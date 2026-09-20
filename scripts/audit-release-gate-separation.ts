import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

type GateName = 'EXTERNAL_BETA' | 'COMMERCIAL_RELEASE';
type GateManifest = {
  schemaVersion: number;
  buildId: string;
  externalBeta: {
    preUploadCommand: string;
    postUploadCommand: string;
    requirements: string[];
    deliberatelyExcluded: string[];
  };
  commercialRelease: { command: string; stage10Defects: string[] };
  stage10Classification: Array<{ id: string; gates: GateName[]; reason: string }>;
};

type DefectRegister = { buildId: string; defects: Array<{ id: string }> };
type PackageJson = { scripts?: Record<string, string> };

const readJson = <T>(path: string): T => JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
const manifest = readJson<GateManifest>('config/release-gates.json');
const defects = readJson<DefectRegister>('config/stage10-release-defects.json');
const packageJson = readJson<PackageJson>('package.json');
const externalAuditSource = readFileSync(resolve('scripts/audit-external-beta-gate.ts'), 'utf8');
const issues: string[] = [];
const checks: Array<{ name: string; passed: boolean }> = [];

const check = (name: string, condition: boolean) => {
  checks.push({ name, passed: condition });
  if (!condition) issues.push(name);
};

check('Gate manifest uses schema version 1', manifest.schemaVersion === 1);
check('Gate manifest matches the current build', manifest.buildId === RELEASE_INFO.buildId);
check('Stage 10 defect register matches the current build', defects.buildId === RELEASE_INFO.buildId);

const defectIds = defects.defects.map(({ id }) => id).sort();
const classifiedIds = manifest.stage10Classification.map(({ id }) => id).sort();
const commercialIds = [...manifest.commercialRelease.stage10Defects].sort();
check('Every Stage 10 defect is classified exactly once', JSON.stringify(defectIds) === JSON.stringify(classifiedIds) && new Set(classifiedIds).size === classifiedIds.length);
check('Every Stage 10 defect remains in the commercial gate', JSON.stringify(defectIds) === JSON.stringify(commercialIds));
check('Every classification has a reason', manifest.stage10Classification.every(({ reason }) => reason.trim().length >= 20));
check('Beta-relevant Stage 10 concerns are limited to readability, controls and listening', JSON.stringify(manifest.stage10Classification.filter(({ gates }) => gates.includes('EXTERNAL_BETA')).map(({ id }) => id)) === JSON.stringify(['S10-007', 'S10-008', 'S10-009']));

const requiredBetaRequirements = [
  'EB-001_AUTOMATED_PREPARATION',
  'EB-002_INTERNAL_GUIDED_MISSION_TEST',
  'EB-003_PHYSICAL_CONTROL_SMOKE',
  'EB-004_READABILITY_REVIEW',
  'EB-005_AUDIO_SMOKE',
  'EB-006_FEEDBACK_ROUTE',
  'EB-007_HOSTED_ITCH_SMOKE',
].sort();
check('External beta requirements are complete', JSON.stringify([...manifest.externalBeta.requirements].sort()) === JSON.stringify(requiredBetaRequirements));
check('External beta deliberately excludes commercial-only work', manifest.externalBeta.deliberatelyExcluded.length >= 9);

const scripts = packageJson.scripts ?? {};
check('Pre-upload beta command is independently callable', scripts['external-beta:gate'] === 'pnpm external-beta:prepare && tsx scripts/audit-external-beta-gate.ts --strict');
check('Hosted beta command is independently callable', scripts['external-beta:hosted-gate'] === 'tsx scripts/audit-external-beta-gate.ts --strict --hosted');
check('Commercial command remains independently callable', scripts['commercial:gate'] === 'pnpm stage10:gate');
check('External beta audit does not consume Stage 10 approval data', !externalAuditSource.includes('stage10-release-approval') && !externalAuditSource.includes('stage10-release-defects'));
check('External beta audit does not consume commercial approval data', !externalAuditSource.includes('commercial-approval'));

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildId: RELEASE_INFO.buildId,
  status: issues.length === 0 ? 'PASS' : 'FAIL',
  checks,
  issues,
  externalBetaRequirementCount: manifest.externalBeta.requirements.length,
  commercialDefectCount: manifest.commercialRelease.stage10Defects.length,
};

mkdirSync(resolve('reports/release-gates'), { recursive: true });
writeFileSync(resolve('reports/release-gates/separation-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const result of checks) console.log(`${result.passed ? 'PASS' : 'FAIL'}  ${result.name}`);
console.log(`\nRelease gate separation audit: ${report.status}`);
if (issues.length > 0) process.exitCode = 1;

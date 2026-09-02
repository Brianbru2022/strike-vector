import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { ReleaseDefectV1 } from '../src/types/game';

const root = process.cwd();
const source = JSON.parse(await readFile(join(root, 'docs', 'STAGE_1_RELEASE_DEFECTS.json'), 'utf8')) as { version: number; buildId: string; defects: ReleaseDefectV1[] };
const issues: string[] = [];
if (source.version !== 1) issues.push('Defect register version must be 1.');
if (source.buildId !== RELEASE_INFO.buildId) issues.push(`Defect register belongs to ${source.buildId}, not ${RELEASE_INFO.buildId}.`);
for (const defect of source.defects || []) {
  if (defect.status !== 'RESOLVED') issues.push(`${defect.id} ${defect.title}: ${defect.status}.`);
  if (defect.status === 'RESOLVED' && (!defect.resolution || defect.verification.length === 0)) issues.push(`${defect.id} is resolved without resolution evidence.`);
}
const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, defectCount: source.defects?.length || 0, issues, passed: issues.length === 0 };
const directory = join(root, 'reports', 'stage-1');
await mkdir(directory, { recursive: true });
await writeFile(join(directory, 'defect-register-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Stage 1 defect register: ${report.passed ? 'PASS' : 'PENDING'} (${report.defectCount} defects)`);
if (!report.passed) process.exitCode = 1;

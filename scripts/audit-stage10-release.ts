import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import type { ReleaseCandidateManifestV1, ReleaseDefectV1 } from '../src/game/ReleaseCandidate';

type ApprovalStatus = 'PENDING' | 'PASS' | 'APPROVED';
interface Approval {
  buildId: string;
  signedCommercialBuild: { status: ApprovalStatus; certificateReference?: string | null };
  storePageApproved: { status: ApprovalStatus; approvedAt?: string | null };
  humanSignOff: { status: ApprovalStatus; report?: string | null };
  windowsCertification: Record<string, ApprovalStatus>;
  saveCertification: Record<string, string>;
  soak: { status: ApprovalStatus; requiredHours: number; report: string | null };
  freeze: { status: string; startedAt: string | null; earliestReleaseAt: string | null };
}
const strict = process.argv.includes('--strict');
const root = process.cwd();
const localBlockers: string[] = [];
const pendingCertification: string[] = [];
const required = [
  'docs/STAGE_10_RELEASE_CANDIDATE.md', 'docs/SUPPORT_RUNBOOK.md', 'docs/KNOWN_ISSUES.md',
  'docs/RELEASE_ROLLBACK_RUNBOOK.md', 'docs/FIRST_WEEK_PATCH_POLICY.md',
  'config/stage10-release-approval.json', 'config/stage10-release-defects.json',
];
for (const file of required) if (!existsSync(path.join(root, file))) localBlockers.push(`Missing Stage 10 deliverable: ${file}`);
const manifestPath = path.join(root, 'release-artifacts/stage10', RELEASE_INFO.buildId, 'candidate-manifest.json');
if (!existsSync(manifestPath)) localBlockers.push('Current-build immutable candidate manifest is missing.');
else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ReleaseCandidateManifestV1;
  if (manifest.buildId !== RELEASE_INFO.buildId || manifest.version !== RELEASE_INFO.version) localBlockers.push('Candidate manifest does not match RELEASE_INFO.');
  if (!manifest.sourceFingerprint || !manifest.assetFingerprint || !manifest.claimsFingerprint || !manifest.storefrontFingerprint || !manifest.evidenceFingerprint || !manifest.windowsManifestFingerprint) localBlockers.push('Candidate manifest is missing one or more fingerprints.');
  if (manifest.migrationCompatibility.currentCampaignSaveVersion !== RELEASE_INFO.saveVersion) localBlockers.push('Candidate migration compatibility is stale.');
}
const windowsManifestPath = path.join(root, 'release-artifacts', `windows-${RELEASE_INFO.version}`, 'release-manifest.json');
if (!existsSync(windowsManifestPath)) localBlockers.push('Windows release manifest is missing for the current version.');
else {
  const windowsManifest = JSON.parse(readFileSync(windowsManifestPath, 'utf8')) as { buildId?: string; version?: string; signed?: boolean };
  if (windowsManifest.buildId !== RELEASE_INFO.buildId || windowsManifest.version !== RELEASE_INFO.version) localBlockers.push('Windows release manifest references a stale build.');
  if (!windowsManifest.signed) pendingCertification.push('Windows release artefacts are not code-signed.');
}
const approvalPath = path.join(root, 'config/stage10-release-approval.json');
if (existsSync(approvalPath)) {
  const approval = JSON.parse(readFileSync(approvalPath, 'utf8')) as Approval;
  if (approval.buildId !== RELEASE_INFO.buildId) localBlockers.push('Stage 10 approval record references another build.');
  if (approval.signedCommercialBuild.status !== 'APPROVED' || !approval.signedCommercialBuild.certificateReference) pendingCertification.push('Signed commercial Windows build is pending.');
  if (approval.storePageApproved.status !== 'APPROVED' || !approval.storePageApproved.approvedAt) pendingCertification.push('Store page approval is pending.');
  if (approval.humanSignOff.status !== 'APPROVED' || !approval.humanSignOff.report || !existsSync(path.join(root, approval.humanSignOff.report))) pendingCertification.push('Judgement-based human sign-off is pending.');
  for (const [name, status] of Object.entries(approval.windowsCertification)) if (status !== 'APPROVED') pendingCertification.push(`Windows certification pending: ${name}.`);
  for (const [name, status] of Object.entries(approval.saveCertification)) if (status !== 'APPROVED') pendingCertification.push(`Save certification pending: ${name}.`);
  let validSoak = false;
  if (approval.soak.report && existsSync(path.join(root, approval.soak.report))) {
    const soak = JSON.parse(readFileSync(path.join(root, approval.soak.report), 'utf8')) as { buildId?: string; requestedMinutes?: number; certificationEligible?: boolean; pageErrors?: unknown[] };
    validSoak = soak.buildId === RELEASE_INFO.buildId && (soak.requestedMinutes ?? 0) >= approval.soak.requiredHours * 60 && soak.certificationEligible === true && (soak.pageErrors?.length ?? 0) === 0;
  }
  if (approval.soak.status !== 'APPROVED' || !validSoak) pendingCertification.push(`${approval.soak.requiredHours}-hour soak report is pending.`);
  const earliest = approval.freeze.earliestReleaseAt ? Date.parse(approval.freeze.earliestReleaseAt) : Number.NaN;
  const started = approval.freeze.startedAt ? Date.parse(approval.freeze.startedAt) : Number.NaN;
  const freezeIsLongEnough = Number.isFinite(started) && Number.isFinite(earliest) && earliest - started >= 14 * 24 * 60 * 60 * 1000;
  if (approval.freeze.status !== 'COMPLETE' || !freezeIsLongEnough || Date.now() < earliest) pendingCertification.push('Two-week code and asset freeze is incomplete.');
}
const defectPath = path.join(root, 'config/stage10-release-defects.json');
if (existsSync(defectPath)) {
  const register = JSON.parse(readFileSync(defectPath, 'utf8')) as { buildId: string; defects: ReleaseDefectV1[] };
  if (register.buildId !== RELEASE_INFO.buildId) localBlockers.push('Stage 10 defect register references another build.');
  for (const defect of register.defects.filter((item) => item.severity === 'BLOCKER' && item.status !== 'RESOLVED')) pendingCertification.push(`${defect.id}: ${defect.title}.`);
}
if (strict && String(RELEASE_INFO.channel) !== 'RELEASE_CANDIDATE') pendingCertification.push('RELEASE_INFO is still a development build.');
const blockers = [...localBlockers, ...(strict ? [...new Set(pendingCertification)] : [])];
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, mode: strict ? 'LAUNCH_GATE' : 'PREPARATION_AUDIT', status: blockers.length ? 'BLOCKED' : 'PREPARED', localBlockers, pendingCertification: [...new Set(pendingCertification)], blockers };
const output = path.join(root, 'reports/stage10', strict ? 'stage10-launch-gate.json' : 'stage10-release-readiness.json');
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Stage 10 ${strict ? 'launch gate' : 'preparation audit'}: ${report.status}`);
console.log(`Local blockers: ${localBlockers.length}; pending certification: ${new Set(pendingCertification).size}`);
blockers.forEach((item) => console.error(`BLOCKER: ${item}`));
if (blockers.length) process.exitCode = 1;

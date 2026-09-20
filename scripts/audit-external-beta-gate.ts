import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { aggregateControlConceptEvidence, sanitiseControlConceptEvidence } from '../src/game/ControlConceptPlaytest';

type Status = 'PENDING' | 'PENDING_HUMAN' | 'PENDING_EXTERNAL' | 'PASS' | 'APPROVED';
interface Approval {
  schemaVersion: number;
  buildId: string;
  fivePlayerInternalTest: { status: Status; evidence: string | null };
  physicalSmoke: Record<'keyboard' | 'xboxController' | 'touchDevice', Status>;
  readabilityReview: { status: Status; evidence: string | null };
  audioSmoke: { status: Status; evidence: string | null };
  feedbackRoute: { status: Status; url: string | null };
  hostedItchSmoke: { status: Status; url: string | null };
}
interface HumanRun {
  testerId?: string;
  experience?: 'NOVICE' | 'EXPERIENCED';
  guidedMission1?: { attempted?: boolean; meaningfulOutcome?: boolean; seriousCrash?: boolean; saveSurvived?: boolean };
  controlsUniversallyRejected?: boolean;
  understoodFailure?: boolean;
  wantedAnotherSortie?: boolean;
}

const strict = process.argv.includes('--strict');
const requireHostedSmoke = process.argv.includes('--hosted');
const blockers: string[] = [];
const pending: string[] = [];
const readJson = <T>(path: string): T | null => {
  try { return JSON.parse(readFileSync(resolve(path), 'utf8')) as T; } catch { return null; }
};

const preparation = readJson<{ buildId?: string; status?: string; completedSteps?: number; requiredSteps?: number }>('reports/external-beta/preparation.json');
if (!preparation || preparation.buildId !== RELEASE_INFO.buildId || preparation.status !== 'PREPARED' || preparation.completedSteps !== preparation.requiredSteps) {
  blockers.push('The current build has not passed the automated external-beta preparation suite.');
}
const itchAudit = readJson<{ buildId?: string; passed?: boolean; configuredFeedbackUrl?: string | null; feedbackUrlEmbedded?: boolean }>('reports/external-beta/itch-build-audit.json');
if (!itchAudit || itchAudit.buildId !== RELEASE_INFO.buildId || itchAudit.passed !== true) blockers.push('The current itch build audit is missing or failed.');
if (!existsSync(resolve('release-artifacts/itch-1.2.0-dev.1/iron-kestrel-87-itch-beta.zip'))) blockers.push('The upload-ready itch ZIP is missing.');

const approval = readJson<Approval>('config/external-beta-approval.json');
if (!approval || approval.schemaVersion !== 1 || approval.buildId !== RELEASE_INFO.buildId) blockers.push('External-beta approval configuration does not match the current build.');
if (approval) {
  const evidence = approval.fivePlayerInternalTest.evidence ? readJson<{ buildId?: string; runs?: HumanRun[]; evidence?: unknown[] }>(approval.fivePlayerInternalTest.evidence) : null;
  const runs = evidence?.runs ?? [];
  const testers = new Set(runs.map((run) => run.testerId).filter(Boolean));
  const novices = runs.filter((run) => run.experience === 'NOVICE').length;
  const experienced = runs.filter((run) => run.experience === 'EXPERIENCED').length;
  const validLegacyEvidence = evidence?.buildId === RELEASE_INFO.buildId && runs.length === 5 && testers.size === 5 && novices >= 3 && experienced >= 2
    && runs.every((run) => run.guidedMission1?.attempted && run.guidedMission1.meaningfulOutcome && !run.guidedMission1.seriousCrash && run.guidedMission1.saveSurvived && !run.controlsUniversallyRejected && typeof run.understoodFailure === 'boolean' && typeof run.wantedAnotherSortie === 'boolean')
    && runs.some((run) => run.wantedAnotherSortie);
  const controlEvidence = Array.isArray(evidence?.evidence) ? evidence.evidence.map(sanitiseControlConceptEvidence).filter((item): item is NonNullable<ReturnType<typeof sanitiseControlConceptEvidence>> => item !== null) : [];
  const controlSummary = aggregateControlConceptEvidence(controlEvidence);
  const validControlEvidence = evidence?.buildId === RELEASE_INFO.buildId && controlSummary.complete && controlSummary.wantsAnotherSortieCount > 0;
  const validHumanEvidence = validLegacyEvidence || validControlEvidence;
  if (approval.fivePlayerInternalTest.status !== 'APPROVED' || !validHumanEvidence) pending.push('Five-player internal Guided Mission 1 evidence is pending or incomplete.');
  for (const [device, status] of Object.entries(approval.physicalSmoke)) if (status !== 'APPROVED') pending.push(`Physical ${device} smoke test is pending.`);
  if (approval.readabilityReview.status !== 'APPROVED' || !approval.readabilityReview.evidence) pending.push('Human readability review is pending.');
  if (approval.audioSmoke.status !== 'APPROVED' || !approval.audioSmoke.evidence) pending.push('Basic human audio smoke is pending.');
  if (approval.feedbackRoute.status !== 'APPROVED' || !approval.feedbackRoute.url) pending.push('Tester feedback route is pending.');
  else if (itchAudit?.configuredFeedbackUrl !== approval.feedbackRoute.url || itchAudit.feedbackUrlEmbedded !== true) pending.push('The approved tester feedback route is not embedded in the packaged itch build.');
  if (approval.hostedItchSmoke.status !== 'APPROVED' || !approval.hostedItchSmoke.url) {
    const message = 'Smoke test of the uploaded unlisted itch build is pending.';
    if (requireHostedSmoke) pending.push(message);
    else console.log(`POST-UPLOAD: ${message}`);
  }
}

const effectiveBlockers = [...blockers, ...(strict ? pending : [])];
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildId: RELEASE_INFO.buildId,
  mode: requireHostedSmoke ? 'HOSTED_BETA_GATE' : strict ? 'UPLOAD_GATE' : 'PREPARATION_AUDIT',
  status: effectiveBlockers.length ? 'BLOCKED' : requireHostedSmoke ? 'HOSTED_BETA_VERIFIED' : strict ? 'APPROVED_FOR_UNLISTED_UPLOAD' : 'PREPARED',
  automatedBlockers: blockers,
  pendingHumanOrExternalEvidence: pending,
  blockers: effectiveBlockers,
  commercialGateDeliberatelyExcluded: true,
  hostedItchSmokeRequired: requireHostedSmoke,
};
mkdirSync(resolve('reports/external-beta'), { recursive: true });
writeFileSync(resolve(`reports/external-beta/${requireHostedSmoke ? 'hosted-gate' : strict ? 'upload-gate' : 'readiness'}.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(`External beta ${strict ? 'upload gate' : 'preparation audit'}: ${report.status}`);
for (const issue of blockers) console.error(`BLOCKER: ${issue}`);
for (const item of pending) console.log(`PENDING: ${item}`);
if (effectiveBlockers.length) process.exitCode = 1;

import { DiagnosticSessionV3, DifficultyPreset, OperationArchetype, WeaponType } from '../types/game';
import { RELEASE_INFO } from './Release';

const DIFFICULTIES: DifficultyPreset[] = ['ARCADE', 'PILOT', 'VETERAN'];
const ARCHETYPES: OperationArchetype[] = ['FLEET_CAP', 'SEAD', 'ARMOURED_INTERDICTION', 'PILOT_RESCUE', 'FARP_DEFENCE', 'DEEP_STRIKE'];

export interface Stage7HumanReview {
  runKey: string;
  openingAttackFair: boolean | null;
  recoveryAchievable: boolean | null;
  deadTravelAcceptable: boolean | null;
  lateFailureUnderstood: boolean | null;
  notes: string;
}

export interface Stage7BalanceEvidenceV1 {
  version: 1;
  buildId: string;
  generatedAt: string;
  runs: DiagnosticSessionV3[];
  humanReviews: Stage7HumanReview[];
}

export interface Stage7RunMetrics {
  attempts: number;
  victories: number;
  completionRate: number;
  averageSortieSeconds: number;
  averageCombatSeconds: number;
  ammunitionUsed: Record<WeaponType, number>;
  damageBySource: DiagnosticSessionV3['damageReceived'];
  missileWarnings: number;
  warningAcknowledgements: number;
  warningAcknowledgementRate: number;
  landingGrades: Record<string, number>;
}

export interface Stage7Verification {
  passed: boolean;
  buildId: string;
  campaignRuns: number;
  deploymentRuns: number;
  completedDeployments: Record<DifficultyPreset, number>;
  coveredArchetypes: Record<DifficultyPreset, OperationArchetype[]>;
  metricsByDifficulty: Record<DifficultyPreset, Stage7RunMetrics>;
  issues: string[];
}

export function stage7RunKey(run: DiagnosticSessionV3): string {
  return run.operationSeed === null
    ? `campaign:${run.difficulty}:${run.missionId}`
    : `operation:${run.difficulty}:${run.operationSeed}:${run.operationSortieIndex}`;
}

export function createStage7Evidence(sessions: DiagnosticSessionV3[], generatedAt = new Date().toISOString()): Stage7BalanceEvidenceV1 {
  const currentBuild = sessions.filter((session) => session.buildId === RELEASE_INFO.buildId);
  const latestByKey = new Map<string, DiagnosticSessionV3>();
  for (const run of currentBuild) latestByKey.set(stage7RunKey(run), run);
  const humanReviews = [...latestByKey.keys()].map((runKey) => ({
    runKey,
    openingAttackFair: null,
    recoveryAchievable: null,
    deadTravelAcceptable: null,
    lateFailureUnderstood: null,
    notes: '',
  }));
  return { version: 1, buildId: RELEASE_INFO.buildId, generatedAt, runs: currentBuild, humanReviews };
}

export function verifyStage7Evidence(evidence: Stage7BalanceEvidenceV1, campaignMissionIds: string[], expectedBuildId = RELEASE_INFO.buildId): Stage7Verification {
  const issues: string[] = [];
  if (evidence.version !== 1) issues.push('Evidence is not Stage7BalanceEvidenceV1.');
  if (evidence.buildId !== expectedBuildId) issues.push(`Evidence belongs to ${evidence.buildId || 'an unknown build'}, not ${expectedBuildId}.`);
  if (!Number.isFinite(Date.parse(evidence.generatedAt))) issues.push('Evidence has no valid generation time.');
  const candidateRuns = evidence.runs.filter((run) => run.buildId === expectedBuildId);
  if (candidateRuns.length !== evidence.runs.length) issues.push('Evidence contains unbound or mismatched-build runs.');

  const latestByKey = new Map<string, DiagnosticSessionV3>();
  for (const run of candidateRuns) latestByKey.set(stage7RunKey(run), run);
  const selected = [...latestByKey.values()];
  const campaignRuns = selected.filter((run) => run.operationSeed === null);
  const deploymentRuns = selected.filter((run) => run.operationSeed !== null);
  for (const run of selected) {
    if (run.simulationTicks <= 0) issues.push(`${stage7RunKey(run)} has no simulation duration.`);
    if (run.result === 'VICTORY' && !run.landingGrade) issues.push(`${stage7RunKey(run)} has no recovery grade.`);
  }

  for (const difficulty of DIFFICULTIES) {
    for (const missionId of campaignMissionIds) {
      const run = latestByKey.get(`campaign:${difficulty}:${missionId}`);
      if (!run) issues.push(`Missing ${difficulty} campaign run for ${missionId}.`);
      else if (run.result !== 'VICTORY') issues.push(`${difficulty}/${missionId} did not end in victory.`);
    }
  }

  const completedDeployments = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, 0])) as Record<DifficultyPreset, number>;
  const coveredArchetypes = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, []])) as Record<DifficultyPreset, OperationArchetype[]>;
  for (const difficulty of DIFFICULTIES) {
    const bySeed = new Map<number, DiagnosticSessionV3[]>();
    for (const run of deploymentRuns.filter((item) => item.difficulty === difficulty)) {
      bySeed.set(run.operationSeed!, [...(bySeed.get(run.operationSeed!) ?? []), run]);
    }
    const completed = [...bySeed.values()].filter((runs) => new Set(runs.filter((run) => run.result === 'VICTORY').map((run) => run.operationSortieIndex)).size === 3);
    completedDeployments[difficulty] = completed.length;
    coveredArchetypes[difficulty] = ARCHETYPES.filter((archetype) => completed.some((runs) => runs.some((run) => run.operationArchetype === archetype)));
    if (completed.length < 2) issues.push(`${difficulty} requires two completed three-sortie deployments.`);
    if (coveredArchetypes[difficulty].length !== ARCHETYPES.length) issues.push(`${difficulty} deployments do not cover all six procedural archetypes.`);
  }

  const reviewByKey = new Map(evidence.humanReviews.map((review) => [review.runKey, review]));
  if (reviewByKey.size !== evidence.humanReviews.length) issues.push('Evidence contains duplicate human-review keys.');
  for (const run of selected.filter((item) => item.result === 'VICTORY')) {
    const review = reviewByKey.get(stage7RunKey(run));
    if (!review) { issues.push(`Missing human review for ${stage7RunKey(run)}.`); continue; }
    if (review.openingAttackFair !== true) issues.push(`${review.runKey} has not certified a fair opening attack.`);
    if (review.recoveryAchievable !== true) issues.push(`${review.runKey} has not certified achievable recovery.`);
    if (review.deadTravelAcceptable !== true) issues.push(`${review.runKey} has unresolved dead travel.`);
    if (review.lateFailureUnderstood !== true) issues.push(`${review.runKey} has unresolved late-failure guidance.`);
  }

  return {
    passed: issues.length === 0,
    buildId: expectedBuildId,
    campaignRuns: campaignRuns.length,
    deploymentRuns: deploymentRuns.length,
    completedDeployments,
    coveredArchetypes,
    metricsByDifficulty: Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, aggregateStage7Metrics(candidateRuns.filter((run) => run.difficulty === difficulty))])) as Record<DifficultyPreset, Stage7RunMetrics>,
    issues,
  };
}

export function exportStage7EvidenceJson(sessions: DiagnosticSessionV3[]): string {
  return JSON.stringify(createStage7Evidence(sessions), null, 2);
}

export function aggregateStage7Metrics(runs: DiagnosticSessionV3[]): Stage7RunMetrics {
  const ammunitionUsed = emptyWeaponRecord();
  const damageBySource: DiagnosticSessionV3['damageReceived'] = { AIRCRAFT_GUN: 0, SAM_MISSILE: 0, FLAK: 0, GROUND_FIRE: 0, IMPACT: 0 };
  const landingGrades: Record<string, number> = {};
  let missileWarnings = 0;
  let warningAcknowledgements = 0;
  for (const run of runs) {
    for (const weapon of Object.keys(ammunitionUsed) as WeaponType[]) ammunitionUsed[weapon] += run.weaponsUsed[weapon];
    for (const source of Object.keys(damageBySource) as Array<keyof typeof damageBySource>) damageBySource[source] += run.damageReceived[source];
    missileWarnings += run.missileWarnings;
    warningAcknowledgements += run.warningAcknowledgements;
    if (run.landingGrade) landingGrades[run.landingGrade] = (landingGrades[run.landingGrade] ?? 0) + 1;
  }
  const victories = runs.filter((run) => run.result === 'VICTORY').length;
  return {
    attempts: runs.length,
    victories,
    completionRate: runs.length ? Math.round(victories / runs.length * 100) : 0,
    averageSortieSeconds: runs.length ? Math.round(runs.reduce((sum, run) => sum + run.simulationTicks / 60, 0) / runs.length) : 0,
    averageCombatSeconds: runs.length ? Math.round(runs.reduce((sum, run) => sum + run.combatTicks / 60, 0) / runs.length) : 0,
    ammunitionUsed,
    damageBySource,
    missileWarnings,
    warningAcknowledgements,
    warningAcknowledgementRate: missileWarnings ? Math.round(Math.min(1, warningAcknowledgements / missileWarnings) * 100) : 0,
    landingGrades,
  };
}

function emptyWeaponRecord(): Record<WeaponType, number> {
  return { CANNON: 0, MISSILE: 0, BOMB: 0, ROCKET: 0, FLARE: 0 };
}

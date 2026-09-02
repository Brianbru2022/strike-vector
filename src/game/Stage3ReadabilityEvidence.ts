import { RELEASE_INFO } from './Release';

export const STAGE_3_READABILITY_SCENARIOS = Object.freeze([
  'MISSION_1_DESKTOP', 'MISSION_6_DESKTOP', 'MISSION_10_DESKTOP',
  'MISSION_1_COMPACT', 'MISSION_6_COMPACT', 'MISSION_10_COMPACT',
] as const);

export type Stage3ReadabilityScenario = typeof STAGE_3_READABILITY_SCENARIOS[number];

export interface Stage3ReadabilityRun {
  scenario: Stage3ReadabilityScenario;
  aircraftTypeRecognised: boolean | null;
  threatDirectionRecognised: boolean | null;
  missileLaunchRecognised: boolean | null;
  largeTargetCircleRequired: boolean | null;
  notes: string;
}

export interface Stage3ReadabilityEvidenceV1 {
  version: 1;
  buildId: string;
  completedAt: string | null;
  runs: Stage3ReadabilityRun[];
}

export function verifyStage3ReadabilityEvidence(evidence: Stage3ReadabilityEvidenceV1): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  if (evidence.version !== 1) issues.push('Unsupported evidence version.');
  if (evidence.buildId !== RELEASE_INFO.buildId) issues.push(`Evidence build ${evidence.buildId} does not match ${RELEASE_INFO.buildId}.`);
  if (!evidence.completedAt) issues.push('Human readability review is not marked complete.');
  for (const scenario of STAGE_3_READABILITY_SCENARIOS) {
    const matches = evidence.runs.filter((run) => run.scenario === scenario);
    if (matches.length !== 1) {
      issues.push(`${scenario} requires exactly one current-build review.`);
      continue;
    }
    const run = matches[0];
    if (run.aircraftTypeRecognised !== true) issues.push(`${scenario}: aircraft type was not recognised visually.`);
    if (run.threatDirectionRecognised !== true) issues.push(`${scenario}: threat direction was not recognised visually.`);
    if (run.missileLaunchRecognised !== true) issues.push(`${scenario}: missile launch was not recognised visually.`);
    if (run.largeTargetCircleRequired !== false) issues.push(`${scenario}: recognition still relied on a large target circle.`);
  }
  return { passed: issues.length === 0, issues };
}


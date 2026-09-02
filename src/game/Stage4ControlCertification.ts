import { InputDevice } from '../types/game';
import { RELEASE_INFO } from './Release';

export const STAGE_4_CONTROL_SCENARIOS = Object.freeze([
  { id: 'GUIDED_KEYBOARD', device: 'KEYBOARD' },
  { id: 'GUIDED_XBOX_GAMEPAD', device: 'GAMEPAD' },
  { id: 'GUIDED_MOBILE_TOUCH', device: 'TOUCH' },
] as const);

export type Stage4ControlScenarioId = typeof STAGE_4_CONTROL_SCENARIOS[number]['id'];

export interface Stage4ControlRun {
  scenarioId: Stage4ControlScenarioId;
  observedDevice: InputDevice;
  hardware: string;
  promptCorrectBeforeFirstAction: boolean | null;
  launchCompleted: boolean | null;
  combatCompleted: boolean | null;
  vtolCompleted: boolean | null;
  recoveryCompleted: boolean | null;
  guidedMissionVictory: boolean | null;
  inputLossObserved: boolean | null;
  outsideHelpUsed: boolean | null;
  notes: string;
}

export interface Stage4ControlEvidenceV1 {
  version: 1;
  buildId: string;
  completedAt: string | null;
  runs: Stage4ControlRun[];
}

export function verifyStage4ControlEvidence(evidence: Stage4ControlEvidenceV1): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  if (evidence.version !== 1) issues.push('Unsupported control evidence version.');
  if (evidence.buildId !== RELEASE_INFO.buildId) issues.push(`Evidence build ${evidence.buildId} does not match ${RELEASE_INFO.buildId}.`);
  if (!evidence.completedAt) issues.push('Hardware control certification is not marked complete.');
  for (const scenario of STAGE_4_CONTROL_SCENARIOS) {
    const matches = evidence.runs.filter((run) => run.scenarioId === scenario.id);
    if (matches.length !== 1) {
      issues.push(`${scenario.id} requires exactly one current-build hardware run.`);
      continue;
    }
    const run = matches[0];
    if (run.observedDevice !== scenario.device) issues.push(`${scenario.id}: expected ${scenario.device}, observed ${run.observedDevice}.`);
    if (run.hardware.trim().length < 3) issues.push(`${scenario.id}: hardware description is missing.`);
    for (const field of ['promptCorrectBeforeFirstAction', 'launchCompleted', 'combatCompleted', 'vtolCompleted', 'recoveryCompleted', 'guidedMissionVictory'] as const) {
      if (run[field] !== true) issues.push(`${scenario.id}: ${field} is not certified.`);
    }
    if (run.inputLossObserved !== false) issues.push(`${scenario.id}: input loss must be explicitly rejected.`);
    if (run.outsideHelpUsed !== false) issues.push(`${scenario.id}: completion must not use outside help.`);
  }
  return { passed: issues.length === 0, issues };
}


import {
  AccessibilitySettings,
  InputAction,
  InputBindingProfile,
  PlaytestEvidenceV1,
  PlaytestResponse,
  ValidationScenario,
  WeaponType,
} from '../types/game';
import { cloneBindings } from './inputBindings';
import { getPlatformStorage } from './PlatformRuntime';
import { RELEASE_INFO } from './Release';

export const PLAYTEST_EVIDENCE_STORAGE_KEY = 'STRIKE_VECTOR_PLAYTEST_EVIDENCE_V1';
export const VALIDATION_BUILD_ID = RELEASE_INFO.buildId;
export const MAX_PLAYTEST_EVIDENCE = 100;

const STANDARD_ACCESSIBILITY: AccessibilitySettings = {
  radioCaptions: true,
  highContrastHud: false,
  hudContrast: 'STANDARD',
  textContrast: 'STANDARD',
  reducedEffects: false,
  screenShake: 1,
  hudScale: 'AUTO',
};

const REDUCED_ACCESSIBILITY: AccessibilitySettings = {
  radioCaptions: true,
  highContrastHud: true,
  hudContrast: 'HIGH',
  textContrast: 'HIGH',
  reducedEffects: true,
  screenShake: 0,
  hudScale: 'LARGE',
};

export const VALIDATION_SCENARIOS: readonly ValidationScenario[] = Object.freeze([
  { id: 'V01', order: 1, title: 'Guided Carrier Qualification', missionId: 'm1_coastal_strike', difficulty: 'ARCADE', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'DEFAULT', guidedTraining: true, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete guided Mission 1 using keyboard controls without instructions outside the game.', requiresCombatDamage: false },
  { id: 'V02', order: 2, title: 'Standard Carrier Qualification', missionId: 'm1_coastal_strike', difficulty: 'PILOT', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete standard Mission 1 and make a normal carrier recovery.', requiresCombatDamage: false },
  { id: 'V03', order: 3, title: 'Guided Veteran Gamepad Recovery', missionId: 'm1_coastal_strike', difficulty: 'VETERAN', deviceClass: 'DESKTOP_GAMEPAD', inputProfile: 'DEFAULT', guidedTraining: true, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Use an Xbox-compatible gamepad for every guided step, combat action and carrier recovery.', requiresCombatDamage: false },
  { id: 'V04', order: 4, title: 'Mobile Guided Qualification', missionId: 'm1_coastal_strike', difficulty: 'ARCADE', deviceClass: 'MOBILE_TOUCH', inputProfile: 'DEFAULT', guidedTraining: true, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'At 844 x 390 landscape, complete guided Mission 1 using touch controls only.', requiresCombatDamage: false },
  { id: 'V05', order: 5, title: 'Mobile Fleet Defence', missionId: 'm6_fleet_defence', difficulty: 'PILOT', deviceClass: 'MOBILE_TOUCH', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'At 844 x 390 landscape, defend the carrier group using touch controls.', requiresCombatDamage: false },
  { id: 'V06', order: 6, title: 'Mobile Bastion Assault', missionId: 'm10_hq_assault', difficulty: 'VETERAN', deviceClass: 'MOBILE_TOUCH', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'STRIKE', accessibility: STANDARD_ACCESSIBILITY, instruction: 'At 844 x 390 landscape, complete the phased Bastion assault using touch controls.', requiresCombatDamage: false },
  { id: 'V07', order: 7, title: 'Reduced-effects Fleet Defence', missionId: 'm6_fleet_defence', difficulty: 'PILOT', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'FLEET_CAP', accessibility: REDUCED_ACCESSIBILITY, instruction: 'Confirm warnings remain readable with reduced effects, captions and the high-contrast HUD.', requiresCombatDamage: false },
  { id: 'V08', order: 8, title: 'Remapped Damaged Recovery', missionId: 'm10_hq_assault', difficulty: 'VETERAN', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'REMAPPED', guidedTraining: false, loadout: 'STRIKE', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Use the validation remap and receive combat damage before completing the recovery.', requiresCombatDamage: true },
  { id: 'V09', order: 9, title: 'Arcade Fleet Defence', missionId: 'm6_fleet_defence', difficulty: 'ARCADE', deviceClass: 'DESKTOP_GAMEPAD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Defend HMS Invincible on Arcade using a gamepad and intercept at least one sea-skimming missile.', requiresCombatDamage: false },
  { id: 'V10', order: 10, title: 'Veteran Fleet Defence', missionId: 'm6_fleet_defence', difficulty: 'VETERAN', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete the fleet-defence battle on Veteran and judge whether every attack wave remains readable and fair.', requiresCombatDamage: false },
  { id: 'V11', order: 11, title: 'Arcade Bastion Assault', missionId: 'm10_hq_assault', difficulty: 'ARCADE', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'STRIKE', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete every Bastion phase on Arcade and verify that locked targets and objective changes are understood.', requiresCombatDamage: false },
  { id: 'V12', order: 12, title: 'Pilot Bastion Assault', missionId: 'm10_hq_assault', difficulty: 'PILOT', deviceClass: 'DESKTOP_GAMEPAD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'STRIKE', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete the Bastion assault on Pilot using a gamepad and assess ammunition and recovery margins.', requiresCombatDamage: false },
  { id: 'V13', order: 13, title: 'Arcade Cold Passage', missionId: 'm11_cold_passage', difficulty: 'ARCADE', deviceClass: 'MOBILE_TOUCH', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'At 844 x 390 landscape, identify the long-range contacts, protect the fleet and recover using touch only.', requiresCombatDamage: false },
  { id: 'V14', order: 14, title: 'Pilot Cold Passage', missionId: 'm11_cold_passage', difficulty: 'PILOT', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete Cold Passage on Pilot and assess identification, warning timing and carrier recovery.', requiresCombatDamage: false },
  { id: 'V15', order: 15, title: 'Veteran Cold Passage', missionId: 'm11_cold_passage', difficulty: 'VETERAN', deviceClass: 'DESKTOP_GAMEPAD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'FLEET_CAP', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete Cold Passage on Veteran using a gamepad without firing on unidentified contacts.', requiresCombatDamage: false },
  { id: 'V16', order: 16, title: 'Arcade Whiteout Rescue', missionId: 'm14_whiteout_rescue', difficulty: 'ARCADE', deviceClass: 'MOBILE_TOUCH', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'CLOSE_SUPPORT', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Locate and recover the crew in mobile landscape using the beacon and touch controls only.', requiresCombatDamage: false },
  { id: 'V17', order: 17, title: 'Pilot Whiteout Rescue', missionId: 'm14_whiteout_rescue', difficulty: 'PILOT', deviceClass: 'DESKTOP_GAMEPAD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'CLOSE_SUPPORT', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete the whiteout rescue on Pilot using a gamepad and verify that beacon and threat cues remain readable.', requiresCombatDamage: false },
  { id: 'V18', order: 18, title: 'Veteran Whiteout Rescue', missionId: 'm14_whiteout_rescue', difficulty: 'VETERAN', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'CLOSE_SUPPORT', accessibility: REDUCED_ACCESSIBILITY, instruction: 'Complete the Veteran rescue with reduced effects, captions and high-contrast HUD enabled.', requiresCombatDamage: false },
  { id: 'V19', order: 19, title: 'Arcade North Cape Assault', missionId: 'm16_north_cape_assault', difficulty: 'ARCADE', deviceClass: 'DESKTOP_KEYBOARD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'STRIKE', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete every North Cape phase on Arcade and assess objective sequencing and ammunition sufficiency.', requiresCombatDamage: false },
  { id: 'V20', order: 20, title: 'Pilot North Cape Assault', missionId: 'm16_north_cape_assault', difficulty: 'PILOT', deviceClass: 'MOBILE_TOUCH', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'STRIKE', accessibility: STANDARD_ACCESSIBILITY, instruction: 'At 844 x 390 landscape, complete the North Cape finale using touch controls and recover aboard Invincible.', requiresCombatDamage: false },
  { id: 'V21', order: 21, title: 'Veteran North Cape Assault', missionId: 'm16_north_cape_assault', difficulty: 'VETERAN', deviceClass: 'DESKTOP_GAMEPAD', inputProfile: 'DEFAULT', guidedTraining: false, loadout: 'STRIKE', accessibility: STANDARD_ACCESSIBILITY, instruction: 'Complete the North Cape finale on Veteran using a gamepad after receiving combat damage.', requiresCombatDamage: true },
]);

/** The three real-input runs that must precede the wider validation matrix. */
export const PRIORITY_INPUT_SCENARIO_IDS = Object.freeze(['V01', 'V09', 'V06'] as const);
export const PRIORITY_INPUT_SCENARIOS = Object.freeze(PRIORITY_INPUT_SCENARIO_IDS.map((id) => VALIDATION_SCENARIOS.find((scenario) => scenario.id === id)!));

export interface PriorityInputValidationSummary {
  buildId: string;
  completedScenarioIds: string[];
  passedScenarioIds: string[];
  missingScenarioIds: string[];
  issues: string[];
  readyForFullMatrix: boolean;
}

export const VALIDATION_REMAPPED_BINDINGS: InputBindingProfile = (() => {
  const bindings = cloneBindings();
  bindings.keyboard = {
    ...bindings.keyboard,
    PITCH_UP: ['KeyI'],
    PITCH_DOWN: ['KeyK'],
    THROTTLE_DOWN: ['KeyJ'],
    THROTTLE_UP: ['KeyL'],
    VTOL: ['KeyU'],
    PRIMARY_FIRE: ['KeyH'],
    SECONDARY_FIRE: ['KeyN'],
    CYCLE_WEAPON: ['KeyM'],
    COUNTERMEASURE: ['KeyO'],
    PAUSE: ['Escape'],
  } satisfies Record<InputAction, string[]>;
  return bindings;
})();

export const EMPTY_PLAYTEST_RESPONSE: PlaytestResponse = {
  warningNoticed: false,
  controlsClear: true,
  objectivesClear: true,
  failureReasonUnderstood: true,
  targetsReadable: true,
  ammunitionSufficient: true,
  recoveryAchievable: true,
  openingAttackFair: true,
  aircraftMovementNatural: true,
  externalHelpUsed: false,
  physicalInputConfirmed: false,
  hardwareDescription: '',
  observations: '',
  blockers: { unavoidableAttack: false, objectiveBlocker: false, impossibleRecovery: false, terrainPenetration: false, inputFailure: false },
};

export interface ValidationSummary {
  buildId: string;
  currentBuildEvidenceCount: number;
  historicalEvidenceCount: number;
  totalScenarios: number;
  completedScenarioIds: string[];
  victoryCount: number;
  coveredMissionIds: string[];
  coveredDifficulties: string[];
  coveredDeviceClasses: string[];
  warningExposedRuns: number;
  warningAcknowledgedRuns: number;
  warningAcknowledgementTarget: number;
  guidedMissionCompletedWithoutHelp: boolean;
  controlsCertified: boolean;
  objectivesCertified: boolean;
  ammunitionCertified: boolean;
  recoveriesCertified: boolean;
  scenarioRequirementsCertified: boolean;
  blockerCount: number;
  repeatedIssues: string[];
  signOffReady: boolean;
}

export function sanitisePlaytestEvidence(value: unknown): PlaytestEvidenceV1 | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<PlaytestEvidenceV1>;
  const scenario = VALIDATION_SCENARIOS.find((candidate) => candidate.id === item.scenarioId);
  if (item.version !== 1 || !scenario || typeof item.buildId !== 'string' || typeof item.completedAt !== 'string' || !item.run || !item.response) return null;
  const run = sanitisePlaytestRunResult(item.run);
  if (!run) return null;
  const response = sanitisePlaytestResponse(item.response);
  return {
    version: 1,
    buildId: item.buildId.slice(0, 80),
    completedAt: item.completedAt,
    scenarioId: scenario.id,
    run,
    response,
  };
}

export function loadPlaytestEvidence(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): PlaytestEvidenceV1[] {
  try {
    const parsed = JSON.parse(storage.getItem(PLAYTEST_EVIDENCE_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitisePlaytestEvidence).filter((item): item is PlaytestEvidenceV1 => item !== null).slice(-MAX_PLAYTEST_EVIDENCE);
  } catch {
    return [];
  }
}

export function appendPlaytestEvidence(evidence: PlaytestEvidenceV1, storage: Pick<Storage, 'getItem' | 'setItem'> = getPlatformStorage()): PlaytestEvidenceV1[] {
  const normalised = sanitisePlaytestEvidence(evidence);
  const next = normalised ? [...loadPlaytestEvidence(storage as Storage), normalised].slice(-MAX_PLAYTEST_EVIDENCE) : loadPlaytestEvidence(storage as Storage);
  try { storage.setItem(PLAYTEST_EVIDENCE_STORAGE_KEY, JSON.stringify(next)); } catch { /* Validation storage must never interrupt play. */ }
  return next;
}

export function clearPlaytestEvidence(storage: Pick<Storage, 'removeItem'> = getPlatformStorage()): void {
  try { storage.removeItem(PLAYTEST_EVIDENCE_STORAGE_KEY); } catch { /* Ignore restricted storage. */ }
}

export function exportPlaytestEvidenceJson(evidence: PlaytestEvidenceV1[]): string {
  const sanitised = evidence.map(sanitisePlaytestEvidence).filter((item): item is PlaytestEvidenceV1 => item !== null);
  const latest = [...latestEvidenceByScenario(sanitised.filter((item) => item.buildId === VALIDATION_BUILD_ID)).values()];
  const latestKeys = new Set(latest.map((item) => `${item.scenarioId}:${item.completedAt}`));
  return JSON.stringify({
    version: 1,
    buildId: VALIDATION_BUILD_ID,
    evidence: latest,
    attemptHistory: sanitised.filter((item) => !latestKeys.has(`${item.scenarioId}:${item.completedAt}`)),
  }, null, 2);
}

export interface ValidationEvidenceVerification {
  passed: boolean;
  buildId: string;
  summary: ValidationSummary;
  issues: string[];
  evidence: PlaytestEvidenceV1[];
}

export function verifyPlaytestEvidenceExport(value: unknown, expectedBuildId = VALIDATION_BUILD_ID): ValidationEvidenceVerification {
  const issues: string[] = [];
  const source = value && typeof value === 'object' ? value as { version?: unknown; buildId?: unknown; evidence?: unknown } : {};
  if (source.version !== 1) issues.push('Evidence export version must be 1.');
  if (source.buildId !== expectedBuildId) issues.push(`Evidence build ${String(source.buildId || 'missing')} does not match ${expectedBuildId}.`);
  const rawEvidence = Array.isArray(source.evidence) ? source.evidence : [];
  if (!Array.isArray(source.evidence)) issues.push('Evidence export does not contain an evidence array.');
  const evidence = rawEvidence.map(sanitisePlaytestEvidence).filter((item): item is PlaytestEvidenceV1 => item !== null);
  if (evidence.length !== rawEvidence.length) issues.push('Evidence export contains invalid records.');
  const duplicateScenarios = [...new Set(evidence.map((item) => item.scenarioId).filter((id, index, all) => all.indexOf(id) !== index))];
  if (duplicateScenarios.length) issues.push(`Duplicate scenario coverage: ${duplicateScenarios.join(', ')}.`);
  const mismatched = evidence.filter((item) => item.buildId !== expectedBuildId);
  if (mismatched.length) issues.push(`${mismatched.length} evidence record(s) belong to another build.`);
  const summary = aggregatePlaytestEvidence(evidence, expectedBuildId);
  const missing = VALIDATION_SCENARIOS.filter((scenario) => !summary.completedScenarioIds.includes(scenario.id)).map((scenario) => scenario.id);
  if (missing.length) issues.push(`Missing scenario coverage: ${missing.join(', ')}.`);
  if (summary.victoryCount !== VALIDATION_SCENARIOS.length) issues.push(`Victories ${summary.victoryCount}/${VALIDATION_SCENARIOS.length}.`);
  if (summary.coveredMissionIds.length !== 6 || summary.coveredDifficulties.length !== 3 || summary.coveredDeviceClasses.length !== 3) issues.push('Mission, difficulty or device coverage is incomplete.');
  if (!summary.scenarioRequirementsCertified) issues.push('One or more scenario-specific requirements failed.');
  if (summary.blockerCount > 0) issues.push(`${summary.blockerCount} blocker(s) remain.`);
  if (summary.repeatedIssues.length) issues.push(`Repeated usability issues: ${summary.repeatedIssues.join(', ')}.`);
  if (summary.warningAcknowledgedRuns < summary.warningAcknowledgementTarget) issues.push(`Warnings acknowledged ${summary.warningAcknowledgedRuns}/${summary.warningAcknowledgementTarget}.`);
  if (!summary.guidedMissionCompletedWithoutHelp) issues.push('Guided Mission 1 was not completed without external help.');
  if (!summary.controlsCertified || !summary.objectivesCertified || !summary.ammunitionCertified || !summary.recoveriesCertified) issues.push('Controls, objectives, ammunition or recovery certification is incomplete.');
  return { passed: issues.length === 0 && summary.signOffReady, buildId: expectedBuildId, summary, issues, evidence };
}

export function aggregatePlaytestEvidence(evidence: PlaytestEvidenceV1[], buildId = VALIDATION_BUILD_ID): ValidationSummary {
  const currentBuildEvidence = evidence.filter((item) => item.buildId === buildId);
  const latest = latestEvidenceByScenario(currentBuildEvidence);
  const completedScenarioIds = VALIDATION_SCENARIOS.filter((scenario) => latest.has(scenario.id)).map((scenario) => scenario.id);
  const runs = [...latest.values()];
  const blockerCount = runs.reduce((sum, item) => sum + Object.values(item.response.blockers).filter(Boolean).length, 0);
  const issueCounts = new Map<string, number>();
  for (const item of runs) {
    if (!item.response.controlsClear) increment(issueCounts, 'Controls unclear');
    if (!item.response.objectivesClear) increment(issueCounts, 'Objectives unclear');
    if (!item.response.failureReasonUnderstood) increment(issueCounts, 'Failure unexplained');
    if (!item.response.targetsReadable) increment(issueCounts, 'Targets unreadable');
    if (!item.response.ammunitionSufficient) increment(issueCounts, 'Ammunition insufficient');
    if (!item.response.recoveryAchievable) increment(issueCounts, 'Recovery unachievable');
    if (!item.response.openingAttackFair) increment(issueCounts, 'Opening attack unfair');
    if (!item.response.aircraftMovementNatural) increment(issueCounts, 'Aircraft movement unnatural');
  }
  const repeatedIssues = [...issueCounts.entries()].filter(([, count]) => count >= 2).map(([issue]) => issue);
  const warningExposedRuns = runs.filter((item) => item.run.fighterWarnings + item.run.missileWarnings > 0).length;
  const warningAcknowledgedRuns = runs.filter((item) => item.run.fighterWarnings + item.run.missileWarnings > 0 && item.response.warningNoticed).length;
  const warningAcknowledgementTarget = Math.max(6, Math.ceil(warningExposedRuns * 0.75));
  const guidedMissionCompletedWithoutHelp = runs.some((item) => {
    const scenario = VALIDATION_SCENARIOS.find((candidate) => candidate.id === item.scenarioId);
    return scenario?.guidedTraining && item.run.result === 'VICTORY' && !item.response.externalHelpUsed && !item.run.tutorialSkipped;
  });
  const controlsCertified = runs.length === VALIDATION_SCENARIOS.length && runs.every((item) => item.response.controlsClear && !item.response.blockers.inputFailure);
  const objectivesCertified = runs.length === VALIDATION_SCENARIOS.length && runs.every((item) => item.response.objectivesClear && item.response.failureReasonUnderstood);
  const ammunitionCertified = runs.length === VALIDATION_SCENARIOS.length && runs.every((item) => item.response.ammunitionSufficient);
  const recoveriesCertified = runs.length === VALIDATION_SCENARIOS.length && runs.every((item) => item.response.recoveryAchievable && !item.response.blockers.impossibleRecovery);
  const scenarioRequirementsCertified = runs.length === VALIDATION_SCENARIOS.length && runs.every((item) => {
    const scenario = VALIDATION_SCENARIOS.find((candidate) => candidate.id === item.scenarioId);
    return scenario ? scenarioRequirementMet(scenario, item) : false;
  });
  const victoryCount = runs.filter((item) => item.run.result === 'VICTORY').length;
  const scenarioFor = (item: PlaytestEvidenceV1) => VALIDATION_SCENARIOS.find((candidate) => candidate.id === item.scenarioId);
  const coveredMissionIds = [...new Set(runs.flatMap((item) => scenarioFor(item)?.missionId ? [scenarioFor(item)!.missionId] : []))];
  const coveredDifficulties = [...new Set(runs.flatMap((item) => scenarioFor(item)?.difficulty ? [scenarioFor(item)!.difficulty] : []))];
  const coveredDeviceClasses = [...new Set(runs.flatMap((item) => scenarioFor(item)?.deviceClass ? [scenarioFor(item)!.deviceClass] : []))];
  return {
    buildId,
    currentBuildEvidenceCount: currentBuildEvidence.length,
    historicalEvidenceCount: evidence.length - currentBuildEvidence.length,
    totalScenarios: VALIDATION_SCENARIOS.length,
    completedScenarioIds,
    victoryCount,
    coveredMissionIds,
    coveredDifficulties,
    coveredDeviceClasses,
    warningExposedRuns,
    warningAcknowledgedRuns,
    warningAcknowledgementTarget,
    guidedMissionCompletedWithoutHelp,
    controlsCertified,
    objectivesCertified,
    ammunitionCertified,
    recoveriesCertified,
    scenarioRequirementsCertified,
    blockerCount,
    repeatedIssues,
    signOffReady: completedScenarioIds.length === VALIDATION_SCENARIOS.length && victoryCount === VALIDATION_SCENARIOS.length && coveredMissionIds.length === 6 && coveredDifficulties.length === 3 && coveredDeviceClasses.length === 3 && warningAcknowledgedRuns >= warningAcknowledgementTarget && guidedMissionCompletedWithoutHelp && controlsCertified && objectivesCertified && ammunitionCertified && recoveriesCertified && scenarioRequirementsCertified && blockerCount === 0 && repeatedIssues.length === 0,
  };
}

export function scenarioRequirementMet(scenario: ValidationScenario, evidence: PlaytestEvidenceV1): boolean {
  const expectedDevice = scenario.deviceClass === 'DESKTOP_GAMEPAD' ? 'GAMEPAD' : scenario.deviceClass === 'MOBILE_TOUCH' ? 'TOUCH' : 'KEYBOARD';
  if (evidence.run.observedInputDevice !== expectedDevice) return false;
  if (!evidence.response.physicalInputConfirmed || evidence.response.hardwareDescription.trim().length < 3) return false;
  if (scenario.requiresCombatDamage && !Object.values(evidence.run.damageReceived).some((amount) => amount > 0)) return false;
  return true;
}

export function aggregatePriorityInputValidation(evidence: PlaytestEvidenceV1[], buildId = VALIDATION_BUILD_ID): PriorityInputValidationSummary {
  const latest = latestEvidenceByScenario(evidence.filter((item) => item.buildId === buildId && PRIORITY_INPUT_SCENARIO_IDS.includes(item.scenarioId as typeof PRIORITY_INPUT_SCENARIO_IDS[number])));
  const completedScenarioIds = PRIORITY_INPUT_SCENARIOS.filter((scenario) => latest.has(scenario.id)).map((scenario) => scenario.id);
  const passedScenarioIds: string[] = [];
  const issues: string[] = [];
  for (const scenario of PRIORITY_INPUT_SCENARIOS) {
    const item = latest.get(scenario.id);
    if (!item) continue;
    const blockers = Object.values(item.response.blockers).some(Boolean);
    const guidedPass = !scenario.guidedTraining || (!item.run.tutorialSkipped && !item.response.externalHelpUsed && item.run.tutorialStepsCompleted >= 9);
    const judgementPass = item.response.controlsClear && item.response.targetsReadable && item.response.recoveryAchievable && item.response.openingAttackFair && item.response.aircraftMovementNatural;
    if (item.run.result === 'VICTORY' && item.run.landingGrade !== null && scenarioRequirementMet(scenario, item) && guidedPass && judgementPass && !blockers) {
      passedScenarioIds.push(scenario.id);
    } else {
      issues.push(`${scenario.id} has current-build evidence but has not passed its physical-input, victory, recovery or usability requirements.`);
    }
  }
  const missingScenarioIds = PRIORITY_INPUT_SCENARIOS.filter((scenario) => !latest.has(scenario.id)).map((scenario) => scenario.id);
  if (missingScenarioIds.length) issues.push(`Pending physical runs: ${missingScenarioIds.join(', ')}.`);
  return { buildId, completedScenarioIds, passedScenarioIds, missingScenarioIds, issues, readyForFullMatrix: passedScenarioIds.length === PRIORITY_INPUT_SCENARIOS.length };
}

export function verifyPriorityInputEvidenceExport(value: unknown, expectedBuildId = VALIDATION_BUILD_ID): { passed: boolean; summary: PriorityInputValidationSummary; issues: string[] } {
  const source = value && typeof value === 'object' ? value as { version?: unknown; buildId?: unknown; evidence?: unknown; attemptHistory?: unknown } : {};
  const issues: string[] = [];
  if (source.version !== 1) issues.push('Evidence export version must be 1.');
  if (source.buildId !== expectedBuildId) issues.push(`Evidence build ${String(source.buildId || 'missing')} does not match ${expectedBuildId}.`);
  const raw = [...(Array.isArray(source.evidence) ? source.evidence : []), ...(Array.isArray(source.attemptHistory) ? source.attemptHistory : [])];
  if (!Array.isArray(source.evidence)) issues.push('Evidence export does not contain an evidence array.');
  const evidence = raw.map(sanitisePlaytestEvidence).filter((item): item is PlaytestEvidenceV1 => item !== null);
  const summary = aggregatePriorityInputValidation(evidence, expectedBuildId);
  issues.push(...summary.issues);
  return { passed: issues.length === 0 && summary.readyForFullMatrix, summary, issues };
}

export function sanitisePlaytestResponse(value: PlaytestResponse): PlaytestResponse {
  const blockers = value.blockers && typeof value.blockers === 'object' ? value.blockers : EMPTY_PLAYTEST_RESPONSE.blockers;
  return {
    warningNoticed: Boolean(value.warningNoticed), controlsClear: Boolean(value.controlsClear),
    objectivesClear: value.objectivesClear === undefined ? true : Boolean(value.objectivesClear),
    failureReasonUnderstood: Boolean(value.failureReasonUnderstood), targetsReadable: Boolean(value.targetsReadable),
    ammunitionSufficient: value.ammunitionSufficient === undefined ? true : Boolean(value.ammunitionSufficient),
    recoveryAchievable: Boolean(value.recoveryAchievable), openingAttackFair: Boolean(value.openingAttackFair),
    aircraftMovementNatural: Boolean(value.aircraftMovementNatural), externalHelpUsed: Boolean(value.externalHelpUsed),
    physicalInputConfirmed: Boolean(value.physicalInputConfirmed),
    hardwareDescription: typeof value.hardwareDescription === 'string' ? value.hardwareDescription.trim().slice(0, 120) : '',
    observations: typeof value.observations === 'string' ? value.observations.slice(0, 1200) : '',
    blockers: {
      unavoidableAttack: Boolean(blockers.unavoidableAttack), objectiveBlocker: Boolean(blockers.objectiveBlocker),
      impossibleRecovery: Boolean(blockers.impossibleRecovery), terrainPenetration: Boolean(blockers.terrainPenetration),
      inputFailure: Boolean(blockers.inputFailure),
    },
  };
}

export function sanitisePlaytestRunResult(value: unknown): PlaytestEvidenceV1['run'] | null {
  if (!value || typeof value !== 'object') return null;
  const run = value as Partial<PlaytestEvidenceV1['run']>;
  const result = run.result;
  if (result !== 'VICTORY' && result !== 'FAILURE' && result !== 'ABORTED') return null;
  const weaponsUsed = sanitiseWeaponRecord(run.weaponsUsed, true);
  const weaponHits = sanitiseWeaponRecord(run.weaponHits, false);
  const damage = run.damageReceived && typeof run.damageReceived === 'object'
    ? run.damageReceived as Partial<Record<keyof PlaytestEvidenceV1['run']['damageReceived'], number>>
    : {};
  const ammunition = run.ammunitionRemaining && typeof run.ammunitionRemaining === 'object' ? run.ammunitionRemaining : undefined;
  return {
    result,
    simulationTicks: positiveInteger(run.simulationTicks),
    completedObjectiveIds: Array.isArray(run.completedObjectiveIds) ? run.completedObjectiveIds.filter((id): id is string => typeof id === 'string').slice(0, 30) : [],
    retries: positiveInteger(run.retries),
    observedInputDevice: run.observedInputDevice === 'GAMEPAD' || run.observedInputDevice === 'TOUCH' ? run.observedInputDevice : 'KEYBOARD',
    fighterWarnings: positiveInteger(run.fighterWarnings),
    missileWarnings: positiveInteger(run.missileWarnings),
    damageReceived: {
      AIRCRAFT_GUN: positiveNumber(damage.AIRCRAFT_GUN), SAM_MISSILE: positiveNumber(damage.SAM_MISSILE),
      FLAK: positiveNumber(damage.FLAK), GROUND_FIRE: positiveNumber(damage.GROUND_FIRE), IMPACT: positiveNumber(damage.IMPACT),
    },
    weaponsUsed,
    weaponHits: { CANNON: weaponHits.CANNON, MISSILE: weaponHits.MISSILE, BOMB: weaponHits.BOMB, ROCKET: weaponHits.ROCKET },
    ammunitionRemaining: ammunition ? {
      missiles: positiveInteger(ammunition.missiles), bombs: positiveInteger(ammunition.bombs),
      rockets: positiveInteger(ammunition.rockets), flares: positiveInteger(ammunition.flares),
    } : undefined,
    landingGrade: run.landingGrade === 'PERFECT' || run.landingGrade === 'SAFE' || run.landingGrade === 'HARD' || run.landingGrade === 'FAILED' ? run.landingGrade : null,
    tutorialStepsCompleted: Math.min(9, positiveInteger(run.tutorialStepsCompleted)),
    tutorialSkipped: Boolean(run.tutorialSkipped),
    aircraftLossPhase: run.aircraftLossPhase === 'EJECTION' || run.aircraftLossPhase === 'LOW_ALTITUDE_IMPACT' ? run.aircraftLossPhase : 'NONE',
  };
}

function latestEvidenceByScenario(evidence: PlaytestEvidenceV1[]): Map<string, PlaytestEvidenceV1> {
  const latest = new Map<string, PlaytestEvidenceV1>();
  for (const item of evidence) latest.set(item.scenarioId, item);
  return latest;
}

function sanitiseWeaponRecord(value: unknown, includeFlare: boolean): Record<WeaponType, number> {
  const source = value && typeof value === 'object' ? value as Partial<Record<WeaponType, number>> : {};
  return { CANNON: positiveInteger(source.CANNON), MISSILE: positiveInteger(source.MISSILE), BOMB: positiveInteger(source.BOMB), ROCKET: positiveInteger(source.ROCKET), FLARE: includeFlare ? positiveInteger(source.FLARE) : 0 };
}
function positiveInteger(value: unknown): number { return Math.max(0, Math.round(Number(value) || 0)); }
function positiveNumber(value: unknown): number { return Math.max(0, Number(value) || 0); }
function increment(values: Map<string, number>, key: string): void { values.set(key, (values.get(key) || 0) + 1); }

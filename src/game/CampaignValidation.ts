import {
  AccessibilitySettings,
  PlaytestEvidenceV1,
  PlaytestResponse,
  ValidationScenario,
} from '../types/game';
import { CAMPAIGN_MISSIONS } from './Missions';
import { getPlatformStorage } from './PlatformRuntime';
import { RELEASE_INFO } from './Release';
import { getOfferedLoadouts } from './ServiceSystem';
import { sanitisePlaytestResponse, sanitisePlaytestRunResult } from './Validation';

export const CAMPAIGN_VALIDATION_STORAGE_KEY = 'IRON_KESTREL_CAMPAIGN_VALIDATION_V1';
export const CAMPAIGN_VALIDATION_BUILD_ID = RELEASE_INFO.buildId;
export const MAX_CAMPAIGN_VALIDATION_EVIDENCE = 250;

export interface CampaignValidationEvidenceV1 extends Omit<PlaytestEvidenceV1, 'scenarioId'> {
  scenarioId: string;
}

export interface CampaignValidationSummaryV1 {
  buildId: string;
  currentBuildEvidenceCount: number;
  historicalEvidenceCount: number;
  totalScenarios: number;
  completedScenarioIds: string[];
  victories: number;
  pilotMissionsCovered: number;
  arcadeStressCovered: number;
  veteranStressCovered: number;
  warningExposedRuns: number;
  warningAcknowledgedRuns: number;
  blockers: number;
  repeatedIssues: string[];
  averageDurationSeconds: number;
  totalDeaths: number;
  signOffReady: boolean;
}

const STANDARD_ACCESSIBILITY: AccessibilitySettings = Object.freeze({
  radioCaptions: true,
  highContrastHud: false,
  hudContrast: 'STANDARD',
  textContrast: 'STANDARD',
  reducedEffects: false,
  screenShake: 1,
  hudScale: 'AUTO',
});

const PREFERRED_LOADOUTS = Object.freeze([
  'FLEET_CAP', 'STRIKE', 'CLOSE_SUPPORT', 'CLOSE_SUPPORT', 'CLOSE_SUPPORT', 'FLEET_CAP', 'CLOSE_SUPPORT', 'STRIKE',
  'FLEET_CAP', 'STRIKE', 'FLEET_CAP', 'STRIKE', 'CLOSE_SUPPORT', 'CLOSE_SUPPORT', 'CLOSE_SUPPORT', 'STRIKE',
] as const);

const pilotScenarios: ValidationScenario[] = CAMPAIGN_MISSIONS.map((mission, index) => ({
  id: `CV-P${String(index + 1).padStart(2, '0')}`,
  order: index + 1,
  title: `Pilot Campaign ${index + 1}: ${mission.title}`,
  missionId: mission.id,
  difficulty: 'PILOT',
  deviceClass: 'DESKTOP_KEYBOARD',
  inputProfile: 'DEFAULT',
  guidedTraining: false,
  loadout: certifiedLoadout(index),
  accessibility: STANDARD_ACCESSIBILITY,
  instruction: `Complete Mission ${index + 1} on Pilot from a fully serviceable clean snapshot. Record fairness, ammunition margin and recovery quality.`,
  requiresCombatDamage: false,
}));

const STRESS_MISSION_INDICES = Object.freeze([0, 5, 9, 13, 15]);
const arcadeDevices = Object.freeze(['MOBILE_TOUCH', 'DESKTOP_GAMEPAD', 'DESKTOP_KEYBOARD', 'MOBILE_TOUCH', 'DESKTOP_KEYBOARD'] as const);
const veteranDevices = Object.freeze(['DESKTOP_GAMEPAD', 'DESKTOP_KEYBOARD', 'DESKTOP_GAMEPAD', 'DESKTOP_KEYBOARD', 'DESKTOP_GAMEPAD'] as const);

const arcadeScenarios: ValidationScenario[] = STRESS_MISSION_INDICES.map((missionIndex, index) => makeStressScenario('ARCADE', missionIndex, index, arcadeDevices[index], 16 + index + 1));
const veteranScenarios: ValidationScenario[] = STRESS_MISSION_INDICES.map((missionIndex, index) => makeStressScenario('VETERAN', missionIndex, index, veteranDevices[index], 21 + index + 1));

export const CAMPAIGN_VALIDATION_SCENARIOS: readonly ValidationScenario[] = Object.freeze([
  ...pilotScenarios,
  ...arcadeScenarios,
  ...veteranScenarios,
]);

function certifiedLoadout(index: number): ValidationScenario['loadout'] {
  const mission = CAMPAIGN_MISSIONS[index];
  const offered = getOfferedLoadouts(mission);
  const preferred = PREFERRED_LOADOUTS[index] ?? offered[0];
  return offered.includes(preferred) ? preferred : offered[0];
}

function makeStressScenario(
  difficulty: 'ARCADE' | 'VETERAN',
  missionIndex: number,
  stressIndex: number,
  deviceClass: ValidationScenario['deviceClass'],
  order: number,
): ValidationScenario {
  const mission = CAMPAIGN_MISSIONS[missionIndex];
  return {
    id: `CV-${difficulty === 'ARCADE' ? 'A' : 'V'}${String(stressIndex + 1).padStart(2, '0')}`,
    order,
    title: `${difficulty === 'ARCADE' ? 'Arcade' : 'Veteran'} Stress: ${mission.title}`,
    missionId: mission.id,
    difficulty,
    deviceClass,
    inputProfile: 'DEFAULT',
    guidedTraining: difficulty === 'ARCADE' && missionIndex === 0,
    loadout: certifiedLoadout(missionIndex),
    accessibility: STANDARD_ACCESSIBILITY,
    instruction: `Complete Mission ${missionIndex + 1} on ${difficulty === 'ARCADE' ? 'Arcade' : 'Veteran'} using ${formatDevice(deviceClass)}. Judge opening fairness, warning time and recovery tolerance.`,
    requiresCombatDamage: false,
  };
}

export function sanitiseCampaignValidationEvidence(value: unknown): CampaignValidationEvidenceV1 | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<CampaignValidationEvidenceV1>;
  const scenario = CAMPAIGN_VALIDATION_SCENARIOS.find((candidate) => candidate.id === item.scenarioId);
  if (item.version !== 1 || !scenario || typeof item.buildId !== 'string' || typeof item.completedAt !== 'string' || !item.run || !item.response) return null;
  const run = sanitisePlaytestRunResult(item.run);
  if (!run) return null;
  return {
    version: 1,
    buildId: item.buildId.slice(0, 80),
    completedAt: item.completedAt,
    scenarioId: scenario.id,
    run,
    response: sanitisePlaytestResponse(item.response as PlaytestResponse),
  };
}

export function loadCampaignValidationEvidence(storage: Pick<Storage, 'getItem'> = getPlatformStorage()): CampaignValidationEvidenceV1[] {
  try {
    const parsed = JSON.parse(storage.getItem(CAMPAIGN_VALIDATION_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitiseCampaignValidationEvidence).filter((item): item is CampaignValidationEvidenceV1 => item !== null).slice(-MAX_CAMPAIGN_VALIDATION_EVIDENCE);
  } catch {
    return [];
  }
}

export function appendCampaignValidationEvidence(
  evidence: CampaignValidationEvidenceV1,
  storage: Pick<Storage, 'getItem' | 'setItem'> = getPlatformStorage(),
): CampaignValidationEvidenceV1[] {
  const normalised = sanitiseCampaignValidationEvidence(evidence);
  const current = loadCampaignValidationEvidence(storage as Storage);
  const next = normalised ? [...current, normalised].slice(-MAX_CAMPAIGN_VALIDATION_EVIDENCE) : current;
  try { storage.setItem(CAMPAIGN_VALIDATION_STORAGE_KEY, JSON.stringify(next)); } catch { /* Validation must never interrupt play. */ }
  return next;
}

export function clearCampaignValidationEvidence(storage: Pick<Storage, 'removeItem'> = getPlatformStorage()): void {
  try { storage.removeItem(CAMPAIGN_VALIDATION_STORAGE_KEY); } catch { /* Ignore restricted storage. */ }
}

export function aggregateCampaignValidationEvidence(
  evidence: CampaignValidationEvidenceV1[],
  buildId = CAMPAIGN_VALIDATION_BUILD_ID,
): CampaignValidationSummaryV1 {
  const current = evidence.filter((item) => item.buildId === buildId);
  const latest = new Map<string, CampaignValidationEvidenceV1>();
  for (const item of current) latest.set(item.scenarioId, item);
  const completedScenarioIds = CAMPAIGN_VALIDATION_SCENARIOS.filter((scenario) => latest.has(scenario.id)).map((scenario) => scenario.id);
  const runs = [...latest.values()];
  const issueCounts = new Map<string, number>();
  for (const item of runs) {
    const response = item.response;
    if (!response.controlsClear) increment(issueCounts, 'Controls unclear');
    if (!response.objectivesClear) increment(issueCounts, 'Objectives unclear');
    if (!response.failureReasonUnderstood) increment(issueCounts, 'Failure unexplained');
    if (!response.targetsReadable) increment(issueCounts, 'Targets unreadable');
    if (!response.ammunitionSufficient) increment(issueCounts, 'Ammunition insufficient');
    if (!response.recoveryAchievable) increment(issueCounts, 'Recovery impossible');
    if (!response.openingAttackFair) increment(issueCounts, 'Opening attack unfair');
  }
  const repeatedIssues = [...issueCounts].filter(([, count]) => count >= 2).map(([issue]) => issue);
  const blockers = runs.reduce((sum, item) => sum + Object.values(item.response.blockers).filter(Boolean).length, 0);
  const warningExposedRuns = runs.filter((item) => item.run.fighterWarnings + item.run.missileWarnings > 0).length;
  const warningAcknowledgedRuns = runs.filter((item) => item.run.fighterWarnings + item.run.missileWarnings > 0 && item.response.warningNoticed).length;
  const victories = runs.filter((item) => item.run.result === 'VICTORY').length;
  const scenarioFor = (id: string) => CAMPAIGN_VALIDATION_SCENARIOS.find((scenario) => scenario.id === id);
  const pilotMissionsCovered = new Set(runs.filter((item) => scenarioFor(item.scenarioId)?.difficulty === 'PILOT').map((item) => scenarioFor(item.scenarioId)?.missionId)).size;
  const arcadeStressCovered = runs.filter((item) => scenarioFor(item.scenarioId)?.difficulty === 'ARCADE').length;
  const veteranStressCovered = runs.filter((item) => scenarioFor(item.scenarioId)?.difficulty === 'VETERAN').length;
  const judgementsPass = runs.length === CAMPAIGN_VALIDATION_SCENARIOS.length && runs.every((item) => {
    const response = item.response;
    return response.controlsClear && response.objectivesClear && response.failureReasonUnderstood && response.targetsReadable
      && response.ammunitionSufficient && response.recoveryAchievable && response.openingAttackFair
      && !Object.values(response.blockers).some(Boolean);
  });
  const warningTarget = Math.ceil(warningExposedRuns * 0.75);
  const averageDurationSeconds = runs.length ? runs.reduce((sum, item) => sum + item.run.simulationTicks / 60, 0) / runs.length : 0;
  const totalDeaths = runs.filter((item) => item.run.result !== 'VICTORY' || item.run.aircraftLossPhase !== 'NONE').length;
  return {
    buildId,
    currentBuildEvidenceCount: current.length,
    historicalEvidenceCount: evidence.length - current.length,
    totalScenarios: CAMPAIGN_VALIDATION_SCENARIOS.length,
    completedScenarioIds,
    victories,
    pilotMissionsCovered,
    arcadeStressCovered,
    veteranStressCovered,
    warningExposedRuns,
    warningAcknowledgedRuns,
    blockers,
    repeatedIssues,
    averageDurationSeconds,
    totalDeaths,
    signOffReady: completedScenarioIds.length === CAMPAIGN_VALIDATION_SCENARIOS.length
      && victories === CAMPAIGN_VALIDATION_SCENARIOS.length
      && pilotMissionsCovered === CAMPAIGN_MISSIONS.length
      && arcadeStressCovered === STRESS_MISSION_INDICES.length
      && veteranStressCovered === STRESS_MISSION_INDICES.length
      && warningAcknowledgedRuns >= warningTarget
      && blockers === 0
      && repeatedIssues.length === 0
      && judgementsPass,
  };
}

export function exportCampaignValidationJson(evidence: CampaignValidationEvidenceV1[]): string {
  const sanitised = evidence.map(sanitiseCampaignValidationEvidence).filter((item): item is CampaignValidationEvidenceV1 => item !== null);
  const current = sanitised.filter((item) => item.buildId === CAMPAIGN_VALIDATION_BUILD_ID);
  const latest = new Map<string, CampaignValidationEvidenceV1>();
  for (const item of current) latest.set(item.scenarioId, item);
  const signOffEvidence = [...latest.values()];
  const latestKeys = new Set(signOffEvidence.map((item) => `${item.scenarioId}:${item.completedAt}`));
  return JSON.stringify({
    version: 1,
    programme: 'INTERNAL_CAMPAIGN_BALANCE',
    buildId: CAMPAIGN_VALIDATION_BUILD_ID,
    generatedAt: new Date().toISOString(),
    summary: aggregateCampaignValidationEvidence(sanitised),
    evidence: signOffEvidence,
    attemptHistory: sanitised.filter((item) => !latestKeys.has(`${item.scenarioId}:${item.completedAt}`)),
  }, null, 2);
}

export function verifyCampaignValidationExport(value: unknown, expectedBuildId = CAMPAIGN_VALIDATION_BUILD_ID): { passed: boolean; issues: string[] } {
  const source = value && typeof value === 'object' ? value as { version?: unknown; buildId?: unknown; evidence?: unknown } : {};
  const issues: string[] = [];
  if (source.version !== 1) issues.push('Campaign validation export version must be 1.');
  if (source.buildId !== expectedBuildId) issues.push(`Evidence build ${String(source.buildId || 'missing')} does not match ${expectedBuildId}.`);
  const raw = Array.isArray(source.evidence) ? source.evidence : [];
  if (!Array.isArray(source.evidence)) issues.push('Campaign validation export does not contain an evidence array.');
  const evidence = raw.map(sanitiseCampaignValidationEvidence).filter((item): item is CampaignValidationEvidenceV1 => item !== null);
  if (evidence.length !== raw.length) issues.push('Campaign validation export contains invalid records.');
  const duplicateIds = evidence.map((item) => item.scenarioId).filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateIds.length) issues.push(`Duplicate scenario coverage: ${[...new Set(duplicateIds)].join(', ')}.`);
  if (evidence.some((item) => item.buildId !== expectedBuildId)) issues.push('Evidence contains records from another build.');
  const summary = aggregateCampaignValidationEvidence(evidence, expectedBuildId);
  const missing = CAMPAIGN_VALIDATION_SCENARIOS.filter((scenario) => !summary.completedScenarioIds.includes(scenario.id));
  if (missing.length) issues.push(`Missing scenario coverage: ${missing.map((scenario) => scenario.id).join(', ')}.`);
  if (!summary.signOffReady) issues.push('Campaign balance sign-off requirements are not satisfied.');
  return { passed: issues.length === 0 && summary.signOffReady, issues };
}

function formatDevice(device: ValidationScenario['deviceClass']): string {
  if (device === 'MOBILE_TOUCH') return 'mobile touch';
  if (device === 'DESKTOP_GAMEPAD') return 'an Xbox-compatible gamepad';
  return 'keyboard controls';
}

function increment(values: Map<string, number>, key: string): void {
  values.set(key, (values.get(key) || 0) + 1);
}

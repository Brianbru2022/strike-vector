import { CombatFeedbackState, CombatFlowState, PlayerStats, RecoveryGuidance, TrainingRuntimeState } from '../types/game';

export type HudInformationTier = 'ALWAYS_REQUIRED' | 'CONTEXT_REQUIRED' | 'WARNING_ONLY' | 'OPTIONAL_EXPANDED';

export const HUD_INFORMATION_MODEL = Object.freeze({
  aircraftCondition: 'ALWAYS_REQUIRED',
  currentObjective: 'ALWAYS_REQUIRED',
  activeWeapon: 'ALWAYS_REQUIRED',
  detailedFlightData: 'CONTEXT_REQUIRED',
  weaponInventory: 'CONTEXT_REQUIRED',
  recoveryGuidance: 'CONTEXT_REQUIRED',
  subsystemDamage: 'WARNING_ONLY',
  missileThreat: 'WARNING_ONLY',
  dangerousFuel: 'WARNING_ONLY',
  mapProgress: 'OPTIONAL_EXPANDED',
  scoreBreakdown: 'OPTIONAL_EXPANDED',
  controlReference: 'OPTIONAL_EXPANDED',
} satisfies Record<string, HudInformationTier>);

export interface HudContextInput {
  player: PlayerStats;
  flow: CombatFlowState;
  feedback?: CombatFeedbackState;
  recoveryGuidance?: RecoveryGuidance | null;
  training?: TrainingRuntimeState;
  expanded: boolean;
  controlsRecalled: boolean;
  tutorialUnderstood: boolean;
}

export interface HudVisibility {
  detailedFlight: boolean;
  weaponDetail: boolean;
  subsystemDetail: boolean;
  dangerousFuel: boolean;
  scoreDetail: boolean;
  mapProgress: boolean;
  controlReference: boolean;
  mode: 'ESSENTIAL' | 'CONTEXTUAL' | 'EXPANDED';
}

export function deriveHudVisibility(input: HudContextInput): HudVisibility {
  const { player, feedback, recoveryGuidance, flow, training, expanded } = input;
  const damagedSubsystem = Object.values(player.subsystems).some((condition) => condition < 0.85);
  const combatContext = Boolean(
    player.targetLockedId
    || player.lockProgress > 0
    || player.cannonHeat > 0
    || player.cannonOverheated
    || feedback?.incomingMissileDirection
    || feedback?.airThreatState,
  );
  const flightContext = Boolean(
    recoveryGuidance
    || player.isLanding
    || player.gearDown
    || player.vtolMode
    || player.vtolTransition > 0.1
    || player.altitudeBand === 'LOW',
  );
  const warningContext = damagedSubsystem || player.health < 60 || player.fuel <= 25;
  const contextual = flightContext || combatContext || warningContext;

  return {
    detailedFlight: expanded || flightContext,
    weaponDetail: expanded || combatContext,
    subsystemDetail: expanded || damagedSubsystem || player.health < 60,
    dangerousFuel: player.fuel <= 25,
    scoreDetail: expanded || flow.multiplier > 1 || flow.lastActionTimer > 0,
    mapProgress: expanded,
    controlReference: !input.tutorialUnderstood || Boolean(training?.enabled) || input.controlsRecalled,
    mode: expanded ? 'EXPANDED' : contextual ? 'CONTEXTUAL' : 'ESSENTIAL',
  };
}

export function activeWeaponLabel(player: PlayerStats): string {
  if (player.selectedWeapon === 'MISSILE') return `AIM-9L ×${player.missiles}`;
  if (player.selectedWeapon === 'BOMB') return `1000 LB ×${player.bombs}`;
  if (player.selectedWeapon === 'ROCKET') return `ROCKET ×${player.rockets}`;
  return player.selectedWeapon;
}

import {
  AirCombatRuntimeState,
  AirCombatSnapshot,
  AirCombatState,
  AircraftVariant,
  CombatDifficultyProfile,
  EnemyAircraftProfile,
  EnemyUnit,
  FormationRole,
  PlayerStats,
} from '../types/game';
import { ENCOUNTER_PACING_PROFILE } from './PlayabilityProfiles';

export type AirCombatCue = 'DETECTED' | 'TRACKING' | 'FIRING';

export interface AirCombatUpdateResult {
  cue: AirCombatCue | null;
  firedGun: boolean;
  hitDefendedAsset: boolean;
}

export const AIRCRAFT_PROFILES: Readonly<Record<AircraftVariant, Readonly<EnemyAircraftProfile>>> = Object.freeze({
  MIG_21BIS: Object.freeze({ doctrine: 'BOOM_AND_ZOOM', cruiseSpeed: 7.3, attackSpeed: 8.2, detectionRange: 760, attackRange: 420, minimumAttackRange: 135, acceleration: 0.13, maximumTurnRate: 0.034, terrainClearance: 82, disengageTicks: 105, decisionDelayTicks: 42 }),
  MIG_23ML: Object.freeze({ doctrine: 'STANDOFF_INTERCEPT', cruiseSpeed: 6.6, attackSpeed: 7.4, detectionRange: 900, attackRange: 500, minimumAttackRange: 165, acceleration: 0.11, maximumTurnRate: 0.03, terrainClearance: 92, disengageTicks: 125, decisionDelayTicks: 50 }),
  MIG_29A: Object.freeze({ doctrine: 'COORDINATED_FIGHTER', cruiseSpeed: 7.8, attackSpeed: 8.5, detectionRange: 820, attackRange: 455, minimumAttackRange: 120, acceleration: 0.15, maximumTurnRate: 0.039, terrainClearance: 86, disengageTicks: 78, decisionDelayTicks: 34 }),
  MI_24D: Object.freeze({ doctrine: 'TERRAIN_GUNSHIP', cruiseSpeed: 3.1, attackSpeed: 3.8, detectionRange: 620, attackRange: 390, minimumAttackRange: 105, acceleration: 0.08, maximumTurnRate: 0.027, terrainClearance: 54, disengageTicks: 115, decisionDelayTicks: 52 }),
  TU_16K: Object.freeze({ doctrine: 'STANDOFF_INTERCEPT', cruiseSpeed: 5.1, attackSpeed: 5.7, detectionRange: 980, attackRange: 620, minimumAttackRange: 240, acceleration: 0.065, maximumTurnRate: 0.016, terrainClearance: 130, disengageTicks: 160, decisionDelayTicks: 62 }),
  SU_24M: Object.freeze({ doctrine: 'BOOM_AND_ZOOM', cruiseSpeed: 6.8, attackSpeed: 7.7, detectionRange: 780, attackRange: 440, minimumAttackRange: 150, acceleration: 0.12, maximumTurnRate: 0.028, terrainClearance: 88, disengageTicks: 112, decisionDelayTicks: 46 }),
});

const MAX_DISPLAY_PITCH = 24 * Math.PI / 180;
const FORMATION_OFFSETS: Record<FormationRole, { x: number; y: number }> = {
  LEAD: { x: 0, y: 0 }, ELEMENT: { x: 145, y: 42 }, TRAIL: { x: 285, y: -34 }, SOLO: { x: 0, y: 0 },
};

export function initialiseAirCombat(enemy: EnemyUnit, index: number, formationCounts: Map<string, number>): AirCombatRuntimeState {
  const variant = enemy.aircraftVariant ?? (enemy.type === 'ATTACK_HELI' ? 'MI_24D' : 'MIG_23ML');
  const profile = AIRCRAFT_PROFILES[variant];
  const formationId = inferFormationId(enemy.id);
  const slotIndex = formationCounts.get(formationId) ?? 0;
  formationCounts.set(formationId, slotIndex + 1);
  const formationRole: FormationRole = slotIndex === 0 ? 'LEAD' : slotIndex === 1 ? 'ELEMENT' : slotIndex === 2 ? 'TRAIL' : 'SOLO';
  const initialState = normaliseState(enemy.state);
  return {
    state: initialState,
    doctrine: profile.doctrine,
    formationRole,
    formationId,
    slotIndex: slotIndex || index,
    decisionTick: 0,
    stateEnteredTick: 0,
    desiredHeading: Math.atan2(enemy.vy, enemy.vx || -1),
    displayedPitch: 0,
    firedThisPass: false,
    warningIssued: false,
  };
}

export function updateAirCombat(
  enemy: EnemyUnit,
  player: PlayerStats,
  tick: number,
  difficulty: Readonly<CombatDifficultyProfile>,
  groundYAt?: (worldX: number) => number,
  strategicTarget?: { x: number; y: number },
): AirCombatUpdateResult {
  const runtime = enemy.airCombat ?? initialiseAirCombat(enemy, 0, new Map());
  enemy.airCombat = runtime;
  const variant = enemy.aircraftVariant ?? (enemy.type === 'ATTACK_HELI' ? 'MI_24D' : 'MIG_23ML');
  const profile = AIRCRAFT_PROFILES[variant];
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  const facingPlayer = Math.sign(dx || enemy.vx || 1) === Math.sign(enemy.vx || 1);
  const decisionDelay = Math.max(ENCOUNTER_PACING_PROFILE.minimumDecisionDelayTicks, Math.round(profile.decisionDelayTicks * difficulty.decisionDelay));
  let cue: AirCombatCue | null = null;
  let firedGun = false;
  let hitDefendedAsset = false;

  if (tick >= runtime.decisionTick) {
    runtime.decisionTick = tick + decisionDelay;
    if (runtime.state === 'FORMATION_INGRESS' && runtime.stateEnteredTick + decisionDelay <= tick) transition(runtime, 'PATROL', tick);
    if ((runtime.state === 'PATROL' || runtime.state === 'REJOIN') && distance < profile.detectionRange * difficulty.detection && !player.isOnCarrier) {
      transition(runtime, 'DETECTION', tick);
      cue = 'DETECTED';
    } else if (runtime.state === 'DETECTION') {
      transition(runtime, 'PURSUIT', tick);
      cue = 'TRACKING';
    } else if (runtime.state === 'PURSUIT' && distance <= profile.attackRange && facingPlayer) {
      transition(runtime, 'ATTACK_PASS', tick);
      runtime.firedThisPass = false;
      cue = 'TRACKING';
    } else if (runtime.state === 'REJOIN' && distance < profile.detectionRange * ENCOUNTER_PACING_PROFILE.reengageRangeFactor) {
      transition(runtime, 'PURSUIT', tick);
    }
  }

  let targetX = player.x;
  let targetY = player.y;
  let targetSpeed = profile.attackSpeed;
  const slot = FORMATION_OFFSETS[runtime.formationRole];

  if (runtime.state === 'BASE_STRIKE' && strategicTarget) {
    targetX = strategicTarget.x;
    targetY = strategicTarget.y;
    targetSpeed = profile.attackSpeed;
    if (Math.abs(enemy.x - strategicTarget.x) < 145 && Math.abs(enemy.y - strategicTarget.y) < 95 && !runtime.firedThisPass) {
      runtime.firedThisPass = true;
      hitDefendedAsset = true;
      transition(runtime, 'STRIKE_EGRESS', tick);
    }
  } else if (runtime.state === 'STRIKE_EGRESS') {
    const direction = enemy.vx < 0 ? -1 : 1;
    targetX = enemy.x + direction * 800;
    targetY = clamp(enemy.y - 130, 75, 360);
    targetSpeed = profile.attackSpeed;
    if (tick - runtime.stateEnteredTick > ENCOUNTER_PACING_PROFILE.baseStrikeEgressTicks) {
      runtime.firedThisPass = false;
      transition(runtime, 'BASE_STRIKE', tick);
    }
  } else if (runtime.state === 'PATROL' || runtime.state === 'FORMATION_INGRESS' || runtime.state === 'REJOIN') {
    const direction = enemy.vx < 0 ? -1 : 1;
    targetX = player.x + direction * (runtime.state === 'REJOIN' ? 520 + slot.x : 720 + slot.x);
    targetY = clamp(player.y + slot.y, 95, 420);
    targetSpeed = profile.cruiseSpeed;
  } else if (runtime.state === 'DISENGAGE' || runtime.state === 'OVERSHOOT') {
    const direction = enemy.vx < 0 ? -1 : 1;
    targetX = enemy.x + direction * 900;
    targetY = clamp(enemy.y - 95 - slot.y * 0.4, 85, 390);
    targetSpeed = profile.attackSpeed;
    if (tick - runtime.stateEnteredTick >= profile.disengageTicks) transition(runtime, 'REJOIN', tick);
  } else if (runtime.state === 'ATTACK_PASS') {
    targetX = player.x + player.vx * 10;
    targetY = player.y + player.vy * 6;
    if (!runtime.firedThisPass && distance >= profile.minimumAttackRange && distance <= profile.attackRange && facingPlayer && hasTerrainLineOfSight(enemy.x, enemy.y, player.x, player.y, groundYAt) && tick - runtime.stateEnteredTick >= Math.round(ENCOUNTER_PACING_PROFILE.attackCommitTicks * difficulty.decisionDelay)) {
      runtime.firedThisPass = true;
      firedGun = true;
      cue = 'FIRING';
    }
    if (distance < profile.minimumAttackRange || tick - runtime.stateEnteredTick > ENCOUNTER_PACING_PROFILE.maximumAttackPassTicks) transition(runtime, 'OVERSHOOT', tick);
  }

  const desiredHeading = Math.atan2(targetY - enemy.y, targetX - enemy.x);
  runtime.desiredHeading = desiredHeading;
  const currentHeading = Math.atan2(enemy.vy, enemy.vx || 0.001);
  const maxTurn = profile.maximumTurnRate * difficulty.aircraftTurnRate;
  const nextHeading = currentHeading + clampAngle(desiredHeading - currentHeading, maxTurn);
  const currentSpeed = Math.max(1.8, Math.hypot(enemy.vx, enemy.vy));
  const nextSpeed = approach(currentSpeed, targetSpeed, profile.acceleration);
  enemy.vx = Math.cos(nextHeading) * nextSpeed;
  enemy.vy = Math.sin(nextHeading) * nextSpeed;

  const terrainY = groundYAt?.(enemy.x + enemy.vx * 10) ?? 500;
  const floorY = terrainY - profile.terrainClearance;
  if (enemy.y + enemy.vy > floorY) {
    enemy.vy = Math.min(enemy.vy, -1.4);
    runtime.desiredHeading = Math.atan2(-1.4, enemy.vx || 1);
  }
  if (enemy.y < 75) enemy.vy = Math.max(enemy.vy, 1.1);

  enemy.x += enemy.vx;
  enemy.y = Math.min(floorY, Math.max(70, enemy.y + enemy.vy));
  const velocityPitch = Math.atan2(enemy.vy, Math.max(1, Math.abs(enemy.vx)));
  const targetPitch = clamp(velocityPitch, -MAX_DISPLAY_PITCH, MAX_DISPLAY_PITCH);
  runtime.displayedPitch = approach(runtime.displayedPitch, targetPitch, 0.035);
  enemy.rotation = runtime.displayedPitch;
  enemy.state = runtime.state;

  return { cue, firedGun, hitDefendedAsset };
}

export function getAirCombatSnapshot(enemy: EnemyUnit): AirCombatSnapshot | null {
  const runtime = enemy.airCombat;
  if (!runtime) return null;
  return {
    enemyId: enemy.id, state: runtime.state, doctrine: runtime.doctrine,
    formationRole: runtime.formationRole, formationId: runtime.formationId,
    decisionTick: runtime.decisionTick, x: enemy.x, y: enemy.y, vx: enemy.vx, vy: enemy.vy,
    displayedPitch: runtime.displayedPitch,
  };
}

export function hasTerrainLineOfSight(fromX: number, fromY: number, toX: number, toY: number, groundYAt?: (worldX: number) => number): boolean {
  if (!groundYAt) return true;
  for (let index = 1; index <= 4; index++) {
    const progress = index / 5;
    const sampleX = fromX + (toX - fromX) * progress;
    const sampleY = fromY + (toY - fromY) * progress;
    if (sampleY >= groundYAt(sampleX) - 12) return false;
  }
  return true;
}

function transition(runtime: AirCombatRuntimeState, state: AirCombatState, tick: number) {
  runtime.state = state;
  runtime.stateEnteredTick = tick;
  runtime.warningIssued = false;
}

function normaliseState(state: string): AirCombatState {
  if (state === 'BASE_STRIKE') return 'BASE_STRIKE';
  if (state === 'STRIKE_EGRESS') return 'STRIKE_EGRESS';
  return 'FORMATION_INGRESS';
}

function inferFormationId(id: string): string {
  return id.replace(/(?:_|-)(?:lead|wing|element|trail|\d+)$/i, '') || id;
}

function approach(value: number, target: number, amount: number): number {
  return value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clampAngle(value: number, maximum: number): number {
  let normalised = value;
  while (normalised > Math.PI) normalised -= Math.PI * 2;
  while (normalised < -Math.PI) normalised += Math.PI * 2;
  return clamp(normalised, -maximum, maximum);
}

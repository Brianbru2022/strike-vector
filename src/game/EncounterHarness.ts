import { DifficultyPreset, EnemyUnit, PlayerStats } from '../types/game';
import { updateAirCombat, initialiseAirCombat, getAirCombatSnapshot } from './AirCombatAI';
import { getCombatDifficultyProfile } from './CombatBalance';
import { FixedStepClock } from './FixedStepClock';
import { PlayerAircraft } from './PlayerAircraft';
import { RELEASE_FEATURES } from './ReleaseFeatures';

export type EncounterScenario = 'FIGHTER' | 'SAM' | 'COMBINED';

export interface EncounterHarnessOptions {
  scenario: EncounterScenario;
  difficulty: DifficultyPreset;
  renderHz?: 30 | 60 | 120;
  durationSeconds?: number;
}

export interface EncounterHarnessResult {
  simulationTicks: number;
  stateSequence: string[];
  firingTicks: number[];
  samLaunchTicks: number[];
  maximumDisplayedPitch: number;
  minimumTerrainClearance: number;
  finalSnapshots: ReturnType<typeof getAirCombatSnapshot>[];
}

export function runEncounterHarness(options: EncounterHarnessOptions): EncounterHarnessResult {
  const renderHz = options.renderHz ?? 60;
  const durationSeconds = options.durationSeconds ?? 12;
  const profile = getCombatDifficultyProfile(options.difficulty);
  const player = new PlayerAircraft().stats;
  Object.assign(player, { x: 1700, y: 270, vx: 7, vy: 0, isOnCarrier: false });
  const enemies = options.scenario === 'SAM' ? [] : createFighterPair();
  const formationCounts = new Map<string, number>();
  enemies.forEach((enemy, index) => { enemy.airCombat = initialiseAirCombat(enemy, index, formationCounts); });
  const clock = new FixedStepClock(1 / 60);
  const stateSequence: string[] = [];
  const firingTicks: number[] = [];
  const samLaunchTicks: number[] = [];
  let tick = 0;
  let maximumDisplayedPitch = 0;
  let minimumTerrainClearance = Number.POSITIVE_INFINITY;
  const samInterval = Math.round(180 * profile.reloadTime);
  const totalFrames = Math.round(durationSeconds * renderHz);

  for (let frame = 0; frame < totalFrames; frame++) {
    clock.advance(1 / renderHz, () => {
      tick++;
      for (const enemy of enemies) {
        const before = enemy.airCombat?.state;
        const result = updateAirCombat(enemy, player as PlayerStats, tick, profile, () => 560);
        if (enemy.airCombat?.state !== before) stateSequence.push(`${enemy.id}:${enemy.airCombat?.state}@${tick}`);
        if (result.firedGun) firingTicks.push(tick);
        maximumDisplayedPitch = Math.max(maximumDisplayedPitch, Math.abs(enemy.airCombat?.displayedPitch ?? 0));
        minimumTerrainClearance = Math.min(minimumTerrainClearance, 560 - enemy.y);
      }
      if (options.scenario !== 'FIGHTER' && tick >= 120 && (tick - 120) % samInterval === 0) samLaunchTicks.push(tick);
    });
  }

  return {
    simulationTicks: tick,
    stateSequence,
    firingTicks,
    samLaunchTicks,
    maximumDisplayedPitch,
    minimumTerrainClearance: Number.isFinite(minimumTerrainClearance) ? minimumTerrainClearance : 0,
    finalSnapshots: enemies.map(getAirCombatSnapshot),
  };
}

export function installDevelopmentEncounterHarness(): void {
  if (!RELEASE_FEATURES.diagnostics || typeof window === 'undefined') return;
  (window as Window & { __STRIKE_VECTOR_BALANCE__?: { run: typeof runEncounterHarness } }).__STRIKE_VECTOR_BALANCE__ = { run: runEncounterHarness };
}

function createFighterPair(): EnemyUnit[] {
  return [0, 1].map((index) => ({
    id: `harness_mig29_${index + 1}`, type: 'INTERCEPTOR', category: 'AIR', name: 'MiG-29A',
    x: 2450 + index * 150, y: 210 + index * 42, vx: -7.8, vy: 0, width: 86, height: 24,
    health: 100, maxHealth: 100, isAlive: true, isTargetable: true, pointsValue: 500, rotation: 0,
    fireCooldown: 0, reloadTime: 120, detectionRange: 820, accuracy: 0.82, stateTimer: 0,
    state: 'FORMATION_INGRESS', aircraftVariant: 'MIG_29A',
  }));
}

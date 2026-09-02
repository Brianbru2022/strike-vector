import { describe, expect, it } from 'vitest';
import { AIRCRAFT_PROFILES, hasTerrainLineOfSight, initialiseAirCombat, updateAirCombat } from './AirCombatAI';
import { getCombatDifficultyProfile } from './CombatBalance';
import { runEncounterHarness } from './EncounterHarness';
import { EnemyUnit, PlayerStats } from '../types/game';
import { PlayerAircraft } from './PlayerAircraft';

const makeEnemy = (variant: EnemyUnit['aircraftVariant'] = 'MIG_21BIS'): EnemyUnit => ({
  id: 'test_flight_1', type: 'PATROL_FIGHTER', category: 'AIR', name: 'Test fighter', x: 900, y: 480,
  vx: 7, vy: 0, width: 82, height: 24, health: 100, maxHealth: 100, isAlive: true, isTargetable: true,
  pointsValue: 100, rotation: 0, fireCooldown: 0, reloadTime: 100, detectionRange: 800, accuracy: 0.8,
  stateTimer: 0, state: 'PATROL', aircraftVariant: variant,
});

describe('tactical air combat', () => {
  it('defines a distinct period doctrine for every aircraft variant', () => {
    expect(new Set(Object.values(AIRCRAFT_PROFILES).map((profile) => profile.doctrine)).size).toBe(4);
  });

  it('keeps normal attitude bounded and maintains terrain clearance', () => {
    const enemy = makeEnemy();
    enemy.airCombat = initialiseAirCombat(enemy, 0, new Map());
    const player = new PlayerAircraft().stats as PlayerStats;
    Object.assign(player, { x: 1300, y: 510, isOnCarrier: false });
    for (let tick = 1; tick <= 600; tick++) updateAirCombat(enemy, player, tick, getCombatDifficultyProfile('PILOT'), () => 560);
    expect(Math.abs(enemy.airCombat.displayedPitch)).toBeLessThanOrEqual(24 * Math.PI / 180);
    expect(enemy.y).toBeLessThanOrEqual(560 - AIRCRAFT_PROFILES.MIG_21BIS.terrainClearance);
  });

  it('reproduces state changes and firing ticks at 30, 60 and 120 Hz', () => {
    const results = ([30, 60, 120] as const).map((renderHz) => runEncounterHarness({ scenario: 'COMBINED', difficulty: 'PILOT', renderHz }));
    expect(results[1].simulationTicks).toBe(results[0].simulationTicks);
    expect(results[2].simulationTicks).toBe(results[0].simulationTicks);
    expect(results[1].stateSequence).toEqual(results[0].stateSequence);
    expect(results[2].firingTicks).toEqual(results[0].firingTicks);
    expect(results[2].samLaunchTicks).toEqual(results[0].samLaunchTicks);
    expect(results[0].firingTicks.length).toBeGreaterThan(0);
    expect(results[0].stateSequence.some((state) => state.includes('DETECTION'))).toBe(true);
    expect(results[0].stateSequence.some((state) => state.includes('PURSUIT'))).toBe(true);
    expect(results[0].stateSequence.some((state) => state.includes('ATTACK_PASS'))).toBe(true);
    expect(results[0].stateSequence.some((state) => state.includes('OVERSHOOT'))).toBe(true);
    expect(results[0].stateSequence.some((state) => state.includes('REJOIN'))).toBe(true);
  });

  it('assigns separated formation roles', () => {
    const counts = new Map<string, number>();
    const lead = makeEnemy('MIG_29A');
    const wing = { ...makeEnemy('MIG_29A'), id: 'test_flight_2' };
    lead.airCombat = initialiseAirCombat(lead, 0, counts);
    wing.airCombat = initialiseAirCombat(wing, 1, counts);
    expect(lead.airCombat.formationRole).toBe('LEAD');
    expect(wing.airCombat.formationRole).toBe('ELEMENT');
  });

  it('blocks firing solutions that pass through authoritative terrain', () => {
    expect(hasTerrainLineOfSight(100, 220, 500, 220, () => 400)).toBe(true);
    expect(hasTerrainLineOfSight(100, 350, 500, 350, (x) => x > 250 && x < 350 ? 330 : 500)).toBe(false);
  });
});

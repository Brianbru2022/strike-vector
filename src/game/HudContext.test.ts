import { describe, expect, it } from 'vitest';
import { PlayerAircraft } from './PlayerAircraft';
import { activeWeaponLabel, deriveHudVisibility, HUD_INFORMATION_MODEL } from './HudContext';

const flow = { multiplier: 1, multiplierTimer: 0, meter: 0, decayTimer: 0, streakCount: 0, lastActionText: '', lastActionTimer: 0 };

describe('contextual HUD visibility', () => {
  it('leaves only essential information expanded during ordinary cruise', () => {
    const player = new PlayerAircraft().stats;
    player.altitudeBand = 'MEDIUM';
    expect(deriveHudVisibility({ player, flow, expanded: false, controlsRecalled: false, tutorialUnderstood: true })).toMatchObject({
      detailedFlight: false,
      weaponDetail: false,
      subsystemDetail: false,
      scoreDetail: false,
      mapProgress: false,
      controlReference: false,
      mode: 'ESSENTIAL',
    });
  });

  it('reveals flight data for low-level, VTOL and recovery contexts', () => {
    const player = new PlayerAircraft().stats;
    player.altitudeBand = 'LOW';
    expect(deriveHudVisibility({ player, flow, expanded: false, controlsRecalled: false, tutorialUnderstood: true }).detailedFlight).toBe(true);
    player.altitudeBand = 'MEDIUM';
    player.vtolMode = true;
    expect(deriveHudVisibility({ player, flow, expanded: false, controlsRecalled: false, tutorialUnderstood: true }).detailedFlight).toBe(true);
  });

  it('reveals only relevant warning and combat detail', () => {
    const player = new PlayerAircraft().stats;
    player.altitudeBand = 'MEDIUM';
    player.fuel = 20;
    player.subsystems.engine = 0.7;
    player.targetLockedId = 'bandit';
    const visibility = deriveHudVisibility({ player, flow, expanded: false, controlsRecalled: false, tutorialUnderstood: true });
    expect(visibility.dangerousFuel).toBe(true);
    expect(visibility.subsystemDetail).toBe(true);
    expect(visibility.weaponDetail).toBe(true);
    expect(visibility.mapProgress).toBe(false);
  });

  it('makes optional data available in expanded mode', () => {
    const player = new PlayerAircraft().stats;
    const visibility = deriveHudVisibility({ player, flow, expanded: true, controlsRecalled: false, tutorialUnderstood: true });
    expect(visibility.mode).toBe('EXPANDED');
    expect(visibility.mapProgress).toBe(true);
    expect(visibility.scoreDetail).toBe(true);
    expect(visibility.weaponDetail).toBe(true);
  });

  it('labels the active secondary weapon with its remaining ammunition', () => {
    const player = new PlayerAircraft().stats;
    player.selectedWeapon = 'MISSILE';
    player.missiles = 4;
    expect(activeWeaponLabel(player)).toBe('AIM-9L ×4');
  });

  it('keeps the agreed information categories explicit', () => {
    expect(HUD_INFORMATION_MODEL.currentObjective).toBe('ALWAYS_REQUIRED');
    expect(HUD_INFORMATION_MODEL.recoveryGuidance).toBe('CONTEXT_REQUIRED');
    expect(HUD_INFORMATION_MODEL.subsystemDamage).toBe('WARNING_ONLY');
    expect(HUD_INFORMATION_MODEL.mapProgress).toBe('OPTIONAL_EXPANDED');
  });
});

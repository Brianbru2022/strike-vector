import { describe, expect, it } from 'vitest';
import { calculateSmartCombatZoom, getAircraftPresentationScale, getProjectilePresentationScale, getTargetReadabilityPresentation, PLAYER_AIRCRAFT_PRESENTATION_SCALE } from './CombatReadability';
import { GAME_CONSTANTS } from './constants';

describe('combat readability presentation', () => {
  it('enlarges aircraft and critical projectiles without changing gameplay constants', () => {
    const collisionWidth = GAME_CONSTANTS.PLAYER.WIDTH;
    expect(PLAYER_AIRCRAFT_PRESENTATION_SCALE).toBeGreaterThanOrEqual(1.15);
    expect(getAircraftPresentationScale('MIG_21BIS')).toBeGreaterThan(getAircraftPresentationScale('TU_16K'));
    expect(getProjectilePresentationScale('ENEMY_MISSILE')).toBeGreaterThan(getProjectilePresentationScale('MISSILE'));
    expect(getProjectilePresentationScale('CANNON_ROUND')).toBe(1);
    expect(GAME_CONSTANTS.PLAYER.WIDTH).toBe(collisionWidth);
  });

  it('frames the player and highest-priority nearby threat', () => {
    const frame = calculateSmartCombatZoom({ enabled: true, reducedEffects: false, playerX: 1200, playerY: 280, cameraX: 900, contacts: [{ x: 1700, y: 220, priority: 2 }, { x: 1400, y: 300, priority: 5 }] });
    expect(frame.factor).toBe(1.1);
    expect(frame.focusX).toBe(400);
    expect(frame.focusY).toBe(290);
    expect(frame.contactCount).toBe(2);
  });

  it('does not zoom with the option off, reduced effects on or threats outside range', () => {
    const base = { playerX: 1200, playerY: 280, cameraX: 900, contacts: [{ x: 2500, y: 220, priority: 5 }] };
    expect(calculateSmartCombatZoom({ ...base, enabled: true, reducedEffects: false }).factor).toBe(1);
    expect(calculateSmartCombatZoom({ ...base, contacts: [{ x: 1500, y: 220, priority: 5 }], enabled: false, reducedEffects: false }).factor).toBe(1);
    expect(calculateSmartCombatZoom({ ...base, contacts: [{ x: 1500, y: 220, priority: 5 }], enabled: true, reducedEffects: true }).factor).toBe(1);
  });

  it('enlarges selected and objective targets using presentation-only values', () => {
    const base = { category: 'GROUND' as const, isTargetable: true, ambientLight: 0.8, gameplayCalm: 0.5 };
    const ordinary = getTargetReadabilityPresentation({ ...base, isSelected: false });
    const objective = getTargetReadabilityPresentation({ ...base, isSelected: false, isPrimaryObjective: true });
    const selected = getTargetReadabilityPresentation({ ...base, isSelected: true, isPrimaryObjective: true });
    expect(ordinary.scale).toBeGreaterThan(1);
    expect(objective.scale).toBeGreaterThan(ordinary.scale);
    expect(selected.scale).toBeGreaterThan(objective.scale);
  });

  it('adapts rim strength to dark busy scenes without changing collision dimensions', () => {
    const dimensions = { width: 62, height: 28 };
    const bright = getTargetReadabilityPresentation({ category: 'AIR', isTargetable: true, isSelected: false, ambientLight: 0.95, gameplayCalm: 0.9 });
    const darkBusy = getTargetReadabilityPresentation({ category: 'AIR', isTargetable: true, isSelected: false, ambientLight: 0.3, gameplayCalm: 0.2 });
    expect(darkBusy.rimBlur).toBeGreaterThan(bright.rimBlur);
    expect(darkBusy.separationFilter).toContain('drop-shadow');
    expect(dimensions).toEqual({ width: 62, height: 28 });
  });

  it('does not highlight protected or inactive contacts', () => {
    expect(getTargetReadabilityPresentation({ category: 'STRUCTURE', isTargetable: false, isSelected: false, ambientLight: 0.3 })).toEqual({
      scale: 1,
      rimColour: 'rgba(0, 0, 0, 0)',
      rimBlur: 0,
      separationFilter: 'none',
    });
  });
});

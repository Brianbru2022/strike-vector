import { describe, expect, it } from 'vitest';
import { PlayerAircraft } from './PlayerAircraft';
import { FixedStepClock } from './FixedStepClock';
import { TrainingDirector } from './TrainingDirector';

describe('guided carrier qualification', () => {
  it('advances only from the required semantic action', () => {
    const director = new TrainingDirector(true);
    const player = new PlayerAircraft().stats;
    player.x = 500;
    player.y = 400;
    director.update(player, 100);
    expect(director.getState().currentStep?.id).toBe('PITCH');
    expect(director.onAction('PRIMARY_FIRE')).toBe(false);
    expect(director.onAction('PITCH_UP')).toBe(true);
    expect(director.getState().currentStep?.id).toBe('THROTTLE');
  });

  it('skips without reporting completion', () => {
    const director = new TrainingDirector(true);
    director.skip();
    expect(director.getState()).toMatchObject({ enabled: false, completed: false, skipped: true, currentStep: null });
  });

  it('requires a complete Sidewinder lock and missile selection before advancing', () => {
    const director = new TrainingDirector(true);
    const player = new PlayerAircraft().stats;
    player.x = 500;
    player.y = 400;
    director.update(player, 100);
    director.onAction('PITCH_UP', player);
    director.onAction('THROTTLE_UP', player);
    director.onAction('PRIMARY_FIRE', player);
    player.lockProgress = 0.5;
    director.update(player, 100);
    expect(director.getState().currentStep?.id).toBe('TARGET');
    player.targetLockedId = 'training-bandit';
    director.update(player, 100);
    player.selectedWeapon = 'BOMB';
    expect(director.onAction('SECONDARY_FIRE', player)).toBe(false);
    player.selectedWeapon = 'MISSILE';
    expect(director.onAction('SECONDARY_FIRE', player)).toBe(true);
    expect(director.getState().currentStep?.id).toBe('COUNTERMEASURE');
  });

  it('starts inert when standard mode is selected', () => {
    const director = new TrainingDirector(false);
    expect(director.getState()).toMatchObject({ enabled: false, completed: false, skipped: false, currentStep: null });
  });

  it.each([30, 60, 120])('advances on the same simulation tick when rendering at %i Hz', (renderHz) => {
    const director = new TrainingDirector(true);
    const player = new PlayerAircraft().stats;
    const clock = new FixedStepClock();
    player.x = 100;
    player.y = 400;
    let simulationTicks = 0;
    let advancedAt = -1;

    for (let frame = 0; frame < renderHz && advancedAt < 0; frame++) {
      clock.advance(1 / renderHz, (dt) => {
        simulationTicks++;
        player.x += 400 * dt;
        if (director.update(player, 100)) advancedAt = simulationTicks;
      });
    }

    expect(advancedAt).toBe(39);
    expect(director.getState().currentStep?.id).toBe('PITCH');
  });
});

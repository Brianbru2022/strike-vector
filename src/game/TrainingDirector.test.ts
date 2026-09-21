import { describe, expect, it } from 'vitest';
import { PlayerAircraft } from './PlayerAircraft';
import { FixedStepClock } from './FixedStepClock';
import { CARRIER_QUALIFICATION_STEPS, TRAINING_SUCCESS_TICKS, TrainingDirector } from './TrainingDirector';

const settleSuccess = (director: TrainingDirector, player: PlayerAircraft['stats'], launchX = 100) => {
  for (let tick = 0; tick < TRAINING_SUCCESS_TICKS; tick++) director.update(player, launchX);
};

describe('guided carrier qualification', () => {
  it('advances only from the required semantic action', () => {
    const director = new TrainingDirector(true);
    const player = new PlayerAircraft().stats;
    player.x = 500;
    player.y = 400;
    director.update(player, 100);
    expect(director.getState()).toMatchObject({ phase: 'SUCCESS', completedSteps: 1, successMessage: 'Airborne — climb established.' });
    settleSuccess(director, player);
    expect(director.getState().currentStep?.id).toBe('PITCH');
    expect(director.onAction('PRIMARY_FIRE')).toBe(false);
    player.pitchAngle = -0.25;
    player.vy = -2;
    expect(director.update(player, 100)).toBe(true);
    expect(director.getState()).toMatchObject({ phase: 'SUCCESS', completedSteps: 2, currentStep: { id: 'PITCH' } });
    settleSuccess(director, player);
    expect(director.getState().currentStep?.id).toBe('DIRECTION');
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
    settleSuccess(director, player);
    player.pitchAngle = -0.25; player.vy = -2; director.update(player, 100);
    settleSuccess(director, player);
    director.onAction('THROTTLE_UP', player);
    settleSuccess(director, player);
    director.onAction('PRIMARY_FIRE', player);
    settleSuccess(director, player);
    player.lockProgress = 0.5;
    director.update(player, 100);
    expect(director.getState().currentStep?.id).toBe('TARGET');
    player.targetLockedId = 'training-bandit';
    director.update(player, 100);
    expect(director.getState().phase).toBe('SUCCESS');
    settleSuccess(director, player);
    player.selectedWeapon = 'BOMB';
    expect(director.onAction('SECONDARY_FIRE', player)).toBe(false);
    player.selectedWeapon = 'MISSILE';
    expect(director.onAction('SECONDARY_FIRE', player)).toBe(true);
    expect(director.getState()).toMatchObject({ currentStep: { id: 'SIDEWINDER' }, phase: 'SUCCESS', successMessage: 'Sidewinder away.' });
    settleSuccess(director, player);
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
    let confirmedAt = -1;
    let nextLessonAt = -1;

    for (let frame = 0; frame < renderHz * 2 && nextLessonAt < 0; frame++) {
      clock.advance(1 / renderHz, (dt) => {
        simulationTicks++;
        player.x += 400 * dt;
        if (director.update(player, 100) && confirmedAt < 0) confirmedAt = simulationTicks;
        if (director.getState().currentStep?.id === 'PITCH' && nextLessonAt < 0) nextLessonAt = simulationTicks;
      });
    }

    expect(confirmedAt).toBe(39);
    expect(nextLessonAt).toBe(87);
    expect(director.getState().currentStep?.id).toBe('PITCH');
  });

  it('gives every lesson concise instruction and explicit success feedback', () => {
    expect(CARRIER_QUALIFICATION_STEPS).toHaveLength(9);
    for (const step of CARRIER_QUALIFICATION_STEPS) {
      expect(step.instruction.length).toBeLessThanOrEqual(92);
      expect(step.successMessage.trim().length).toBeGreaterThan(0);
      expect(step.successMessage).not.toBe(step.instruction);
    }
  });

  it('does not accept the next lesson input during success confirmation', () => {
    const director = new TrainingDirector(true);
    const player = new PlayerAircraft().stats;
    player.x = 500;
    player.y = 400;
    director.update(player, 100);
    expect(director.onAction('PITCH_UP', player)).toBe(false);
    expect(director.getState()).toMatchObject({ currentStep: { id: 'LAUNCH' }, phase: 'SUCCESS', completedSteps: 1 });
  });

  it('marks the course complete as soon as carrier recovery succeeds', () => {
    const director = new TrainingDirector(true);
    const player = new PlayerAircraft().stats;
    player.x = 500;
    player.y = 400;
    director.update(player, 100);
    settleSuccess(director, player);
    player.pitchAngle = -0.25; player.vy = -2; director.update(player, 100); settleSuccess(director, player);
    director.onAction('THROTTLE_UP', player); settleSuccess(director, player);
    director.onAction('PRIMARY_FIRE', player); settleSuccess(director, player);
    player.targetLockedId = 'training-bandit'; director.update(player, 100); settleSuccess(director, player);
    player.selectedWeapon = 'MISSILE'; director.onAction('SECONDARY_FIRE', player); settleSuccess(director, player);
    director.onAction('COUNTERMEASURE', player); settleSuccess(director, player);
    player.vtolMode = true; player.vtolTransition = 0.5; director.update(player, 100); settleSuccess(director, player);
    player.carrierLandingGrade = 'SAFE';
    expect(director.update(player, 100)).toBe(true);
    expect(director.getState()).toMatchObject({ enabled: false, completed: true, completedSteps: 9, currentIndex: 9, currentStep: null });
  });
});

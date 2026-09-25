import { describe, expect, it, vi } from 'vitest';
import { ParticleAndEffects } from './ParticleAndEffects';
import { PlayerAircraft } from './PlayerAircraft';
import { FixedStepClock } from './FixedStepClock';
import { soundEngine } from '../audio/SoundEngine';

describe('carrier recovery', () => {
  it('plays one nozzle cue for each commanded VTOL mode transition', () => {
    const aircraft = new PlayerAircraft();
    const effects = new ParticleAndEffects();
    aircraft.stats.isTakingOff = false;
    const nozzleCue = vi.spyOn(soundEngine, 'playNozzleTransition').mockImplementation(() => undefined);

    aircraft.update({ up: false, down: false, left: false, right: false, vtol: true, fireCannon: false }, effects);
    aircraft.update({ up: false, down: false, left: false, right: false, vtol: true, fireCannon: false }, effects);
    aircraft.update({ up: false, down: false, left: false, right: false, vtol: false, fireCannon: false }, effects);

    expect(nozzleCue.mock.calls).toEqual([[true], [false]]);
    nozzleCue.mockRestore();
  });

  it('brakes into a controlled turn before flying in the opposite direction', () => {
    const aircraft = new PlayerAircraft();
    const effects = new ParticleAndEffects();
    aircraft.stats.isTakingOff = false;
    aircraft.stats.vx = 7;

    aircraft.update(
      { up: false, down: false, left: true, right: false, vtol: false, fireCannon: false },
      effects,
    );

    expect(aircraft.stats.vx).toBeGreaterThan(0);
    expect(aircraft.stats.facing).toBe(1);

    let presentationAtTurn = aircraft.getHeadingPresentation();
    const observedTurnFrames = new Set<number>();
    for (let tick = 0; tick < 180; tick++) {
      aircraft.update(
        { up: false, down: false, left: true, right: false, vtol: false, fireCannon: false },
        effects,
      );
      const heading = aircraft.getHeadingPresentation();
      if (heading.turnOpacity > 0.2) observedTurnFrames.add(Math.round(heading.turnFramePosition));
      if (aircraft.stats.facing === -1 && !presentationAtTurn.turning) {
        presentationAtTurn = heading;
      }
    }

    expect(presentationAtTurn.turning).toBe(true);
    expect(presentationAtTurn.blend).toBeGreaterThan(-1);
    expect(presentationAtTurn.turnOpacity).toBeGreaterThan(0);
    expect(presentationAtTurn.turnFramePosition).toBeGreaterThanOrEqual(0);
    expect(presentationAtTurn.turnFramePosition).toBeLessThanOrEqual(4);
    expect(aircraft.stats.facing).toBe(-1);
    expect(aircraft.stats.vx).toBeLessThan(0);
    expect(aircraft.stats.speedKnots).toBeGreaterThan(0);
    expect(aircraft.getHeadingPresentation().blend).toBe(-1);
    expect(aircraft.getHeadingPresentation().sideProfileOpacity).toBe(1);
    expect(aircraft.getHeadingPresentation().turnOpacity).toBe(0);
    expect([...observedTurnFrames].sort()).toEqual([0, 1, 2, 3, 4]);

    for (let tick = 0; tick < 180; tick++) {
      aircraft.update(
        { up: false, down: false, left: false, right: true, vtol: false, fireCannon: false },
        effects,
      );
    }

    expect(aircraft.stats.facing).toBe(1);
    expect(aircraft.stats.vx).toBeGreaterThan(0);
    expect(aircraft.getHeadingPresentation().blend).toBe(1);
    expect(aircraft.getFlightTelemetrySnapshot()).toMatchObject({ reversalsCompleted: 2 });
  });

  it('completes the same controlled reversal at 30, 60 and 120 Hz rendering', () => {
    const simulate = (renderHz: 30 | 60 | 120) => {
      const aircraft = new PlayerAircraft();
      const effects = new ParticleAndEffects();
      const clock = new FixedStepClock(1 / 60);
      aircraft.stats.isTakingOff = false;
      aircraft.stats.vx = 7;
      for (let frame = 0; frame < renderHz * 3; frame++) {
        clock.advance(1 / renderHz, () => aircraft.update(
          { up: false, down: false, left: true, right: false, vtol: false, fireCannon: false },
          effects,
        ));
      }
      return { facing: aircraft.stats.facing, vx: aircraft.stats.vx, telemetry: aircraft.getFlightTelemetrySnapshot() };
    };
    const outcomes = ([30, 60, 120] as const).map(simulate);
    expect(outcomes[1]).toEqual(outcomes[0]);
    expect(outcomes[2]).toEqual(outcomes[0]);
    expect(outcomes[0].telemetry.reversalsCompleted).toBe(1);
  });

  it('blends through nozzle transition without an instantaneous speed reversal', () => {
    const aircraft = new PlayerAircraft();
    aircraft.stats.isTakingOff = false;
    aircraft.stats.vx = 7;
    aircraft.stats.vy = 0;
    aircraft.stats.vtolTransition = 0.55;

    aircraft.update(
      { up: false, down: false, left: false, right: false, vtol: true, fireCannon: false },
      new ParticleAndEffects(),
    );

    expect(aircraft.stats.vtolTransition).toBeGreaterThan(0.55);
    expect(aircraft.stats.vx).toBeGreaterThan(4);
    expect(aircraft.stats.vx).toBeLessThan(7.2);
  });

  it('builds lift progressively during an Invincible ski-jump departure', () => {
    const aircraft = new PlayerAircraft();
    aircraft.launchFromCarrier('CARRIER');
    const initialVy = aircraft.stats.vy;
    for (let tick = 0; tick < 12; tick++) {
      aircraft.update(
        { up: false, down: false, left: false, right: true, vtol: false, fireCannon: false },
        new ParticleAndEffects(),
      );
    }
    expect(aircraft.stats.vx).toBeGreaterThan(8.4);
    expect(aircraft.stats.vy).toBeLessThan(initialVy);
    expect(aircraft.stats.pitchAngle).toBeLessThan(0);
  });

  it('captures a gentle VTOL touchdown anywhere on the painted recovery deck', () => {
    const aircraft = new PlayerAircraft();
    aircraft.stats.x = 9030;
    aircraft.stats.y = 548;
    aircraft.stats.vx = 1.2;
    aircraft.stats.vy = 0.1;
    aircraft.stats.vtolTransition = 1;
    aircraft.stats.isTakingOff = false;

    aircraft.update(
      { up: false, down: false, left: false, right: false, vtol: true, fireCannon: false },
      new ParticleAndEffects(),
      { startX: 8835, endX: 9245, deckY: 570 }
    );

    expect(aircraft.stats.isOnCarrier).toBe(true);
    expect(aircraft.stats.y).toBe(548);
    expect(aircraft.stats.carrierLandingGrade).toBe('PERFECT');
  });

  it('grades a gentle reverse-direction VTOL touchdown by speed rather than signed velocity', () => {
    const aircraft = new PlayerAircraft();
    aircraft.stats.x = 9030;
    aircraft.stats.y = 548;
    aircraft.stats.vx = -1.2;
    aircraft.stats.facing = -1;
    aircraft.stats.vy = 0.1;
    aircraft.stats.vtolTransition = 1;
    aircraft.stats.isTakingOff = false;

    aircraft.update(
      { up: false, down: false, left: true, right: false, vtol: true, fireCannon: false },
      new ParticleAndEffects(),
      { startX: 8835, endX: 9245, deckY: 570 },
    );

    expect(aircraft.stats.isOnCarrier).toBe(true);
    expect(aircraft.stats.carrierLandingGrade).toBe('PERFECT');
  });

  it('uses the same precise touchdown physics on a captured forward pad', () => {
    const aircraft = new PlayerAircraft();
    aircraft.stats.x = 8375;
    aircraft.stats.y = 548;
    aircraft.stats.vx = 0.8;
    aircraft.stats.vy = 0.05;
    aircraft.stats.vtolTransition = 1;
    aircraft.stats.isTakingOff = false;

    aircraft.update(
      { up: false, down: false, left: false, right: false, vtol: true, fireCannon: false },
      new ParticleAndEffects(),
      { startX: 8200, endX: 8550, deckY: 570, siteType: 'FORWARD_BASE' }
    );

    expect(aircraft.stats.isOnCarrier).toBe(true);
    expect(aircraft.stats.y).toBe(548);
    expect(aircraft.stats.carrierLandingGrade).toBe('PERFECT');
  });

  it.each(['ARCADE', 'PILOT', 'VETERAN'] as const)('keeps undamaged and damaged carrier recovery technically achievable on %s', (difficulty) => {
    for (const damaged of [false, true]) {
      const aircraft = new PlayerAircraft();
      aircraft.setDifficulty(difficulty);
      aircraft.stats.health = damaged ? 58 : 100;
      aircraft.stats.subsystems.engine = damaged ? 0.68 : 1;
      aircraft.stats.subsystems.flightControls = damaged ? 0.62 : 1;
      Object.assign(aircraft.stats, { x: 9030, y: 548, vx: 0.9, vy: 0.08, vtolTransition: 1, isTakingOff: false });
      aircraft.update(
        { up: false, down: false, left: false, right: false, vtol: true, fireCannon: false },
        new ParticleAndEffects(),
        { startX: 8835, endX: 9245, deckY: 570 },
      );
      expect(aircraft.stats.isOnCarrier, `${difficulty}/${damaged ? 'damaged' : 'undamaged'}`).toBe(true);
      expect(aircraft.stats.carrierLandingGrade).not.toBe('FAILED');
    }
  });

  it('does not mistake departure from a shared FARP pad for an immediate landing', () => {
    const aircraft = new PlayerAircraft();
    aircraft.stats.x = 345;
    aircraft.stats.y = 418;
    aircraft.stats.vx = 0.8;
    aircraft.stats.vy = 0;
    aircraft.stats.vtolTransition = 1;
    aircraft.stats.isTakingOff = true;

    aircraft.update(
      { up: false, down: false, left: false, right: false, vtol: true, fireCannon: false },
      new ParticleAndEffects(),
      { startX: 205, endX: 450, deckY: 440, siteType: 'FORWARD_BASE' }
    );

    expect(aircraft.stats.isOnCarrier).toBe(false);
    expect(aircraft.stats.carrierLandingGrade).toBeNull();
    expect(aircraft.stats.isTakingOff).toBe(true);
  });
});

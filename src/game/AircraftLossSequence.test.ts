import { describe, expect, it } from 'vitest';
import { AircraftLossSequence } from './AircraftLossSequence';

describe('aircraft loss sequence', () => {
  it.each([30, 60, 120])('finishes the high-altitude ejection on the same 144th simulation tick at %i Hz rendering', () => {
    const sequence = new AircraftLossSequence(100, 300, 5, 0, 0, 600);
    let snapshot;
    for (let tick = 0; tick < 144; tick++) snapshot = sequence.update();
    expect(snapshot?.complete).toBe(true);
    expect(snapshot?.pilotSurvived).toBe(true);
    expect(snapshot?.totalFrames).toBe(144);
  });

  it('uses the shorter impact-only sequence below ejection height', () => {
    const sequence = new AircraftLossSequence(100, 540, 4, 1, 0, 600);
    let snapshot;
    for (let tick = 0; tick < 66; tick++) snapshot = sequence.update();
    expect(snapshot?.complete).toBe(true);
    expect(snapshot?.pilotSurvived).toBe(false);
    expect(snapshot?.totalFrames).toBe(66);
  });

  it('opens the parachute at 0.7 seconds', () => {
    const sequence = new AircraftLossSequence(100, 300, 5, 0, 0, 600);
    let snapshot;
    for (let tick = 0; tick < 42; tick++) snapshot = sequence.update();
    expect(snapshot?.ejectionFrame).toBe(3);
  });
});

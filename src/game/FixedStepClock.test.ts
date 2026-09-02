import { describe, expect, it } from 'vitest';
import { FixedStepClock } from './FixedStepClock';

describe('FixedStepClock', () => {
  it.each([30, 60, 120])('runs 60 simulation ticks over one second at %i Hz rendering', (displayHz) => {
    const clock = new FixedStepClock(1 / 60);
    let ticks = 0;
    for (let frame = 0; frame < displayHz; frame++) {
      clock.advance(1 / displayHz, () => ticks++);
    }
    expect(ticks).toBe(60);
  });

  it('discards partial accumulated time on reset', () => {
    const clock = new FixedStepClock(1 / 60);
    clock.advance(1 / 120, () => undefined);
    clock.reset();
    expect(clock.advance(1 / 120, () => undefined)).toBe(0);
  });
});

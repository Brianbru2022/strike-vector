import { describe, expect, it } from 'vitest';
import { TouchInputTracker } from './TouchInputTracker';

describe('multi-pointer touch tracking', () => {
  it('does not release an action until its final pointer is cancelled', () => {
    const tracker = new TouchInputTracker();
    expect(tracker.press('PRIMARY_FIRE', 1)).toBe(true);
    expect(tracker.press('PRIMARY_FIRE', 2)).toBe(false);
    expect(tracker.release('PRIMARY_FIRE', 1)).toBe(false);
    expect(tracker.release('PRIMARY_FIRE', 2)).toBe(true);
  });

  it('releases every held action during an interruption', () => {
    const tracker = new TouchInputTracker();
    tracker.press('PITCH_UP', 4);
    tracker.press('SECONDARY_FIRE', 8);
    expect(new Set(tracker.releaseAll())).toEqual(new Set(['PITCH_UP', 'SECONDARY_FIRE']));
    expect(tracker.releaseAll()).toEqual([]);
  });

  it('keeps six simultaneous flight and combat actions independent', () => {
    const tracker = new TouchInputTracker();
    const actions = ['PITCH_UP', 'THROTTLE_UP', 'PRIMARY_FIRE', 'CYCLE_WEAPON', 'VTOL', 'COUNTERMEASURE'] as const;
    actions.forEach((action, index) => expect(tracker.press(action, index + 1)).toBe(true));
    expect(new Set(tracker.releaseAll())).toEqual(new Set(actions));
  });
});

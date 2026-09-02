import { describe, expect, it } from 'vitest';
import { cloneBindings } from './inputBindings';
import { GamepadInputState, GamepadLike } from './GamepadInputState';

function pad(axes: number[] = [0, 0], pressedButtons: number[] = []): GamepadLike {
  return { axes, buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressedButtons.includes(index) })) };
}

describe('Xbox-compatible semantic gamepad state', () => {
  it('supports simultaneous axes and remapped combat actions', () => {
    const bindings = cloneBindings();
    bindings.gamepad.COUNTERMEASURE = 2;
    const state = new GamepadInputState();
    const update = state.update(pad([-0.8, -0.9], [0, 2, 3, 4]), bindings);
    expect(new Set(update.active)).toEqual(new Set(['PITCH_UP', 'THROTTLE_DOWN', 'PRIMARY_FIRE', 'COUNTERMEASURE', 'CYCLE_WEAPON', 'VTOL']));
  });

  it('releases every held action when the controller disconnects', () => {
    const state = new GamepadInputState();
    state.update(pad([0.9, 0.9], [0, 1]), cloneBindings());
    const disconnected = state.update(null, cloneBindings());
    expect(new Set(disconnected.released)).toEqual(new Set(['PITCH_DOWN', 'THROTTLE_UP', 'PRIMARY_FIRE', 'SECONDARY_FIRE']));
    expect(disconnected.connectionChanged).toBe(true);
    expect(disconnected.connected).toBe(false);
  });
});

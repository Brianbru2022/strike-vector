import { describe, expect, it } from 'vitest';
import { actionForCode, bindGamepad, bindKeyboard, bindingLabel, cloneBindings, DEFAULT_INPUT_BINDINGS, preferredInitialInputDevice, sanitiseInputBindings } from './inputBindings';

describe('configurable semantic input bindings', () => {
  it('resolves both default keyboard aliases', () => {
    expect(actionForCode('KeyW')).toBe('PITCH_UP');
    expect(actionForCode('ArrowUp')).toBe('PITCH_UP');
  });

  it('rejects keyboard and gamepad conflicts', () => {
    const profile = cloneBindings();
    expect(bindKeyboard(profile, 'PRIMARY_FIRE', 'KeyW').conflict).toBe('PITCH_UP');
    expect(bindGamepad(profile, 'COUNTERMEASURE', 0).conflict).toBe('PRIMARY_FIRE');
    expect(profile).toEqual(DEFAULT_INPUT_BINDINGS);
  });

  it('sanitises invalid saved bindings back to defaults', () => {
    const profile = sanitiseInputBindings({ keyboard: { PRIMARY_FIRE: [] }, gamepad: { PRIMARY_FIRE: 99 } });
    expect(profile.keyboard.PRIMARY_FIRE).toEqual(['Space']);
    expect(profile.gamepad.PRIMARY_FIRE).toBe(0);
  });

  it('selects touch prompts on coarse touch-first devices before the first input', () => {
    expect(preferredInitialInputDevice({ maxTouchPoints: 5, coarsePointer: true })).toBe('TOUCH');
    expect(preferredInitialInputDevice({ maxTouchPoints: 5, coarsePointer: true, gamepadConnected: true })).toBe('GAMEPAD');
    expect(preferredInitialInputDevice({ maxTouchPoints: 1, coarsePointer: false })).toBe('KEYBOARD');
    expect(preferredInitialInputDevice({ maxTouchPoints: 0, coarsePointer: true })).toBe('KEYBOARD');
  });

  it('describes controller flight axes instead of showing an unbound button', () => {
    expect(bindingLabel(DEFAULT_INPUT_BINDINGS, 'PITCH_UP', 'GAMEPAD')).toBe('LEFT STICK / D-PAD ↑');
    expect(bindingLabel(DEFAULT_INPUT_BINDINGS, 'THROTTLE_UP', 'GAMEPAD')).toBe('LEFT STICK / D-PAD →');
    expect(bindingLabel(DEFAULT_INPUT_BINDINGS, 'PRIMARY_FIRE', 'GAMEPAD')).toBe('A');
  });
});

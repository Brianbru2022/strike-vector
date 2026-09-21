import { describe, expect, it } from 'vitest';
import { DIRECTIONAL_FLIGHT_COPY, directionalActionLabel, directionalDeviceInstruction } from './DirectionalFlightCopy';

describe('directional flight terminology', () => {
  it('describes the result consistently without calling the axis a throttle', () => {
    const playerFacingCopy = Object.values(DIRECTIONAL_FLIGHT_COPY).join(' ');
    expect(playerFacingCopy).not.toMatch(/throttle/i);
    expect(DIRECTIONAL_FLIGHT_COPY.leftAction).toBe('Turn / Fly Left');
    expect(DIRECTIONAL_FLIGHT_COPY.rightAction).toBe('Turn / Fly Right');
    expect(DIRECTIONAL_FLIGHT_COPY.behaviour).toContain('turns at low speed');
  });

  it('maps legacy semantic actions to player-facing flight results', () => {
    expect(directionalActionLabel('THROTTLE_DOWN')).toBe('Turn / Fly Left');
    expect(directionalActionLabel('THROTTLE_UP')).toBe('Turn / Fly Right');
    expect(directionalActionLabel('PRIMARY_FIRE')).toBeNull();
  });

  it('uses equivalent keyboard, gamepad and touch descriptions', () => {
    expect(directionalDeviceInstruction('KEYBOARD')).toContain('LEFT / RIGHT');
    expect(directionalDeviceInstruction('GAMEPAD')).toContain('left / right');
    expect(directionalDeviceInstruction('TOUCH')).toContain('LEFT / RIGHT');
  });
});

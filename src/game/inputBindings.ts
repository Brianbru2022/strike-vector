import { InputAction, InputBindingProfile, InputDevice } from '../types/game';

export interface InputDeviceEnvironment {
  maxTouchPoints: number;
  coarsePointer: boolean;
  gamepadConnected?: boolean;
}

export function preferredInitialInputDevice(environment: InputDeviceEnvironment): InputDevice {
  if (environment.gamepadConnected) return 'GAMEPAD';
  return environment.maxTouchPoints > 0 && environment.coarsePointer ? 'TOUCH' : 'KEYBOARD';
}

export function detectInitialInputDevice(): InputDevice {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'KEYBOARD';
  return preferredInitialInputDevice({
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    gamepadConnected: Array.from(navigator.getGamepads?.() ?? []).some(Boolean),
  });
}

export const INPUT_ACTIONS: InputAction[] = [
  'PITCH_UP', 'PITCH_DOWN', 'THROTTLE_DOWN', 'THROTTLE_UP', 'VTOL',
  'PRIMARY_FIRE', 'SECONDARY_FIRE', 'CYCLE_WEAPON', 'COUNTERMEASURE', 'PAUSE',
];

export const DEFAULT_INPUT_BINDINGS: InputBindingProfile = {
  keyboard: {
    PITCH_UP: ['KeyW', 'ArrowUp'],
    PITCH_DOWN: ['KeyS', 'ArrowDown'],
    THROTTLE_DOWN: ['KeyA', 'ArrowLeft'],
    THROTTLE_UP: ['KeyD', 'ArrowRight'],
    VTOL: ['KeyV', 'ShiftLeft'],
    PRIMARY_FIRE: ['Space'],
    SECONDARY_FIRE: ['KeyJ', 'KeyZ'],
    CYCLE_WEAPON: ['KeyQ', 'Tab'],
    COUNTERMEASURE: ['KeyF', 'KeyE'],
    PAUSE: ['KeyP', 'Escape'],
  },
  gamepad: {
    PRIMARY_FIRE: 0,
    SECONDARY_FIRE: 1,
    CYCLE_WEAPON: 3,
    VTOL: 4,
    COUNTERMEASURE: 5,
    PAUSE: 9,
  },
};

export function cloneBindings(profile: InputBindingProfile = DEFAULT_INPUT_BINDINGS): InputBindingProfile {
  return {
    keyboard: Object.fromEntries(INPUT_ACTIONS.map((action) => [action, [...profile.keyboard[action]]])) as Record<InputAction, string[]>,
    gamepad: { ...profile.gamepad },
  };
}

export function sanitiseInputBindings(value: unknown): InputBindingProfile {
  const fallback = cloneBindings();
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<InputBindingProfile>;
  for (const action of INPUT_ACTIONS) {
    const codes = raw.keyboard?.[action];
    if (Array.isArray(codes)) {
      const valid = codes.filter((code): code is string => typeof code === 'string' && code.length > 0).slice(0, 2);
      if (valid.length) fallback.keyboard[action] = valid;
    }
    const button = raw.gamepad?.[action];
    if (Number.isInteger(button) && Number(button) >= 0 && Number(button) <= 31) fallback.gamepad[action] = Number(button);
  }
  return fallback;
}

export function actionForCode(code: string, profile: InputBindingProfile = DEFAULT_INPUT_BINDINGS): InputAction | undefined {
  return INPUT_ACTIONS.find((action) => profile.keyboard[action].includes(code));
}

export function actionForGamepadButton(button: number, profile: InputBindingProfile = DEFAULT_INPUT_BINDINGS): InputAction | undefined {
  return INPUT_ACTIONS.find((action) => profile.gamepad[action] === button);
}

export function bindKeyboard(profile: InputBindingProfile, action: InputAction, code: string): { profile: InputBindingProfile; conflict?: InputAction } {
  const conflict = INPUT_ACTIONS.find((candidate) => candidate !== action && profile.keyboard[candidate].includes(code));
  if (conflict) return { profile, conflict };
  const next = cloneBindings(profile);
  next.keyboard[action] = [code];
  return { profile: next };
}

export function bindGamepad(profile: InputBindingProfile, action: InputAction, button: number): { profile: InputBindingProfile; conflict?: InputAction } {
  const conflict = INPUT_ACTIONS.find((candidate) => candidate !== action && profile.gamepad[candidate] === button);
  if (conflict) return { profile, conflict };
  const next = cloneBindings(profile);
  next.gamepad[action] = button;
  return { profile: next };
}

export function formatKeyboardCode(code: string): string {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '').replace('ShiftLeft', 'SHIFT').replace('Space', 'SPACE').toUpperCase();
}

export function formatGamepadButton(button: number | undefined): string {
  if (button === undefined) return '—';
  return ({ 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 9: 'MENU' } as Record<number, string>)[button] ?? `B${button}`;
}

export function bindingLabel(profile: InputBindingProfile, action: InputAction, device: 'KEYBOARD' | 'GAMEPAD' | 'TOUCH'): string {
  if (device === 'TOUCH') return action.replaceAll('_', ' ');
  if (device === 'GAMEPAD') {
    const axisLabels: Partial<Record<InputAction, string>> = {
      PITCH_UP: 'LEFT STICK / D-PAD ↑',
      PITCH_DOWN: 'LEFT STICK / D-PAD ↓',
      THROTTLE_DOWN: 'LEFT STICK / D-PAD ←',
      THROTTLE_UP: 'LEFT STICK / D-PAD →',
    };
    return axisLabels[action] ?? formatGamepadButton(profile.gamepad[action]);
  }
  return profile.keyboard[action].map(formatKeyboardCode).join('/');
}

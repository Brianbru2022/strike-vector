import { InputAction, InputDevice } from '../types/game';

/**
 * Player-facing authority for horizontal flight controls. The InputAction
 * identifiers retain their legacy THROTTLE names for save/binding compatibility;
 * they must never be presented to players as a conventional throttle axis.
 */
export const DIRECTIONAL_FLIGHT_COPY = Object.freeze({
  concept: 'Choose the direction you want to fly.',
  behaviour: 'Hold the opposite direction to slow down. Kestrel One turns at low speed, then accelerates in the new direction.',
  leftAction: 'Turn / Fly Left',
  rightAction: 'Turn / Fly Right',
  hudLabel: 'FLY LEFT / RIGHT',
  lessonTitle: 'Flight direction',
  lessonInstruction: 'Hold RIGHT to fly right. Hold the opposite direction later to slow down and turn around.',
  lessonSuccess: 'Fly-right command confirmed.',
  keyboard: 'A / D or LEFT / RIGHT arrows',
  gamepad: 'LEFT STICK or D-PAD left / right',
  touch: 'On-screen LEFT / RIGHT flight arrows',
});

export function directionalActionLabel(action: InputAction): string | null {
  if (action === 'THROTTLE_DOWN') return DIRECTIONAL_FLIGHT_COPY.leftAction;
  if (action === 'THROTTLE_UP') return DIRECTIONAL_FLIGHT_COPY.rightAction;
  return null;
}

export function directionalDeviceInstruction(device: InputDevice): string {
  if (device === 'GAMEPAD') return DIRECTIONAL_FLIGHT_COPY.gamepad;
  if (device === 'TOUCH') return DIRECTIONAL_FLIGHT_COPY.touch;
  return DIRECTIONAL_FLIGHT_COPY.keyboard;
}

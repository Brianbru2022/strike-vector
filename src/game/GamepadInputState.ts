import { InputAction, InputBindingProfile } from '../types/game';
import { INPUT_ACTIONS } from './inputBindings';

export interface GamepadLike {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
}

export interface GamepadInputUpdate {
  pressed: InputAction[];
  released: InputAction[];
  active: InputAction[];
  pausePressed: boolean;
  connected: boolean;
  connectionChanged: boolean;
}

/** Converts one controller snapshot into semantic actions and releases held actions on disconnect. */
export class GamepadInputState {
  private active = new Set<InputAction>();
  private connected = false;

  update(pad: GamepadLike | null, bindings: InputBindingProfile, deadzone = 0.28): GamepadInputUpdate {
    const next = new Set<InputAction>();
    if (pad) {
      if ((pad.axes[1] || 0) < -deadzone || pad.buttons[12]?.pressed) next.add('PITCH_UP');
      if ((pad.axes[1] || 0) > deadzone || pad.buttons[13]?.pressed) next.add('PITCH_DOWN');
      if ((pad.axes[0] || 0) < -deadzone || pad.buttons[14]?.pressed) next.add('THROTTLE_DOWN');
      if ((pad.axes[0] || 0) > deadzone || pad.buttons[15]?.pressed) next.add('THROTTLE_UP');
      for (const action of INPUT_ACTIONS) {
        if (action === 'PAUSE') continue;
        const button = bindings.gamepad[action];
        if (button !== undefined && pad.buttons[button]?.pressed) next.add(action);
      }
    }
    const pressed = [...next].filter((action) => !this.active.has(action));
    const released = [...this.active].filter((action) => !next.has(action));
    const wasConnected = this.connected;
    this.active = next;
    this.connected = Boolean(pad);
    const pauseButton = bindings.gamepad.PAUSE;
    return {
      pressed,
      released,
      active: [...next],
      pausePressed: Boolean(pad && pauseButton !== undefined && pad.buttons[pauseButton]?.pressed),
      connected: this.connected,
      connectionChanged: wasConnected !== this.connected,
    };
  }
}

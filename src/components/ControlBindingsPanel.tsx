import React from 'react';
import { InputAction, InputBindingProfile } from '../types/game';
import { bindGamepad, bindKeyboard, DEFAULT_INPUT_BINDINGS, formatGamepadButton, formatKeyboardCode, INPUT_ACTIONS, cloneBindings } from '../game/inputBindings';
import { DIRECTIONAL_FLIGHT_COPY } from '../game/DirectionalFlightCopy';

const ACTION_LABELS: Record<InputAction, string> = {
  PITCH_UP: 'Pitch up', PITCH_DOWN: 'Pitch down', THROTTLE_DOWN: DIRECTIONAL_FLIGHT_COPY.leftAction, THROTTLE_UP: DIRECTIONAL_FLIGHT_COPY.rightAction,
  VTOL: 'VTOL vectoring', PRIMARY_FIRE: 'ADEN cannon', SECONDARY_FIRE: 'Selected weapon', CYCLE_WEAPON: 'Cycle weapon',
  COUNTERMEASURE: 'Countermeasure', PAUSE: 'Pause',
};

interface ControlBindingsPanelProps {
  bindings: InputBindingProfile;
  onChange: (bindings: InputBindingProfile) => void;
}

export const ControlBindingsPanel: React.FC<ControlBindingsPanelProps> = ({ bindings, onChange }) => {
  const [listening, setListening] = React.useState<InputAction | null>(null);
  const [conflict, setConflict] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!listening) return;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const result = bindKeyboard(bindings, listening, event.code);
      if (result.conflict) setConflict(`${formatKeyboardCode(event.code)} is already assigned to ${ACTION_LABELS[result.conflict]}.`);
      else { onChange(result.profile); setConflict(null); }
      setListening(null);
    };
    window.addEventListener('keydown', capture, true);
    return () => window.removeEventListener('keydown', capture, true);
  }, [bindings, listening, onChange]);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="mb-2 flex items-center justify-between"><div className="font-bold text-cyan-300">CONTROL BINDINGS</div><button type="button" onClick={() => { onChange(cloneBindings(DEFAULT_INPUT_BINDINGS)); setConflict(null); }} className="rounded border border-zinc-700 px-2 py-1 text-[9px] text-zinc-300">RESET DEFAULTS</button></div>
      <div className="grid grid-cols-[1fr_90px_80px] gap-1 text-[9px] text-zinc-500"><span>ACTION</span><span>KEYBOARD</span><span>GAMEPAD</span></div>
      <div className="mt-1 max-h-48 space-y-1 overflow-y-auto pr-1">
        {INPUT_ACTIONS.map((action) => (
          <div key={action} className="grid grid-cols-[1fr_90px_80px] items-center gap-1 rounded bg-black/40 px-2 py-1.5">
            <span className="text-[10px] text-zinc-300">{ACTION_LABELS[action]}</span>
            <button type="button" onClick={() => { setConflict(null); setListening(action); }} className="truncate rounded border border-cyan-700/60 bg-cyan-950/30 px-1.5 py-1 text-[9px] text-cyan-200">{listening === action ? 'PRESS KEY…' : bindings.keyboard[action].map(formatKeyboardCode).join('/')}</button>
            <select aria-label={`${ACTION_LABELS[action]} gamepad button`} value={bindings.gamepad[action] ?? ''} onChange={(event) => {
              const result = bindGamepad(bindings, action, Number(event.target.value));
              if (result.conflict) setConflict(`${formatGamepadButton(Number(event.target.value))} is already assigned to ${ACTION_LABELS[result.conflict]}.`);
              else { onChange(result.profile); setConflict(null); }
            }} className="rounded border border-amber-700/50 bg-zinc-950 px-1 py-1 text-[9px] text-amber-200">
              <option value="">—</option>{Array.from({ length: 16 }, (_, button) => <option key={button} value={button}>{formatGamepadButton(button)}</option>)}
            </select>
          </div>
        ))}
      </div>
      <p className={`mt-2 min-h-4 text-[9px] ${conflict ? 'text-rose-300' : 'text-zinc-500'}`}>{conflict || `${DIRECTIONAL_FLIGHT_COPY.concept} ${DIRECTIONAL_FLIGHT_COPY.behaviour}`}</p>
    </section>
  );
};

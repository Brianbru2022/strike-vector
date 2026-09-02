import React, { useEffect, useRef } from 'react';
import { Crosshair, Zap, Repeat2, Shield, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { InputAction, WeaponType } from '../types/game';
import { TouchInputTracker } from '../game/TouchInputTracker';

interface TouchControlsProps {
  onInput: (action: InputAction, pressed: boolean) => void;
  visible?: boolean;
  selectedWeapon: WeaponType;
  scale?: number;
  opacity?: number;
  leftHanded?: boolean;
  safeInset?: number;
  lift?: number;
  clearView?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onInput, visible = true, selectedWeapon, scale = 1, opacity = 0.82, leftHanded = false, safeInset = 12, lift = 0, clearView = true }) => {
  const tracker = useRef(new TouchInputTracker());

  useEffect(() => {
    const releaseAll = () => tracker.current.releaseAll().forEach((action) => onInput(action, false));
    const releaseWhenHidden = () => { if (document.hidden) releaseAll(); };
    window.addEventListener('blur', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    document.addEventListener('visibilitychange', releaseWhenHidden);
    return () => {
      releaseAll();
      window.removeEventListener('blur', releaseAll);
      window.removeEventListener('pagehide', releaseAll);
      document.removeEventListener('visibilitychange', releaseWhenHidden);
    };
  }, [onInput]);

  if (!visible) return null;

  const bindButton = (action: InputAction) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      if (tracker.current.press(action, e.pointerId)) onInput(action, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      if (tracker.current.release(action, e.pointerId)) onInput(action, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      if (tracker.current.release(action, e.pointerId)) onInput(action, false);
    },
    onLostPointerCapture: (e: React.PointerEvent) => {
      if (tracker.current.release(action, e.pointerId)) onInput(action, false);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId) && tracker.current.release(action, e.pointerId)) onInput(action, false);
    },
  });

  return (
    <div
      className={`touch-controls absolute inset-x-0 bottom-0 pointer-events-none flex justify-between items-end select-none z-30 ${leftHanded ? 'flex-row-reverse' : ''}`}
      data-clear-view={clearView}
      data-handedness={leftHanded ? 'LEFT' : 'RIGHT'}
      aria-label={`${leftHanded ? 'Left' : 'Right'}-handed touch flight controls`}
      style={{
        opacity,
        paddingLeft: `max(env(safe-area-inset-left, 0px), ${safeInset}px)`,
        paddingRight: `max(env(safe-area-inset-right, 0px), ${safeInset}px)`,
        paddingBottom: `calc(max(env(safe-area-inset-bottom, 0px), ${safeInset}px) + ${lift}px)`,
      }}
    >
      {/* Left Flight D-Pad */}
      <div className="touch-control-panel grid grid-cols-3 gap-1.5 pointer-events-auto bg-zinc-950/60 backdrop-blur-md p-2 rounded-xl border border-cyan-500/30 shadow-xl touch-none" style={{ transform: `scale(${scale})`, transformOrigin: leftHanded ? 'bottom right' : 'bottom left' }}>
        <div />
        <button
          type="button"
          {...bindButton('PITCH_UP')}
          aria-label="Climb / Pitch Up"
          className="w-12 h-12 rounded-lg bg-zinc-900/90 active:bg-cyan-600 hover:bg-zinc-800 border border-cyan-500/40 active:border-cyan-400 flex items-center justify-center text-cyan-300 active:text-zinc-950 cursor-pointer shadow transition-colors"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div />

        <button
          type="button"
          {...bindButton('THROTTLE_DOWN')}
          aria-label="Brake / Turn / Fly Left"
          className="w-12 h-12 rounded-lg bg-zinc-900/90 active:bg-cyan-600 hover:bg-zinc-800 border border-cyan-500/40 active:border-cyan-400 flex items-center justify-center text-cyan-300 active:text-zinc-950 cursor-pointer shadow transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          {...bindButton('PITCH_DOWN')}
          aria-label="Dive / Pitch Down"
          className="w-12 h-12 rounded-lg bg-zinc-900/90 active:bg-cyan-600 hover:bg-zinc-800 border border-cyan-500/40 active:border-cyan-400 flex items-center justify-center text-cyan-300 active:text-zinc-950 cursor-pointer shadow transition-colors"
        >
          <ArrowDown className="w-6 h-6" />
        </button>
        <button
          type="button"
          {...bindButton('THROTTLE_UP')}
          aria-label="Turn / Fly Right"
          className="w-12 h-12 rounded-lg bg-zinc-900/90 active:bg-cyan-600 hover:bg-zinc-800 border border-cyan-500/40 active:border-cyan-400 flex items-center justify-center text-cyan-300 active:text-zinc-950 cursor-pointer shadow transition-colors"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Right Weapons & Systems Cluster */}
      <div className="flex flex-col gap-1.5 pointer-events-auto items-end touch-none" style={{ transform: `scale(${scale})`, transformOrigin: leftHanded ? 'bottom left' : 'bottom right' }}>
        <div className="flex gap-1.5">
          {/* VTOL Toggle */}
          <button
            type="button"
            {...bindButton('VTOL')}
            aria-label="VTOL Hover Mode"
            className="px-3.5 py-2 rounded-lg bg-amber-950/80 active:bg-amber-500 hover:bg-amber-900/90 border border-amber-500 text-amber-300 active:text-zinc-950 text-xs font-bold font-display shadow cursor-pointer transition-colors"
          >
            VTOL HOVER
          </button>
        </div>

        <div className="touch-control-panel grid grid-cols-4 gap-1.5 bg-zinc-950/60 backdrop-blur-md p-1.5 rounded-xl border border-cyan-500/30 shadow-xl">
          {/* Cannon */}
          <button
            type="button"
            {...bindButton('PRIMARY_FIRE')}
            aria-label="Fire twin 30mm ADEN cannon"
            className="w-13 h-13 rounded-lg bg-cyan-950/90 active:bg-cyan-500 hover:bg-cyan-900/90 border-2 border-cyan-400 text-cyan-200 active:text-zinc-950 font-display font-black text-[11px] flex flex-col items-center justify-center cursor-pointer shadow transition-colors"
          >
            <Crosshair className="w-5 h-5 mb-0.5" /> GUN
          </button>

          {/* Missile */}
          <button
            type="button"
            {...bindButton('SECONDARY_FIRE')}
            aria-label={`Fire selected ${selectedWeapon.toLowerCase()}`}
            className="w-13 h-13 rounded-lg bg-rose-950/90 active:bg-rose-500 hover:bg-rose-900/90 border-2 border-rose-500 text-rose-200 active:text-zinc-950 font-display font-black text-[11px] flex flex-col items-center justify-center cursor-pointer shadow transition-colors"
          >
            <Zap className="w-5 h-5 mb-0.5" /> {selectedWeapon === 'MISSILE' ? 'AIM-9L' : selectedWeapon}
          </button>

          {/* Bomb */}
          <button
            type="button"
            {...bindButton('CYCLE_WEAPON')}
            aria-label="Cycle secondary weapon"
            className="w-13 h-13 rounded-lg bg-amber-950/90 active:bg-amber-500 hover:bg-amber-900/90 border-2 border-amber-500 text-amber-200 active:text-zinc-950 font-display font-black text-[11px] flex flex-col items-center justify-center cursor-pointer shadow transition-colors"
          >
            <Repeat2 className="w-5 h-5 mb-0.5" /> CYCLE
          </button>

          {/* Rocket Pods */}
          <button
            type="button"
            {...bindButton('COUNTERMEASURE')}
            aria-label="Deploy countermeasure flares"
            className="w-13 h-13 rounded-lg bg-indigo-950/90 active:bg-indigo-500 hover:bg-indigo-900/90 border-2 border-indigo-400 text-indigo-200 active:text-zinc-950 font-display font-black text-[11px] flex flex-col items-center justify-center cursor-pointer shadow transition-colors"
          >
            <Shield className="w-5 h-5 mb-0.5" /> FLARE
          </button>
        </div>
      </div>
    </div>
  );
};

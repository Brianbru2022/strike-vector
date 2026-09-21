import React from 'react';
import { X, Navigation, Crosshair, Shield, Target, Anchor, Accessibility, Award, LockKeyhole } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { RELEASE_INFO } from '../game/Release';
import { DIRECTIONAL_FLIGHT_COPY } from '../game/DirectionalFlightCopy';

interface HowToPlayModalProps {
  onClose: () => void;
  onStartTraining?: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose, onStartTraining }) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md font-mono-tech select-none overflow-y-auto">
      <div className="w-full max-w-3xl bg-zinc-900 border-2 border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-zinc-950 border-b border-cyan-500/30 p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-display font-black text-lg tracking-wider">
            <Navigation className="w-5 h-5 text-cyan-400" />
            <span>IRON KESTREL ’87 // TACTICAL FLIGHT MANUAL</span>
          </div>
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs / Sections */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto text-xs">
          {/* Key Bindings Table */}
          <div>
            <div className="text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Crosshair className="w-4 h-4" /> FLIGHT & WEAPONS CONTROLS
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-cyan-300 font-bold block text-sm">W / UP</span>
                <span className="text-[10px] text-zinc-400">CLIMB / PITCH UP</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-cyan-300 font-bold block text-sm">S / DOWN</span>
                <span className="text-[10px] text-zinc-400">DIVE / PITCH DOWN</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-cyan-300 font-bold block text-sm">D / RIGHT</span>
                <span className="text-[10px] text-zinc-400">{DIRECTIONAL_FLIGHT_COPY.rightAction.toUpperCase()}</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-cyan-300 font-bold block text-sm">A / LEFT</span>
                <span className="text-[10px] text-zinc-400">{DIRECTIONAL_FLIGHT_COPY.leftAction.toUpperCase()}</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-amber-500/40">
                <span className="text-amber-400 font-bold block text-sm">SHIFT / V</span>
                <span className="text-[10px] text-amber-200">VTOL HOVER MODE</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-cyan-500/40">
                <span className="text-cyan-300 font-bold block text-sm">SPACE / L-CLICK</span>
                <span className="text-[10px] text-cyan-200">TWIN 30mm ADEN (HOLD)</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-rose-500/40">
                <span className="text-rose-300 font-bold block text-sm">J / Z / R-CLICK</span>
                <span className="text-[10px] text-rose-200">FIRE SELECTED SECONDARY</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-amber-500/40">
                <span className="text-amber-300 font-bold block text-sm">Q / TAB</span>
                <span className="text-[10px] text-amber-200">CYCLE AIM-9 / BOMB / ROCKET</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-indigo-500/40">
                <span className="text-indigo-300 font-bold block text-sm">GAMEPAD B / Y</span>
                <span className="text-[10px] text-indigo-200">SECONDARY / CYCLE</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-emerald-500/40">
                <span className="text-emerald-300 font-bold block text-sm">F / E / 4</span>
                <span className="text-[10px] text-emerald-200">COUNTERMEASURE FLARES</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-zinc-700">
                <span className="text-zinc-300 font-bold block text-sm">P / ESC</span>
                <span className="text-[10px] text-zinc-400">PAUSE SORTIE</span>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded border border-cyan-500/40">
                <span className="text-cyan-300 font-bold block text-sm">ON-SCREEN</span>
                <span className="text-[10px] text-cyan-200">TOUCH / MOUSE D-PAD</span>
              </div>
            </div>
            <div className="mt-2 rounded border border-cyan-700/40 bg-cyan-950/15 p-2 text-[10px] leading-relaxed text-zinc-300">
              <strong className="text-cyan-200">{DIRECTIONAL_FLIGHT_COPY.concept}</strong> {DIRECTIONAL_FLIGHT_COPY.behaviour}
              <div className="mt-1 grid gap-1 text-[9px] text-zinc-500 sm:grid-cols-3"><span>KEYBOARD: {DIRECTIONAL_FLIGHT_COPY.keyboard}</span><span>GAMEPAD: {DIRECTIONAL_FLIGHT_COPY.gamepad}</span><span>TOUCH: {DIRECTIONAL_FLIGHT_COPY.touch}</span></div>
            </div>
          </div>

          {/* Tactical Systems Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VTOL & Altitude Bands */}
            <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col gap-2">
              <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> VTOL & TACTICAL ALTITUDE
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed font-sans">
                <strong>VTOL Hover:</strong> Holding SHIFT engages vectoring thrusters, allowing full hover to precision-bomb ground silos or perform carrier recovery. Hovering burns +140% fuel and increases exposure to ground AA.
              </p>
              <p className="text-zinc-300 text-[11px] leading-relaxed font-sans">
                <strong>Low Altitude:</strong> Skimming below 480ft masks your jet from early-warning radars and long-range SAM missiles.
              </p>
            </div>

            {/* Target Destruction & Chain Reactions */}
            <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col gap-2">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <Target className="w-4 h-4" /> CAUSE & EFFECT DESTRUCTION
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed font-sans">
                <strong>Radar Stations:</strong> Destroying radar dishes collapses regional SAM accuracy by 70%.
              </p>
              <p className="text-zinc-300 text-[11px] leading-relaxed font-sans">
                <strong>Fuel Depots:</strong> Heavy bombs trigger massive secondary chain reactions with rising smoke plumes.
              </p>
              <p className="text-zinc-300 text-[11px] leading-relaxed font-sans">
                <strong>Carrier Recovery:</strong> Follow the approach guidance, lower forward speed and descent rate, align over the marked deck and use partial or full nozzle as required.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-sky-700/50 bg-sky-950/20 p-3.5">
              <div className="mb-2 flex items-center gap-1.5 font-bold text-sky-300"><Anchor className="h-4 w-4" /> RECOVERY & SERVICING</div>
              <ul className="space-y-1 text-[11px] leading-relaxed text-zinc-300 font-sans"><li>• Rolling recovery rewards a stable shallow approach; vertical recovery trades speed for fuel.</li><li>• Carrier servicing fully repairs the aircraft. FARP servicing is deliberately limited.</li><li>• Failed campaign retries restore the pre-sortie aircraft snapshot.</li><li>• Landing Practice is isolated from campaign and operation saves.</li></ul>
            </div>
            <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/20 p-3.5">
              <div className="mb-2 flex items-center gap-1.5 font-bold text-emerald-300"><Accessibility className="h-4 w-4" /> ACCESSIBILITY GUIDE</div>
              <ul className="space-y-1 text-[11px] leading-relaxed text-zinc-300 font-sans"><li>• Radio captions preserve every tactical call when speech is muted.</li><li>• HUD contrast and general text contrast can be adjusted independently.</li><li>• Threat shapes remain distinct without colour: ◆ missile, △ fighter, ✦ damage and ○ recovery.</li><li>• Aircraft use reinforced silhouettes; missiles and rockets have distinct motor trails so direction and weapon type remain readable without labels.</li><li>• Optional Smart Combat Camera gently frames nearby threats without changing collision, weapon ranges or simulation geometry.</li><li>• Reduced effects limits particles, lightning and camera motion while retaining launches, impacts, objectives and recovery cues.</li><li>• Touch size, opacity, safe area, lift, clear-view panels and handedness are adjustable in System Settings.</li><li>• Xbox-compatible controllers support remapping and menu navigation; disconnecting releases every held action and restores keyboard or touch control.</li></ul>
            </div>
          </div>

          <div className="rounded-lg border border-amber-700/40 bg-black/35 p-3.5">
            <div className="mb-2 flex items-center gap-1.5 font-bold text-amber-300"><Award className="h-4 w-4" /> CREDITS & RELEASE</div>
            <div className="grid gap-2 text-[10px] leading-relaxed text-zinc-400 sm:grid-cols-2"><p><strong className="text-zinc-200">Creative direction and development</strong><br />Independent user-directed production with engineering assistance from OpenAI Codex.</p><p><strong className="text-zinc-200">Release</strong><br />Iron Kestrel ’87: North Atlantic Air War {RELEASE_INFO.displayVersion}<br />Build {RELEASE_INFO.buildId}</p><p><strong className="text-zinc-200">Artwork and audio</strong><br />Original painted 2D assets, curated AI-assisted source art and bundled offline sound production.</p><p><strong className="text-zinc-200">Notice</strong><br />An original alternative-history work. No endorsement or affiliation with aircraft manufacturers, armed forces or earlier Harrier games is claimed.</p></div>
          </div>

          <div className="rounded-lg border border-cyan-700/40 bg-cyan-950/10 p-3.5">
            <div className="mb-2 flex items-center gap-1.5 font-bold text-cyan-300"><LockKeyhole className="h-4 w-4" /> PRIVACY, SUPPORT & LEGAL</div>
            <p className="mb-3 text-[10px] leading-relaxed text-zinc-400">Campaign progress and settings stay on this device. Consumer builds do not record playtest diagnostics. Exports are created only when requested and are never uploaded automatically.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <a href="/legal/EULA.txt" target="_blank" rel="noreferrer" className="rounded border border-cyan-700/50 bg-black/35 px-3 py-2 text-center text-[10px] font-bold text-cyan-200 transition hover:border-cyan-400 hover:text-white">END-USER LICENCE</a>
              <a href="/legal/PRIVACY.txt" target="_blank" rel="noreferrer" className="rounded border border-cyan-700/50 bg-black/35 px-3 py-2 text-center text-[10px] font-bold text-cyan-200 transition hover:border-cyan-400 hover:text-white">PRIVACY NOTICE</a>
              <a href="/legal/AI_CONTENT_DISCLOSURE.txt" target="_blank" rel="noreferrer" className="rounded border border-cyan-700/50 bg-black/35 px-3 py-2 text-center text-[10px] font-bold text-cyan-200 transition hover:border-cyan-400 hover:text-white">AI CONTENT DISCLOSURE</a>
              <a href="/legal/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer" className="rounded border border-cyan-700/50 bg-black/35 px-3 py-2 text-center text-[10px] font-bold text-cyan-200 transition hover:border-cyan-400 hover:text-white">THIRD-PARTY NOTICES</a>
              <a href="/legal/RUST_THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer" className="rounded border border-cyan-700/50 bg-black/35 px-3 py-2 text-center text-[10px] font-bold text-cyan-200 transition hover:border-cyan-400 hover:text-white">WINDOWS NOTICES</a>
              <a href="/legal/SUPPORT.txt" target="_blank" rel="noreferrer" className="rounded border border-cyan-700/50 bg-black/35 px-3 py-2 text-center text-[10px] font-bold text-cyan-200 transition hover:border-cyan-400 hover:text-white">SUPPORT & REPORTING</a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-950 border-t border-zinc-800 p-4 px-6 flex justify-end gap-2">
          {onStartTraining ? <button type="button" onClick={() => { soundEngine.playUIClick(); onStartTraining(); }} className="rounded border border-emerald-500/60 bg-emerald-950/40 px-5 py-2 text-xs font-bold text-emerald-200">REPLAY FLIGHT SCHOOL</button> : null}
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs"
          >
            DISMISS INTEL
          </button>
        </div>
      </div>
    </div>
  );
};

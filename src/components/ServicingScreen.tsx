import React, { useMemo, useState } from 'react';
import { AircraftCondition, LoadoutPreset, MissionDefinition } from '../types/game';
import { getOfferedLoadouts, LOADOUT_PRESETS, serviceAircraft } from '../game/ServiceSystem';
import { ArrowRight, Fuel, ShieldCheck, Wrench } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { isNorwegianMission, missionPresentationArtwork } from '../game/MissionPresentation';

interface ServicingScreenProps {
  mission: MissionDefinition;
  recoveredCondition: AircraftCondition;
  selectedLoadout: LoadoutPreset;
  onComplete: (condition: AircraftCondition, loadout: LoadoutPreset) => void;
}

const ConditionBar: React.FC<{ label: string; before: number; after: number; percent?: boolean }> = ({ label, before, after, percent = true }) => {
  const scale = percent ? 1 : 100;
  return (
    <div className="rounded border border-white/10 bg-black/45 p-2.5">
      <div className="mb-1 flex justify-between text-[10px] font-bold tracking-wider text-zinc-300">
        <span>{label}</span>
        <span><span className="text-amber-300">{Math.round(before * scale)}%</span> → <span className="text-emerald-300">{Math.round(after * scale)}%</span></span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-zinc-800"><div className="h-full bg-emerald-400" style={{ width: `${after * scale}%` }} /></div>
    </div>
  );
};

export const ServicingScreen: React.FC<ServicingScreenProps> = ({ mission, recoveredCondition, selectedLoadout, onComplete }) => {
  const offeredLoadouts = useMemo(() => getOfferedLoadouts(mission), [mission]);
  const [loadout, setLoadout] = useState<LoadoutPreset>(() => offeredLoadouts.includes(selectedLoadout) ? selectedLoadout : offeredLoadouts[0]);
  const siteType = mission.recoverySite === 'FORWARD_BASE' ? 'FORWARD_BASE' : 'CARRIER';
  const service = useMemo(() => serviceAircraft(recoveredCondition, siteType, loadout), [recoveredCondition, siteType, loadout]);
  const background = siteType === 'CARRIER' ? '/assets/ui/carrier-servicing-v1.webp' : '/assets/ui/farp-servicing-v1.webp';
  const norwegianSortie = isNorwegianMission(mission);
  const missionBackdrop = missionPresentationArtwork(mission);

  return (
    <div className="mission-screen-enter absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-zinc-950 p-3 font-mono-tech md:p-7">
      <img src={missionBackdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <img src={background} alt="" className="absolute inset-y-0 right-0 h-full w-[62%] object-cover opacity-45 [mask-image:linear-gradient(90deg,transparent,black_28%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-slate-950/60" />
      <section className="relative my-auto w-full max-w-5xl overflow-hidden rounded-xl border border-emerald-400/45 bg-slate-950/88 shadow-2xl backdrop-blur-sm">
        <header className="border-b border-emerald-400/25 bg-black/55 p-4 md:px-6">
          <div className="text-[10px] font-bold tracking-[.28em] text-emerald-400">{norwegianSortie ? 'NORWEGIAN JOINT COMMAND // ' : ''}{siteType === 'CARRIER' ? 'HMS INVINCIBLE FLIGHT DECK' : 'EXPEDITIONARY FARP TURNAROUND'}</div>
          <h1 className="mt-1 font-display text-2xl font-black tracking-wider text-zinc-100 md:text-3xl">AIRCRAFT SERVICING</h1>
          <p className="mt-1 max-w-2xl text-xs text-zinc-400">{siteType === 'CARRIER' ? 'Full carrier workshop repair, refuel and rearm.' : 'Field crews apply limited repairs, then fully refuel and replenish countermeasures.'}</p>
        </header>

        <div className="grid gap-4 p-4 md:grid-cols-[.9fr_1.1fr] md:p-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-300"><Wrench className="h-4 w-4" /> CONDITION REPORT</div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              <ConditionBar label="AIRFRAME" before={service.incoming.health} after={service.outgoing.health} />
              <ConditionBar label="FUEL" before={service.incoming.fuel} after={service.outgoing.fuel} />
              <ConditionBar label="ENGINE" before={service.incoming.subsystems.engine} after={service.outgoing.subsystems.engine} percent={false} />
              <ConditionBar label="FLIGHT CONTROLS" before={service.incoming.subsystems.flightControls} after={service.outgoing.subsystems.flightControls} percent={false} />
              <ConditionBar label="AVIONICS" before={service.incoming.subsystems.targeting} after={service.outgoing.subsystems.targeting} percent={false} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-300"><ShieldCheck className="h-4 w-4" /> SELECT 1987 LOADOUT</div>
            <div className="grid gap-2">
              {offeredLoadouts.map((key) => {
                const preset = LOADOUT_PRESETS[key];
                const active = key === loadout;
                return (
                  <button key={key} type="button" onClick={() => { soundEngine.playUIClick(); setLoadout(key); }} className={`rounded-lg border p-3 text-left transition ${active ? 'border-emerald-400 bg-emerald-950/55 shadow-[0_0_22px_rgba(52,211,153,.12)]' : 'border-white/10 bg-black/45 hover:border-emerald-500/40'}`}>
                    <div className="flex items-center justify-between gap-3"><span className="font-display text-sm font-black tracking-wider text-zinc-100">{preset.label.toUpperCase()}</span>{active && <span className="rounded bg-emerald-400 px-2 py-0.5 text-[9px] font-black text-slate-950">SELECTED</span>}</div>
                    <p className="mt-1 text-[11px] text-zinc-400">{preset.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold"><span className="text-rose-300">AIM-9L ×{preset.missiles}</span><span className="text-amber-300">BOMBS ×{preset.bombs}</span><span className="text-cyan-300">ROCKETS ×{preset.rockets}</span><span className="text-emerald-300">FLARES ×{preset.flares}</span></div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-zinc-500">Only loadouts certified to carry sufficient period ordnance for the next sortie are offered.</p>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-white/10 bg-black/55 p-4 md:px-6">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400"><Fuel className="h-4 w-4 text-amber-300" /> CONDITION AND LOADOUT WILL CARRY INTO THE NEXT SORTIE</div>
          <button type="button" onClick={() => { soundEngine.playUIClick(); onComplete(service.outgoing, loadout); }} className="flex items-center gap-2 rounded bg-emerald-400 px-5 py-2.5 font-display text-xs font-black tracking-wider text-slate-950 hover:bg-emerald-300">TURNAROUND COMPLETE <ArrowRight className="h-4 w-4" /></button>
        </footer>
      </section>
    </div>
  );
};

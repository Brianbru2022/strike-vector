import React from 'react';
import { Anchor, CheckCircle2, Crosshair, Lock, Plane, RadioTower, Shield, X } from 'lucide-react';
import { CampaignSave, MissionDefinition } from '../types/game';
import { soundEngine } from '../audio/SoundEngine';

interface CampaignMapProps {
  missions: MissionDefinition[];
  save: CampaignSave;
  onSelectMission: (mission: MissionDefinition, index: number) => void;
  onClose: () => void;
}

const sectorPositions = [
  { left: '13%', top: '68%' },
  { left: '31%', top: '50%' },
  { left: '51%', top: '38%' },
  { left: '70%', top: '27%' },
  { left: '86%', top: '14%' },
];

export const CampaignMap: React.FC<CampaignMapProps> = ({ missions, save, onSelectMission, onClose }) => (
  <div className="mission-screen-enter absolute inset-0 z-30 overflow-hidden bg-[#020706] font-mono-tech text-[#d8ffe5]">
    <img src="/assets/ui/campaign-map-northern-lance.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,7,7,.72)_0%,rgba(1,7,7,.05)_25%,rgba(1,7,7,.12)_70%,rgba(1,7,7,.88)_100%)]" />
    <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,.85)]" />

    <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between border-b border-emerald-300/20 bg-[#020806]/70 px-4 py-3 backdrop-blur-md sm:px-7 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden h-12 w-12 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-950/60 shadow-[0_0_25px_rgba(99,217,154,.18)] sm:flex">
          <Crosshair className="h-6 w-6 text-emerald-200" />
        </div>
        <div>
          <p className="text-[8px] tracking-[.32em] text-emerald-200/65 sm:text-[10px]">NORTH ATLANTIC COMMAND // 1987</p>
          <h2 className="font-display text-lg font-black tracking-[.12em] text-[#effff3] drop-shadow-[0_2px_10px_rgba(120,255,170,.2)] sm:text-3xl">OPERATION NORTHERN LANCE</h2>
          <div className="mt-1 flex items-center gap-2 text-[8px] uppercase tracking-[.18em] text-amber-200/80 sm:text-[9px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" /> Live theatre plot · select an available sortie
          </div>
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Return to main menu" className="rounded border border-emerald-300/35 bg-black/45 p-2 text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-950/70">
        <X className="h-5 w-5" />
      </button>
    </header>

    <main className="absolute inset-x-0 bottom-12 top-[88px] hidden lg:block">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 112 430 C 220 400, 245 335, 320 315 S 455 265, 520 235 S 650 170, 710 155 S 825 92, 875 78" fill="none" stroke="rgba(159,255,194,.18)" strokeWidth="8" />
        <path d="M 112 430 C 220 400, 245 335, 320 315 S 455 265, 520 235 S 650 170, 710 155 S 825 92, 875 78" fill="none" stroke="rgba(159,255,194,.72)" strokeWidth="1.5" strokeDasharray="7 9" />
      </svg>

      {save.sectors.map((sector, sectorIndex) => {
        const startIndex = sectorIndex * 2;
        const accessible = startIndex <= save.unlockedMission;
        return (
          <section key={sector.id} style={sectorPositions[sectorIndex]} className={`group absolute w-[clamp(145px,15vw,210px)] -translate-x-1/2 -translate-y-1/2 rounded-md border backdrop-blur-md transition ${accessible ? 'border-emerald-200/45 bg-[#03110c]/82 shadow-[0_10px_35px_rgba(0,0,0,.55),0_0_25px_rgba(80,220,140,.08)]' : 'border-slate-500/25 bg-[#02070b]/78 text-slate-500 grayscale'}`}>
            <div className="absolute left-1/2 top-full h-8 -translate-x-1/2 border-l border-dashed border-emerald-200/30" />
            <div className="absolute left-1/2 top-[calc(100%+2rem)] h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-emerald-100/70 bg-[#07140f] shadow-[0_0_12px_rgba(120,255,170,.65)]" />

            <div className="flex items-center justify-between border-b border-current/15 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current/45 bg-black/35">
                  {sectorIndex === 0 ? <Anchor className="h-3.5 w-3.5" /> : sectorIndex === 4 ? <RadioTower className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <p className="text-[7px] uppercase tracking-[.2em] text-current/55">Sector 0{sectorIndex + 1}</p>
                  <p className="font-display text-[10px] font-bold uppercase leading-tight tracking-wide text-current sm:text-[11px]">{sector.name}</p>
                </div>
              </div>
              {sector.secured ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : !accessible ? <Lock className="h-3.5 w-3.5" /> : null}
            </div>

            <div className="space-y-1.5 p-2">
              {missions.slice(startIndex, startIndex + 2).map((mission, localIndex) => {
                const index = startIndex + localIndex;
                const unlocked = index <= save.unlockedMission;
                const complete = save.completedMissionIds.includes(mission.id);
                return (
                  <button type="button" key={mission.id} disabled={!unlocked} aria-label={unlocked ? `Open Mission ${index + 1}: ${mission.title}` : `Mission ${index + 1}: ${mission.title}, locked`} onClick={() => { soundEngine.playUIClick(); onSelectMission(mission, index); }} className="flex w-full items-center gap-1.5 rounded-sm border border-current/15 bg-black/25 px-2 py-1.5 text-left text-[8px] transition enabled:hover:border-emerald-200/60 enabled:hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:border-slate-500/50 disabled:bg-slate-950/90 disabled:text-slate-300 sm:text-[9px]">
                    {complete ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : unlocked ? <Plane className="h-3 w-3 shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />}
                    <span className="truncate"><strong className="text-amber-200">M{index + 1}</strong> {mission.title}</span>
                  </button>
                );
              })}
              {sector.forwardBase && <p className="border-t border-amber-200/20 pt-1.5 text-[7px] uppercase tracking-wider text-amber-200">FARP active · rearm + repair</p>}
            </div>
          </section>
        );
      })}
    </main>

    <main className="absolute inset-x-0 bottom-12 top-[88px] z-10 overflow-x-auto px-4 pb-4 pt-8 lg:hidden">
      <div className="flex min-h-full snap-x items-end gap-3">
        {save.sectors.map((sector, sectorIndex) => {
          const startIndex = sectorIndex * 2;
          const accessible = startIndex <= save.unlockedMission;
          return (
            <section key={sector.id} className={`w-[72vw] max-w-[280px] shrink-0 snap-center rounded-lg border p-3 backdrop-blur-md ${accessible ? 'border-emerald-200/45 bg-[#03110c]/88' : 'border-slate-600/30 bg-[#02070b]/88 text-slate-500'}`}>
              <div className="mb-3 flex items-center justify-between"><p className="font-display text-sm font-bold uppercase">{sector.name}</p>{accessible ? <Shield className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</div>
              <div className="space-y-2">
                {missions.slice(startIndex, startIndex + 2).map((mission, localIndex) => {
                  const index = startIndex + localIndex;
                  const unlocked = index <= save.unlockedMission;
                  return (
                    <button key={mission.id} type="button" disabled={!unlocked} aria-label={unlocked ? `Open Mission ${index + 1}: ${mission.title}` : `Mission ${index + 1}: ${mission.title}, locked`} onClick={() => { soundEngine.playUIClick(); onSelectMission(mission, index); }} className="flex w-full items-center gap-2 rounded border border-current/20 bg-black/35 px-3 py-2 text-left text-[10px] disabled:border-slate-500/50 disabled:bg-slate-950/90 disabled:text-slate-300">
                      {unlocked ? <Plane className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}<span><strong>M{index + 1}</strong> {mission.title}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>

    <footer className="absolute inset-x-0 bottom-0 z-20 flex h-12 items-center justify-between border-t border-emerald-300/20 bg-[#020806]/78 px-4 text-[8px] uppercase tracking-[.12em] text-emerald-200/65 backdrop-blur-md sm:px-7 sm:text-[9px]">
      <span>Clear both missions to establish the next forward operating point</span>
      <span className="hidden items-center gap-2 text-amber-200/80 sm:flex"><RadioTower className="h-3.5 w-3.5" /> NATO LINK 17 · SECURE</span>
    </footer>
  </div>
);

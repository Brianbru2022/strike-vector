import React from 'react';
import { MissionDefinition } from '../types/game';
import { AlertTriangle, Crosshair, MapPin, Navigation, Play, Radio, Sun, Target, Wind } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { missionPresentationArtwork } from '../game/MissionPresentation';

interface BriefingScreenProps {
  mission: MissionDefinition;
  onLaunch: () => void;
  onBack: () => void;
  guidedTraining?: boolean;
  onGuidedTrainingChange?: (guided: boolean) => void;
  tutorialCompleted?: boolean;
}

const threatStyles: Record<string, string> = {
  CRITICAL: 'border-rose-400/70 bg-rose-500/20 text-rose-200',
  HIGH: 'border-amber-400/70 bg-amber-500/20 text-amber-200',
  MODERATE: 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100',
};

export const BriefingScreen: React.FC<BriefingScreenProps> = ({ mission, onLaunch, onBack, guidedTraining = false, onGuidedTrainingChange, tutorialCompleted = false }) => {
  const missionNumber = mission.id.match(/^m\d+/i)?.[0].toUpperCase() ?? mission.id.toUpperCase();
  const missionArtwork = missionPresentationArtwork(mission);

  const handleLaunch = React.useCallback(() => {
    soundEngine.playUIClick();
    soundEngine.playRadioCall('KESTREL ONE SCRAMBLE. ALL UNITS COMBAT READY.');
    onLaunch();
  }, [onLaunch]);

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleLaunch();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleLaunch, onBack]);

  return (
    <div id="briefing-screen" className="mission-screen-enter absolute inset-0 z-20 flex h-full w-full items-center justify-center overflow-y-auto bg-[#020706] p-3 font-mono-tech select-none md:p-6">
      <img src={missionArtwork} alt="" className="fixed inset-0 h-full w-full object-cover opacity-35" draggable={false} />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_67%_38%,rgba(5,42,36,.08),rgba(1,5,5,.95)_76%)]" />

      <section className="relative z-10 my-auto flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-emerald-300/45 bg-[#06100d]/95 shadow-[0_28px_90px_rgba(0,0,0,.85),0_0_44px_rgba(80,220,140,.10)] backdrop-blur-lg">
        <div className="relative min-h-[210px] shrink-0 overflow-hidden border-b border-cyan-400/35 md:min-h-[250px]">
          <img src={missionArtwork} alt="Sea Harrier launching from a carrier towards the coastal target area" className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,7,6,.88)_0%,rgba(1,7,6,.30)_52%,rgba(1,7,6,.52)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#020806] via-[#020806]/45 to-transparent" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(104,255,180,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(104,255,180,.18)_1px,transparent_1px)] [background-size:48px_48px]" />

          <header className="relative flex items-start justify-between gap-4 p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md border border-cyan-400/70 bg-cyan-950/80 p-2.5 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,.16)]"><Radio className="h-5 w-5 animate-pulse" /></div>
              <div className="text-[10px] font-bold tracking-[.22em] text-emerald-200 uppercase md:text-xs">North Atlantic Command // Eyes Only</div>
            </div>
            <div className="flex items-center gap-2 rounded border border-white/10 bg-black/50 px-3 py-2 text-[10px] text-zinc-300 backdrop-blur-md">
              <span>DAY {mission.dayNumber}</span><span className="text-zinc-600">/</span><span>{mission.timeString}</span>
              <span className={`ml-1 rounded border px-2 py-0.5 font-bold ${threatStyles[mission.threatLevel] ?? threatStyles.MODERATE}`}>{mission.threatLevel}</span>
            </div>
          </header>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 md:p-6">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-amber-300 uppercase"><Crosshair className="h-3.5 w-3.5" /> Mission {missionNumber} · Strike package</div>
              <h1 className="font-display text-2xl font-black tracking-[.08em] text-white drop-shadow-lg md:text-4xl">OPERATION {mission.codeName}</h1>
              <div className="mt-2 flex items-center gap-2 text-[10px] tracking-wider text-emerald-100/75 uppercase"><MapPin className="h-3 w-3 text-cyan-300" /> {mission.theater}</div>
            </div>
            <div className="hidden rounded border border-emerald-200/20 bg-black/45 px-4 py-2 text-right backdrop-blur-sm md:block">
              <div className="text-[9px] tracking-[.2em] text-zinc-500 uppercase">Aircraft assigned</div>
              <div className="font-display text-sm font-bold tracking-wider text-emerald-200">SEA HARRIER FRS.1</div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200/20 bg-[#020806]/72 p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-wider text-cyan-300 uppercase"><Navigation className="h-3.5 w-3.5" /> Mission directive</div>
                <p className="font-sans text-sm leading-relaxed text-zinc-200">{mission.briefingText}</p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-zinc-400 uppercase"><Target className="h-3.5 w-3.5 text-rose-400" /> Assigned objectives</div>
                  <span className="text-[9px] tracking-widest text-zinc-600 uppercase">Tasking order</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {mission.objectives.map((objective, index) => (
                    <div key={objective.id} className={`relative min-h-[76px] overflow-hidden rounded-lg border p-3 pl-12 ${objective.isPrimary ? 'border-cyan-400/35 bg-cyan-950/20' : 'border-zinc-700/60 bg-zinc-950/55'}`}>
                      <div className={`absolute inset-y-0 left-0 flex w-9 items-center justify-center border-r font-display text-lg font-black ${objective.isPrimary ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300' : 'border-zinc-700 bg-zinc-900 text-zinc-500'}`}>{String(index + 1).padStart(2, '0')}</div>
                      <div className="mb-1 text-[8px] font-bold tracking-[.16em] text-zinc-500 uppercase">{objective.isPrimary ? 'Primary objective' : 'Secondary objective'}</div>
                      <div className="pr-16 text-xs font-semibold leading-snug text-zinc-100">{objective.description}</div>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 font-display text-xs font-bold text-amber-300">+{objective.points}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="overflow-hidden rounded-lg border border-cyan-400/35 bg-[#020806]/85">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[9px] font-bold tracking-[.16em] text-zinc-400 uppercase"><span>Target intelligence</span><span className="text-cyan-300">LIVE FEED 04</span></div>
                <div className="relative h-28 overflow-hidden">
                  <img src={missionArtwork} alt="" className="h-full w-full object-cover object-right" draggable={false} />
                  <div className="absolute inset-0 bg-cyan-950/20 mix-blend-color" />
                  <div className="absolute left-[65%] top-[42%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-400/70 shadow-[0_0_18px_rgba(251,113,133,.3)]"><span className="absolute -right-7 -top-3 text-[8px] font-bold text-rose-300">OBJ-A</span></div>
                  <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(34,211,238,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.3)_1px,transparent_1px)] [background-size:18px_18px]" />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/65 p-3">
                <div className="mb-3 text-[9px] font-bold tracking-[.16em] text-zinc-400 uppercase">Flight conditions</div>
                <div className="grid grid-cols-2 divide-x divide-zinc-800">
                  <div className="pr-3"><Sun className="mb-1 h-4 w-4 text-amber-300" /><div className="text-[8px] tracking-wider text-zinc-600 uppercase">Light</div><div className="text-xs font-bold text-zinc-200">{mission.timeOfDay.time}</div></div>
                  <div className="pl-3"><Wind className="mb-1 h-4 w-4 text-sky-300" /><div className="text-[8px] tracking-wider text-zinc-600 uppercase">Weather</div><div className="text-xs font-bold text-zinc-200">{mission.weather.condition}</div></div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/65 p-3 sm:col-span-2 lg:col-span-1">
                <div className="mb-2 text-[9px] font-bold tracking-[.16em] text-zinc-400 uppercase">Tactical doctrine</div>
                <ul className="space-y-1.5 text-[10px] leading-snug text-zinc-300">
                  {mission.tacticalNotes.slice(0, 3).map((note, index) => <li key={note} className="flex gap-2"><span className="font-bold text-cyan-400">{String(index + 1).padStart(2, '0')}</span><span>{note}</span></li>)}
                </ul>
              </div>
            </aside>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div><div className="text-[9px] font-bold tracking-[.16em] text-rose-400 uppercase">Rules of engagement</div><div className="mt-0.5 text-[10px]">{mission.rulesOfEngagement}</div></div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-cyan-400/30 bg-[#020806]/95 p-3 md:px-5">
          <button onClick={onBack} className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-[10px] font-bold tracking-wider text-zinc-300 transition hover:border-zinc-500 hover:text-white">← ABORT BRIEFING</button>
          {mission.id === 'm1_coastal_strike' && onGuidedTrainingChange ? (
            <div className="flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-950/30 p-1 text-[9px]">
              <span className="hidden px-2 text-emerald-200 sm:inline">FLIGHT SCHOOL {tutorialCompleted ? 'COMPLETE' : 'AVAILABLE'}</span>
              <button type="button" onClick={() => onGuidedTrainingChange(true)} className={`rounded px-2 py-1 font-bold ${guidedTraining ? 'bg-emerald-300 text-slate-950' : 'text-zinc-400'}`}>GUIDED</button>
              <button type="button" onClick={() => onGuidedTrainingChange(false)} className={`rounded px-2 py-1 font-bold ${!guidedTraining ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>STANDARD</button>
            </div>
          ) : <div className="hidden items-center gap-2 text-[9px] tracking-widest text-emerald-400/60 uppercase sm:flex"><Radio className="h-3 w-3" /> Package ready · launch authority confirmed</div>}
          <button onClick={handleLaunch} className="flex cursor-pointer items-center gap-2 rounded bg-cyan-400 px-7 py-3 font-display text-sm font-black tracking-wider text-zinc-950 shadow-[0_0_28px_rgba(34,211,238,.22)] transition hover:bg-cyan-300 hover:shadow-[0_0_36px_rgba(34,211,238,.34)]"><Play className="h-4 w-4 fill-zinc-950" /> SCRAMBLE LAUNCH</button>
        </footer>
      </section>
    </div>
  );
};

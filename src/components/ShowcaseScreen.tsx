import React from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Film, Plane, RotateCcw } from 'lucide-react';
import { MissionDefinition, ShowcaseManifest, ShowcaseProgress } from '../types/game';
import { soundEngine } from '../audio/SoundEngine';

interface ShowcaseScreenProps {
  manifest: ShowcaseManifest;
  progress: ShowcaseProgress;
  missions: MissionDefinition[];
  onLaunch: (position: number) => void;
  onReset: () => void;
  onClose: () => void;
}

const ACCENTS = {
  CYAN: 'border-cyan-400/60 text-cyan-300',
  AMBER: 'border-amber-400/60 text-amber-300',
  RED: 'border-rose-400/60 text-rose-300',
};

export const ShowcaseScreen: React.FC<ShowcaseScreenProps> = ({ manifest, progress, missions, onLaunch, onReset, onClose }) => (
  <div id="showcase-screen" className="absolute inset-0 z-30 overflow-y-auto bg-[#020908]/95 p-3 sm:p-6 font-mono-tech text-zinc-100">
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-4">
      <header className="flex items-end justify-between border-b border-emerald-400/30 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[.3em] text-emerald-300"><Film className="h-4 w-4" /> CURATED FLIGHT PROGRAMME // 1987</div>
          <h1 className="mt-1 font-display text-3xl font-black tracking-[.12em] sm:text-5xl">{manifest.title}</h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-400">
            {manifest.entries.length === 2
              ? 'Two focused sorties demonstrating guided carrier qualification and storm-bound fleet defence. Demo progress is separate from paid-game saves.'
              : 'Three signature sorties demonstrating carrier operations, naval defence and the final Bastion assault. Progress is separate from the campaign.'}
          </p>
        </div>
        <button onClick={onClose} className="rounded border border-zinc-700 bg-zinc-900/80 p-2 text-zinc-300 hover:border-emerald-400/60" aria-label="Return to main menu"><ArrowLeft className="h-5 w-5" /></button>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        {manifest.entries.map((entry, position) => {
          const mission = missions.find((candidate) => candidate.id === entry.missionId);
          if (!mission) return null;
          const complete = progress.completedMissionIds.includes(entry.missionId);
          return (
            <article key={entry.missionId} className={`group overflow-hidden rounded-lg border bg-zinc-950/80 ${ACCENTS[entry.accent]}`}>
              <div className="relative h-36 overflow-hidden sm:h-44">
                <img src={entry.artwork} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                <div className="absolute left-3 top-3 rounded bg-zinc-950/80 px-2 py-1 text-[10px] font-black tracking-widest">SIGNATURE {position + 1}</div>
                {complete && <CheckCircle2 className="absolute right-3 top-3 h-6 w-6 text-emerald-300 drop-shadow" />}
              </div>
              <div className="p-4">
                <div className="text-[10px] font-bold tracking-[.2em] opacity-80">{mission.codeName} // {mission.timeString}</div>
                <h2 className="mt-1 font-display text-xl font-black text-zinc-100">{mission.title}</h2>
                <p className="mt-2 min-h-10 text-xs leading-relaxed text-zinc-400">{entry.strapline}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{mission.threatLevel} THREAT</span>
                  <span>BEST {Math.round(progress.bestScores[mission.id] || 0).toLocaleString()}</span>
                </div>
                <button onClick={() => { soundEngine.playUIClick(); onLaunch(position); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-current bg-current/10 py-2.5 font-display text-xs font-black tracking-wider hover:bg-current/20">
                  <Plane className="h-4 w-4" /> {complete ? 'REFLY SORTIE' : 'LAUNCH SORTIE'} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="flex items-center justify-between border-t border-emerald-400/20 pt-3 text-[10px] text-zinc-500">
        <span>{progress.completedMissionIds.length}/{manifest.entries.length} SIGNATURE SORTIES COMPLETE</span>
        <button onClick={onReset} className="flex items-center gap-1.5 rounded border border-zinc-800 px-2.5 py-1.5 hover:border-rose-500/50 hover:text-rose-300"><RotateCcw className="h-3 w-3" /> RESET SHOWCASE</button>
      </footer>
    </div>
  </div>
);

interface ShowcaseCompleteProps {
  manifest: ShowcaseManifest;
  progress: ShowcaseProgress;
  onRefly: () => void;
  onMenu: () => void;
}

export const ShowcaseComplete: React.FC<ShowcaseCompleteProps> = ({ manifest, progress, onRefly, onMenu }) => {
  const total = Object.values(progress.bestScores).reduce<number>((sum, score) => sum + Number(score), 0);
  const isDemo = manifest.entries.length === 2;
  return (
    <div id="showcase-complete" className="absolute inset-0 z-30 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(16,80,62,.34),rgba(1,7,7,.97)_62%)] p-5 font-mono-tech text-zinc-100">
      <div className="w-full max-w-xl rounded-xl border border-emerald-400/50 bg-zinc-950/90 p-7 text-center shadow-[0_0_80px_rgba(52,211,153,.12)]">
        <div className="text-xs font-black tracking-[.32em] text-emerald-300">{isDemo ? 'BROWSER DEMO COMPLETE' : 'NORTH ATLANTIC SHOWCASE COMPLETE'}</div>
        <h1 className="mt-3 font-display text-4xl font-black tracking-wider">{isDemo ? 'QUALIFIED. FLEET DEFENDED.' : 'THREE FRONTS. ONE HARRIER.'}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          {isDemo
            ? 'Carrier qualification and fleet defence have been recorded in the isolated demo dossier. The paid edition contains the complete campaign and Dynamic Operations.'
            : 'Carrier qualification, fleet defence and the Bastion withdrawal have been recorded in the independent showcase dossier.'}
        </p>
        <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-2 text-left text-xs">
          <div className="rounded border border-zinc-800 bg-zinc-900/80 p-3"><div className="text-zinc-500">SORTIES</div><div className="mt-1 font-display text-2xl font-black text-emerald-300">{manifest.entries.length} / {manifest.entries.length}</div></div>
          <div className="rounded border border-zinc-800 bg-zinc-900/80 p-3"><div className="text-zinc-500">BEST TOTAL</div><div className="mt-1 font-display text-2xl font-black text-amber-300">{Math.round(total).toLocaleString()}</div></div>
        </div>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button onClick={onRefly} className="rounded bg-emerald-400 px-5 py-2.5 font-display text-xs font-black tracking-wider text-zinc-950">{isDemo ? 'VIEW DEMO SORTIES' : 'VIEW SHOWCASE'}</button>
          <button onClick={onMenu} className="rounded border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-xs font-bold text-zinc-300">MAIN MENU</button>
        </div>
      </div>
    </div>
  );
};

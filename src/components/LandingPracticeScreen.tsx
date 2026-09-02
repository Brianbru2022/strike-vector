import React from 'react';
import { Anchor, CheckCircle2, MapPin, PlaneLanding, X } from 'lucide-react';
import { DifficultyPreset, GameScoreBreakdown } from '../types/game';
import { LANDING_PRACTICES, LandingPracticeConfig } from '../game/LandingPractice';

interface LandingPracticeScreenProps {
  result: GameScoreBreakdown | null;
  onLaunch: (config: LandingPracticeConfig) => void;
  onClose: () => void;
}

export function LandingPracticeScreen({ result, onLaunch, onClose }: LandingPracticeScreenProps) {
  const [difficulty, setDifficulty] = React.useState<DifficultyPreset>('PILOT');
  const [damaged, setDamaged] = React.useState(false);
  return (
    <section className="mission-screen-enter absolute inset-0 z-30 overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,rgba(12,74,110,.42),transparent_48%),linear-gradient(180deg,#071015,#020607)] p-4 font-mono-tech text-zinc-100 sm:p-7">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center">
        <header className="mb-5 flex items-start justify-between border-b border-cyan-500/30 pb-4">
          <div><div className="text-[10px] font-bold tracking-[.28em] text-cyan-300">800 NAS // RECOVERY TRAINING</div><h2 className="mt-1 font-display text-3xl font-black tracking-wider text-white">LANDING PRACTICE</h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-400">Fly the real carrier and forward-base recovery geometry with no combat pressure. Each attempt starts clean and remains completely separate from normal saves.</p></div>
          <button type="button" onClick={onClose} aria-label="Close landing practice" className="rounded border border-zinc-700 bg-black/50 p-2 text-zinc-400 hover:border-cyan-400 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        {result ? <div className={`mb-5 flex items-center gap-3 rounded border p-4 ${result.isVictory ? 'border-emerald-400/50 bg-emerald-950/35 text-emerald-200' : 'border-rose-400/50 bg-rose-950/35 text-rose-200'}`} aria-live="polite"><CheckCircle2 className="h-6 w-6" /><div><div className="font-display text-sm font-black">{result.isVictory ? `${result.carrierLandingGrade ?? 'SAFE'} RECOVERY` : 'APPROACH INCOMPLETE'}</div><div className="mt-1 text-[10px] text-zinc-300">Select any circuit to fly again. No campaign condition, score or ammunition was changed.</div></div></div> : null}

        <section aria-label="Recovery certification configuration" className="mb-4 grid gap-3 rounded-lg border border-zinc-700 bg-black/45 p-3 text-[10px] sm:grid-cols-2">
          <label className="flex flex-col gap-1 font-bold text-zinc-300">DIFFICULTY<select aria-label="Landing difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value as DifficultyPreset)} className="rounded border border-cyan-700 bg-zinc-950 px-3 py-2 text-cyan-200"><option value="ARCADE">ARCADE</option><option value="PILOT">PILOT</option><option value="VETERAN">VETERAN</option></select></label>
          <button type="button" aria-pressed={damaged} onClick={() => setDamaged((value) => !value)} className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-300"><span>AIRCRAFT CONDITION</span><strong className={damaged ? 'text-amber-300' : 'text-emerald-300'}>{damaged ? 'DAMAGED 58%' : 'UNDAMAGED 100%'}</strong></button>
          <p className="sm:col-span-2 text-zinc-400">Certification target: complete each condition and difficulty using keyboard, Xbox-compatible gamepad and real mobile touch hardware.</p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {LANDING_PRACTICES.map((practice) => (
            <button key={practice.id} type="button" onClick={() => onLaunch({ type: practice.id, difficulty, damaged })} className="group min-h-56 rounded-lg border border-cyan-700/45 bg-black/55 p-5 text-left shadow-xl transition hover:-translate-y-1 hover:border-emerald-300 hover:bg-cyan-950/35 focus-visible:outline-2 focus-visible:outline-emerald-300">
              <div className="flex items-center justify-between"><span className="rounded border border-cyan-500/40 bg-cyan-950/50 p-2 text-cyan-300">{practice.site === 'CARRIER' ? <Anchor className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}</span><PlaneLanding className="h-5 w-5 text-zinc-600 group-hover:text-emerald-300" /></div>
              <h3 className="mt-5 font-display text-base font-black tracking-wide text-white">{practice.title.toUpperCase()}</h3>
              <div className="mt-2 text-[9px] font-bold tracking-[.18em] text-emerald-300">{practice.site.replace('_', ' ')} // {practice.technique}</div>
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">{practice.description}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

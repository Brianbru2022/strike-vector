import React from 'react';
import { Award, Clock3, RotateCcw, Target } from 'lucide-react';
import { OperationRecordV2, OperationRunState } from '../types/game';
import { soundEngine } from '../audio/SoundEngine';

interface OperationAfterActionProps {
  run: OperationRunState;
  record: OperationRecordV2;
  onOperations: () => void;
}

export const OperationAfterAction: React.FC<OperationAfterActionProps> = ({ run, record, onOperations }) => <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950 p-4 font-mono-tech">
  <img src="/assets/backgrounds/mission-10-bastion-hero-v3.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-38" /><div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/78 to-amber-950/35" />
  <main className="relative my-auto w-full max-w-4xl overflow-hidden rounded-xl border border-amber-300/45 bg-black/78 shadow-2xl backdrop-blur-sm">
    <header className="border-b border-amber-300/25 p-6 text-center md:p-8"><div className="text-[10px] font-bold tracking-[.3em] text-amber-300">NORTH ATLANTIC COMMAND // AFTER-ACTION REPORT</div><h1 className="mt-2 font-display text-3xl font-black text-zinc-100 md:text-5xl">OPERATION {run.blueprint.codeName}</h1><div className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-full border border-amber-300/45 bg-amber-950/30 px-6 py-3"><Award className="h-7 w-7 text-amber-300" /><span className="font-display text-2xl font-black text-amber-200">{record.medal} MEDAL</span></div></header>
    <section className="grid gap-3 p-5 sm:grid-cols-3 md:p-8"><div className="rounded border border-white/10 bg-black/45 p-4"><Target className="mb-2 h-5 w-5 text-cyan-300" /><div className="text-[9px] text-zinc-500">TOTAL SCORE</div><div className="mt-1 font-display text-xl font-black text-cyan-200">{record.totalScore.toLocaleString()}</div></div><div className="rounded border border-white/10 bg-black/45 p-4"><Clock3 className="mb-2 h-5 w-5 text-emerald-300" /><div className="text-[9px] text-zinc-500">SIMULATION TIME</div><div className="mt-1 font-display text-xl font-black text-emerald-200">{Math.round(record.simulationTicks / 60)}s</div></div><div className="rounded border border-white/10 bg-black/45 p-4"><RotateCcw className="mb-2 h-5 w-5 text-rose-300" /><div className="text-[9px] text-zinc-500">DEPLOYMENT STRIKES</div><div className="mt-1 font-display text-xl font-black text-rose-200">{record.retries}</div></div></section>
    <section className="px-5 pb-6 md:px-8"><div className="mb-2 text-xs font-bold tracking-wider text-amber-300">SORTIE RECORD</div><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{run.results.map((result) => <div key={result.sortieIndex} className="rounded border border-white/10 bg-black/40 p-3"><div className="font-bold text-zinc-100">{run.blueprint.sorties[result.sortieIndex].title}</div><div className="mt-2 text-[9px] leading-relaxed text-zinc-500">Score {result.score.toLocaleString()}<br />Landing {result.landingGrade || 'NONE'}<br />Optional objectives {result.optionalObjectivesCompleted}</div></div>)}</div></section>
    <footer className="flex justify-end border-t border-white/10 bg-black/55 p-4 md:px-8"><button type="button" onClick={() => { soundEngine.playUIClick(); onOperations(); }} className="rounded bg-amber-300 px-6 py-3 font-display text-xs font-black tracking-wider text-slate-950">RETURN TO OPERATIONS</button></footer>
  </main>
</div>;

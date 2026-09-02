import React from 'react';
import { ArrowLeft, Gauge, Medal, Play, ShieldCheck, Wrench } from 'lucide-react';
import { OperationRunState } from '../types/game';
import { medalCeiling } from '../game/Operations';
import { soundEngine } from '../audio/SoundEngine';

interface OperationDossierProps {
  run: OperationRunState;
  onLaunch: () => void;
  onBack: () => void;
}

export const OperationDossier: React.FC<OperationDossierProps> = ({ run, onLaunch, onBack }) => {
  const [copied, setCopied] = React.useState(false);
  const current = run.blueprint.sorties[run.currentSortieIndex];
  const ceiling = medalCeiling(run.retries);
  const norwegianTheatre = run.blueprint.version === 2 || (run.blueprint.version === 3 && run.blueprint.contentSet === 'NORWEGIAN_SEA');
  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(run.blueprint.seedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return <div className="absolute inset-0 z-30 overflow-y-auto bg-slate-950 p-3 font-mono-tech md:p-7">
    <img src={norwegianTheatre ? '/assets/backgrounds/north-cape-fortress-storm-v1.webp' : '/assets/backgrounds/north-atlantic-dawn-painted.webp'} alt="" className="fixed inset-0 h-full w-full object-cover opacity-35" />
    <div className="fixed inset-0 bg-gradient-to-r from-black/95 via-slate-950/85 to-cyan-950/50" />
    <main className="relative mx-auto my-auto w-full max-w-5xl overflow-hidden rounded-xl border border-cyan-400/45 bg-black/78 shadow-2xl backdrop-blur-sm">
      <header className="flex items-start justify-between border-b border-cyan-400/25 p-5 md:p-7"><div><div className="flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-[.28em] text-cyan-300"><span>DEPLOYMENT DOSSIER // {run.blueprint.seedCode}</span><span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[8px] tracking-normal text-zinc-300">V{run.blueprint.version} // {norwegianTheatre ? 'NORWEGIAN SEA' : 'NORTH ATLANTIC'}</span><button type="button" onClick={copySeed} className="rounded border border-cyan-600/50 px-2 py-1 text-[8px] tracking-normal text-cyan-200">{copied ? 'COPIED' : 'COPY SEED'}</button></div><h1 className="mt-1 font-display text-3xl font-black tracking-wider text-zinc-100">OPERATION {run.blueprint.codeName}</h1><p className="mt-2 text-xs text-zinc-400">{run.blueprint.theater} // {run.blueprint.difficulty}</p></div><button type="button" aria-label="Back to operations board" onClick={onBack} className="rounded border border-white/15 p-2 text-zinc-300"><ArrowLeft className="h-5 w-5" /></button></header>
      <section className="grid gap-4 p-5 md:p-7 lg:grid-cols-[1.25fr_.75fr]">
        <div><div className="mb-3 text-xs font-bold tracking-wider text-cyan-300">SORTIE SEQUENCE</div><div className="space-y-2">{run.blueprint.sorties.map((sortie) => {
          const complete = sortie.index < run.currentSortieIndex;
          const active = sortie.index === run.currentSortieIndex;
          return <div key={sortie.index} className={`rounded-lg border p-3 ${active ? 'border-cyan-400 bg-cyan-950/35' : complete ? 'border-emerald-600/35 bg-emerald-950/15' : 'border-white/8 bg-black/35 opacity-55'}`}><div className="flex items-center justify-between"><div className="font-display text-sm font-black text-zinc-100">{sortie.title}</div><span className={`text-[9px] font-bold ${complete ? 'text-emerald-300' : active ? 'text-cyan-300' : 'text-zinc-500'}`}>{complete ? 'COMPLETE' : active ? 'CURRENT' : 'CLASSIFIED'}</span></div><div className="mt-1 text-[9px] text-zinc-500">{sortie.terrainProfile.replaceAll('_', ' ')} // {sortie.timeOfDay} // {sortie.weather}</div>{active ? <div className="mt-2 text-[10px] text-zinc-300"><strong className="text-amber-300">EXPECTED:</strong> {sortie.expectedThreats.join(', ')}<br /><strong className="text-emerald-300">RECOMMENDED:</strong> {sortie.recommendedLoadout.replaceAll('_', ' ')}<br /><strong className="text-rose-300">MODIFIERS:</strong> {sortie.modifiers?.map((modifier) => modifier.replaceAll('_', ' ')).join(', ') || 'NONE'}</div> : null}</div>;
        })}</div></div>
        <aside className="space-y-3"><div className="rounded border border-amber-400/30 bg-amber-950/20 p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-amber-300"><Medal className="h-4 w-4" /> MEDAL CEILING</div><div className="mt-1 font-display text-2xl font-black text-zinc-100">{ceiling}</div><div className="mt-1 text-[9px] text-zinc-500">{run.retries} deployment strike{run.retries === 1 ? '' : 's'}</div></div><div className="rounded border border-emerald-400/30 bg-emerald-950/15 p-4"><div className="flex items-center gap-2 text-[10px] font-bold text-emerald-300"><Wrench className="h-4 w-4" /> AIRCRAFT CONDITION</div><div className="mt-3 space-y-2 text-[10px]"><div className="flex justify-between"><span>AIRFRAME</span><strong>{Math.round(run.aircraftCondition.health)}%</strong></div><div className="flex justify-between"><span>FUEL</span><strong>{Math.round(run.aircraftCondition.fuel)}%</strong></div><div className="flex justify-between"><span>LOADOUT</span><strong>{run.selectedLoadout.replaceAll('_', ' ')}</strong></div></div></div><div className="rounded border border-cyan-400/25 bg-cyan-950/15 p-4"><div className="text-[10px] font-bold text-cyan-300">DEFENDED ASSETS</div><div className="mt-2 space-y-1 text-[10px]"><div className="flex justify-between"><span>CARRIER</span><strong>{Math.round(run.defendedAssets.CARRIER)}%</strong></div><div className="flex justify-between"><span>FORWARD BASE</span><strong>{Math.round(run.defendedAssets.FORWARD_BASE)}%</strong></div></div></div><div className="rounded border border-white/10 bg-black/35 p-4 text-[9px] leading-relaxed text-zinc-400"><div className="mb-2 flex items-center gap-2 font-bold text-cyan-300"><Gauge className="h-4 w-4" /> DEPLOYMENT RULES</div>Damage, servicing and defended-asset integrity carry between sorties. Failed sorties restore the pre-sortie aircraft snapshot and add a medal-limiting strike.</div></aside>
      </section>
      <footer className="flex items-center justify-between border-t border-white/10 bg-black/55 p-4 md:px-7"><div className="flex items-center gap-2 text-[9px] text-zinc-500"><ShieldCheck className="h-4 w-4 text-emerald-300" /> SORTIE {current.index + 1} OF {run.blueprint.sorties.length} READY</div><button type="button" onClick={() => { soundEngine.playUIClick(); onLaunch(); }} className="flex items-center gap-2 rounded bg-cyan-400 px-6 py-3 font-display text-xs font-black tracking-wider text-slate-950"><Play className="h-4 w-4 fill-slate-950" /> OPEN BRIEFING</button></footer>
    </main>
  </div>;
};

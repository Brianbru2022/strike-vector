import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, History, Medal, Play, Radio, RotateCcw, Star } from 'lucide-react';
import { DifficultyPreset, OperationBlueprint, OperationContentSet, OperationHistoryEntryV1, OperationLength, OperationRunState, OperationsProfileV2 } from '../types/game';
import { generateOperation, generateOperationV3, getDailyOperationSeeds, seedFromCode } from '../game/DynamicOperations';
import { soundEngine } from '../audio/SoundEngine';

interface OperationsBoardProps {
  difficulty: DifficultyPreset;
  norwegianOperationsUnlocked: boolean;
  activeRun: OperationRunState | null;
  profile: OperationsProfileV2;
  onSelect: (blueprint: OperationBlueprint) => void;
  onResume: () => void;
  onAbandon: () => void;
  onToggleFavourite: (entry: OperationHistoryEntryV1) => void;
  onClose: () => void;
}

const MEDAL_COLOUR = { GOLD: 'text-amber-300', SILVER: 'text-slate-200', BRONZE: 'text-orange-400' } as const;

export const OperationsBoard: React.FC<OperationsBoardProps> = ({ difficulty, norwegianOperationsUnlocked, activeRun, profile, onSelect, onResume, onAbandon, onToggleFavourite, onClose }) => {
  const [seedEntry, setSeedEntry] = useState('');
  const [contentSet, setContentSet] = useState<OperationContentSet>('NORTH_ATLANTIC');
  const [sortieCount, setSortieCount] = useState<OperationLength>(3);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'FAVOURITES'>('ALL');
  const dailySeeds = useMemo(() => getDailyOperationSeeds(new Date(), 3), []);
  const offers = useMemo(() => dailySeeds.map((seed) => generateOperationV3(seed, difficulty, contentSet, sortieCount)), [dailySeeds, difficulty, contentSet, sortieCount]);
  const norwegianTheatre = contentSet === 'NORWEGIAN_SEA';
  const visibleHistory = useMemo(() => [...profile.history]
    .filter((entry) => historyFilter === 'ALL' || entry.favourite)
    .sort((a, b) => Number(b.favourite) - Number(a.favourite) || b.lastPlayedAt.localeCompare(a.lastPlayedAt)), [historyFilter, profile.history]);

  const openCustomSeed = () => {
    if (!seedEntry.trim()) return;
    soundEngine.playUIClick();
    onSelect(generateOperationV3(seedFromCode(seedEntry), difficulty, contentSet, sortieCount));
  };

  const replayHistory = (entry: OperationHistoryEntryV1) => {
    const blueprint = entry.generationVersion === 1
      ? generateOperation(entry.seed, entry.difficulty)
      : entry.generationVersion === 2
        ? generateOperation(entry.seed, entry.difficulty, 2)
        : generateOperationV3(entry.seed, entry.difficulty, entry.contentSet, entry.sortieCount);
    onSelect(blueprint);
  };

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-slate-950 p-3 font-mono-tech md:p-7">
      <img src={norwegianTheatre ? '/assets/backgrounds/north-cape-fortress-storm-v1.webp' : '/assets/ui/campaign-map-northern-lance.jpg'} alt="" className="fixed inset-0 h-full w-full object-cover opacity-30" />
      <div className={`fixed inset-0 bg-gradient-to-br from-black/95 via-slate-950/88 ${norwegianTheatre ? 'to-cyan-950/50' : 'to-emerald-950/45'}`} />
      <main className="relative mx-auto my-auto w-full max-w-6xl overflow-hidden rounded-xl border border-emerald-400/45 bg-black/75 shadow-2xl backdrop-blur-sm">
        <header className="flex items-start justify-between gap-4 border-b border-emerald-400/25 p-4 md:p-6">
          <div><div className="text-[10px] font-bold tracking-[.3em] text-emerald-400">{norwegianTheatre ? 'NORWEGIAN JOINT OPERATIONS // 1987' : 'NORTH ATLANTIC OPERATIONS CONTROL // 1987'}</div><h1 className="mt-1 font-display text-2xl font-black tracking-wider text-zinc-100 md:text-4xl">{norwegianTheatre ? 'NORWEGIAN SEA OPERATIONS' : 'DYNAMIC OPERATIONS 2.0'}</h1><p className="mt-2 max-w-2xl text-xs text-zinc-400">Choose a three- or five-sortie deployment. Aircraft and defended-asset condition persist while operational modifiers reshape each sortie.</p></div>
          <button type="button" aria-label="Return to main menu" onClick={onClose} className="rounded border border-white/15 bg-black/50 p-2 text-zinc-300 hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
        </header>

        {activeRun ? <section className="m-4 rounded-lg border border-amber-400/50 bg-amber-950/20 p-4 md:m-6 md:flex md:items-center md:justify-between">
          <div><div className="text-[9px] font-bold tracking-[.2em] text-amber-300">ACTIVE DEPLOYMENT</div><div className="mt-1 font-display text-xl font-black text-zinc-100">OPERATION {activeRun.blueprint.codeName}</div><div className="mt-1 text-[10px] text-zinc-400">{activeRun.blueprint.seedCode} // Sortie {activeRun.currentSortieIndex + 1} of {activeRun.blueprint.sorties.length} // {activeRun.retries} strike{activeRun.retries === 1 ? '' : 's'}</div></div>
          <div className="mt-3 flex gap-2 md:mt-0"><button type="button" onClick={onAbandon} className="rounded border border-rose-700/60 px-3 py-2 text-[10px] font-bold text-rose-300">ABANDON</button><button type="button" onClick={onResume} className="flex items-center gap-2 rounded bg-amber-300 px-4 py-2 font-display text-xs font-black text-slate-950"><RotateCcw className="h-4 w-4" /> RESUME DOSSIER</button></div>
        </section> : null}

        <section className="p-4 md:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-300"><CalendarDays className="h-4 w-4" /> TODAY&apos;S ENCRYPTED CONTRACTS</div><div className="flex flex-wrap gap-2"><div className="flex rounded border border-white/10 bg-black/45 p-1 text-[9px] font-bold"><button type="button" onClick={() => setContentSet('NORTH_ATLANTIC')} className={`rounded px-3 py-1.5 ${contentSet === 'NORTH_ATLANTIC' ? 'bg-emerald-300 text-slate-950' : 'text-zinc-400'}`}>NORTH ATLANTIC</button><button type="button" disabled={!norwegianOperationsUnlocked} title={norwegianOperationsUnlocked ? 'Use Norwegian Sea terrain and forces' : 'Complete Mission 16 to unlock'} onClick={() => setContentSet('NORWEGIAN_SEA')} className={`rounded px-3 py-1.5 ${contentSet === 'NORWEGIAN_SEA' ? 'bg-cyan-300 text-slate-950' : 'text-zinc-400'} disabled:cursor-not-allowed disabled:opacity-35`}>NORWEGIAN SEA</button></div><div className="flex rounded border border-white/10 bg-black/45 p-1 text-[9px] font-bold" aria-label="Deployment length"><button type="button" onClick={() => setSortieCount(3)} className={`rounded px-3 py-1.5 ${sortieCount === 3 ? 'bg-amber-300 text-slate-950' : 'text-zinc-400'}`}>3 SORTIES</button><button type="button" onClick={() => setSortieCount(5)} className={`rounded px-3 py-1.5 ${sortieCount === 5 ? 'bg-amber-300 text-slate-950' : 'text-zinc-400'}`}>5 SORTIES</button></div></div></div>
          <div className="grid gap-3 lg:grid-cols-3">
            {offers.map((offer) => {
              const prior = profile.records.find((record) => record.seed === offer.seed && record.difficulty === difficulty && record.generationVersion === offer.version && record.sortieCount === sortieCount && record.contentSet === contentSet);
              return <article key={offer.seed} className="flex flex-col rounded-lg border border-white/10 bg-slate-950/80 p-4 transition hover:border-emerald-400/45">
                <div className="flex items-start justify-between gap-2"><div><div className="text-[9px] tracking-[.18em] text-cyan-400">{offer.seedCode}</div><h2 className="mt-1 font-display text-lg font-black text-zinc-100">{offer.codeName}</h2></div>{prior ? <div className={`flex items-center gap-1 text-[10px] font-bold ${MEDAL_COLOUR[prior.medal]}`}><Medal className="h-4 w-4" /> {prior.medal}</div> : null}</div>
                <div className="mt-2 text-[10px] text-zinc-500">{offer.theater} // {difficulty}</div>
                <ol className="mt-3 flex-1 space-y-2">{offer.sorties.map((sortie) => <li key={sortie.index} className="rounded border border-white/8 bg-black/35 p-2"><div className="font-bold text-emerald-200">{sortie.title}</div><div className="mt-1 text-[9px] text-zinc-500">{sortie.terrainProfile.replaceAll('_', ' ')} // {sortie.weather} // Recover: {sortie.recoverySite}</div><div className="mt-1 text-[8px] font-bold text-amber-300">{sortie.modifiers?.map((modifier) => modifier.replaceAll('_', ' ')).join(' + ')}</div></li>)}</ol>
                <button type="button" disabled={Boolean(activeRun)} onClick={() => { soundEngine.playUIClick(); onSelect(offer); }} className="mt-3 flex items-center justify-center gap-2 rounded bg-emerald-400 px-4 py-2.5 font-display text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"><Play className="h-4 w-4 fill-slate-950" /> REVIEW CONTRACT</button>
              </article>;
            })}
          </div>
        </section>

        {profile.history.length ? <section className="border-t border-white/10 p-4 md:p-6"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300"><History className="h-4 w-4" /> SEED HISTORY & FAVOURITES</div><div className="flex rounded border border-white/10 p-1 text-[8px] font-bold"><button type="button" onClick={() => setHistoryFilter('ALL')} className={`rounded px-2 py-1 ${historyFilter === 'ALL' ? 'bg-cyan-300 text-slate-950' : 'text-zinc-500'}`}>ALL {profile.history.length}</button><button type="button" onClick={() => setHistoryFilter('FAVOURITES')} className={`rounded px-2 py-1 ${historyFilter === 'FAVOURITES' ? 'bg-amber-300 text-slate-950' : 'text-zinc-500'}`}>FAVOURITES {profile.history.filter((entry) => entry.favourite).length}</button></div></div><div className="grid gap-2 md:grid-cols-2">{visibleHistory.map((entry) => <div key={`${entry.seed}-${entry.generationVersion}-${entry.contentSet}-${entry.sortieCount}-${entry.difficulty}`} className="flex items-center gap-3 rounded border border-white/10 bg-black/35 p-3 [content-visibility:auto]"><button type="button" aria-label={entry.favourite ? `Remove ${entry.seedCode} from favourites` : `Favourite ${entry.seedCode}`} onClick={() => onToggleFavourite(entry)} className={entry.favourite ? 'text-amber-300' : 'text-zinc-600'}><Star className={`h-4 w-4 ${entry.favourite ? 'fill-amber-300' : ''}`} /></button><div className="min-w-0 flex-1"><div className="truncate font-bold text-zinc-200">{entry.codeName}</div><div className="text-[8px] text-zinc-500">{entry.seedCode} // {entry.contentSet.replaceAll('_', ' ')} // {entry.sortieCount} sorties // {entry.difficulty}</div></div><button type="button" disabled={Boolean(activeRun) || (entry.contentSet === 'NORWEGIAN_SEA' && !norwegianOperationsUnlocked)} onClick={() => replayHistory(entry)} className="rounded border border-cyan-600/50 px-3 py-1.5 text-[9px] font-bold text-cyan-200 disabled:opacity-30">REPLAY</button></div>)}</div>{visibleHistory.length === 0 ? <p className="py-4 text-center text-[9px] text-zinc-500">No favourite operations yet.</p> : null}</section> : null}

        <footer className="border-t border-white/10 bg-black/55 p-4 md:flex md:items-end md:justify-between md:px-6">
          <label className="block max-w-md flex-1 text-[10px] font-bold text-zinc-300"><span className="flex items-center gap-1.5"><Radio className="h-3.5 w-3.5 text-cyan-300" /> CUSTOM / SHARED SEED</span><div className="mt-2 flex gap-2"><input value={seedEntry} onChange={(event) => setSeedEntry(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') openCustomSeed(); }} placeholder="IK-0000000" className="min-w-0 flex-1 rounded border border-cyan-700/50 bg-slate-950 px-3 py-2 text-cyan-200 outline-none focus:border-cyan-400" /><button type="button" disabled={!seedEntry.trim() || Boolean(activeRun)} onClick={openCustomSeed} className="rounded border border-cyan-500/60 px-4 py-2 text-cyan-200 disabled:opacity-30">DECODE</button></div></label>
          <div className="mt-3 text-[9px] leading-relaxed text-zinc-500 md:mt-0 md:max-w-xs md:text-right">Daily seeds use UTC and remain stable for the entire day. Shared codes are deterministic within the selected theatre version and require no network connection.</div>
        </footer>
      </main>
    </div>
  );
};

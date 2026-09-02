import React from 'react';
import { Anchor, ArrowRight, Lock, MountainSnow, ShieldCheck, X } from 'lucide-react';
import { CampaignChapterId, CampaignSave } from '../types/game';
import { CAMPAIGN_CHAPTERS, CHAPTER_ORDER } from '../game/CampaignChapters';
import { soundEngine } from '../audio/SoundEngine';

interface ChapterSelectScreenProps {
  campaign: CampaignSave;
  onSelect: (chapterId: CampaignChapterId) => void;
  onClose: () => void;
}

const chapterArtwork: Record<CampaignChapterId, string> = {
  NORTHERN_LANCE: '/assets/ui/campaign-map-northern-lance.jpg',
  NORWEGIAN_SEA: '/assets/backgrounds/arctic-open-sea-painted-v1.webp',
};

export const ChapterSelectScreen: React.FC<ChapterSelectScreenProps> = ({ campaign, onSelect, onClose }) => (
  <div className="mission-screen-enter absolute inset-0 z-40 overflow-y-auto bg-[#020706] font-mono-tech text-[#eaffef]">
    <img src="/assets/ui/campaign-map-northern-lance.jpg" alt="" className="fixed inset-0 h-full w-full object-cover opacity-25" draggable={false} />
    <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(21,93,68,.25),transparent_45%),linear-gradient(180deg,rgba(1,7,6,.72),rgba(1,7,6,.96))]" />
    <main className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center p-4 sm:p-8">
      <header className="mb-5 flex items-start justify-between border-b border-emerald-300/25 pb-5">
        <div>
          <p className="text-[9px] uppercase tracking-[.35em] text-emerald-300/70">NATO NORTH ATLANTIC COMMAND // CAMPAIGN ARCHIVE</p>
          <h1 className="mt-2 font-display text-2xl font-black uppercase tracking-[.12em] sm:text-4xl">Select Campaign Chapter</h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-400">Campaign aircraft condition, loadout and pilot history carry between theatres. Chapter progress remains independently tracked.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Return to main menu" className="rounded border border-emerald-300/30 bg-black/45 p-2 hover:bg-emerald-950/70"><X className="h-5 w-5" /></button>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {CHAPTER_ORDER.map((chapterId) => {
          const chapter = CAMPAIGN_CHAPTERS[chapterId];
          const progress = campaign.chapterProgress[chapterId];
          const available = progress.unlocked;
          const operationalLabel = chapterId === 'NORWEGIAN_SEA'
            ? campaign.completedMissionIds.includes('m16_north_cape_assault') ? 'Norwegian Sea secured' : campaign.completedMissionIds.includes('m15_red_tide') ? 'North Cape Assault ready' : campaign.completedMissionIds.includes('m14_whiteout_rescue') ? 'Red Tide ready' : campaign.completedMissionIds.includes('m13_troms_bridgehead') ? 'Whiteout Rescue ready' : campaign.completedMissionIds.includes('m12_hammerfall_fjord') ? 'Troms Bridgehead ready' : campaign.completedMissionIds.includes('m11_cold_passage') ? 'Hammerfall Fjord ready' : 'Cold Passage ready'
            : 'Operational';
          return (
            <article key={chapterId} aria-label={`${chapter.title}, ${available ? 'available' : 'locked until Mission 10 is complete'}`} className={`group relative min-h-[300px] overflow-hidden rounded-xl border ${available ? 'border-emerald-300/45' : 'border-slate-400/55 saturate-50'} bg-black/80 shadow-2xl`}>
              <img src={chapterArtwork[chapterId]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50 transition duration-500 group-hover:scale-[1.02]" draggable={false} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />
              <div className="relative flex min-h-[300px] flex-col justify-end p-5 sm:p-7">
                <div className="mb-auto flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200/45 bg-black/60">{chapterId === 'NORTHERN_LANCE' ? <Anchor className="h-5 w-5" /> : <MountainSnow className="h-5 w-5" />}</span>
                  <span className={`rounded px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${available ? 'bg-emerald-300 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{available ? 'Authorised' : 'Complete Mission 10'}</span>
                </div>
                <p className="text-[9px] uppercase tracking-[.25em] text-amber-200/80">{chapter.subtitle} // {chapter.year}</p>
                <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-wider">{chapter.title}</h2>
                <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-[10px] text-zinc-300">
                  <span>{progress.completedMissionIds.length}/{chapter.missions.length} missions complete</span>
                  <span className="flex items-center gap-1">{available ? <ShieldCheck className="h-4 w-4 text-emerald-300" /> : <Lock className="h-4 w-4" />}{available ? operationalLabel : 'Locked'}</span>
                </div>
                <button type="button" disabled={!available} onClick={() => { soundEngine.playUIClick(); onSelect(chapterId); }} className="mt-4 flex w-full items-center justify-between rounded bg-emerald-300 px-4 py-3 font-display text-xs font-black uppercase tracking-wider text-slate-950 transition enabled:hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">
                  {available ? 'Open strategic map' : 'Chapter locked'}<ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="mt-5 grid grid-cols-3 gap-2 rounded border border-white/10 bg-black/45 p-3 text-center text-[9px] uppercase tracking-wider text-zinc-400">
        <span>Airframe <strong className="text-emerald-300">{Math.round(campaign.aircraftCondition.health)}%</strong></span>
        <span>Loadout <strong className="text-amber-200">{campaign.selectedLoadout.replace('_', ' ')}</strong></span>
        <span>Sorties <strong className="text-cyan-200">{campaign.pilotRecord.sorties}</strong></span>
      </footer>
    </main>
  </div>
);

import React from 'react';
import { CampaignChapterId, CampaignSave, GameScoreBreakdown } from '../types/game';
import { Anchor, Award, Fuel, Radio, ShieldCheck, Target } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface CampaignEpilogueProps {
  campaign: CampaignSave;
  finalScore: GameScoreBreakdown;
  chapterId: CampaignChapterId;
  onCampaignMap: () => void;
  onProceduralSortie: () => void;
  onChapterSelect: () => void;
}

export const CampaignEpilogue: React.FC<CampaignEpilogueProps> = ({ campaign, finalScore, chapterId, onCampaignMap, onProceduralSortie, onChapterSelect }) => {
  const isNorwegianFinale = chapterId === 'NORWEGIAN_SEA';
  const totalScore = (Object.values(campaign.bestScores) as number[]).reduce((sum, score) => sum + score, 0);
  const securedSectors = campaign.sectors.filter((sector) => sector.secured).length;
  const carrierSurvived = campaign.completedMissionIds.includes(isNorwegianFinale ? 'm16_north_cape_assault' : 'm6_fleet_defence');
  const farpSurvived = campaign.completedMissionIds.includes(isNorwegianFinale ? 'm13_troms_bridgehead' : 'm9_forward_defence');
  const chapterMissions = isNorwegianFinale
    ? ['m11_cold_passage', 'm12_hammerfall_fjord', 'm13_troms_bridgehead', 'm14_whiteout_rescue', 'm15_red_tide', 'm16_north_cape_assault']
    : ['m1_coastal_strike', 'm2_valley_run', 'm3_convoy_hunter', 'm4_night_raid', 'm5_pilot_rescue', 'm6_fleet_defence', 'm7_bridge_strike', 'm8_airbase_raid', 'm9_forward_defence', 'm10_hq_assault'];
  const chapterCleared = chapterMissions.filter((missionId) => campaign.completedMissionIds.includes(missionId)).length;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950 p-4 font-mono-tech">
      <img src={isNorwegianFinale ? '/assets/backgrounds/arctic-north-cape-assault-operational-v1.webp' : '/assets/backgrounds/mission-10-bastion-hero-v3.webp'} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-emerald-950/35" />
      <main className="relative my-auto w-full max-w-4xl overflow-hidden rounded-xl border border-emerald-400/50 bg-black/75 shadow-2xl backdrop-blur-sm">
        <header className="border-b border-emerald-400/25 p-5 md:p-8">
          <div className="text-[10px] font-bold tracking-[.3em] text-emerald-400">NORTH ATLANTIC COMMAND // {isNorwegianFinale ? 'NORTHERN FRONT COMPLETE' : 'CAMPAIGN COMPLETE'}</div>
          <h1 className="mt-2 font-display text-3xl font-black tracking-wider text-zinc-100 md:text-5xl">{isNorwegianFinale ? 'THE NORWEGIAN SEA' : 'NORTHERN LANCE'}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">{isNorwegianFinale ? 'North Cape’s hardened command network is silent. The missile fleet has been broken, the Troms bridgehead holds and HMS Invincible has recovered Kestrel One from the northern front.' : 'Bastion’s command network is silent. The island chain is secure, HMS Invincible remains operational and Kestrel One has returned from the final assault.'}</p>
        </header>

        <section className="grid gap-3 p-5 sm:grid-cols-2 md:p-8 lg:grid-cols-3">
          <div className="rounded border border-white/10 bg-black/50 p-4"><Award className="mb-2 h-5 w-5 text-amber-300" /><div className="text-[9px] tracking-wider text-zinc-500">CAMPAIGN SCORE</div><div className="mt-1 font-display text-xl font-black text-amber-300">{totalScore.toLocaleString()}</div></div>
          <div className="rounded border border-white/10 bg-black/50 p-4"><Target className="mb-2 h-5 w-5 text-cyan-300" /><div className="text-[9px] tracking-wider text-zinc-500">CHAPTER MISSIONS</div><div className="mt-1 font-display text-xl font-black text-cyan-300">{chapterCleared}/{chapterMissions.length}</div></div>
          <div className="rounded border border-white/10 bg-black/50 p-4"><ShieldCheck className="mb-2 h-5 w-5 text-emerald-300" /><div className="text-[9px] tracking-wider text-zinc-500">{isNorwegianFinale ? 'NORTHERN FRONT' : 'SECTORS SECURED'}</div><div className="mt-1 font-display text-xl font-black text-emerald-300">{isNorwegianFinale ? 'SECURED' : `${securedSectors}/5`}</div></div>
          <div className="rounded border border-white/10 bg-black/50 p-4"><Radio className="mb-2 h-5 w-5 text-rose-300" /><div className="text-[9px] tracking-wider text-zinc-500">FINAL PILOT STATUS</div><div className="mt-1 font-display text-sm font-black text-emerald-300">{finalScore.pilotSurvived === false ? 'LOST' : 'RECOVERED'}</div></div>
          <div className="rounded border border-white/10 bg-black/50 p-4"><Anchor className="mb-2 h-5 w-5 text-sky-300" /><div className="text-[9px] tracking-wider text-zinc-500">HMS INVINCIBLE</div><div className={`mt-1 font-display text-sm font-black ${carrierSurvived ? 'text-emerald-300' : 'text-rose-300'}`}>{carrierSurvived ? 'OPERATIONAL' : 'LOST'}</div></div>
          <div className="rounded border border-white/10 bg-black/50 p-4"><Fuel className="mb-2 h-5 w-5 text-amber-300" /><div className="text-[9px] tracking-wider text-zinc-500">SKELD FARP</div><div className={`mt-1 font-display text-sm font-black ${farpSurvived ? 'text-emerald-300' : 'text-rose-300'}`}>{farpSurvived ? 'OPERATIONAL' : 'LOST'}</div></div>
        </section>

        <div className="border-t border-white/10 bg-black/55 p-5 md:flex md:items-center md:justify-between md:px-8">
          <div className="mb-4 text-xs text-zinc-400 md:mb-0"><span className="font-bold text-cyan-200">{isNorwegianFinale ? 'NORTH CAPE CAMPAIGN COMPLETE' : 'NORWEGIAN SEA CHAPTER AUTHORISED'}</span><br />{isNorwegianFinale ? 'All sixteen campaign sorties remain available for replay alongside Dynamic Operations.' : 'The northern-front strategic map and Operation Ice Gate are now available.'}</div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { soundEngine.playUIClick(); onCampaignMap(); }} className="rounded bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700">CAMPAIGN MAP</button>
            <button type="button" onClick={() => { soundEngine.playUIClick(); onChapterSelect(); }} className="rounded bg-cyan-300 px-4 py-2.5 font-display text-xs font-black tracking-wider text-slate-950 hover:bg-cyan-200">{isNorwegianFinale ? 'CHAPTER SELECT' : 'NORWEGIAN SEA'}</button>
            <button type="button" onClick={() => { soundEngine.playUIClick(); onProceduralSortie(); }} className="rounded bg-emerald-400 px-5 py-2.5 font-display text-xs font-black tracking-wider text-slate-950 hover:bg-emerald-300">OPEN OPERATIONS</button>
          </div>
        </div>
      </main>
    </div>
  );
};

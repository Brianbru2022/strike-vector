import React from 'react';
import { CheckCircle2, CloudSnow, Construction, Fuel, LockKeyhole, MountainSnow, Plane, Shield, X } from 'lucide-react';
import { CampaignSave, MissionDefinition } from '../types/game';
import { CAMPAIGN_CHAPTERS } from '../game/CampaignChapters';
import { CAMPAIGN_MISSIONS } from '../game/Missions';
import { norwegianChapterArtwork } from '../game/MissionPresentation';

interface NorwegianCampaignMapProps {
  campaign: CampaignSave;
  onBack: () => void;
  onSelectMission: (mission: MissionDefinition, index: number) => void;
}

const missionDefinitions = new Map(CAMPAIGN_MISSIONS.map((mission, index) => [mission.id, { mission, index }]));

export const NorwegianCampaignMap: React.FC<NorwegianCampaignMapProps> = ({ campaign, onBack, onSelectMission }) => {
  const chapter = CAMPAIGN_CHAPTERS.NORWEGIAN_SEA;
  return (
    <div className="mission-screen-enter absolute inset-0 z-40 overflow-hidden bg-[#031018] font-mono-tech text-slate-100">
      <img src={norwegianChapterArtwork(campaign.completedMissionIds)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition-opacity duration-500" draggable={false} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,12,19,.55),rgba(2,12,19,.18)_35%,rgba(2,12,19,.94))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(92,180,204,.12),transparent_38%)]" />

      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between border-b border-cyan-200/25 bg-[#020a10]/75 px-4 py-3 backdrop-blur-md sm:px-7 sm:py-4">
        <div className="flex items-center gap-3">
          <span className="hidden h-11 w-11 items-center justify-center rounded-full border border-cyan-200/40 bg-slate-950/60 sm:flex"><MountainSnow className="h-5 w-5 text-cyan-100" /></span>
          <div>
            <p className="text-[8px] uppercase tracking-[.32em] text-cyan-200/65 sm:text-[10px]">Norwegian Joint Command // Northern Front</p>
            <h1 className="font-display text-lg font-black uppercase tracking-[.12em] sm:text-3xl">The Norwegian Sea</h1>
            <p className="mt-1 text-[8px] uppercase tracking-[.16em] text-amber-200/80">All six northern-front strike packages authorised · North Cape finale ready</p>
          </div>
        </div>
        <button type="button" onClick={onBack} aria-label="Return to chapter selection" className="rounded border border-cyan-200/30 bg-black/45 p-2 hover:bg-cyan-950/70"><X className="h-5 w-5" /></button>
      </header>

      <main className="absolute inset-x-0 bottom-[68px] top-[88px] overflow-y-auto px-4 py-4 sm:px-7">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chapter.missions.map((mission, index) => {
            const definition = missionDefinitions.get(mission.missionId);
            const completed = campaign.completedMissionIds.includes(mission.missionId);
            const authored = mission.status === 'PLAYABLE' && Boolean(definition);
            const prerequisiteMet = index === 0 || campaign.completedMissionIds.includes(chapter.missions[index - 1].missionId);
            const playable = authored && prerequisiteMet;
            return (
            <article key={mission.missionId} className={`relative overflow-hidden rounded-lg border p-4 shadow-[0_14px_35px_rgba(0,0,0,.4)] backdrop-blur-md ${playable ? 'border-cyan-200/55 bg-[#031923]/90' : 'border-cyan-100/20 bg-[#031019]/82'}`}>
              <div className="mb-4 flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-100/30 bg-black/40">{index === 0 ? <Plane className="h-4 w-4" /> : index === 3 ? <CloudSnow className="h-4 w-4" /> : index === 5 ? <Shield className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}</span>
                {completed ? <span className="flex items-center gap-1 rounded bg-emerald-300/15 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-emerald-200"><CheckCircle2 className="h-3 w-3" /> Completed</span> : playable ? <span className="flex items-center gap-1 rounded bg-cyan-300/15 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-cyan-100"><Plane className="h-3 w-3" /> Sortie ready</span> : authored ? <span className="flex items-center gap-1 rounded bg-slate-300/10 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-slate-300"><LockKeyhole className="h-3 w-3" /> Route locked</span> : <span className="flex items-center gap-1 rounded bg-amber-300/15 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-amber-200"><Construction className="h-3 w-3" /> In production</span>}
              </div>
              <p className="text-[8px] uppercase tracking-[.22em] text-cyan-200/60">Mission {mission.number} // {mission.sector}</p>
              <h2 className="mt-1 font-display text-lg font-black uppercase tracking-wide">{mission.title}</h2>
              <p className="mt-1 text-[9px] uppercase tracking-[.16em] text-amber-200/70">{mission.operationName}</p>
              <p className="mt-3 min-h-[42px] text-[10px] leading-relaxed text-slate-300">{mission.summary}</p>
              {playable && definition ? <button type="button" onClick={() => onSelectMission(definition.mission, definition.index)} className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-cyan-200/45 bg-cyan-300 py-2 text-[9px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-200"><Plane className="h-3.5 w-3.5" /> {completed ? 'Fly again' : 'Open mission package'}</button> : <button type="button" disabled className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded border border-white/10 bg-black/35 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-500"><LockKeyhole className="h-3.5 w-3.5" /> Awaiting mission package</button>}
            </article>
          );})}
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 z-20 grid h-[68px] grid-cols-4 items-center border-t border-cyan-200/20 bg-[#020a10]/88 px-3 text-center text-[8px] uppercase tracking-wider text-slate-400 backdrop-blur-md sm:px-7 sm:text-[9px]">
        <span>Airframe <strong className="block text-emerald-300">{Math.round(campaign.aircraftCondition.health)}%</strong></span>
        <span><Fuel className="mx-auto mb-0.5 h-3 w-3 text-amber-200" />Fuel <strong className="block text-amber-200">{Math.round(campaign.aircraftCondition.fuel)}%</strong></span>
        <span>Loadout <strong className="block text-cyan-200">{campaign.selectedLoadout.replace('_', ' ')}</strong></span>
        <span>Pilot <strong className="block text-emerald-300">{campaign.pilotRecord.losses === 0 ? 'Operational' : `${campaign.pilotRecord.losses} losses`}</strong></span>
      </footer>
    </div>
  );
};

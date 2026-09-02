import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FilePlus2, Play, RefreshCw, Upload } from 'lucide-react';
import type { MissionDefinition } from '../types/game';
import { CAMPAIGN_MISSIONS } from '../game/Missions';
import {
  compileMissionAuthoringDocument,
  createBlankMissionDocument,
  createMissionAuthoringDocument,
  exportMissionAuthoringJson,
  MissionAuthoringDocumentV1,
  parseMissionAuthoringJson,
  validateMissionAuthoringDocument,
} from '../game/MissionAuthoring';
import { soundEngine } from '../audio/SoundEngine';
import { missionPresentationArtwork } from '../game/MissionPresentation';
import { getEnemySpritePlacement } from '../game/SpritePlacement';

interface MissionAuthoringScreenProps {
  onLaunch: (mission: MissionDefinition) => void;
  onClose: () => void;
}

const KNOWN_BACKDROPS = new Set(CAMPAIGN_MISSIONS.flatMap((mission) => [missionPresentationArtwork(mission), ...(mission.presentation?.backdropAsset ? [mission.presentation.backdropAsset] : [])]));

export const MissionAuthoringScreen: React.FC<MissionAuthoringScreenProps> = ({ onLaunch, onClose }) => {
  const [sourceMissionId, setSourceMissionId] = useState(CAMPAIGN_MISSIONS[0].id);
  const [draft, setDraft] = useState<MissionAuthoringDocumentV1>(() => createMissionAuthoringDocument(CAMPAIGN_MISSIONS[0]));
  const [jsonText, setJsonText] = useState(() => exportMissionAuthoringJson(createMissionAuthoringDocument(CAMPAIGN_MISSIONS[0])));
  const [parseError, setParseError] = useState<string | null>(null);
  const issues = useMemo(() => validateMissionAuthoringDocument(draft, KNOWN_BACKDROPS), [draft]);
  const blockers = issues.filter((issue) => issue.severity === 'ERROR');

  const replaceDraft = (next: MissionAuthoringDocumentV1) => {
    setDraft(next);
    setJsonText(exportMissionAuthoringJson(next));
    setParseError(null);
  };

  const loadMission = (missionId: string) => {
    const mission = CAMPAIGN_MISSIONS.find((candidate) => candidate.id === missionId) ?? CAMPAIGN_MISSIONS[0];
    setSourceMissionId(mission.id);
    replaceDraft(createMissionAuthoringDocument(mission));
  };

  const applyJson = () => {
    try {
      replaceDraft(parseMissionAuthoringJson(jsonText));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid mission document.');
    }
  };

  const importJsonFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      replaceDraft(parseMissionAuthoringJson(await file.text()));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid mission document.');
    }
  };

  const updateMission = (patch: Partial<MissionAuthoringDocumentV1['mission']>) => {
    const next = { ...draft, mission: { ...draft.mission, ...patch } };
    replaceDraft(next);
  };

  const exportJson = () => {
    const blob = new Blob([exportMissionAuthoringJson(draft)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${draft.mission.id || 'mission-draft'}.mission.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="absolute inset-0 z-40 overflow-y-auto bg-slate-950 p-3 font-mono-tech md:p-6">
    <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(8,145,178,.18),transparent_38%),linear-gradient(135deg,#020617,#04130f)]" />
    <main className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl border border-cyan-500/45 bg-black/80 shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-cyan-500/25 p-4 md:p-6"><div><div className="text-[9px] font-bold tracking-[.3em] text-cyan-300">DEVELOPMENT TOOL // EXTERNAL DATA V1</div><h1 className="mt-1 font-display text-2xl font-black tracking-wider text-zinc-100 md:text-4xl">MISSION AUTHORING TOOLKIT</h1><p className="mt-2 max-w-3xl text-[10px] text-zinc-400">Edit a serialisable mission document, validate gameplay references and preview world-space contacts before exporting or launching a clean deterministic test sortie.</p></div><button type="button" aria-label="Close mission authoring toolkit" onClick={onClose} className="rounded border border-white/15 p-2 text-zinc-300"><ArrowLeft className="h-5 w-5" /></button></header>

      <section className="grid gap-4 p-4 md:p-6 xl:grid-cols-[.78fr_1.22fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-slate-950/80 p-4"><label className="text-[9px] font-bold text-zinc-400">SOURCE MISSION<select aria-label="Source mission" value={sourceMissionId} onChange={(event) => loadMission(event.target.value)} className="mt-2 w-full rounded border border-cyan-800 bg-black px-3 py-2 text-cyan-100">{CAMPAIGN_MISSIONS.map((mission, index) => <option key={mission.id} value={mission.id}>M{index + 1} — {mission.title}</option>)}</select></label><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => replaceDraft(createBlankMissionDocument(CAMPAIGN_MISSIONS[0]))} className="flex items-center gap-2 rounded border border-emerald-600/60 px-3 py-2 text-[9px] font-bold text-emerald-200"><FilePlus2 className="h-4 w-4" /> NEW TEST MISSION</button><button type="button" onClick={() => loadMission(sourceMissionId)} className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-2 text-[9px] font-bold text-zinc-300"><RefreshCw className="h-4 w-4" /> RESET SOURCE</button></div></div>

          <div className="grid gap-2 rounded-lg border border-white/10 bg-slate-950/80 p-4 sm:grid-cols-2"><AuthorField label="MISSION ID" value={draft.mission.id} onChange={(value) => updateMission({ id: value })} /><AuthorField label="TITLE" value={draft.mission.title} onChange={(value) => updateMission({ title: value })} /><AuthorNumber label="MAP LENGTH" value={draft.mission.mapLength} onChange={(value) => updateMission({ mapLength: value })} /><AuthorNumber label="RECOVERY X" value={draft.mission.carrierLandingX} onChange={(value) => updateMission({ carrierLandingX: value })} /></div>

          <div className="rounded-lg border border-white/10 bg-slate-950/80 p-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[9px] font-bold text-zinc-400">MISSION DOCUMENT JSON</span><div className="flex gap-2"><label className="flex cursor-pointer items-center gap-1 rounded border border-emerald-600/60 px-2 py-1 text-[8px] font-bold text-emerald-200"><Upload className="h-3 w-3" /> IMPORT FILE<input aria-label="Import mission JSON file" type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { void importJsonFile(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label><button type="button" onClick={applyJson} className="flex items-center gap-1 rounded border border-cyan-600/60 px-2 py-1 text-[8px] font-bold text-cyan-200"><Upload className="h-3 w-3" /> APPLY JSON</button></div></div><textarea aria-label="Mission document JSON" spellCheck={false} value={jsonText} onChange={(event) => setJsonText(event.target.value)} className="h-80 w-full resize-y rounded border border-zinc-800 bg-black p-3 font-mono text-[9px] leading-relaxed text-emerald-200 outline-none focus:border-cyan-500" />{parseError ? <p className="mt-2 text-[9px] text-rose-300">{parseError}</p> : null}</div>
        </div>

        <div className="space-y-4">
          <MissionWorldPreview draft={draft} />
          <div className="rounded-lg border border-white/10 bg-slate-950/80 p-4"><div className="mb-3 flex items-center justify-between"><div className="text-[10px] font-bold tracking-wider text-zinc-200">VALIDATION REPORT</div><div className={`flex items-center gap-1 text-[9px] font-bold ${blockers.length ? 'text-rose-300' : 'text-emerald-300'}`}>{blockers.length ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{blockers.length ? `${blockers.length} BLOCKER${blockers.length === 1 ? '' : 'S'}` : 'READY TO COMPILE'}</div></div><div className="max-h-44 space-y-2 overflow-y-auto">{issues.length ? issues.map((issue, index) => <div key={`${issue.code}-${issue.path}-${index}`} className={`rounded border p-2 text-[9px] ${issue.severity === 'ERROR' ? 'border-rose-800/60 bg-rose-950/20 text-rose-200' : 'border-amber-800/50 bg-amber-950/15 text-amber-200'}`}><strong>{issue.code}</strong> // {issue.path}<br /><span className="text-zinc-400">{issue.message}</span></div>) : <p className="text-[9px] text-emerald-300">All identifiers, references, contacts, openings, objectives, recovery surfaces and assets are valid.</p>}</div></div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/60 p-4 md:px-6"><div className="text-[8px] text-zinc-500">{draft.enemies.length} initial units // {draft.mission.objectives.length} objectives // {draft.mission.phases?.length || 0} phases // {draft.mission.events?.length || 0} events</div><div className="flex gap-2"><button type="button" onClick={exportJson} className="flex items-center gap-2 rounded border border-amber-500/60 px-4 py-2 text-[9px] font-bold text-amber-200"><Download className="h-4 w-4" /> EXPORT BUNDLE DATA</button><button type="button" disabled={blockers.length > 0} onClick={() => { soundEngine.playUIClick(); onLaunch(compileMissionAuthoringDocument(draft, KNOWN_BACKDROPS)); }} className="flex items-center gap-2 rounded bg-cyan-400 px-5 py-2 font-display text-[10px] font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30"><Play className="h-4 w-4 fill-slate-950" /> LAUNCH TEST SORTIE</button></div></footer>
    </main>
  </div>;
};

const AuthorField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => <label className="text-[8px] font-bold text-zinc-500">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border border-zinc-800 bg-black px-2 py-2 text-[9px] text-zinc-200 outline-none focus:border-cyan-500" /></label>;

const AuthorNumber: React.FC<{ label: string; value: number; onChange: (value: number) => void }> = ({ label, value, onChange }) => <label className="text-[8px] font-bold text-zinc-500">{label}<input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-800 bg-black px-2 py-2 text-[9px] text-zinc-200 outline-none focus:border-cyan-500" /></label>;

const MissionWorldPreview: React.FC<{ draft: MissionAuthoringDocumentV1 }> = ({ draft }) => {
  const mission = draft.mission;
  const scaleX = (worldX: number) => Math.max(0, Math.min(1000, worldX / Math.max(1, mission.mapLength) * 1000));
  const profile = mission.terrainContact?.heightProfile;
  const terrainPoints = profile?.samples.map((sample, index) => sample === null ? null : `${scaleX(profile.startWorldX + (profile.endWorldX - profile.startWorldX) * index / Math.max(1, profile.samples.length - 1))},${Math.max(0, Math.min(280, sample / 720 * 280))}`).filter((point): point is string => point !== null).join(' ');
  const overscan = Math.max(0, Math.min(0.12, mission.presentation?.overscan ?? 0));
  return <figure className="overflow-hidden rounded-lg border border-cyan-700/50 bg-black"><figcaption className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[8px] font-bold text-zinc-400"><span>WORLD PREVIEW // CONTACTS, ANCHORS & PATHS</span><span>0 — {mission.mapLength.toLocaleString()} WU</span></figcaption><div className="relative aspect-[16/7] overflow-hidden"><img src={mission.presentation?.backdropAsset} alt="Mission panorama preview" className="absolute inset-0 h-full w-full object-cover opacity-55" /><svg viewBox="0 0 1000 280" className="absolute inset-0 h-full w-full" role="img" aria-label="Mission world-space preview"><defs><marker id="authoring-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#fb7185" /></marker></defs><rect x="0" y="0" width={overscan * 1000} height="280" fill="#22d3ee" opacity=".08" /><rect x={(1 - overscan) * 1000} y="0" width={overscan * 1000} height="280" fill="#22d3ee" opacity=".08" />{terrainPoints ? <polyline points={terrainPoints} fill="none" stroke="#84cc16" strokeWidth="3" /> : null}<line x1={scaleX(mission.carrierX)} x2={scaleX(mission.carrierX)} y1="0" y2="280" stroke="#22d3ee" strokeDasharray="5 4" /><line x1={scaleX(mission.carrierLandingX)} x2={scaleX(mission.carrierLandingX)} y1="0" y2="280" stroke="#facc15" strokeWidth="3" />{draft.enemies.map((enemy) => { const x = scaleX(enemy.x); const y = Math.max(10, Math.min(265, enemy.y / 720 * 280)); const pathX = enemy.targetX === undefined ? x + Math.sign(enemy.vx || 1) * 55 : scaleX(enemy.targetX); const placement = getEnemySpritePlacement(enemy.type); const footprint = placement ? Math.max(8, placement.width / Math.max(1, mission.mapLength) * 1000) : 8; return <g key={enemy.id}><line x1={x} y1={y} x2={pathX} y2={y} stroke="#fb7185" strokeWidth="1.5" markerEnd="url(#authoring-arrow)" opacity={enemy.vx || enemy.targetX !== undefined ? 0.8 : 0} /><line x1={x - footprint / 2} x2={x + footprint / 2} y1={y} y2={y} stroke="#a3e635" strokeWidth="3" /><line x1={x - 4} x2={x + 4} y1={y} y2={y} stroke="#fff" /><line x1={x} x2={x} y1={y - 4} y2={y + 4} stroke="#fff" /><circle cx={x} cy={y - 8} r={enemy.category === 'AIR' ? 6 : 5} fill={enemy.category === 'AIR' ? '#fb7185' : enemy.category === 'NAVAL' ? '#38bdf8' : '#f97316'} stroke="#fff" strokeWidth="1" /><text x={x + 8} y={y - 12} fill="#e2e8f0" fontSize="9">{enemy.id}</text></g>; })}<text x={scaleX(mission.carrierX) + 5} y="17" fill="#67e8f9" fontSize="10">LAUNCH</text><text x={Math.max(5, scaleX(mission.carrierLandingX) - 55)} y="270" fill="#fde047" fontSize="10">LANDING SURFACE</text><text x="10" y="270" fill="#67e8f9" fontSize="9">PANORAMA OVERSCAN {(overscan * 100).toFixed(0)}%</text></svg></div><div className="grid grid-cols-4 gap-px bg-white/10 text-center text-[8px]"><div className="bg-slate-950 p-2 text-cyan-300">BLUE: NAVAL / COVERAGE</div><div className="bg-slate-950 p-2 text-rose-300">ROSE: AIR / PATROL</div><div className="bg-slate-950 p-2 text-amber-300">ORANGE: GROUND / LANDING</div><div className="bg-slate-950 p-2 text-lime-300">LIME: CONTACT FOOTPRINT</div></div></figure>;
};

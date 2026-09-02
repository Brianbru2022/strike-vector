import React from 'react';
import { BarChart3, CheckCircle2, Download, Trash2 } from 'lucide-react';
import { aggregateDiagnostics, aggregateDifficultyDiagnostics, buildBalanceCoverage, clearDiagnostics, exportDiagnosticsJson, loadDiagnostics } from '../game/Diagnostics';
import { CAMPAIGN_MISSIONS } from '../game/Missions';
import { CampaignSave, InputDevice, PerformanceSnapshot } from '../types/game';
import { buildIssueReport, exportIssueReportJson } from '../game/IssueReport';
import { loadActiveOperation } from '../game/Operations';
import { RELEASE_INFO } from '../game/Release';
import { exportStage7EvidenceJson } from '../game/Stage7Balance';
import { aggregateStage7Metrics } from '../game/Stage7Balance';

const CAMPAIGN_MISSION_IDS = CAMPAIGN_MISSIONS.map((mission) => mission.id);

interface DiagnosticsPanelProps {
  campaign: CampaignSave;
  performance: PerformanceSnapshot | null;
  inputDevice: InputDevice;
}

const downloadJson = (json: string, filename: string) => {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ campaign, performance, inputDevice }) => {
  const [sessions, setSessions] = React.useState(loadDiagnostics);
  const aggregates = React.useMemo(() => aggregateDiagnostics(sessions), [sessions]);
  const difficultyAggregates = React.useMemo(() => aggregateDifficultyDiagnostics(sessions), [sessions]);
  const balanceCoverage = React.useMemo(() => buildBalanceCoverage(sessions, CAMPAIGN_MISSION_IDS), [sessions]);
  const currentBuildMetrics = React.useMemo(() => aggregateStage7Metrics(sessions.filter((session) => session.buildId === RELEASE_INFO.buildId)), [sessions]);

  const exportData = () => {
    downloadJson(exportDiagnosticsJson(sessions), 'iron-kestrel-diagnostics-v3.json');
  };

  const exportStage7 = () => {
    downloadJson(exportStage7EvidenceJson(sessions), `iron-kestrel-stage7-evidence-${RELEASE_INFO.buildId}.json`);
  };

  const exportIssueReport = () => {
    const report = buildIssueReport(campaign, sessions, performance, loadActiveOperation(), {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
      inputDevice,
    });
    downloadJson(exportIssueReportJson(report), `iron-kestrel-issue-report-${RELEASE_INFO.version}.json`);
  };

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-1.5 font-bold text-emerald-300"><BarChart3 className="h-4 w-4" /> LOCAL PLAYTEST DIAGNOSTICS</div><span className="text-[9px] text-zinc-500">{sessions.length}/100 SESSIONS</span></div>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        {aggregates.length ? aggregates.map((item) => <div key={item.missionId} className="grid grid-cols-6 gap-2 rounded bg-black/40 px-2 py-1.5 text-[9px]"><span className="col-span-2 font-bold text-cyan-300">{item.missionId}</span><span>{item.victories}/{item.sorties} wins</span><span>{item.accuracyPercent}% hits</span><span>{item.damageReceived} dmg</span><span>{item.survivalPercent}% safe</span></div>) : <p className="py-2 text-[9px] text-zinc-500">No local sortie records yet.</p>}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">{difficultyAggregates.map((item) => <div key={item.difficulty} className="rounded border border-white/10 bg-black/35 p-2 text-[8px]"><div className="font-bold text-amber-300">{item.difficulty}</div><div className="mt-1 text-zinc-400">{item.sorties} sorties · {item.victoryPercent}% wins</div><div className="text-zinc-500">{item.accuracyPercent}% hits · {item.averageDamage} avg dmg</div><div className="text-zinc-500">{item.warningAcknowledgementPercent}% missile warnings answered</div></div>)}</div>
      <div className="mt-3 border-t border-white/10 pt-2">
        <div className="mb-1.5 flex items-center gap-1 text-[9px] font-bold tracking-wider text-cyan-300"><CheckCircle2 className="h-3 w-3" /> RELEASE BALANCE MATRIX</div>
        <div className="grid gap-1 sm:grid-cols-3">{balanceCoverage.map((item) => <div key={item.difficulty} className={`rounded border p-2 text-[8px] ${item.complete ? 'border-emerald-500/50 bg-emerald-950/25' : 'border-white/10 bg-black/35'}`}><div className={item.complete ? 'font-bold text-emerald-300' : 'font-bold text-zinc-300'}>{item.difficulty} {item.complete ? '✓' : 'INCOMPLETE'}</div><div className="mt-1 text-zinc-400">Campaign {item.campaignVictories}/{item.campaignRequired}</div><div className="text-zinc-400">Deployments {item.completedDeployments}/{item.deploymentsRequired}</div><div className="text-zinc-500">Archetypes {item.coveredArchetypes.length}/{item.archetypesRequired}</div></div>)}</div>
      </div>
      <div className="mt-2 grid gap-1 border-t border-white/10 pt-2 sm:grid-cols-3" aria-label="Current-build Stage 7 balance measurements">
        <div className="rounded border border-white/10 bg-black/35 p-2 text-[8px]"><div className="font-bold text-cyan-300">CURRENT BUILD</div><div className="mt-1 text-zinc-400">{currentBuildMetrics.victories}/{currentBuildMetrics.attempts} victories · {currentBuildMetrics.completionRate}%</div><div className="text-zinc-500">{currentBuildMetrics.averageSortieSeconds}s sortie · {currentBuildMetrics.averageCombatSeconds}s combat</div></div>
        <div className="rounded border border-white/10 bg-black/35 p-2 text-[8px]"><div className="font-bold text-amber-300">ORDNANCE USED</div><div className="mt-1 text-zinc-400">Cannon {currentBuildMetrics.ammunitionUsed.CANNON} · AIM-9L {currentBuildMetrics.ammunitionUsed.MISSILE}</div><div className="text-zinc-500">Bomb {currentBuildMetrics.ammunitionUsed.BOMB} · Rocket {currentBuildMetrics.ammunitionUsed.ROCKET} · Flare {currentBuildMetrics.ammunitionUsed.FLARE}</div></div>
        <div className="rounded border border-white/10 bg-black/35 p-2 text-[8px]"><div className="font-bold text-rose-300">THREAT & RECOVERY</div><div className="mt-1 text-zinc-400">Warnings answered {currentBuildMetrics.warningAcknowledgementRate}% · Landings P {currentBuildMetrics.landingGrades.PERFECT ?? 0} / S {currentBuildMetrics.landingGrades.SAFE ?? 0} / H {currentBuildMetrics.landingGrades.HARD ?? 0}</div><div className="text-zinc-500">Damage gun {Math.round(currentBuildMetrics.damageBySource.AIRCRAFT_GUN + currentBuildMetrics.damageBySource.GROUND_FIRE)} · SAM {Math.round(currentBuildMetrics.damageBySource.SAM_MISSILE)} · flak {Math.round(currentBuildMetrics.damageBySource.FLAK)} · impact {Math.round(currentBuildMetrics.damageBySource.IMPACT)}</div></div>
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-zinc-500">Stores mission results and simulation statistics on this device only. No raw inputs, identity or network transmission.</p>
      <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={!sessions.length} onClick={exportData} className="flex items-center gap-1 rounded border border-emerald-600/50 px-2 py-1 text-[9px] text-emerald-300 disabled:opacity-30"><Download className="h-3 w-3" /> EXPORT SESSIONS</button><button type="button" disabled={!sessions.length} onClick={exportStage7} className="flex items-center gap-1 rounded border border-amber-600/50 px-2 py-1 text-[9px] text-amber-300 disabled:opacity-30"><Download className="h-3 w-3" /> EXPORT STAGE 7 EVIDENCE</button><button type="button" onClick={exportIssueReport} className="flex items-center gap-1 rounded border border-cyan-600/50 px-2 py-1 text-[9px] text-cyan-300"><Download className="h-3 w-3" /> EXPORT ISSUE REPORT</button><button type="button" disabled={!sessions.length} onClick={() => { clearDiagnostics(); setSessions([]); }} className="flex items-center gap-1 rounded border border-rose-700/50 px-2 py-1 text-[9px] text-rose-300 disabled:opacity-30"><Trash2 className="h-3 w-3" /> CLEAR DATA</button></div>
    </section>
  );
};

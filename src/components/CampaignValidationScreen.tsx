import React from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Download, Play, Trash2 } from 'lucide-react';
import { ValidationScenario } from '../types/game';
import {
  aggregateCampaignValidationEvidence,
  CAMPAIGN_VALIDATION_BUILD_ID,
  CAMPAIGN_VALIDATION_SCENARIOS,
  CampaignValidationEvidenceV1,
  exportCampaignValidationJson,
} from '../game/CampaignValidation';
import { soundEngine } from '../audio/SoundEngine';

interface CampaignValidationScreenProps {
  evidence: CampaignValidationEvidenceV1[];
  onLaunch: (scenario: ValidationScenario) => void;
  onClear: () => void;
  onBack: () => void;
  onClose: () => void;
}

export const CampaignValidationScreen: React.FC<CampaignValidationScreenProps> = ({ evidence, onLaunch, onClear, onBack, onClose }) => {
  const summary = React.useMemo(() => aggregateCampaignValidationEvidence(evidence), [evidence]);
  const latest = React.useMemo(() => {
    const values = new Map<string, CampaignValidationEvidenceV1>();
    for (const item of evidence.filter((candidate) => candidate.buildId === CAMPAIGN_VALIDATION_BUILD_ID)) values.set(item.scenarioId, item);
    return values;
  }, [evidence]);
  const [difficulty, setDifficulty] = React.useState('ALL');
  const visible = CAMPAIGN_VALIDATION_SCENARIOS.filter((scenario) => difficulty === 'ALL' || scenario.difficulty === difficulty);

  const exportEvidence = () => {
    const blob = new Blob([exportCampaignValidationJson(evidence)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iron-kestrel-campaign-validation-${CAMPAIGN_VALIDATION_BUILD_ID}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-slate-950/95 p-3 font-mono-tech text-zinc-100 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-zinc-950/90 p-4">
          <div>
            <div className="text-[10px] font-bold tracking-[.22em] text-amber-300">STAGE 2 // CURRENT BUILD {CAMPAIGN_VALIDATION_BUILD_ID}</div>
            <h1 className="font-display text-2xl font-black tracking-wider md:text-4xl">CAMPAIGN BALANCE VALIDATION</h1>
            <p className="mt-1 max-w-4xl text-xs leading-relaxed text-zinc-400">Sixteen complete Pilot sorties plus five targeted Arcade and five Veteran stress passes. Every launch uses a clean aircraft, certified loadout and fixed simulation seed. Human answers are never filled automatically.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onBack} className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /> STAGE 1</button>
            <button type="button" onClick={onClose} className="rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">MAIN MENU</button>
          </div>
        </header>

        <section aria-label="Campaign validation summary" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          <Status label="RUNS" value={`${summary.completedScenarioIds.length}/${summary.totalScenarios}`} passed={summary.completedScenarioIds.length === summary.totalScenarios} />
          <Status label="VICTORIES" value={`${summary.victories}/${summary.totalScenarios}`} passed={summary.victories === summary.totalScenarios} />
          <Status label="PILOT MISSIONS" value={`${summary.pilotMissionsCovered}/16`} passed={summary.pilotMissionsCovered === 16} />
          <Status label="ARCADE STRESS" value={`${summary.arcadeStressCovered}/5`} passed={summary.arcadeStressCovered === 5} />
          <Status label="VETERAN STRESS" value={`${summary.veteranStressCovered}/5`} passed={summary.veteranStressCovered === 5} />
          <Status label="BLOCKERS" value={String(summary.blockers)} passed={summary.blockers === 0} />
          <Status label="GATE" value={summary.signOffReady ? 'READY' : 'PENDING'} passed={summary.signOffReady} />
        </section>

        <section className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 sm:grid-cols-4">
          <Metric label="CURRENT-BUILD ATTEMPTS" value={String(summary.currentBuildEvidenceCount)} />
          <Metric label="HISTORICAL ATTEMPTS" value={String(summary.historicalEvidenceCount)} />
          <Metric label="AVERAGE SORTIE" value={summary.averageDurationSeconds ? `${Math.round(summary.averageDurationSeconds / 60)} MIN` : '—'} />
          <Metric label="WARNINGS ACKNOWLEDGED" value={`${summary.warningAcknowledgedRuns}/${summary.warningExposedRuns}`} />
        </section>

        {summary.repeatedIssues.length ? <div className="rounded border border-amber-500/50 bg-amber-950/25 p-3 text-xs text-amber-200"><AlertTriangle className="mr-2 inline h-4 w-4" />Repeated usability defects: {summary.repeatedIssues.join(', ')}</div> : null}

        <label className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-[10px] font-bold tracking-wider text-zinc-500 sm:w-72">DIFFICULTY
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-amber-500">
            {['ALL', 'PILOT', 'ARCADE', 'VETERAN'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((scenario) => {
            const result = latest.get(scenario.id);
            const ammo = result?.run.ammunitionRemaining;
            return (
              <article key={scenario.id} className={`rounded-xl border p-4 ${result ? 'border-emerald-500/35 bg-emerald-950/15' : 'border-zinc-800 bg-zinc-950/80'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-[9px] font-bold tracking-[.16em] text-amber-300">{scenario.id} // {scenario.difficulty} // {formatDevice(scenario.deviceClass)}</div><h2 className="mt-1 font-display text-base font-black tracking-wide">{scenario.title}</h2></div>
                  {result ? <CheckCircle2 aria-label="Evidence recorded" className="h-5 w-5 shrink-0 text-emerald-400" /> : <ClipboardCheck aria-label="Evidence pending" className="h-5 w-5 shrink-0 text-zinc-600" />}
                </div>
                <p className="mt-2 min-h-14 text-[10px] leading-relaxed text-zinc-400">{scenario.instruction}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-zinc-400"><span className="rounded border border-zinc-700 px-2 py-1">{scenario.loadout.replace('_', ' ')}</span><span className="rounded border border-zinc-700 px-2 py-1">CLEAN AIRCRAFT</span></div>
                {result ? <div className="mt-3 rounded border border-zinc-800 bg-black/30 p-2 text-[9px] leading-relaxed text-zinc-400">
                  <span className={result.run.result === 'VICTORY' ? 'text-emerald-300' : 'text-rose-300'}>{result.run.result}</span> · {Math.round(result.run.simulationTicks / 60)} sec · {result.run.landingGrade || 'NO LANDING'}<br />
                  Ammo: {ammo ? `${ammo.missiles} AIM-9L / ${ammo.bombs} bombs / ${ammo.rockets} rockets / ${ammo.flares} flares` : 'legacy record'} · warnings {result.run.fighterWarnings + result.run.missileWarnings}
                </div> : null}
                <button type="button" onClick={() => { soundEngine.playUIClick(); onLaunch(scenario); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-amber-400 px-4 py-2 font-display text-xs font-black tracking-wider text-zinc-950 hover:bg-amber-300"><Play className="h-4 w-4 fill-zinc-950" /> {result ? 'RUN AGAIN' : 'START CLEAN RUN'}</button>
              </article>
            );
          })}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-xs">
          <div className="max-w-3xl text-zinc-500">Stage 2 evidence is local and isolated. It records build, mission, result, simulation duration, loss, damage, ammunition, warnings and landing outcome; never names, raw input or network identifiers.</div>
          <div className="flex gap-2">
            <button type="button" disabled={!evidence.length} onClick={exportEvidence} className="flex items-center gap-2 rounded border border-emerald-600/50 px-3 py-2 text-emerald-300 disabled:opacity-30"><Download className="h-4 w-4" /> EXPORT JSON</button>
            <button type="button" disabled={!evidence.length} onClick={onClear} className="flex items-center gap-2 rounded border border-rose-700/50 px-3 py-2 text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4" /> RESET STAGE 2</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const Status: React.FC<{ label: string; value: string; passed: boolean }> = ({ label, value, passed }) => <div className={`rounded-lg border p-3 ${passed ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/80'}`}><div className="text-[9px] tracking-wider text-zinc-500">{label}</div><div className={`mt-1 font-display text-lg font-black ${passed ? 'text-emerald-300' : 'text-zinc-300'}`}>{value}</div></div>;
const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded border border-zinc-800 bg-zinc-900 p-2"><div className="text-[9px] text-zinc-500">{label}</div><div className="mt-1 font-bold text-cyan-300">{value}</div></div>;

function formatDevice(device: ValidationScenario['deviceClass']): string {
  if (device === 'MOBILE_TOUCH') return 'TOUCH';
  if (device === 'DESKTOP_GAMEPAD') return 'GAMEPAD';
  return 'KEYBOARD';
}

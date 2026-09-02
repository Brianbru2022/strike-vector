import React from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Download, Play, RotateCcw, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import { PlaytestEvidenceV1, PlaytestResponse, PlaytestRunResult, ValidationScenario } from '../types/game';
import {
  aggregatePlaytestEvidence,
  aggregatePriorityInputValidation,
  EMPTY_PLAYTEST_RESPONSE,
  exportPlaytestEvidenceJson,
  PRIORITY_INPUT_SCENARIO_IDS,
  PRIORITY_INPUT_SCENARIOS,
  scenarioRequirementMet,
  VALIDATION_BUILD_ID,
  VALIDATION_SCENARIOS,
} from '../game/Validation';
import { soundEngine } from '../audio/SoundEngine';

interface ValidationRunsScreenProps {
  evidence: PlaytestEvidenceV1[];
  onLaunch: (scenario: ValidationScenario) => void;
  onClear: () => void;
  onOpenCampaignValidation: () => void;
  onClose: () => void;
}

export const ValidationRunsScreen: React.FC<ValidationRunsScreenProps> = ({ evidence, onLaunch, onClear, onOpenCampaignValidation, onClose }) => {
  const summary = React.useMemo(() => aggregatePlaytestEvidence(evidence), [evidence]);
  const prioritySummary = React.useMemo(() => aggregatePriorityInputValidation(evidence), [evidence]);
  const latest = React.useMemo(() => new Map(evidence.filter((item) => item.buildId === VALIDATION_BUILD_ID).map((item) => [item.scenarioId, item])), [evidence]);
  const [missionFilter, setMissionFilter] = React.useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = React.useState('ALL');
  const [deviceFilter, setDeviceFilter] = React.useState('ALL');
  const [priorityOnly, setPriorityOnly] = React.useState(true);
  const visibleScenarios = React.useMemo(() => VALIDATION_SCENARIOS.filter((scenario) =>
    (!priorityOnly || PRIORITY_INPUT_SCENARIO_IDS.includes(scenario.id as typeof PRIORITY_INPUT_SCENARIO_IDS[number]))
    && (missionFilter === 'ALL' || scenario.missionId === missionFilter)
    && (difficultyFilter === 'ALL' || scenario.difficulty === difficultyFilter)
    && (deviceFilter === 'ALL' || scenario.deviceClass === deviceFilter),
  ), [deviceFilter, difficultyFilter, missionFilter, priorityOnly]);

  const exportEvidence = () => {
    const blob = new Blob([exportPlaytestEvidenceJson(evidence)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iron-kestrel-playtest-${VALIDATION_BUILD_ID}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-slate-950/95 p-3 font-mono-tech text-zinc-100 md:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-cyan-500/40 bg-zinc-950/90 p-4">
          <div>
            <div className="text-[10px] font-bold tracking-[.22em] text-cyan-400">INTERNAL RELEASE EVIDENCE // {VALIDATION_BUILD_ID}</div>
            <h1 className="font-display text-2xl font-black tracking-wider md:text-4xl">VALIDATION RUNS</h1>
            <p className="mt-1 max-w-3xl text-xs text-zinc-400">Twenty-one clean, isolated human-validation scenarios covering six benchmark missions, every difficulty and every input class. Results remain on this device and never alter normal saves.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onOpenCampaignValidation} className="flex items-center gap-2 rounded border border-amber-500/50 px-3 py-2 text-xs text-amber-200 hover:bg-amber-950/40"><ClipboardCheck className="h-4 w-4" /> STAGE 2 CAMPAIGN MATRIX</button>
            <button type="button" onClick={onClose} className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /> MAIN MENU</button>
          </div>
        </header>

        <section aria-label="Validation sign-off summary" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <StatusCard label="SCENARIOS" value={`${summary.completedScenarioIds.length}/${summary.totalScenarios}`} passed={summary.completedScenarioIds.length === summary.totalScenarios} />
          <StatusCard label="VICTORIES" value={`${summary.victoryCount}/${summary.totalScenarios}`} passed={summary.victoryCount === summary.totalScenarios} />
          <StatusCard label="MISSIONS" value={`${summary.coveredMissionIds.length}/6`} passed={summary.coveredMissionIds.length === 6} />
          <StatusCard label="WARNINGS NOTICED" value={`${summary.warningAcknowledgedRuns}/${summary.warningAcknowledgementTarget}`} passed={summary.warningAcknowledgedRuns >= summary.warningAcknowledgementTarget} />
          <StatusCard label="BLOCKERS" value={String(summary.blockerCount)} passed={summary.blockerCount === 0} />
          <StatusCard label="SIGN-OFF" value={summary.signOffReady ? 'READY' : 'PENDING'} passed={summary.signOffReady} />
        </section>

        <section aria-label="Priority physical input validation" className={`rounded-xl border p-4 ${prioritySummary.readyForFullMatrix ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-amber-500/50 bg-amber-950/15'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-[10px] font-bold tracking-[.2em] text-amber-300">STEP 8 // PHYSICAL INPUT PASS</div><h2 className="mt-1 font-display text-xl font-black">THREE RUNS BEFORE THE FULL MATRIX</h2><p className="mt-1 max-w-3xl text-xs text-zinc-400">Complete Guided Mission 1 with a keyboard, Mission 6 with an Xbox-compatible controller and Mission 10 on real touch hardware. Browser emulation does not count.</p></div>
            <button type="button" onClick={() => setPriorityOnly((current) => !current)} className="rounded border border-cyan-600/50 px-3 py-2 text-xs font-bold text-cyan-200">{priorityOnly ? 'SHOW FULL MATRIX' : 'SHOW PRIORITY RUNS'}</button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">{PRIORITY_INPUT_SCENARIOS.map((scenario) => { const passed = prioritySummary.passedScenarioIds.includes(scenario.id); return <div key={scenario.id} className={`rounded border px-3 py-2 text-xs ${passed ? 'border-emerald-600/50 text-emerald-200' : 'border-zinc-700 text-zinc-400'}`}><strong>{scenario.id} // {formatDevice(scenario.deviceClass)}</strong><div className="mt-1">{scenario.title}</div><div className="mt-1 font-bold">{passed ? 'CERTIFIED' : 'PHYSICAL RUN PENDING'}</div></div>; })}</div>
          <div className="mt-3 text-xs font-bold text-zinc-300">FULL MATRIX: {prioritySummary.readyForFullMatrix ? 'READY TO BEGIN' : 'NOT YET CERTIFIED — COMPLETE THE THREE PRIORITY RUNS FIRST'}</div>
        </section>

        {summary.repeatedIssues.length > 0 ? (
          <div className="rounded border border-amber-500/50 bg-amber-950/25 p-3 text-xs text-amber-200"><AlertTriangle className="mr-2 inline h-4 w-4" />Repeated issues: {summary.repeatedIssues.join(', ')}</div>
        ) : null}

        {summary.historicalEvidenceCount > 0 ? (
          <div className="rounded border border-zinc-700 bg-zinc-950/80 p-3 text-xs text-zinc-400">{summary.historicalEvidenceCount} historical attempt{summary.historicalEvidenceCount === 1 ? '' : 's'} retained from other builds. Historical evidence is excluded from this build's sign-off.</div>
        ) : null}

        <section aria-label="Validation scenario filters" className="grid gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-[10px] sm:grid-cols-3">
          <FilterSelect label="MISSION" value={missionFilter} onChange={setMissionFilter} options={[
            ['ALL', 'ALL SIX MISSIONS'], ['m1_coastal_strike', 'M1 CARRIER QUALIFICATION'], ['m6_fleet_defence', 'M6 FLEET DEFENCE'], ['m10_hq_assault', 'M10 BASTION'], ['m11_cold_passage', 'M11 COLD PASSAGE'], ['m14_whiteout_rescue', 'M14 WHITEOUT RESCUE'], ['m16_north_cape_assault', 'M16 NORTH CAPE'],
          ]} />
          <FilterSelect label="DIFFICULTY" value={difficultyFilter} onChange={setDifficultyFilter} options={['ALL', 'ARCADE', 'PILOT', 'VETERAN'].map((value) => [value, value])} />
          <FilterSelect label="CONTROL" value={deviceFilter} onChange={setDeviceFilter} options={[
            ['ALL', 'ALL CONTROL TYPES'], ['DESKTOP_KEYBOARD', 'KEYBOARD'], ['DESKTOP_GAMEPAD', 'GAMEPAD'], ['MOBILE_TOUCH', 'MOBILE TOUCH'],
          ]} />
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {visibleScenarios.map((scenario) => {
            const result = latest.get(scenario.id);
            const completed = Boolean(result);
            const requirementMet = result ? scenarioRequirementMet(scenario, result) : false;
            return (
              <article key={scenario.id} className={`rounded-xl border p-4 ${completed ? 'border-emerald-500/40 bg-emerald-950/15' : 'border-zinc-800 bg-zinc-950/80'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-bold tracking-[.18em] text-cyan-400">RUN {scenario.order} // {scenario.difficulty} // {formatDevice(scenario.deviceClass)}</div>
                    <h2 className="mt-1 font-display text-lg font-black tracking-wide">{scenario.title}</h2>
                  </div>
                  {completed ? <CheckCircle2 aria-label="Evidence recorded" className="h-5 w-5 text-emerald-400" /> : <ClipboardCheck aria-label="Evidence pending" className="h-5 w-5 text-zinc-600" />}
                </div>
                <p className="mt-2 min-h-10 text-[11px] leading-relaxed text-zinc-400">{scenario.instruction}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-zinc-400">
                  <span className="rounded border border-zinc-700 px-2 py-1">{scenario.loadout.replace('_', ' ')}</span>
                  <span className="rounded border border-zinc-700 px-2 py-1">{scenario.guidedTraining ? 'GUIDED' : 'STANDARD'}</span>
                  {scenario.accessibility.reducedEffects ? <span className="rounded border border-cyan-700 px-2 py-1 text-cyan-300">REDUCED EFFECTS</span> : null}
                  {scenario.inputProfile === 'REMAPPED' ? <span className="rounded border border-amber-700 px-2 py-1 text-amber-300">I/K/J/L REMAP</span> : null}
                </div>
                {result ? (
                  <div className="mt-3 text-[10px] text-zinc-400">Latest: <span className={result.run.result === 'VICTORY' ? 'text-emerald-300' : 'text-rose-300'}>{result.run.result}</span> · {result.run.landingGrade || 'NO LANDING'} · warnings {result.run.fighterWarnings + result.run.missileWarnings}{requirementMet ? '' : ' · DAMAGE REQUIREMENT NOT MET'}</div>
                ) : null}
                <button type="button" onClick={() => { soundEngine.playUIClick(); onLaunch(scenario); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-cyan-600 px-4 py-2 font-display text-xs font-black tracking-wider text-zinc-950 hover:bg-cyan-500"><Play className="h-4 w-4 fill-zinc-950" /> {completed ? 'RUN AGAIN' : 'START CLEAN RUN'}</button>
              </article>
            );
          })}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-xs">
          <div className="text-zinc-500">{summary.currentBuildEvidenceCount} current-build attempt{summary.currentBuildEvidenceCount === 1 ? '' : 's'} · {summary.historicalEvidenceCount} historical · no identity or raw input recorded</div>
          <div className="flex gap-2">
            <button type="button" disabled={!evidence.length} onClick={exportEvidence} className="flex items-center gap-2 rounded border border-emerald-600/50 px-3 py-2 text-emerald-300 disabled:opacity-30"><Download className="h-4 w-4" /> EXPORT JSON</button>
            <button type="button" disabled={!evidence.length} onClick={onClear} className="flex items-center gap-2 rounded border border-rose-700/50 px-3 py-2 text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4" /> RESET EVIDENCE</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

interface ValidationReviewProps {
  scenario: ValidationScenario;
  run: PlaytestRunResult;
  onSubmit: (response: PlaytestResponse, retry: boolean) => void;
}

export const ValidationReview: React.FC<ValidationReviewProps> = ({ scenario, run, onSubmit }) => {
  const [response, setResponse] = React.useState<PlaytestResponse>(() => ({ ...EMPTY_PLAYTEST_RESPONSE, blockers: { ...EMPTY_PLAYTEST_RESPONSE.blockers } }));
  const warningExposed = run.fighterWarnings + run.missileWarnings > 0;
  const setAnswer = <K extends Exclude<keyof PlaytestResponse, 'blockers'>>(key: K, value: PlaytestResponse[K]) => setResponse((previous) => ({ ...previous, [key]: value }));
  const setBlocker = (key: keyof PlaytestResponse['blockers'], value: boolean) => setResponse((previous) => ({ ...previous, blockers: { ...previous.blockers, [key]: value } }));

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-slate-950/95 p-3 font-mono-tech text-zinc-100 md:p-6">
      <form className="mx-auto w-full max-w-3xl rounded-xl border border-cyan-500/40 bg-zinc-950 p-4 shadow-2xl md:p-6" onSubmit={(event) => { event.preventDefault(); onSubmit(response, false); }}>
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4">
          <div><div className="text-[10px] tracking-[.18em] text-cyan-400">RUN {scenario.order} AFTER-ACTION REVIEW</div><h1 className="font-display text-2xl font-black">{scenario.title}</h1></div>
          {run.result === 'VICTORY' ? <CheckCircle2 className="h-8 w-8 text-emerald-400" /> : <XCircle className="h-8 w-8 text-rose-400" />}
        </div>

        <div className="my-4 grid grid-cols-2 gap-2 text-[10px] md:grid-cols-5">
          <Metric label="RESULT" value={run.result} />
          <Metric label="LANDING" value={run.landingGrade || 'NONE'} />
          <Metric label="WARNINGS" value={String(run.fighterWarnings + run.missileWarnings)} />
          <Metric label="RETRIES" value={String(run.retries)} />
          <Metric label="AMMO REMAINING" value={run.ammunitionRemaining ? `${run.ammunitionRemaining.missiles}M ${run.ammunitionRemaining.bombs}B ${run.ammunitionRemaining.rockets}R ${run.ammunitionRemaining.flares}F` : 'LEGACY'} />
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-bold tracking-wider text-zinc-300">STRUCTURED OBSERVATIONS</legend>
          <ResponseToggle label={warningExposed ? 'Fighter or missile warning noticed before impact' : 'No warning was presented during this run'} value={response.warningNoticed} onChange={(value) => setAnswer('warningNoticed', value)} disabled={!warningExposed} />
          <ResponseToggle label="Controls were clear and functioned correctly" value={response.controlsClear} onChange={(value) => setAnswer('controlsClear', value)} />
          <ResponseToggle label="Current objectives and their required sequence were clear" value={response.objectivesClear} onChange={(value) => setAnswer('objectivesClear', value)} />
          <ResponseToggle label="Mission failure or success conditions were understood" value={response.failureReasonUnderstood} onChange={(value) => setAnswer('failureReasonUnderstood', value)} />
          <ResponseToggle label="Targets and locks remained readable" value={response.targetsReadable} onChange={(value) => setAnswer('targetsReadable', value)} />
          <ResponseToggle label="The offered loadout provided sufficient ammunition" value={response.ammunitionSufficient} onChange={(value) => setAnswer('ammunitionSufficient', value)} />
          <ResponseToggle label="The required recovery felt technically achievable" value={response.recoveryAchievable} onChange={(value) => setAnswer('recoveryAchievable', value)} />
          <ResponseToggle label="The opening attack felt fair" value={response.openingAttackFair} onChange={(value) => setAnswer('openingAttackFair', value)} />
          <ResponseToggle label="Enemy aircraft movement looked natural" value={response.aircraftMovementNatural} onChange={(value) => setAnswer('aircraftMovementNatural', value)} />
          <ResponseToggle label="Instructions outside the game were used" value={response.externalHelpUsed} onChange={(value) => setAnswer('externalHelpUsed', value)} danger />
        </fieldset>

        <fieldset className="mt-5 rounded border border-cyan-800/50 bg-cyan-950/10 p-3">
          <legend className="px-1 text-xs font-bold tracking-wider text-cyan-200">PHYSICAL INPUT EVIDENCE</legend>
          <ResponseToggle label={`I used the required physical ${formatDevice(scenario.deviceClass).toLowerCase()} hardware for this complete run`} value={response.physicalInputConfirmed} onChange={(value) => setAnswer('physicalInputConfirmed', value)} />
          <label className="mt-3 block text-xs font-bold tracking-wider text-zinc-300">HARDWARE MODEL
            <input value={response.hardwareDescription} maxLength={120} onChange={(event) => setAnswer('hardwareDescription', event.target.value)} placeholder="For example: Xbox Wireless Controller or Pixel 8 — no serial numbers or names" className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-[11px] font-normal text-zinc-200 outline-none focus:border-cyan-500" />
          </label>
        </fieldset>

        <label className="mt-4 block text-xs font-bold tracking-wider text-zinc-300">OBSERVATIONS
          <textarea value={response.observations} maxLength={1200} onChange={(event) => setAnswer('observations', event.target.value)} placeholder="Record the exact confusing cue, unfair attack, ammunition problem or recovery issue. Do not enter personal information." className="mt-2 min-h-24 w-full resize-y rounded border border-zinc-700 bg-zinc-900 p-3 text-[11px] font-normal leading-relaxed text-zinc-200 outline-none focus:border-cyan-500" />
        </label>

        <fieldset className="mt-5 rounded border border-rose-800/40 bg-rose-950/15 p-3">
          <legend className="px-1 text-xs font-bold tracking-wider text-rose-300"><ShieldAlert className="mr-1 inline h-4 w-4" /> IMMEDIATE BLOCKERS</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {Object.entries({ unavoidableAttack: 'Unavoidable attack', objectiveBlocker: 'Objective blocker', impossibleRecovery: 'Impossible recovery', terrainPenetration: 'Terrain penetration', inputFailure: 'Input failure' }).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-300"><input type="checkbox" checked={response.blockers[key as keyof PlaytestResponse['blockers']]} onChange={(event) => setBlocker(key as keyof PlaytestResponse['blockers'], event.target.checked)} className="accent-rose-500" /> {label}</label>
            ))}
          </div>
        </fieldset>

        {scenario.requiresCombatDamage && !Object.values(run.damageReceived).some((amount) => Number(amount) > 0) ? <div className="mt-4 rounded border border-amber-600/50 bg-amber-950/20 p-3 text-xs text-amber-200"><AlertTriangle className="mr-2 inline h-4 w-4" />This run did not meet the required combat-damage condition. Save it as evidence, then repeat the scenario.</div> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-4">
          <button type="button" onClick={() => onSubmit(response, true)} className="flex items-center gap-2 rounded border border-zinc-700 px-4 py-2 text-xs text-zinc-200 hover:bg-zinc-800"><RotateCcw className="h-4 w-4" /> SAVE &amp; RETRY</button>
          <button type="submit" className="flex items-center gap-2 rounded bg-emerald-500 px-5 py-2 font-display text-xs font-black tracking-wider text-zinc-950 hover:bg-emerald-400"><ClipboardCheck className="h-4 w-4" /> SAVE EVIDENCE</button>
        </div>
      </form>
    </div>
  );
};

const StatusCard: React.FC<{ label: string; value: string; passed: boolean }> = ({ label, value, passed }) => <div className={`rounded-lg border p-3 ${passed ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/80'}`}><div className="text-[9px] tracking-wider text-zinc-500">{label}</div><div className={`mt-1 font-display text-xl font-black ${passed ? 'text-emerald-300' : 'text-zinc-300'}`}>{value}</div></div>;
const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded border border-zinc-800 bg-zinc-900 p-2"><div className="text-zinc-500">{label}</div><div className="mt-1 font-bold text-cyan-300">{value}</div></div>;
const ResponseToggle: React.FC<{ label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean; danger?: boolean }> = ({ label, value, onChange, disabled = false, danger = false }) => <div className={`flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/70 px-3 py-2 ${disabled ? 'opacity-45' : ''}`}><span className="text-[11px] text-zinc-300">{label}</span><div className="flex shrink-0 gap-1"><button type="button" disabled={disabled} aria-pressed={value} onClick={() => onChange(true)} className={`rounded px-2 py-1 text-[9px] font-bold ${value ? danger ? 'bg-rose-500 text-zinc-950' : 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>YES</button><button type="button" disabled={disabled} aria-pressed={!value} onClick={() => onChange(false)} className={`rounded px-2 py-1 text-[9px] font-bold ${!value ? danger ? 'bg-emerald-500 text-zinc-950' : 'bg-rose-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>NO</button></div></div>;
const FilterSelect: React.FC<{ label: string; value: string; onChange: (value: string) => void; options: string[][] }> = ({ label, value, onChange, options }) => <label className="font-bold tracking-wider text-zinc-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-cyan-500">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;

function formatDevice(device: ValidationScenario['deviceClass']): string {
  if (device === 'MOBILE_TOUCH') return 'MOBILE TOUCH';
  if (device === 'DESKTOP_GAMEPAD') return 'GAMEPAD';
  return 'KEYBOARD';
}

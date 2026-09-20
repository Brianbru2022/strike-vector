import React from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Download, Play, Trash2, XCircle } from 'lucide-react';
import { InputDevice, PlaytestRunResult } from '../types/game';
import { soundEngine } from '../audio/SoundEngine';
import {
  aggregateControlConceptEvidence,
  CONTROL_CONCEPT_BUILD_ID,
  CONTROL_CONCEPT_IDS,
  CONTROL_CONCEPT_LABELS,
  CONTROL_CONCEPT_SLOTS,
  CONTROL_CONFUSION_LABELS,
  ControlConceptConfusion,
  ControlConceptEvidenceV1,
  ControlConceptObservation,
  ControlConceptRating,
  ControlConceptResponseV1,
  ControlConceptSlot,
  exportControlConceptEvidenceJson,
} from '../game/ControlConceptPlaytest';

interface ControlConceptPlaytestScreenProps {
  evidence: ControlConceptEvidenceV1[];
  onLaunch: (slot: ControlConceptSlot, inputDevice: InputDevice) => void;
  onClear: () => void;
  onClose: () => void;
}

export const ControlConceptPlaytestScreen: React.FC<ControlConceptPlaytestScreenProps> = ({ evidence, onLaunch, onClear, onClose }) => {
  const summary = React.useMemo(() => aggregateControlConceptEvidence(evidence), [evidence]);
  const latest = React.useMemo(() => new Map(evidence.filter((item) => item.buildId === CONTROL_CONCEPT_BUILD_ID).map((item) => [item.slotId, item])), [evidence]);
  const [inputDevice, setInputDevice] = React.useState<InputDevice>('KEYBOARD');

  const exportEvidence = () => {
    const blob = new Blob([exportControlConceptEvidenceJson(evidence)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iron-kestrel-control-concept-${CONTROL_CONCEPT_BUILD_ID}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-slate-950/95 p-3 font-mono-tech text-zinc-100 md:p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-zinc-950/90 p-4">
          <div>
            <div className="text-[10px] font-bold tracking-[.22em] text-amber-300">MILESTONE 5 // {CONTROL_CONCEPT_BUILD_ID}</div>
            <h1 className="font-display text-2xl font-black tracking-wider md:text-4xl">EARLY CONTROL-CONCEPT TEST</h1>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">Three novice and two experienced players fly a clean, isolated Guided Mission 1. Do not explain the controls. Observe behaviour, then complete the structured review. These runs never alter campaign, showcase or operation saves.</p>
          </div>
          <button type="button" onClick={onClose} className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /> MAIN MENU</button>
        </header>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Control concept evidence summary">
          <SummaryCard label="SESSIONS" value={`${summary.completedSlotIds.length}/5`} passed={summary.complete} />
          <SummaryCard label="NOVICE" value={`${summary.noviceCount}/3`} passed={summary.noviceCount === 3} />
          <SummaryCard label="EXPERIENCED" value={`${summary.experiencedCount}/2`} passed={summary.experiencedCount === 2} />
          <SummaryCard label="WANT ANOTHER" value={`${summary.wantsAnotherSortieCount}/5`} passed={summary.wantsAnotherSortieCount >= 3} />
          <SummaryCard label="EVIDENCE" value={summary.complete ? 'COMPLETE' : 'PENDING'} passed={summary.complete} />
        </section>

        <section className="rounded-xl border border-cyan-800/50 bg-cyan-950/10 p-4 text-xs">
          <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-end">
            <div><strong className="text-cyan-200">Observer protocol</strong><ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-400"><li>Seat the player at the chosen physical control method.</li><li>Launch the assigned clean run and provide no explanation beyond the game.</li><li>Record comprehension when behaviour demonstrates it, not when the prompt appears.</li><li>After success or failure, ask whether they want another sortie before suggesting Mission 2.</li></ol></div>
            <label className="text-[10px] font-bold tracking-wider text-zinc-400">PHYSICAL CONTROL FOR NEXT RUN<select value={inputDevice} onChange={(event) => setInputDevice(event.target.value as InputDevice)} className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"><option value="KEYBOARD">KEYBOARD</option><option value="GAMEPAD">GAMEPAD</option><option value="TOUCH">TOUCH</option></select></label>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {CONTROL_CONCEPT_SLOTS.map((slot) => {
            const result = latest.get(slot.id);
            return <article key={slot.id} className={`rounded-xl border p-4 ${result ? 'border-emerald-500/40 bg-emerald-950/15' : 'border-zinc-800 bg-zinc-950/80'}`}>
              <div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-bold tracking-[.18em] text-amber-300">{slot.id} // PLAYER {slot.order}</div><h2 className="mt-1 font-display text-lg font-black">{slot.experience === 'NOVICE' ? 'LITTLE / NO FLIGHT-GAME EXPERIENCE' : 'ARCADE / ACTION / FLIGHT EXPERIENCED'}</h2></div>{result ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <ClipboardCheck className="h-5 w-5 text-zinc-600" />}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">Clean Pilot-difficulty snapshot · Guided Mission 1 · Fleet CAP · no external coaching.</p>
              {result ? <div className="mt-3 rounded border border-zinc-800 bg-zinc-950/70 p-2 text-[10px] text-zinc-400">Latest: <span className={result.run.result === 'VICTORY' ? 'text-emerald-300' : 'text-rose-300'}>{result.run.result}</span> · wants another: {result.response.wantedAnotherSortie ? 'YES' : 'NO'} · {result.response.confusionPoints.length} confusion point{result.response.confusionPoints.length === 1 ? '' : 's'}</div> : null}
              <button type="button" onClick={() => { soundEngine.playUIClick(); onLaunch(slot, inputDevice); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-amber-400 px-4 py-2 font-display text-xs font-black tracking-wider text-zinc-950 hover:bg-amber-300"><Play className="h-4 w-4 fill-zinc-950" /> {result ? 'RUN AGAIN FROM CLEAN SNAPSHOT' : 'START CLEAN GUIDED RUN'}</button>
            </article>;
          })}
        </section>

        {summary.historicalCount > 0 ? <div className="rounded border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-400">{summary.historicalCount} historical run{summary.historicalCount === 1 ? '' : 's'} retained but excluded from this build.</div> : null}
        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs"><span className="text-zinc-500">No names, contact details, raw controls or network identifiers are recorded.</span><div className="flex gap-2"><button type="button" disabled={!evidence.length} onClick={exportEvidence} className="flex items-center gap-2 rounded border border-emerald-600/50 px-3 py-2 text-emerald-300 disabled:opacity-30"><Download className="h-4 w-4" /> EXPORT JSON</button><button type="button" disabled={!evidence.length} onClick={() => { if (window.confirm('Reset all local early control-test evidence?')) onClear(); }} className="flex items-center gap-2 rounded border border-rose-700/50 px-3 py-2 text-rose-300 disabled:opacity-30"><Trash2 className="h-4 w-4" /> RESET</button></div></footer>
      </div>
    </div>
  );
};

interface ControlConceptReviewProps {
  slot: ControlConceptSlot;
  run: PlaytestRunResult;
  onSubmit: (response: ControlConceptResponseV1) => void;
}

type DraftObservation = { rating: ControlConceptRating | ''; comprehensionSeconds: string };

export const ControlConceptReview: React.FC<ControlConceptReviewProps> = ({ slot, run, onSubmit }) => {
  const [observations, setObservations] = React.useState<Record<string, DraftObservation>>(() => Object.fromEntries(CONTROL_CONCEPT_IDS.map((id) => [id, { rating: '', comprehensionSeconds: '' }])));
  const [confusionPoints, setConfusionPoints] = React.useState<ControlConceptConfusion[]>([]);
  const [wantedAnotherSortie, setWantedAnotherSortie] = React.useState<boolean | null>(null);
  const [requestedAnotherSortieWithoutPrompt, setRequestedAnotherSortieWithoutPrompt] = React.useState<boolean | null>(null);
  const [outsideHelpGiven, setOutsideHelpGiven] = React.useState(false);
  const complete = CONTROL_CONCEPT_IDS.every((id) => {
    const item = observations[id];
    return item.rating && (item.rating === 'NOT_UNDERSTOOD' || (Number(item.comprehensionSeconds) > 0 && Number(item.comprehensionSeconds) <= 3600));
  }) && wantedAnotherSortie !== null && requestedAnotherSortieWithoutPrompt !== null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete || wantedAnotherSortie === null || requestedAnotherSortieWithoutPrompt === null) return;
    const clean = Object.fromEntries(CONTROL_CONCEPT_IDS.map((id) => [id, {
      rating: observations[id].rating as ControlConceptRating,
      comprehensionSeconds: observations[id].rating === 'NOT_UNDERSTOOD' ? null : Math.round(Number(observations[id].comprehensionSeconds)),
    }])) as Record<typeof CONTROL_CONCEPT_IDS[number], ControlConceptObservation>;
    onSubmit({ observations: clean, confusionPoints, wantedAnotherSortie, requestedAnotherSortieWithoutPrompt, outsideHelpGiven });
  };

  return <div className="absolute inset-0 z-40 overflow-y-auto bg-slate-950/95 p-3 font-mono-tech text-zinc-100 md:p-6"><form onSubmit={submit} className="mx-auto w-full max-w-4xl rounded-xl border border-amber-500/40 bg-zinc-950 p-4 md:p-6">
    <header className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-4"><div><div className="text-[10px] tracking-[.18em] text-amber-300">{slot.id} // OBSERVER REVIEW</div><h1 className="font-display text-2xl font-black">{slot.experience} PLAYER</h1><p className="mt-1 text-xs text-zinc-400">Judge demonstrated behaviour. Do not infer comprehension from prompts alone.</p></div>{run.result === 'VICTORY' ? <CheckCircle2 className="h-8 w-8 text-emerald-400" /> : <XCircle className="h-8 w-8 text-rose-400" />}</header>
    <div className="my-4 grid grid-cols-2 gap-2 text-[10px] md:grid-cols-4"><Metric label="RESULT" value={run.result} /><Metric label="SIM TIME" value={`${Math.round(run.simulationTicks / 60)}s`} /><Metric label="TUTORIAL" value={`${run.tutorialStepsCompleted}/9`} /><Metric label="LANDING" value={run.landingGrade || 'NONE'} /></div>
    <fieldset><legend className="mb-2 text-xs font-bold tracking-wider text-zinc-300">TIME TO COMPREHENSION</legend><div className="space-y-2">{CONTROL_CONCEPT_IDS.map((id) => <div key={id} className="grid gap-2 rounded border border-zinc-800 bg-zinc-900/60 p-3 sm:grid-cols-[1fr_190px_150px] sm:items-center"><span className="text-[11px] text-zinc-300">{CONTROL_CONCEPT_LABELS[id]}</span><select aria-label={`${CONTROL_CONCEPT_LABELS[id]} result`} value={observations[id].rating} onChange={(event) => setObservations((current) => ({ ...current, [id]: { ...current[id], rating: event.target.value as ControlConceptRating | '' } }))} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-[10px]"><option value="">SELECT RESULT</option><option value="INDEPENDENT">INDEPENDENT</option><option value="HESITANT">WITH HESITATION</option><option value="NOT_UNDERSTOOD">NOT UNDERSTOOD</option></select><label className="text-[9px] text-zinc-500">SECONDS<input aria-label={`${CONTROL_CONCEPT_LABELS[id]} comprehension seconds`} type="number" min="1" max="3600" disabled={observations[id].rating === 'NOT_UNDERSTOOD'} value={observations[id].comprehensionSeconds} onChange={(event) => setObservations((current) => ({ ...current, [id]: { ...current[id], comprehensionSeconds: event.target.value } }))} className="ml-2 w-20 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200 disabled:opacity-30" /></label></div>)}</div></fieldset>
    <fieldset className="mt-5"><legend className="mb-2 text-xs font-bold tracking-wider text-zinc-300">MAJOR CONFUSION POINTS</legend><div className="grid gap-2 sm:grid-cols-2">{(Object.entries(CONTROL_CONFUSION_LABELS) as [ControlConceptConfusion, string][]).map(([id, label]) => <label key={id} className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-300"><input type="checkbox" checked={confusionPoints.includes(id)} onChange={(event) => setConfusionPoints((current) => event.target.checked ? [...current, id] : current.filter((item) => item !== id))} className="accent-amber-400" />{label}</label>)}</div></fieldset>
    <fieldset className="mt-5 space-y-2"><legend className="mb-2 text-xs font-bold tracking-wider text-amber-200">PRIMARY BEHAVIOURAL MEASURE</legend><TriState label="After the run, did the player say they wanted another sortie?" value={wantedAnotherSortie} onChange={setWantedAnotherSortie} /><TriState label="Did they request another sortie before the observer suggested Mission 2?" value={requestedAnotherSortieWithoutPrompt} onChange={setRequestedAnotherSortieWithoutPrompt} /><label className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-300"><input type="checkbox" checked={outsideHelpGiven} onChange={(event) => setOutsideHelpGiven(event.target.checked)} className="accent-rose-500" />Outside control coaching was given; this session must be rerun for completion.</label></fieldset>
    <div className="mt-5 flex justify-end border-t border-zinc-800 pt-4"><button type="submit" disabled={!complete} className="flex items-center gap-2 rounded bg-emerald-500 px-5 py-2 font-display text-xs font-black tracking-wider text-zinc-950 disabled:cursor-not-allowed disabled:opacity-30"><ClipboardCheck className="h-4 w-4" /> SAVE HUMAN EVIDENCE</button></div>
  </form></div>;
};

const SummaryCard: React.FC<{ label: string; value: string; passed: boolean }> = ({ label, value, passed }) => <div className={`rounded-lg border p-3 ${passed ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/80'}`}><div className="text-[9px] tracking-wider text-zinc-500">{label}</div><div className={`mt-1 font-display text-xl font-black ${passed ? 'text-emerald-300' : 'text-zinc-300'}`}>{value}</div></div>;
const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded border border-zinc-800 bg-zinc-900 p-2"><div className="text-zinc-500">{label}</div><div className="mt-1 font-bold text-cyan-300">{value}</div></div>;
const TriState: React.FC<{ label: string; value: boolean | null; onChange: (value: boolean) => void }> = ({ label, value, onChange }) => <div className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2"><span className="text-[11px] text-zinc-300">{label}</span><div className="flex gap-1"><button type="button" aria-pressed={value === true} onClick={() => onChange(true)} className={`rounded px-3 py-1 text-[9px] font-bold ${value === true ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>YES</button><button type="button" aria-pressed={value === false} onClick={() => onChange(false)} className={`rounded px-3 py-1 text-[9px] font-bold ${value === false ? 'bg-rose-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>NO</button></div></div>;

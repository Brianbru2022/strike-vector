import { DifficultyPreset } from '../types/game';
import { RELEASE_INFO } from './Release';

export const BETA_EVIDENCE_STORAGE_KEY = 'IRON_KESTREL_EXTERNAL_BETA_EVIDENCE_V1';
export const MAX_BETA_EVENTS = 250;

export type BetaEvidenceEventType = 'SESSION_STARTED' | 'MISSION_STARTED' | 'SORTIE_ENDED' | 'RETRY_REQUESTED' | 'CONTINUE_REQUESTED';

export interface BetaEvidenceEventV1 {
  sequence: number;
  utcDay: string;
  type: BetaEvidenceEventType;
  missionId: string | null;
  difficulty: DifficultyPreset | null;
  result: 'VICTORY' | 'FAILURE' | null;
  simulationTicks: number | null;
}

export interface BetaEvidenceV1 {
  version: 1;
  buildId: string;
  events: BetaEvidenceEventV1[];
}

type BetaEventInput = Partial<Omit<BetaEvidenceEventV1, 'sequence' | 'utcDay' | 'type'>>;

const emptyEvidence = (): BetaEvidenceV1 => ({ version: 1, buildId: RELEASE_INFO.buildId, events: [] });

export function sanitiseBetaEvidence(value: unknown): BetaEvidenceV1 {
  if (!value || typeof value !== 'object') return emptyEvidence();
  const source = value as Partial<BetaEvidenceV1>;
  if (source.version !== 1 || source.buildId !== RELEASE_INFO.buildId || !Array.isArray(source.events)) return emptyEvidence();
  const events = source.events.flatMap((event): BetaEvidenceEventV1[] => {
    if (!event || typeof event !== 'object') return [];
    const item = event as Partial<BetaEvidenceEventV1>;
    if (!['SESSION_STARTED', 'MISSION_STARTED', 'SORTIE_ENDED', 'RETRY_REQUESTED', 'CONTINUE_REQUESTED'].includes(item.type ?? '')) return [];
    if (typeof item.sequence !== 'number' || !Number.isFinite(item.sequence) || !/^\d{4}-\d{2}-\d{2}$/.test(item.utcDay ?? '')) return [];
    return [{
      sequence: Math.max(1, Math.round(item.sequence)),
      utcDay: item.utcDay!,
      type: item.type!,
      missionId: typeof item.missionId === 'string' ? item.missionId : null,
      difficulty: ['ARCADE', 'PILOT', 'VETERAN'].includes(item.difficulty ?? '') ? item.difficulty! : null,
      result: item.result === 'VICTORY' || item.result === 'FAILURE' ? item.result : null,
      simulationTicks: typeof item.simulationTicks === 'number' && Number.isFinite(item.simulationTicks) ? Math.max(0, Math.round(item.simulationTicks)) : null,
    }];
  }).slice(-MAX_BETA_EVENTS);
  return { version: 1, buildId: RELEASE_INFO.buildId, events };
}

export function loadBetaEvidence(storage: Pick<Storage, 'getItem'> = window.localStorage): BetaEvidenceV1 {
  try { return sanitiseBetaEvidence(JSON.parse(storage.getItem(BETA_EVIDENCE_STORAGE_KEY) ?? 'null')); }
  catch { return emptyEvidence(); }
}

export function recordBetaEvent(
  type: BetaEvidenceEventType,
  input: BetaEventInput = {},
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage,
  now = new Date(),
): BetaEvidenceV1 {
  const current = loadBetaEvidence(storage as Storage);
  const sequence = (current.events.at(-1)?.sequence ?? 0) + 1;
  const event: BetaEvidenceEventV1 = {
    sequence,
    utcDay: now.toISOString().slice(0, 10),
    type,
    missionId: input.missionId ?? null,
    difficulty: input.difficulty ?? null,
    result: input.result ?? null,
    simulationTicks: input.simulationTicks == null ? null : Math.max(0, Math.round(input.simulationTicks)),
  };
  const next = { ...current, events: [...current.events, event].slice(-MAX_BETA_EVENTS) };
  try { storage.setItem(BETA_EVIDENCE_STORAGE_KEY, JSON.stringify(next)); } catch { /* Restricted storage must not interrupt play. */ }
  return next;
}

export function exportBetaEvidenceJson(storage: Pick<Storage, 'getItem'> = window.localStorage): string {
  const evidence = loadBetaEvidence(storage);
  const days = new Set(evidence.events.map((event) => event.utcDay));
  const missionOneEnds = evidence.events.filter((event) => event.type === 'SORTIE_ENDED' && event.missionId === 'm1_coastal_strike');
  const missionTwoStarts = evidence.events.filter((event) => event.type === 'MISSION_STARTED' && event.missionId === 'm2_valley_run').length;
  return JSON.stringify({
    ...evidence,
    summary: {
      sessions: evidence.events.filter((event) => event.type === 'SESSION_STARTED').length,
      returnVisitDays: Math.max(0, days.size - 1),
      missionOneAttempts: missionOneEnds.length,
      missionOneVictories: missionOneEnds.filter((event) => event.result === 'VICTORY').length,
      retryRequests: evidence.events.filter((event) => event.type === 'RETRY_REQUESTED').length,
      continueRequests: evidence.events.filter((event) => event.type === 'CONTINUE_REQUESTED').length,
      missionTwoStarts,
    },
    privacy: 'Local event categories only. No raw input, free text, account, network address or automatic transmission.',
  }, null, 2);
}

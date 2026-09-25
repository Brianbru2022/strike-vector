export const RELEASE_INFO = Object.freeze({
  version: '1.2.0-dev.1',
  displayVersion: '1.2 DEV1',
  buildId: 'IK87-1.2.0-DEV1-20260925-AUDIO1',
  channel: 'DEVELOPMENT' as const,
  campaignMissionCount: 16,
  operationGenerationVersions: Object.freeze([1, 2, 3] as const),
  saveVersion: 4,
  freezeStarted: '2026-08-31',
});

export const RELEASE_FREEZE_RULES = Object.freeze([
  'The 1.0 campaign objectives, formations and progression remain frozen.',
  'Campaign V1-V4 migration and operation V1/V2 seeds remain compatible.',
  'Dynamic Operations 2.0 data is isolated in V3 blueprints and V2 persistence stores.',
  'Campaign content remains frozen; the playability-profile refactor requires fresh balance, recovery and physical-input evidence.',
  'The ElevenLabs nozzle-transition cue remains conditional pending commercial-entitlement evidence and build-bound listening approval.',
]);

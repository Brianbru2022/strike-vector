# Playability-to-release implementation

Build `IK87-1.2.0-DEV1-20260922-PLAY1` establishes the shared engineering authorities and evidence boundaries for Milestones 11–20. Campaign content remains frozen at sixteen missions.

## Implemented engineering authority

- `PlayerFlightProfile` controls acceleration, reversal, hover response, pitch response and the visual heading transition.
- `RecoveryAssistProfile` supplies the same difficulty-specific tolerances to recovery guidance and touchdown grading.
- `CombatFeedbackProfile` controls the duration of hit, damage, radio and fighter-state cues.
- `EncounterPacingProfile` controls attack commitment, pass duration, re-engagement and active-combat measurement.
- `DiagnosticSessionV4` adds reversal quality, input-device transitions, recovery failure, warning response and encounter idle time while migrating V1–V3 records.

## Evidence boundary

`pnpm roadmap:playability:prepare` verifies engineering contracts. `pnpm roadmap:playability:gate` is intentionally fail-closed until the required human sessions, listening checks, physical-device matrix, three-hour soak, Windows lifecycle checks, trusted signing, legal clearance and Steam approval exist for the exact candidate build.

No automated command may synthesise those outcomes. The product remains a development build until the candidate-bound Milestone 19 evidence passes.

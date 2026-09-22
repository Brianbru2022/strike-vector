# Milestone 11 human playtesting and balance closure

Build identifier: **IK87-1.2.0-DEV1-20260922-PLAY1**

Status: **PENDING HUMAN RUNS**

The validation tooling and automated release gates are implemented. No judgement-based run is marked complete until a local tester flies the scenario and submits its after-action review. Automated browser control does not count as human evidence.

## Required matrix

Validation Runs contains 21 clean scenarios. The original eight control and accessibility runs remain, with another thirteen runs providing complete Arcade, Pilot and Veteran coverage for Missions 1, 6, 10, 11, 14 and 16. Keyboard, gamepad and 844 x 390 touch play are represented throughout the matrix.

Use the mission, difficulty and control filters to work through the matrix in manageable batches. Each launch receives a clean aircraft, fixed loadout, declared accessibility settings and a freshly reconstructed mission runtime.

## Completion rules

- All 21 scenarios have current evidence and end in victory.
- All six benchmark missions, three difficulties and three control classes are covered.
- At least 75% of warning-exposed runs acknowledge the warning, with a minimum of six.
- Guided Mission 1 completes without external help or skipping training.
- Controls, objectives, ammunition and recovery are certified in every latest run.
- The two damaged-recovery scenarios record non-zero combat damage.
- No immediate blocker or issue repeated in two or more latest runs remains.

Earlier attempts remain in the export after a tuning batch, but only the latest attempt for each scenario controls sign-off. Adjust shared combat difficulty profiles, aircraft profiles or recovery tolerances; do not add mission-specific difficulty exceptions.

## Evidence and privacy

Open **Validation Runs** in a development build or add `?playtest=1` to a local production URL. Evidence is stored only under `STRIKE_VECTOR_PLAYTEST_EVIDENCE_V1`. Exported JSON contains the build, scenario, technical run metrics, structured answers and an optional 1,200-character observation. It contains no name, raw input, network identifier or transmitted telemetry.

## Automated guarantees

- Validation sorties do not update campaign progress, aircraft condition, showcase progress, operation state, diagnostics or the global high score.
- Scenario difficulty, loadout, accessibility and remapped bindings are temporary runtime overrides.
- Retries retain earlier evidence and reset the sortie to a clean aircraft and immutable mission runtime.
- Corrupt validation records recover to an empty evidence set without touching other saves.

## Remaining human authority

- Warning readability, control comfort, perceived fairness and enjoyment require genuine human judgement.
- Gamepad and touch quality require physical input; automated checks verify flow and storage isolation only.
- Genuine first-time-player usability remains advisable before a public commercial release.

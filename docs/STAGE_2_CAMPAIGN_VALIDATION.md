# Stage 2: Internal Campaign Validation

Stage 2 is a judgement-based balance pass for the current build. Automated tests prepare and verify the programme, but they do not count as human evidence.

## Run matrix

- Complete Missions 1–16 on Pilot using the declared clean aircraft and certified loadout.
- Complete targeted Arcade stress runs for Missions 1, 6, 10, 14 and 16.
- Complete targeted Veteran stress runs for Missions 1, 6, 10, 14 and 16.
- Save the structured after-action review after every attempt. If tuning changes code or balance, use the new build and repeat the affected coverage.

Open **Validation Runs** from a development or internal build, then choose **Stage 2 Campaign Matrix**. Stage 2 storage is separate from campaign, operations, showcase, diagnostics and Stage 1 evidence.

## Recorded evidence

Each run records the build ID, scenario, simulation duration, result, retry count, completed objectives, aircraft-loss phase, damage by source, weapons used and hit, ammunition remaining, warning exposure and landing grade. The review records control, objective, warning, target, ammunition, opening-fairness and recovery judgements plus explicit blockers.

No name, raw input, network identifier or online telemetry is collected.

## Gate

Export the completed matrix and place it at `reports/stage-2/campaign-validation-evidence.json`, then run:

```powershell
pnpm stage2:evidence
```

The command remains unsuccessful until all 26 current-build scenarios are present, victorious and free of blockers or repeated unresolved issues. Historical attempts remain in the export but cannot certify another build.

# Stage 7 — Complete-game balance validation

Candidate build: `IK87-1.2.0-DEV1-20260831-BAL7`

Stage 7 separates automated certification from human play evidence. Automated tests prove deterministic encounter behaviour, authoritative shared tuning, valid recovery geometry, sufficient capacity for every loadout the servicing screen offers, and complete procedural-archetype coverage. They do not claim that a human completed a sortie.

## Required play matrix

- Complete all 16 campaign missions once on Arcade, Pilot and Veteran: 48 victories.
- Complete two three-sortie deployments on each difficulty: 18 sortie victories across six deployments.
- The two deployments at each difficulty must collectively cover Fleet CAP, SEAD, armoured interdiction, pilot rescue, FARP defence and deep strike.
- Use the exact candidate build shown above. Historical diagnostics do not count.

The diagnostics screen reports completion, ammunition use, damage by source, combat/sortie duration, missile-warning response and landing grade for the current build. Use **Export Stage 7 Evidence** after completing the matrix. The export now creates one review template per unique run; complete every template honestly for opening-attack fairness, recovery feasibility, dead travel and late-failure clarity. Copy the completed export to `reports/stage7/human-balance-evidence.json` and run `pnpm stage7:evidence`.

## Tuning authority

- Difficulty changes belong only in `CombatDifficultyProfile`.
- Aircraft changes belong in shared aircraft profiles.
- Weapon and recovery changes belong in their shared systems.
- Mission-specific difficulty branches are prohibited and audited.
- Mission objectives, recovery geometry, difficulty profiles and offered loadouts are sealed in `config/stage7-balance-freeze.json`. Regenerating that file is an explicit balance-freeze decision, not part of the normal gate.

## Current automated result

- 48 campaign/difficulty definitions certified.
- Six deterministic deployments certified, two per difficulty, covering every archetype.
- Nine deterministic fighter/SAM/combined encounter checks certified.
- All servicing-screen loadouts have sufficient static mission capacity.
- Recovery sites are inside mission bounds on every difficulty.
- The static pacing audit passed. Mission 11's 4,600-unit contact gap and Mission 14's 10,050-unit gap remain explicit human-review observations.
- Stage 7 evidence now rejects missing simulation duration, missing victory recovery grades, duplicate human-review keys and mismatched build identifiers.
- Current-build diagnostics expose completion, sortie/combat duration, ordnance, damage source, warning response and landing-grade totals directly in settings.
- Human evidence is pending; therefore Stage 7 is not signed off and balance/objective freeze is not a commercial-release claim.

## Commands

```text
pnpm stage7:authority
pnpm balance:certify
pnpm stage7:pacing
pnpm stage7:freeze:audit
pnpm stage7:evidence
pnpm stage7:gate
```

`stage7:gate` must remain unsuccessful until the genuine current-build play matrix and its human reviews are present.

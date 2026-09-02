# Tactical Air Combat Release Sign-off

Use this sheet for the human release pass. Automated tests establish deterministic behaviour and content validity; these sessions decide whether each encounter is readable, fair and enjoyable.

Run `pnpm balance:certify` before each human pass. It writes `reports/balance-certification.json` and `reports/balance-certification.md`, covering all 30 campaign/difficulty combinations, two deployments per difficulty, every operation archetype and fighter/SAM determinism at 30, 60 and 120 Hz. The System Settings diagnostics panel separately tracks completed human coverage from genuine victory records.

## Required coverage

- Complete the ten-mission campaign once on Arcade, Pilot and Veteran.
- Complete two three-sortie Dynamic Operations deployments on each difficulty.
- Across the deployments, cover Fleet CAP, SEAD, armoured interdiction, pilot rescue, FARP defence and deep strike.
- Test at least one campaign sortie and one deployment on a compact mobile-landscape viewport.
- Export Local Playtest Diagnostics after each difficulty pass and retain the files with the build notes.
- Use operation seeds `1` and `23` on each difficulty; together they cover all six archetypes in exactly two deployments.

## Session record

| Build | Date | Difficulty | Mission or seed | Result | Accuracy | Damage | Recovery | Retries | Notes |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |
|  |  |  |  |  |  |  |  |  |  |

For each session, note:

- whether detection, tracking and launch cues were noticed in time;
- whether fighter attitude and formation movement looked natural;
- whether any opening attack was unavoidable;
- the cause and phase of every aircraft loss;
- whether ammunition was sufficient for required objectives;
- whether carrier or FARP recovery remained achievable after combat damage;
- any pause, input-prompt or reduced-effects defect.

## Immediate release blockers

- An unavoidable attack before the player receives a readable cue.
- Visible angle snapping, instantaneous reversal or overlapping formation aircraft.
- Terrain penetration or persistent failure to maintain clearance.
- A campaign or operation objective that cannot be completed with its offered loadouts.
- A carrier or FARP recovery that is impossible within the selected difficulty tolerance.
- Diagnostics that expose raw input data, fail migration or exceed 100 retained sessions.

## Tuning discipline

Change shared values in `src/game/CombatBalance.ts` or the aircraft profiles in `src/game/AirCombatAI.ts`; do not introduce mission-specific difficulty branches. Re-run type-check, deterministic tests, production/PWA build and the browser suite after every tuning batch. Difficulty may alter competence and punishment, but never objectives, formations or medal rules.

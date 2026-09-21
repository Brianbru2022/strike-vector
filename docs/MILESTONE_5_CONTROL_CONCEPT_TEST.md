# Milestone 5 — early control-concept human test

This milestone tests the control concept before the larger commercial validation matrix. Automated browser runs do not count as human evidence.

## Required group

- P01–P03: three people with little or no flight-game experience.
- P04–P05: two people experienced with arcade, action or flight games.

Open a local development build and select **Early Control Test**. Choose the physical control method, assign the correct anonymous participant slot and start the clean run. Every run uses an isolated Pilot-difficulty Guided Mission 1 snapshot with the Fleet CAP loadout. It cannot alter campaign, showcase, operation, diagnostics or the existing 21-run validation evidence.

Do not explain controls beyond what an ordinary player receives in the game. Observe whether the player understands pitch, left/right flight direction and low-speed reversal, altitude, VTOL, target acquisition and firing, threat warnings, countermeasures, fuel and damage, carrier recovery and the reason for failure. Record demonstrated comprehension time and structured confusion categories after the sortie.

Before suggesting Mission 2, ask whether the player wants another sortie and record whether they requested it without prompting. This is the primary behavioural measure; it must not be inferred from an automated profile.

## Evidence

Evidence remains local under `IRON_KESTREL_CONTROL_CONCEPT_PLAYTEST_V1` and contains no name, contact detail, raw control input or network identifier. Export it from the screen after all five sessions, review the JSON, then place the approved export at:

`reports/milestone-5/control-concept-evidence.json`

Verify it with:

`pnpm milestone5:evidence`

When the reviewed export passes, set `fivePlayerInternalTest.status` in `config/external-beta-approval.json` to `APPROVED`. The external-beta gate consumes this same structured export directly; no second transcription containing tester names is required.

The verifier rejects stale build IDs, missing group coverage, malformed records and any latest session where outside coaching was given. Earlier attempts remain in the export but only the latest run for each slot is used for completion.

Milestone 5 remains pending until the five judgement-based sessions are genuinely completed on the exact current build.

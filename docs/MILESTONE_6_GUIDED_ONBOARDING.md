# Milestone 6 — Guided Mission 1 onboarding

Mission 1 now follows one consistent loop:

**Teach → player acts → clear success response → next lesson.**

Each of the nine lessons uses a compact top safe-area banner so the instruction does not cover the player aircraft, target or central aiming region. Input prompts continue to use the most recently active keyboard, gamepad or touch binding. The player may skip training from any active instruction.

After a lesson succeeds, its instruction is replaced by an explicit confirmation for 48 fixed simulation ticks (0.8 seconds). Inputs for later lessons cannot accidentally satisfy a lesson during that confirmation. Carrier recovery completes the course immediately because the debrief transition supplies the final response.

Run the automated onboarding review with:

`pnpm milestone6:onboarding:audit`

Run the implementation checks with:

`pnpm milestone6:prepare`

The strict gate is:

`pnpm milestone6:gate`

The strict gate deliberately includes the Milestone 5 evidence verifier. It cannot pass until three novice and two experienced players have completed current-build Guided Mission 1 sessions. Automated tests certify sequence, timing, copy length, binding behaviour and layout isolation; they do not certify that unfamiliar players understand the wording.

When human evidence exists, review comprehension times and repeated confusion categories before changing copy. Do not infer wording approval from deterministic input profiles.

# Five-player internal beta test

Use the exact build ID shown in the game and in `src/game/Release.ts`. Each tester starts with a clean save and receives only the guidance available to an ordinary player.

Recruit three people with little or no flight-game experience and two people experienced with action or flight games. Every tester begins Guided Mission 1. Do not coach them. Observe when they understand pitch, left/right flight, altitude, VTOL, targeting, weapons, warnings, countermeasures, fuel/damage and recovery.

For each tester record a distinct non-identifying tester code in `config/internal-beta-playtest.json`, experience group, whether Mission 1 produced a meaningful completion or understood failure, whether a serious crash occurred, whether the save survived, whether the controls were universally rejected, whether the failure reason was understood and—most importantly—whether they voluntarily wanted another sortie. Never infer or pre-fill these answers.

The test passes its minimum safety gate when all five valid runs belong to the candidate build, no serious crash or save loss occurs, every tester can complete or fail meaningfully, controls are not universally rejected, and at least one tester voluntarily wants another sortie. Repeated confusion remains product evidence even when the minimum gate passes and should be fixed before inviting strangers.

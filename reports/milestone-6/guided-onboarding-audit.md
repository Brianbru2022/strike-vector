# Milestone 6 guided onboarding audit

Build: `IK87-1.2.0-DEV1-20260920-ONBOARD1`

Automated structure: **PASS**
Human wording evidence: **PENDING MILESTONE 5 SESSIONS**

| # | Lesson | Learn by doing | Success response | Banner copy |
| -: | --- | --- | --- | --- |
| 1 | LAUNCH | PLAYER_STATE | Airborne — climb established. | 58 chars |
| 2 | PITCH | PLAYER_STATE | Climb response confirmed. | 48 chars |
| 3 | THROTTLE | SEMANTIC_ACTION | Power increasing — acceleration confirmed. | 67 chars |
| 4 | CANNON | SEMANTIC_ACTION | Cannon response confirmed. | 60 chars |
| 5 | TARGET | PLAYER_STATE | Target locked. | 86 chars |
| 6 | SIDEWINDER | SEMANTIC_ACTION | Sidewinder away. | 57 chars |
| 7 | COUNTERMEASURE | SEMANTIC_ACTION | Flare released. | 85 chars |
| 8 | VTOL | PLAYER_STATE | VTOL selected — nozzles rotating. | 70 chars |
| 9 | RECOVERY | MISSION_RESULT | Carrier qualification complete. | 94 chars |

The runtime now uses TEACH → PLAYER ACTS → CLEAR SUCCESS RESPONSE → NEXT LESSON. Non-final confirmations remain visible for 0.8 simulation seconds in a top safe-area banner. Recovery completion is confirmed by the debrief transition.

The skip control remains available during every active instruction. Automated checks do not approve wording on behalf of players; final copy approval requires the five genuine Milestone 5 sessions.

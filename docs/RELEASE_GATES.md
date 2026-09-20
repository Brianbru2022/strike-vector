# External beta and commercial release gates

Iron Kestrel '87 uses two intentionally separate release decisions. Passing the first never implies that the paid game is commercially certified.

## External beta gate

The external-beta gate answers one question: is the restricted browser build safe and coherent enough to expose to genuine testers on an unlisted itch.io page?

Before upload, `pnpm external-beta:gate` requires the automated preparation suite, five genuine Guided Mission 1 sessions, physical keyboard/controller/touch smoke checks, a human readability review, a basic audio smoke and an embedded feedback route. After upload, `pnpm external-beta:hosted-gate` additionally requires the real hosted-iframe smoke test.

It deliberately excludes code signing, Steam approval, formal title clearance, final commercial asset approval, Windows installer lifecycle certification, Auto-Cloud conflict rehearsal, commercial rollback rehearsal, the three-hour soak and the two-week release freeze.

## Commercial release gate

`pnpm commercial:gate` retains every Stage 10 blocker and the stricter Windows, legal, store, balance, listening, soak, rollback and release-freeze evidence. Beta approval cannot satisfy or suppress any of these requirements.

## Stage 10 classification

| Defect | External beta | Commercial | Reason |
| --- | --- | --- | --- |
| S10-001 Code signing | No | Yes | Applies to paid Windows artefacts. |
| S10-002 Steam approval | No | Yes | itch.io testing does not depend on Steam review. |
| S10-003 Three-hour soak | No | Yes | Long hardware certification belongs to the paid build. |
| S10-004 Two-week freeze | No | Yes | Freeze follows beta learning and final scope. |
| S10-005 Rollback/Auto-Cloud | No | Yes | Applies to the commercial desktop lifecycle. |
| S10-006 Full campaign matrix | No | Yes | Beta uses focused safety and Mission 1 evidence. |
| S10-007 Readability | Basic human review | Full sign-off | Serious unreadability blocks both, with different evidence depth. |
| S10-008 Physical controls | Smoke pass | Full matrix | Beta needs working controls; commercial needs exhaustive certification. |
| S10-009 Listening | Basic smoke | Three-device sign-off | Beta requires audible critical cues, not final mix certification. |
| S10-010 Paid-game balance | No | Yes | Exhaustive balance follows behavioural beta evidence. |
| S10-011 Legal/title/assets | No | Yes | Formal clearance is required before sale. |

The machine-readable authority is `config/release-gates.json`. Run `pnpm release:gates:audit` after changing either gate.

# Browser contract audit

Milestone 3 distinguishes genuine regressions from stale wording and deliberately inapplicable project combinations. The current full browser inventory contains 35 scenarios executed across desktop and compact mobile landscape.

## Resolved contract review

| Area | Classification | Resolution |
| --- | --- | --- |
| HMS Invincible integrity | Intended UI change; stale assertion | The test now verifies the current `HMS INVINCIBLE n%` HUD contract. |
| Validation Runs | Intended UI/content change; stale assertion | The development-only route is tested by its current accessible name and isolated storage behaviour. |
| Landing Practice | Intended UI/content change; stale assertion | The dedicated practice route, damaged condition and Invincible recovery cue are tested. |
| Bidirectional controls | Intended control redesign; stale wording | Guided prompts remain device-aware and touch tests now require both `Turn / Fly Left` and `Turn / Fly Right`. |

No player-facing regression was found in these four areas, so the UI was not reverted to obsolete wording.

## Deliberate project skips

Five duplicate project executions are inapplicable rather than flaky:

- connected-controller boot and disconnection checks run in desktop Chrome;
- the complete viewport matrix and ultra-wide geometry check run once in desktop Chrome;
- simultaneous multi-touch certification runs in the compact mobile project.

Every skip carries an explicit reason. The remaining combinations execute normally. `pnpm browser:contracts:audit` rejects focused tests, unresolved `fixme` tests, unexplained/new skips, broad consumer-suite exclusions and loss of the four repaired contracts.

## Verification

The Milestone 5 addition covers the isolated five-person control-concept runner, its structured observer review and its separate storage namespace. It is an internal human-evidence contract and remains excluded from the public consumer suite under the existing `isolated internal validation` filter.

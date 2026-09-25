# Release engineering baseline

## Candidate identity

- Product: Iron Kestrel '87
- Version: 1.2.0-dev.1 / 1.2 DEV1
- Build: `IK87-1.2.0-DEV1-20260925-AUDIO2`
- Branch: `release/1.2-playability-roadmap`
- Channel: development

This baseline records the complete local game state as a reproducible development candidate. It is not a commercial release candidate and must continue to display `DEVELOPMENT BUILD`.

## Automated evidence

Run `pnpm baseline:gate` for the deterministic, content, build, offline and consumer audits. GitHub Actions repeats those checks and separately runs the consumer browser suite, Windows desktop checks, browser demo gate and itch.io package gate.

After committing all intended files, run `pnpm baseline:verify -- --strict`. Strict mode also requires the expected branch and a clean working tree.

## Evidence boundary

Only the current build-bound approval and defect records are rebound to this baseline. Historical reports, visual captures, balance freezes and archived release records retain their original build identifiers. They are evidence of those older builds and do not certify this one.

The following remain deliberately pending and cannot be completed by automation:

- human playability, accessibility, listening and hardware testing;
- fresh build-matched visual capture approval;
- Windows installer signing and clean-machine installation testing;
- trademark, legal, storefront and Steam review;
- long-duration soak, rollback and cloud-conflict rehearsals.

## Completion rule

Milestone 1 is complete when the automated gate passes, the branch contains one auditable baseline commit, and the working tree is clean. That means the code baseline is trustworthy; it does not mean the game is commercially certified.

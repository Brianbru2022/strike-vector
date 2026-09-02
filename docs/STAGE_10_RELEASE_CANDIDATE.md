# Stage 10: Release-candidate certification

Stage 10 prepares one build-bound candidate and does not promote the current development build by itself. `RELEASE_INFO` remains authoritative. Every binary, source tree, runtime asset, storefront pack, release-evidence set, storefront claim and migration range is fingerprinted in `release-artifacts/stage10/<buildId>/candidate-manifest.json`.

## Local preparation

Run `pnpm stage10:prepare`. This executes the deterministic/unit suites, production and demo builds, consumer/offline audits, Rust desktop tests, five-viewport consumer tests, identity checks and candidate-manifest creation.

Run `pnpm stage10:gate` only for launch certification. It must fail while any approval in `config/stage10-release-approval.json` or blocker in `config/stage10-release-defects.json` remains open. Preparation and launch results are stored separately as `reports/stage10/stage10-release-readiness.json` and `stage10-launch-gate.json`.

The three-hour soak status is accepted only when its report belongs to the same build, records at least 180 minutes, contains no page errors and marks itself certification-eligible. A freeze is accepted only when its recorded interval is at least fourteen days and the earliest release time has passed. Status labels without that evidence cannot pass.

## Promotion rule

After all evidence is complete, assign a fresh RC build ID, set the channel to `RELEASE_CANDIDATE`, rebuild and sign Windows artefacts, create a new immutable manifest, repeat all suites and start the two-week freeze. The signing script targets only the current version directory, verifies Authenticode and rewrites the Windows manifest with post-signing hashes. Evidence from another build cannot certify it.

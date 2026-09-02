# Stage 8 — Focused browser demo

The browser demo is built independently with `pnpm demo:build` and written to `dist-demo`. It contains only:

- Guided Mission 1 — Carrier Qualification.
- Replayable Mission 6 — Fleet Defence challenge.
- The shared flight, combat, HUD, accessibility and control systems required by those sorties.

The demo has no campaign map, chapter selection, landing-practice route, Dynamic Operations, validation screen or mission-authoring screen. Late-game and Norwegian environment files are absent from the demo asset directory.

## Storage and paid-edition transfer

Every storage key created by the demo is prefixed `IRON_KESTREL_DEMO_`. Paid browser and Windows save keys are therefore outside its writable namespace.

The demo can export `IRON_KESTREL_DEMO_TRANSFER` V1 JSON. The paid edition has a separate **Import Demo Record** action. Its merge rules are deliberately narrow:

- Keep the higher compatible Mission 1 or Mission 6 score.
- Preserve guided-training completion.
- Never unlock campaign missions.
- Never replace difficulty, controls, accessibility, aircraft condition, loadout, operation records or paid progress.
- Reject ordinary paid-save archives and unrelated JSON.

## Delivery budget

`scripts/prepare-demo-assets.ts` creates a temporary `.demo-public` directory from an explicit allow-list. The current build contains 42 approved content files totalling 13.43 MB; the complete built demo is 14.27 MB and the PWA precache is 14.25 MB. It includes every authored audio cue used by the shared sound engine, so the demo does not silently fall back to synthetic audio for missing release samples.

The 15 MB limit is enforced by `pnpm demo:audit`. The build-bound manifest records each asset's SHA-256 checksum and a combined fingerprint. The audit rejects changed or missing files, duplicate entries, late-game asset names, incomplete offline precaching, the wrong build or title, and missing PWA or commercial-edition files.

## Gate

Run:

```text
pnpm demo:gate
```

`pnpm stage8:gate` is the release-roadmap alias for the same certification.

The gate performs TypeScript checking, the complete deterministic unit suite, a fresh demo asset/build pass, the size/content audit and desktop/mobile browser tests. Browser tests verify both routes, storage isolation, absent development tools, local start time, the restrained Windows-edition hand-off and offline replay of both the interface and authored audio.

Current certification build: `IK87-1.2.0-DEV1-20260831-REL10`. The machine-readable result is written to `reports/stage8/demo-audit.json`.

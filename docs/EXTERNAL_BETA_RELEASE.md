# Iron Kestrel '87 external beta release

The authoritative separation between this gate and the paid-commercial gate is documented in `docs/RELEASE_GATES.md` and checked by `pnpm release:gates:audit`.

The immediate release target is a free, unlisted itch.io HTML5 beta. It is deliberately separate from the paid Windows and Steam release gate. The beta exists to answer whether real people understand and enjoy flying the game before more content or final commercial production work is commissioned.

## Local preparation

Run `pnpm external-beta:prepare`. This checks the current source, deterministic tests, consumer build, PWA build, desktop source, missions, operations and balance simulation. It also builds, audits, browser-tests and packages the dedicated itch target.

The upload archive is `release-artifacts/itch-1.2.0-dev.1/iron-kestrel-87-itch-beta.zip`. Its `index.html` is at the archive root. The itch target uses relative URLs, runs under an arbitrary nested path and does not register a service worker inside the host iframe. The normal PWA and Tauri builds are unchanged.

`pnpm itch:gate` now treats the ZIP as the product under test. It rejects unsafe archive paths, absolute application URLs, service-worker or web-manifest files, missing asset classes and any mismatch between the audited build and packaged file inventory. It then extracts that exact ZIP into a clean staging directory. The browser certification serves the extracted package at `/games/iron-kestrel/`, both directly and inside an itch-style iframe; downloads every packaged file; confirms image and audio delivery; exercises lazy chunks, save/reload and the Mission 1-to-2 campaign transition; and fails on request, HTTP, console or page errors.

Set `VITE_BETA_FEEDBACK_URL` to the HTTPS tester form or support page before the final itch build. The value is a public URL, never a secret. The beta keeps a small local event record and offers an explicit **Export Beta Play Record** download; it never transmits play data automatically.

Run `pnpm external-beta:audit` to see automated readiness without pretending that human work is complete. Run `pnpm external-beta:gate` only when the current-build evidence in `config/external-beta-approval.json` has been completed. The strict upload command must remain blocked until the five-player test, physical input smoke, readability/audio checks and feedback route are genuine.

## Gate split

The external-beta gate requires a working consumer build, stable saves, a working itch package, no internal tools, understandable Mission 1, basic keyboard/Xbox/touch operation, essential readability and audio, a real feedback route and a successful smoke test of the uploaded unlisted build.

The following existing Stage 10 blockers remain commercial-only and do not block an unlisted free beta:

- S10-001: signed Windows commercial artefacts.
- S10-002: Steam store and build approval.
- S10-003: the final long hardware soak.
- S10-004: the two-week release freeze.
- S10-005: commercial rollback and Steam Auto-Cloud rehearsal.
- S10-006 and S10-010: exhaustive human balance/victory matrices; beta still requires the smaller five-player safety check.
- S10-007: final multi-resolution readability certification; beta requires a major-defect review.
- S10-008: exhaustive physical-control certification; beta requires one real keyboard, Xbox-compatible controller and touch-device smoke.
- S10-009: final three-device listening certification; beta requires a basic human audio smoke.
- S10-011: paid-release title, legal and final conditional-asset approval. Beta still requires no unresolved provenance item, honest AI-assisted-content disclosure and no unsupported claim.

## Exact upload point

Upload the ZIP only after `pnpm external-beta:gate` passes for the exact `RELEASE_INFO.buildId`. The upload remains restricted/unlisted. After upload, perform the hosted smoke test, record its URL/evidence, and run `pnpm external-beta:hosted-gate`. Do not mark the page public or paid at this stage.

## What must wait

No new missions, theatre, operation archetypes, multiplayer or authoring expansion should be started before external behaviour is reviewed. Formal title clearance, publisher identity, code signing, Windows lifecycle certification, Steamworks, Auto-Cloud, store approval, long soak and final freeze belong to the later commercial gate.

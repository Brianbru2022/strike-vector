# Superseded 1.0 RC1 freeze record

This historical planning record referred to build `SV-1.0.0-RC1-20260830`. That build is not the current product and this document does not certify a release freeze. The authoritative Stage 10 state is `config/stage10-release-approval.json`.

Campaign objectives, formations, progression, save schema and bundled gameplay assets are frozen. V1–V4 campaign migrations and V1/V2 Dynamic Operations compatibility are protected release surfaces.

Permitted changes are limited to:

- release blockers and objective deadlocks;
- performance regressions and offline/PWA failures;
- accessibility defects;
- save corruption, migration or recovery defects.

Every permitted change must pass type-check, deterministic tests, balance certification, production/PWA build, offline cache inspection and browser regression. Human flight, accessibility, installation and offline-recovery approval is required before promotion from RC1.

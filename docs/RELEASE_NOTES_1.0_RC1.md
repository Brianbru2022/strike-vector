# Superseded 1.0 RC1 planning notes

Build `SV-1.0.0-RC1-20260830` was a historical planning candidate and is not the current commercial build. These notes are retained as an archive only; consult `src/game/Release.ts` and the Stage 10 candidate manifest for current identity.

## Highlights

- Sixteen authored sorties across the North Atlantic and Norwegian Sea campaigns.
- Deterministic three-sortie Dynamic Operations in both original and Norwegian content sets.
- Sea Harrier flight, VTOL, carrier and FARP recovery, servicing, damage and ejection systems.
- Tactical air combat, naval warfare, mission-directed encounters and period-inspired radio presentation.
- Adaptive rendering, keyboard/gamepad/touch controls, captions, high-contrast HUD and reduced-effects support.
- Installable offline PWA with the complete bundled campaign available after the first successful load.
- Corrected duplicate Workbox precache declarations that could activate a service worker without populating its offline cache.

## Save compatibility

Campaign saves V1–V4 migrate to V4 without discarding completed missions, scores or settings. Dynamic Operations V1 seed output remains unchanged; V2 continues to identify the Norwegian content set explicitly.

## Issue reports

System Settings can export a local technical issue report. It contains release identity, viewport class, selected quality/accessibility settings, aggregate campaign state, performance measurements and up to twenty sanitised diagnostic sessions. It does not include names, raw inputs, bindings, browser identity, save contents, operation seeds or network identifiers.

## Known release-candidate limits

- Browser-provided speech voices can differ between devices.
- Physical mobile, gamepad, PWA installation and offline recovery still require human sign-off on release hardware.
- Release freeze permits only blocker, performance, accessibility and save-integrity corrections.

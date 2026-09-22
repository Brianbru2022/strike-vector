# Stage 6 — environment, effects and audio

## Implemented presentation authority

- Every painted environment now supports an ultrawide focus crop and a restrained gameplay-corridor grade. These operate before units are drawn, improving target separation without changing collision geometry.
- Arctic and original-theatre profiles share the same presentation controls. Ultrawide framing is applied only above a 2:1 aspect ratio.
- Weapon profiles own their visual signature and impact-ring colour. Cannon is sharp and local; Sidewinder is cool-white with a motor trail; rockets use a compact orange salvo; bombs retain the broadest ground or water disturbance.
- The primary six-stage explosion is an original painted strip, not the previous photoreal composite. The release preparation preserves the generator source and prompt.
- Warning and radio priority now duck engine, ambience, music, weapons and impacts at their category buses. A transparent peak limiter only protects the final output from stacked transients; it does not replace mixer ducking.
- Thirteen deterministic, locally authored PCM assets now provide distinct Pegasus, VTOL, cannon, Sidewinder, rocket, bomb, flare, naval-gun, touchdown, impact, warning, radio and North Atlantic ambience layers. Procedural synthesis remains a resilient offline fallback and supplies flight-state modulation.

## Human listening protocol

Run Mission 1 and Mission 6 on each of:

1. headphones;
2. ordinary speakers;
3. a typical laptop or mobile device.

For each device confirm warnings remain clear under engine and weapon load, radio remains intelligible, weapon signatures are distinct, the engine remains present without masking essential cues, ambience is balanced, and no objectionable clipping or distortion is audible. Record genuine judgements in `reports/stage6/audio-listening-evidence.json`, using the exact current `RELEASE_INFO.buildId` and an ISO completion timestamp. Do not infer or synthesise answers.

## Commands

- `pnpm stage6:art:prepare` — builds the alpha-cleaned release atlas from the archived source.
- `pnpm stage6:audio:generate` — deterministically rebuilds the checked-in production WAV set.
- `pnpm stage6:audio:audit` — checks format, signal, uniqueness, pack size and mixer priority.
- `pnpm effects:capture` — captures full and reduced-effects comparisons.
- `pnpm visual:capture` — produces the 112-image 16-mission matrix.
- `pnpm visual:manifest:audit` — validates identity, build, checksums and matrix coverage.
- `pnpm stage6:gate` — verifies the current-build visual matrix and the three-device human listening evidence.

## Current candidate status

Build `IK87-1.2.0-DEV1-20260922-PLAY1` passes TypeScript, 284 unit tests, the 13-cue audio audit, the refreshed 112-capture visual-manifest audit, production/PWA build, consumer audit and offline-cache verification. The complete consumer browser suite passes 59 applicable tests with five device-specific skips; the V4 playability diagnostics also pass on desktop and mobile. Commercial Stage 6 sign-off remains pending until the three genuine listening records are completed; automated work must not fill those judgements.

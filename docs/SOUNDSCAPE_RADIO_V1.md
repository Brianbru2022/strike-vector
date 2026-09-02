# Soundscape and Radio Production V1

## Production standard

Milestone 15 established a single offline sound authority for all sixteen campaign sorties. Stage 6 extends it to thirteen checked-in recordings covering the Pegasus and VTOL beds, ADEN cannon, Sidewinder, rockets, bomb release, countermeasures, naval gunfire, carrier touchdown, heavy impacts, threat warnings, radio chirps and North Atlantic wind. Web Audio remains the universal fallback and supplies flight-state modulation.

The Pegasus mix now separates low core, compressor turbine, exhaust roar, airframe wind, vectored-thrust downwash and damaged-compressor flutter. The pure `calculatePegasusLayerMix` function derives every layer from throttle, speed, nozzle position and engine condition, allowing automated checks without an AudioContext.

Weather uses independent low wind/sea and high rain/spray layers. Clear, mist, rain and thunderstorm conditions alter those layers without changing simulation state.

## Readability and accessibility

- Warnings and radio retain dedicated mixer buses.
- Fighter, radar and missile threats use distinguishable tone ranges.
- Critical warnings briefly reduce engine, ambience and music only; weapons and impacts remain present.
- Radio calls use a longer, gentler background reduction and a short period radio chirp.
- Captions are emitted before any audio or speech checks, so disabling speech never removes tactical information.
- Radio scripts contain launch, first-contact and recovery lines for every campaign mission. Mission-director events continue to supply phase-specific tactical calls.

## Offline assets

All audio is either checked in under `public/assets/audio` or synthesised locally by Web Audio after a deliberate user interaction. The PWA cache includes WAV files and no network speech or generation endpoint is required for core sound effects. Browser speech is an optional voice layer; captions remain the authoritative content.

## Listening acceptance

Automated tests certify catalogue coverage, finite mixer values, priority relationships and complete captions. Final sign-off still requires a human listening pass with headphones and speakers across Missions 1, 6, 10, 12, 14, 15 and 16, checking that warnings remain intelligible over engines, weapons and severe weather.

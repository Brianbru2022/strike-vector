# Iron Kestrel '87 audio production brief

The authoritative individual prompts are in `config/audio-production-manifest.json`. It contains twelve original music cues and forty-eight sound effects, each with duration, loop behaviour, intended use and a generation prompt. Run `pnpm audio:production:audit` to validate completeness and reject obvious artist or identifiable-work imitation requests.

## Production workflow

1. Generate two or three candidates for one coherent batch at a time. Do not generate unrelated cues independently with changing aesthetics.
2. Archive the unedited 48 kHz, 24-bit WAV output, exact prompt, generator and version, date, seed or job identifier, editor and approval decision.
3. Reject recognisable melodies, branded warning sounds, voices accidentally present in effects, clipping, phase problems, noisy loop joins and over-compressed masters.
4. Edit music into clean intros, loop regions and endings. Keep warning and radio midrange clear in every combat cue.
5. Test SFX in the actual mixer, not in isolation. Keep radar search, radar track, missile warning, low fuel and damage warning immediately distinguishable.
6. After human listening approval, export runtime files. Prefer efficient stereo Opus for music and ambience where browser support is certified; use mono lossless or high-quality compressed files for short positional effects. Keep the source masters outside the runtime pack.
7. Update the asset-rights register and AI-content disclosure before shipping any generated result.

## Highest-priority replacement order

1. Missile warning, radar track, low-fuel and damage warnings.
2. Pegasus idle/power, airframe wind and VTOL downwash loops.
3. ADEN cannon, Sidewinder, rocket, bomb and flare signatures.
4. Small/medium/large destruction, aircraft breakup and ground/sea crash.
5. Title, patrol, combat, recovery and debrief music.
6. Mission-specific Fleet Defence and Bastion music.
7. Carrier/FARP ambience, servicing music and secondary interface sounds.

The existing thirteen bundled WAV files remain functional fallbacks until replacements pass headphones, ordinary speakers and laptop/mobile listening checks. They should not be removed merely because a new generated candidate exists.

# Norwegian Toolkit Art Register

Milestone 3 establishes the visual kit for Missions 11–16 without adding those missions. The release images are deterministic bundled assets; no generator is called during play.

## Runtime assets

- `public/assets/backgrounds/arctic-open-sea-painted-v1.webp`
- `public/assets/backgrounds/arctic-deep-fjord-painted-v1.webp`
- `public/assets/backgrounds/arctic-bridgehead-painted-v1.webp`
- `public/assets/backgrounds/arctic-bridgehead-operational-v1.webp`
- `public/assets/backgrounds/arctic-polar-night-painted-v1.webp`
- `public/assets/backgrounds/arctic-north-cape-painted-v1.webp`
- `public/assets/sprites/tu16k-damage-v1.png`
- `public/assets/sprites/su24m-damage-v1.png`
- `public/assets/sprites/landing-craft-damage-v1.png`
- `public/assets/sprites/coastal-artillery-damage-v1.png`
- `public/assets/sprites/submarine-pen-damage-v1.png`

Original generator outputs and the cleaned master atlas are archived under `art/source/generated-1987/norwegian-toolkit-v1`. Runtime backgrounds use visually checked WebP. Transparency-critical sprites use RGBA PNG.

## Final prompt set

All environment prompts used: painted 2D side-scrolling game panorama, alternative 1987 North Norwegian theatre, restrained Cold War palette, visible brush texture, cinematic but readable silhouettes, continuous 16:9 composition, no text, no HUD, no aircraft, no repeated tiles, no frame or border. The scene-specific subjects were:

1. Open Arctic sea beneath a low winter sun, slate water, distant snow mountains, broken cloud and sea haze, broad clear flight corridor.
2. Deep Norwegian fjord, steep snow-streaked rock walls, dark water, layered atmospheric depth and a navigable low-altitude corridor.
3. Coastal bridgehead, snow-dusted shore road and causeway, fishing settlement kept visually separate from military ground, beaches and rocky shelves.
4. Polar-night plateau, blue-black snowfield, radar horizon, sparse lamps, aurora glow and broad readable ground plane.
5. North Cape fortress, monumental dark cliff, concrete coastal works and submarine-pen approaches, rough sea, cold dawn break and staged defensive depth.

The unit atlas prompt used: five rows and three columns, strict side-on painted 2D game sprites, consistent 1987 Soviet/Norwegian-theatre light from upper left and consistent scale within each row. Rows: Tu-16K, Su-24M, landing craft, coastal artillery and rock-cut submarine pen. Columns: intact, damaged with contained smoke, destroyed or wrecked. Isolated subjects, generous padding, no text, no shadows crossing cells. Transparent background was requested, then corrected with deterministic boundary-connected neutral-background removal because the generator encoded a checkerboard into RGB.

## Contact and damage rules

`ARCTIC_TERRAIN_HEIGHT_PROFILES` is the gameplay authority for ground contact. The same sample is consumed by collision, landing, shadows, wreck contact and object placement. Sprites declare contact anchors, shadow footprints, effect attachment points and damage frames in the sprite manifest. Every Norwegian unit sheet contains intact, damaged and destroyed frames in that order.

Run `python scripts/prepare_norwegian_toolkit.py --source-root <generated-image-directory>` to reproduce the optimised release files from the archived generator outputs.

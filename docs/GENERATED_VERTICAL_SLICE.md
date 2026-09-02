# Generated vertical-slice art

The opening three-mission slice uses deterministic, bundled bitmap assets. They were created with Codex's built-in image-generation mode, then checked into the project; the game does not call an image-generation service at runtime.

## Runtime assets

- `public/assets/backgrounds/fjord-pass-painted-v1.webp` — Skeld fjord environment, 1536 x 1024.
- `public/assets/backgrounds/forward-base-painted-v1.webp` — forward operating site environment, 1983 x 793.
- `public/assets/sprites/forward-base-farp-v1.png` — transparent FARP and level landing pad, 1024 x 275.

The original generated files are archived under `art/source/generated-1987/vertical-slice-v1/`. The FARP source was post-processed only to remove the generated checkerboard, crop transparent margins and scale it for runtime use.

## Prompt set

### Fjord pass

> Use case: stylized-concept. Asset type: full-screen scrolling background for mission 2 of a painted 2D 1987 Harrier combat game. Primary request: a severe North Atlantic basalt fjord viewed from low aircraft altitude, dark sea running through a narrow mountain pass, towering layered cliffs on both sides, distant snow-streaked ridges, pockets of mist and low cloud, no foreground objects. Style/medium: realistic hand-painted military aviation environment, coherent with premium Cold War game key art, natural rock and water texture, restrained painterly brush detail. Composition/framing: wide landscape, horizon in upper-middle, navigable open air and water corridor through the centre, distant depth for parallax, bottom edge mostly dark water with no abrupt land strip. Lighting/mood: cold overcast afternoon, diffuse light, threatening but readable. Colour palette: slate blue, charcoal basalt, muted tundra green, cold grey mist. Constraints: environment only; no aircraft, vehicles, buildings, ships, UI, text, logos or watermark; seamless-looking wide framing suitable for horizontal crop and parallax.

### Forward-base landscape

> Use case: stylized-concept. Asset type: full-screen scrolling background for mission 3 of a painted 2D 1987 Harrier combat game. Primary request: a remote NATO forward operating site on a windswept North Atlantic island, seen from low aircraft altitude across a broad tundra coastal plain, distant basalt ridges and sea inlets, a rough expeditionary runway and scattered revetments visible in the middle distance, no foreground units. Style/medium: realistic hand-painted military aviation environment, coherent with premium Cold War game key art, authentic late-1980s temporary airfield materials, natural painterly detail. Composition/framing: wide landscape, low horizon, large open air corridor, flat operational ground through the lower middle suitable for placing game objects, distant runway running horizontally, strong depth for parallax. Lighting/mood: pale late-afternoon light breaking through overcast, determined and austere. Colour palette: muted tundra olive, weathered brown, charcoal rock, steel-blue sea, pale amber highlights. Constraints: environment only; no aircraft, vehicles, people, readable signs, UI, logos or watermark; no modern equipment; suitable for wide horizontal crop.

### Forward arming and refuelling point

> Use case: stylized-concept. Asset type: transparent forward arming and refuelling point sprite for a painted 2D 1987 Harrier combat game. Primary request: a compact NATO expeditionary Harrier forward landing site viewed in strict side elevation, featuring a long level pierced-steel-plank landing pad, low sandbag revetments, two canvas field shelters, fuel bladders, palletised crates, portable amber landing lights and a windsock. Style/medium: realistic hand-painted 2D game illustration matching premium Cold War military vehicle sprites, crisp silhouette and authentic worn materials. Composition/framing: one continuous broad low platform, landing surface perfectly straight and horizontal across most of the width, all structures firmly resting on the same ground line, generous transparent space above the pad, suitable for a Harrier landing on top. Lighting/mood: pale overcast North Atlantic daylight from upper left. Colour palette: olive drab, weathered steel, muted tan canvas, dark earth and restrained amber lights. Background: genuine transparent alpha. Constraints: no aircraft, people, ship, sea, landscape, scenery, checkerboard, white rectangle, readable text, logos or watermark; exactly one self-contained forward base sprite.

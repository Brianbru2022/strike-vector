# Act III generated art archive

The Act III release art was generated with the built-in OpenAI image generator, then processed and checked into the repository. The game never generates art at runtime and requires no API key.

## Runtime assets

- `public/assets/backgrounds/janus-causeway-painted-v1.webp`
- `public/assets/backgrounds/janus-airbase-night-painted-v1.webp`
- `public/assets/backgrounds/skeld-defence-dawn-painted-v1.webp`
- `public/assets/backgrounds/bastion-fortress-painted-v1.webp`
- `public/assets/layers/janus-causeway-surface-v2.webp`
- `public/assets/layers/janus-airbase-surface-v2.webp`
- `public/assets/layers/skeld-defence-surface-v2.webp`
- `public/assets/layers/bastion-fortress-surface-v3.webp`
- `public/assets/sprites/act-three-objectives-v1.png`

The optimised backgrounds and operational surfaces are alpha-capable WebP; the objective sheet is PNG. Each mission samples the same surface alpha profile for drawing, collision, landing and ground-object placement.

Original generator outputs are preserved under `art/source/generated-1987/act-three-v1/`.
The four-section foreground repaint sources, exact prompts and processing record are preserved under `art/source/generated-1987/act-three-foreground-v2/`.

## Prompt set

All prompts specified a painted 2D side-scrolling game asset, restrained Cold War colour, realistic 1980s aviation-box-art brushwork, no modern equipment, no writing, no logos and no user-interface elements.

### Mission panoramas

1. **Janus causeway:** A wide 16:9 North Atlantic island causeway in 1987, basalt cliffs to the left, a military road and concrete bridge crossing a cold inlet, and a protected fishing settlement to the right. Overcast daylight, open flight sky, no aircraft, vehicles or explosions.
2. **Janus airbase:** A wide 16:9 Warsaw Pact coastal island airbase at night in 1987, with runway, low hangars, radar, fuel farm, searchlights and steep mountains. Moonless blue-black atmosphere with restrained runway and red warning lights; no aircraft or people.
3. **Skeld defence:** A wide 16:9 NATO forward arming and refuelling point at dawn in 1987, with expeditionary pad, revetments, canvas shelters, radar and surrounding cliffs. Storm-clearing orange and blue-grey light, open eastern approach; no aircraft or explosions.
4. **Bastion fortress:** A wide 16:9 Warsaw Pact command fortress terraced into basalt cliffs in 1987, with command radar, hardened concrete bunkers, fuel complex and coastal escape route. Pre-dawn mist and pale gold horizon, with a clear aerial corridor and distant sea at far right.

### Operational surfaces

Each surface prompt requested a single continuous lower-foreground strip matching its mission panorama: a complete opaque land silhouette below an irregular top edge, empty transparent sky above, no repeated tiles and no scenery detached from the ground. The four subjects were the Janus cliff/causeway/bridge shore, Janus airbase runway and revetments, Skeld FARP ridge and pads, and Bastion terraced basalt fortress. Generated checkerboard-like edge colour was removed from alpha during post-processing and the result was inspected for transparent top corners.

### Objectives sheet

One horizontal five-cell transparent sprite sheet: damaged concrete causeway span, hardened basalt command bunker, Warsaw Pact steel airbase hangar, 1980s searchlight emplacement and destroyed bunker wreck. Each object was isolated, side-on, grounded on the same baseline, consistently lit from the upper left and rendered without text, borders, checkerboards or drop shadows.

## Runtime size and transparency checks

Every panorama is below the 2.5 MB release target. Surface and objective sprites have genuine alpha at their upper corners. The Vite PWA glob caches PNG and WebP release assets for offline play.

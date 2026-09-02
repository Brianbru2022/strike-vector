# Iron Kestrel '87: North Atlantic Air War — Art Bible

## Visual target

Painted 2D Cold War action art with modern compositing. Every asset should look as though it belongs to the same 1987 North Atlantic theatre painting: restrained slate blue, sea green, charcoal and muted amber; one readable light source; strong silhouettes; visible but controlled brush texture.

## Non-negotiable rules

- Keep the central flight corridor quiet enough for aircraft, tracers and target locks to read instantly.
- Concentrate detail in the distant upper third and foreground lower quarter.
- Use period-correct silhouettes and markings. Do not add stealth-era aircraft, modern digital camouflage or post-1989 weapons.
- Match the environment's cool dawn light unless a mission-specific grade says otherwise.
- Avoid flat vector geometry, repeated triangle mountains, bubble clouds, checker textures, synthetic gradients and photorealistic stock imagery.
- Do not bake aircraft, targets, explosions, interface, text or logos into scenery.
- Export deterministic PNG or WebP assets and check them into `public/assets` with metadata.

## Layer model

1. Painted sky and weather mass.
2. Distant islands and cliffs.
3. Operational sea and terrain.
4. Foreground rock, spray, mist and destruction effects.

The first vertical-slice backdrop currently combines layers 1–4 into one painting with a subtle camera drift. Future terrain sets should split those depths into separate authored layers before replacing it.

## Sprite rules

- Side-on three-quarter silhouettes, nose direction explicit in metadata.
- Transparent background with a tight crop and no baked shadow.
- Neutral damage state first, followed by damaged and critical variants using the same pivot.
- Player aircraft should remain recognisable at 96–128 CSS pixels wide.
- Use restrained highlight ramps; effects supply the brightest colours.

## Current production prompt

“Create a finished production game background for a side-scrolling 2D action flight game titled Iron Kestrel '87: North Atlantic Air War. Wide 16:9 landscape, alternative 1987 North Atlantic island chain at cold dawn. Painterly hand-illustrated 1980s military box-art aesthetic translated into clean modern game art: stormy blue-grey sky with a restrained warm sunrise break, layered distant sea cliffs and rugged volcanic islands, dark cold ocean, mist and atmospheric depth, subtle visible brush texture, restrained Cold War palette of slate blue, sea green, charcoal and muted amber. Composition must be designed for gameplay: large uncluttered open flight corridor across the centre, detailed scenery concentrated in distant upper third and lower quarter, readable silhouettes, four implied parallax depth bands. No aircraft, no vehicles, no people, no buildings, no explosions, no interface, no text, no logos, no borders. Avoid photorealism, pixel art, vector-flat shapes, geometric triangle mountains, repeated motifs, synthetic gradients and generic mobile-game gloss.”

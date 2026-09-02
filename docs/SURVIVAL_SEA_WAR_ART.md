# Survival and Sea War art set

This milestone uses six deterministic, checked-in painted assets. The original generator outputs are archived under `art/source/generated-1987/survival-sea-war-v1`; runtime-ready alpha sprites and service plates live under `public/assets`. Image generation is not called by the game.

## Sprite prompts

### Osa missile boat

> Use case: stylized-concept. Asset type: transparent side-profile naval unit sprite for a painted 2D 1987 Harrier combat game. A Soviet Project 205 Osa-class missile boat circa 1987, complete vessel in strict side profile facing right, compact hull, enclosed bridge, mast and visible box missile launchers. Realistic hand-painted premium Cold War game illustration, crisp readable silhouette at small scale. Cold North Atlantic overcast light from upper left. Weathered Soviet naval grey, charcoal, restrained rust and pale highlights. Genuine transparent alpha. Complete hull and waterline edge visible; no sea, wake, shadow, aircraft, people, flags, text, labels, checkerboard, rectangle, logo or watermark.

### Nanuchka missile corvette

> Use case: stylized-concept. Asset type: transparent side-profile naval unit sprite for a painted 2D 1987 Harrier combat game. A small Soviet Nanuchka-class missile corvette circa 1987 in strict side profile facing right, low hull, angular superstructure, radar mast and prominent anti-ship missile canisters. Realistic hand-painted premium Cold War game illustration with a crisp small-scale silhouette, cold North Atlantic light, weathered naval grey and restrained rust. Genuine transparent alpha. No sea, wake, people, text, checkerboard, rectangle, logo or watermark.

### Combat wreck strip

> Use case: stylized-concept. Transparent horizontal wreck sprite collection. Three separate destroyed military wrecks in one straight horizontal row: crumpled Sea Harrier crash debris with scorched fuselage pieces, burnt-out tracked armoured vehicle hull, broken sinking missile-boat hull with fire damage. Realistic hand-painted 2D Cold War game assets, exactly three equal cells, strict side view and shared contact line. No terrain, sea, active explosion, large smoke cloud, people, text, borders, checkerboard, logo or watermark.

### Harrier ejection strip

> Use case: stylized-concept. Transparent horizontal ejection animation strip. Four sequential side-view frames of one Royal Navy pilot ejecting: seat and canopy separation, rising ejection seat, pilot separating, round parachute fully deployed. Realistic hand-painted 2D animation, period-correct olive flight suit, white helmet and orange-white parachute, exactly four equal cells at identical scale. No landscape, text, borders, checkerboard, rectangle, logo or watermark.

## Service plate prompts

### Carrier turnaround

> Painted cinematic 16:9 game interface background showing a Royal Navy Sea Harrier FRS.1 being serviced on the wet deck of an Invincible-class carrier in a cold North Atlantic dusk. Period-correct 1987 deck crew, Sidewinder and rocket weapon trolleys, maintenance equipment, restrained blue-grey palette and warm task lights. Leave calm dark negative space on the left for a service panel. No text, logos, modern equipment or UI.

### FARP turnaround

> Painted cinematic 16:9 game interface background showing a Royal Navy Sea Harrier FRS.1 at a rugged North Atlantic forward arming and refuelling point in 1987. PSP landing mat, canvas shelter, fuel bowser, wooden ammunition crates, period ground crew and weapon trolleys beneath steep misty island cliffs. Leave dark negative space on the left for UI. No text, logos, modern equipment or interface elements.

The sprite post-process removes the generator's edge background, crops transparent bounds and preserves the source files for repeatability. All checked sprite corners have alpha zero.

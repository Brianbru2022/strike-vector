# Sea Harrier Turn Strip Prompt Record

Tool: OpenAI built-in image generation.

Reference: `public/assets/sprites/sea-harrier-frs1-hero-v3.png`.

## Generation prompt

Create one horizontal five-frame yaw-turn transition strip for the referenced Royal Navy Sea Harrier FRS.1: right-facing three-quarter, near head-on right, exact head-on, near head-on left and left-facing three-quarter. Match the dark low-visibility slate-grey paint, roundels, proportions, underwing stores, upper-left lighting and realistic painted 2D style. Keep equal cells, identical scale and pivots, genuine transparency, and no shadows, glow, text, borders, watermarks or side-profile endpoint frames.

## Technical alpha pass

The built-in generator returned its checkerboard preview as opaque RGB. A background-only edit replaced it with a uniform magenta matte. `scripts/prepare_player_turn_art.py` removes that matte, restores feathered edge alpha, normalises the five cells and exports the runtime atlas. Both untouched generator outputs are retained here.

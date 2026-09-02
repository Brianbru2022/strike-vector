# Stage 6 painted effects source

Mode: generation, followed by a transparency-focused edit attempt and deterministic release preparation.

Final production prompt:

> A single transparent-background painted 2D explosion sprite sheet for a side-scrolling 1987 naval aviation game. Exactly six chronological frames in one horizontal row with even cell spacing: compact ignition flash, small orange bloom, expanding fire and smoke, peak charcoal-orange blast, cooling dark smoke, thinning grey smoke. Hand-painted gouache texture, restrained scale, readable silhouette, consistent centre. No photographic realism, no scenery, no ground, no checkerboard, no text, no logo, no border. Genuine alpha transparency.

The generator returned a checkerboard preview rather than alpha. `scripts/prepare_stage6_effect_art.py` removes only bright, neutral checker pixels and exports the checked runtime PNG. The untouched generator output remains beside this record.

Approval: accepted for Stage 6 integration as an original, project-specific effect; final in-game scale and transparency require visual-capture review.

# Visual integration authority

Stage 2 treats terrain contact as shared simulation and rendering data. Ground units, wrecks, shadows and landing checks must query `TerrainSystem.getGroundContactY`; visual-only offsets must not become a second terrain model.

## Sprite placement

`SpritePlacement.ts` defines explicit horizontal and vertical anchors for every ground and naval sprite. Vehicles follow the sampled terrain slope up to approximately six degrees. Fixed installations remain level and use the highest contact point across their footprint, preventing either corner from clipping into a ridge. Naval anchors identify the painted waterline rather than the bottom of the bitmap.

Sprite renderers consume these anchors through `drawSpriteAnchored` and `drawSpriteFrameAnchored`. New ground or naval types must add placement metadata and pass `VisualIntegration.test.ts`.

## Visual audit

Run the development server on port 4178 and then run:

```powershell
pnpm visual:capture
```

The development-only audit hook opens each immutable campaign mission without changing production menus or saves. It captures:

- the first representative ground or naval objective in all ten missions;
- route coverage at 22%, 50% and 78% of every mission;
- Mission 2 at desktop, ultrawide and compact mobile-landscape sizes.

Outputs are written to `reports/visual-integration`. Review the contact sheets for panorama edges, sudden terrain changes, hovering or clipped targets, waterline errors, shadow projection and malformed transparency.

Missions 7–10 use 8,000-pixel four-section foreground panoramas prepared by `scripts/prepare_act_three_foregrounds.py`. Their untouched built-in-generator outputs, exact prompts and provenance are archived in `art/source/generated-1987/act-three-foreground-v2`; runtime WebP files contain genuine alpha and no repeated tile. Ground, airborne and FARP shadows use `TerrainShadow.ts` to follow the same local slope sampled for contact and collision.

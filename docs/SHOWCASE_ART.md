# North Atlantic showcase art authority

The showcase establishes the final presentation target for Missions 1, 6 and 10. Generator output is source material, never a runtime dependency. Every release asset is reviewed, colour matched, optimised and bundled.

## Signature reference frames

| Mission | Runtime plate | Composition authority |
| --- | --- | --- |
| 1 — Carrier Qualification | `mission-1-dawn-showcase-v2.webp` | Clear open-water flight area, distant volcanic islands, cold dawn with restrained amber light. |
| 6 — Carrier Fleet Defence | `mission-6-storm-showcase-v2.webp` | Low horizon, uninterrupted ocean, layered cold front and readable silhouettes. |
| 10 — Bastion Headquarters Assault | `mission-10-bastion-hero-v3.webp` | Basalt fortress receding into haze with a clear lateral withdrawal route to open sea. |

The curated carrier sprite is the three-state `invincible-carrier-hero-v3.png`. Its alpha is produced by edge-connected background extraction and verified by `python scripts/audit_visual_assets.py` and `pnpm stage5:art:audit`.

## Prioritised asset register

| Priority | Asset family | Decision | Acceptance rule |
| --- | --- | --- | --- |
| P0 | Invincible carrier | Replace | Genuine alpha, correct ski-jump silhouette, explicit waterline and no rectangular halo. |
| P0 | Signature panoramas | Replace | One coherent painted family, complete viewport coverage and no baked operational objects. |
| P0 | Harrier and principal fighters | Repainted in Stage 5 | Correct side profile, three damage states, bounded attitude, exhaust/effect attachments and consistent scale. |
| P1 | Corvettes and patrol boats | Repainted in Stage 5 | Verified waterline, three damage states, buoyancy, bow spray, wake and progressive sinking. |
| P1 | Bastion objectives | Retain and re-grade | Terrain-contact authority, readable phase locks and damage progression. |
| P2 | Remaining campaign plates | Retain with consistency grade | No crops, seams, floating contacts or transparency defects. |

## Generation prompt set

All four source outputs use the `stylized-concept` or `background-extraction` image-generation workflow. Shared constraints are: painted late-1980s military illustration, upper-left light, restrained Cold War palette, no text or UI, no repeated texture tiles, and no operational targets baked into backgrounds. The carrier prompt additionally requires a complete orthographic side profile and genuine transparency.

Original showcase outputs remain under `art/source/generated-1987/showcase-v1`. Stage 5 replacements, rejected candidate, approvals and superseded runtime files are archived under `art/source/generated-1987/stage5-hero-v1`. Runtime plates are WebP; the carrier remains an optimised three-frame RGBA PNG.

## Scale and contact rules

- Gameplay geometry continues to use `TerrainSystem.getGroundContactY`; presentation profiles cannot override collision.
- Naval contact uses the painted waterline, not the bitmap bottom.
- Sprite metadata supplies contact anchors, shadow footprints, animation clips, damage frames and effect attachments.
- The three presentation profiles control only backdrop selection, grading, parallax, overscan, haze, spray and visual sea state.

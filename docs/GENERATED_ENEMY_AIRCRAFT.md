# Generated enemy aircraft assets

These deterministic, bundled sprites replace the generic procedural enemy-aircraft art.

| Aircraft | Runtime asset | Archived generation |
| --- | --- | --- |
| MiG-21bis | `public/assets/sprites/mig21bis-hero-v3.png` | `art/source/generated-1987/stage5-hero-v1/mig21bis-stage5-source.png` |
| MiG-23ML | `public/assets/sprites/mig23ml-hero-v3.png` | `art/source/generated-1987/stage5-hero-v1/mig23ml-stage5-source.png` |
| MiG-29A | `public/assets/sprites/mig29a-hero-v3.png` | `art/source/generated-1987/stage5-hero-v1/mig29a-stage5-source.png` |
| Mi-24D | `public/assets/sprites/mi24d-painted-v2.png` | `art/source/generated-1987/enemy-aircraft-v2/mi24d-source.png` |

Generation mode: built-in image generation. Each prompt used the `stylized-concept` use case and requested one realistic, hand-painted, strict side-profile 1987 aircraft sprite with genuine transparent alpha, a complete readable silhouette and no ground, scenery, captions, watermark, white rectangle or checkerboard. The model-specific subjects and constraints were:

- MiG-21bis: nose pointing right; nose intake, delta wing and single vertical tail; Soviet grey-green camouflage; two period-correct missiles.
- MiG-23ML: nose pointing right; pointed radar nose, side intakes, variable-sweep wing in a moderately swept combat position and tall single tail; grey and olive camouflage; two period-correct missiles.
- MiG-29A: nose pointing right; early-production blended wing roots, twin engines and twin vertical tails; two-tone grey-green camouflage; two period-correct missiles.
- Mi-24D: nose pointing right; tandem bubble cockpits, troop cabin, stub wings, five-blade rotor and period-correct rocket pods; olive and sand camouflage.

The generated sources contained a pale preview checkerboard. Runtime copies use edge-connected background removal, transparent edges, tight source bounds and a 768-pixel master width.

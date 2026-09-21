# Milestone 9 — Foreground sprite and readability pass

Milestone 9 integrates foreground gameplay art with the painted environments without rebuilding those environments or changing authoritative gameplay geometry.

## Implemented

- One presentation authority now covers player aircraft, enemy aircraft, ground units, ships, recovery sites and Bastion objectives.
- Ambient-light tint, restrained local contrast and contact separation are applied consistently. Selected and objective targets retain their stronger readability rim.
- Ground and airborne shadows use per-family footprint metadata while terrain sampling remains authoritative.
- Harrier side and turn sprites share the same scene treatment; this preserves a coherent left/right transition.
- Carrier and FARP art now receive the same environmental treatment as combat sprites.
- Sprite metadata now records contact anchors, shadow footprints and effect attachment points for all release-critical foreground families.
- The automated audit rejects missing metadata, invalid source rectangles, opaque corners, malformed transparency and unregistered runtime assets.

## Deliberate boundaries

- Presentation scaling, filters and shadows do not change hit boxes, terrain collision, weapon origin or landing geometry.
- Existing approved painted panoramas and hero sprite pixels are retained. The audit found no need to replace them with another uncurated generation batch.
- Automated checks cannot judge final contrast in motion. The gate therefore records a manual visual-acceptance boundary rather than manufacturing approval evidence.

## Commands

- `pnpm milestone9:sprites:audit` checks release-critical sprite files and metadata.
- `pnpm milestone9:prepare` runs automated engineering and build checks.
- `pnpm milestone9:gate` additionally requires the existing current-build human control evidence.

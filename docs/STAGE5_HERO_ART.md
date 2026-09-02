# Stage 5 hero artwork authority

Stage 5 replaces the mixed hero presentation with one controlled, auditable batch. Runtime generation is not used. Untouched built-in generator outputs, the rejected first Harrier candidate, prompts, reference list, editing history and approval state are preserved under `art/source/generated-1987/stage5-hero-v1`.

Superseded public hero files were moved into `stage5-hero-v1/superseded-runtime`. They remain recoverable for comparison but are no longer included in the PWA cache.

## Shared direction

- Gameplay sprites use a strict port-side profile, nose right, with only slight upper-surface visibility.
- All subjects use a cool upper-left key, restrained amber rim, slate-blue/sea-green/charcoal palette and controlled gouache/oil texture.
- Aircraft and ships contain intact, damaged and critical states at identical scale and alignment.
- Markings are fictional geometric devices without words, brand marks or real unit identity.
- Prompts prohibit imitation of identifiable artwork, logos, signatures and living artists' styles.

## Final prompt set

`P-AIRCRAFT-*`: production three-state side-profile sprite sheet; exact model silhouette; alternative 1987 North Atlantic; consistent lighting and palette; intact, locally damaged and critical rows; period stores; genuine transparent background; generous padding; no scenery, text, logo, watermark, signature or living-artist style. Model clauses specify the Sea Harrier FRS.1, MiG-21bis, MiG-23ML and early MiG-29A. The approved Harrier repaint used the existing project sprite only as structural reference.

`P-NAVAL-*`: production three-state strict side-elevation sheet; bow right; exact shared waterline; period fittings; intact, damaged and critical rows; genuine transparency; no sea, wake, flags, text, logo, signature or living-artist style. Subject clauses specify the fictional Invincible-inspired carrier, missile corvette and missile patrol boat.

`P-BASTION-01`: wide lateral basalt command fortress at pre-dawn, coherent operational ground, open central flight corridor and sea withdrawal route; no units, effects, text or repeated texture.

`P-TITLE-01`: text-free 16:9 North Atlantic carrier/Harrier key art with negative space for real UI typography.

`P-STORE-01`: text-free store master with all subjects inside a central safe area for 616x353, 460x215 and 231x87 crops.

## Production and integration

Run `python scripts/prepare_stage5_hero_art.py` to recreate the checked runtime atlases, Bastion plate, title composition and store crops. The processor removes the generator's encoded checkerboard, preserves soft smoke alpha, aligns cells to a shared baseline and verifies transparent corners. Runtime code selects damage frames from aircraft health/damage stage. Naval sprites use their metadata waterline and remain immersed by the final foreground-water mask.

Run `pnpm stage5:art:audit` for the Stage 5 gate. The audit requires every source and runtime file, approved provenance, valid alpha corners, three equal frames, exact capsule dimensions, runtime references and resolved metadata.

## Approval note

The batch passed project technical, consistency and visual provenance review on 30 August 2026. The review found no identifiable copied composition, external branding, watermark, signature or named living-artist style. AI output may not be unique; this record does not make a legal guarantee of exclusivity.

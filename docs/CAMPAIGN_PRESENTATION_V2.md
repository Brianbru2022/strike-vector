# Campaign presentation pass V2

Milestone 12 reviewed the 112-frame campaign visual matrix against the Mission 1, 6, 10 and 16 benchmarks. Missions 7, 8 and 9 were the strongest outliers: their narrow operational layers produced a repeated dark lower mass that did not share the depth or surface variation of their distant panoramas.

## Replacement surface candidates

Three replacement candidates were generated for:

- Janus causeway
- Janus night airbase
- Skeld FARP

The built-in generator returned RGB files with a baked checkerboard despite explicit transparency instructions. They failed the release alpha audit and were quarantined under `art/source/generated-1987/campaign-presentation-v2`; they are not referenced or cached by the game. The passing V1 RGBA surfaces remain active until an approved transparency-cleaning workflow produces genuine alpha.

## Prompt set

All three prompts used the `historical-scene` workflow and specified a very wide, side-on orthographic operational strip, genuine transparent sky, solid edge-to-edge terrain, no gameplay objects or text, restrained 1987 North Atlantic colour and painted gouache/oil texture.

- **Janus causeway:** exposed basalt shelf, wet compacted road, modest bridge approaches, drainage and sparse wind-bent grass under cold overcast light.
- **Janus airbase:** wet runway and taxiway, recessed revetment entrances, restrained runway lamps and blue-grey polar-night lighting.
- **Skeld FARP:** pierced-steel-plank VTOL pad, muddy tracks, puddles, revetment berms and cold amber dawn light.

## Interface consistency

Briefings, chapter maps, servicing and debriefing screens now share one restrained screen-entry treatment that respects reduced-motion settings. Every servicing and debrief screen uses its mission artwork behind the functional panel; carrier/FARP service art remains a secondary masked layer rather than replacing the sortie identity.

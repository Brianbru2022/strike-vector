# Performance, Mobile and Offline Hardening V1

## Adaptive rendering

New saves use `AUTO` render quality. The initial tier is selected from coarse-pointer/mobile status, CPU concurrency, reported device memory, viewport size and device-pixel ratio. During active flight the controller samples frame duration without touching the fixed 60 Hz simulation:

- sustained p95 frame time above 27 ms or average above 21 ms lowers one tier;
- a long stable window below 17 ms p95 can raise one tier;
- manual Low, Medium or High selection disables automatic changes;
- background tabs, menus, paused simulation and 250 ms interruption clamps are excluded.

Low quality retains the controlled 30 fps presentation fallback. Quality tiers now drive particle, explosion, cloud, foam, rain and Arctic-weather budgets. Gameplay geometry, AI, timers and weapon simulation are unchanged.

## Mobile interruption safety

Touch actions track every pointer independently. Releasing or cancelling one finger no longer releases the same action while another pointer remains held. Blur, hidden-tab, page hide and component teardown release all semantic actions.

Visibility, orientation, blur, page-hide and browser freeze events pause active simulation and preserve campaign plus between-sortie operation state. Mid-sortie saves remain intentionally unsupported.

## Offline installation

System Settings includes a local status panel showing network state, service-worker control, install mode, cache presence, browser storage usage and measured performance. It supports:

- browser installation when the install prompt is available;
- deliberate application of a waiting service-worker update after saves are flushed;
- a two-step cache repair available only while online;
- repair limited to the Iron Kestrel root registration and recognised current or legacy Workbox/game caches;
- no deletion or migration of localStorage campaign, operation, showcase, validation or diagnostic records.

The full campaign remains in the generated Workbox precache. Cache repair requires a reload after completion so the newly installed worker can assume control.

## Acceptance

Automated gates cover adaptive thresholds, manual overrides, quality budgets, simultaneous touch pointers, interruption release, cache matching, corrupt save recovery, production precaching and desktop/mobile browser flows. Final hardware sign-off still requires representative physical desktop and mobile runs because automated viewport emulation cannot measure real GPU thermals or sustained touch-device performance.

# Iron Kestrel '87: North Atlantic Air War

A painted 2D, side-scrolling VTOL action-simulation set during an alternative 1987 NATO–Warsaw Pact conflict. Fly a Sea Harrier FRS.1 through a sixteen-mission North Atlantic and Norwegian Sea campaign.

Current development build: **1.2 DEV1** (`IK87-1.2.0-DEV1-20260925-AUDIO2`). The certified 1.0 RC1 campaign baseline remains frozen while playability work validates the existing game with real players and prepares the Windows/Steam candidate. See `docs/PLAYABILITY_TO_RELEASE_ROADMAP.md`, `docs/EXTERNAL_BETA_RELEASE.md`, `docs/MILESTONE_5_CONTROL_CONCEPT_TEST.md`, `docs/MILESTONE_6_GUIDED_ONBOARDING.md`, `docs/MILESTONE_7_DIRECTIONAL_CONTROLS.md`, `docs/MILESTONE_8_CONTEXTUAL_HUD.md`, `docs/MISSION_AUTHORING.md` and the archived `docs/RELEASE_NOTES_1.0_RC1.md`.

## Production vertical slice

The first three missions now form a connected, polished opening arc:

- **Carrier Qualification** teaches interception and carrier recovery.
- **Fjord SAM Suppression** introduces terrain masking against radar and SA-8 batteries.
- **Forward-Base Capture** ends with a physical VTOL landing on a painted expeditionary FARP, which becomes active on the campaign map.

Each mission has its own authored painted environment and force layout. Campaign flags persist carrier qualification, fjord suppression and the captured forward base.

The next three missions form **The Forward War**: a moving armoured convoy interdiction, VTOL pilot rescue and storm-bound carrier-group defence. Missions four and five launch and recover at the captured Skeld FARP; mission six returns the player to HMS Invincible. The fleet-defence battle now fields painted patrol boats and missile corvettes, four interceptable sea-skimming missiles, carrier integrity and waterline-aware sinking wrecks.

Aircraft loss is a staged fixed-timestep sequence with automatic ejection at survivable height, independent aircraft impact and painted persistent wrecks. Victorious sorties pass through a carrier or FARP servicing screen where repair limits and one of three 1987 loadouts are applied to the persistent campaign aircraft.

The campaign finale, **Act III**, replaces missions seven to ten with four authored operations: a moving Janus bridgehead interdiction, a low-level night airbase raid with a live alert meter, a three-wave defence of Skeld FARP, and a five-phase assault on Bastion headquarters. A fixed-timestep mission director owns phase changes, one-shot reinforcements, target protection, radio calls and immediate failure conditions. Completing Bastion opens the campaign epilogue and Dynamic Operations mode.

**Dynamic Operations** offers three daily deterministic contracts plus custom shareable seed codes. Each contract is a three-sortie deployment drawn without repetition from Fleet CAP, SEAD, armoured interdiction, pilot rescue, FARP defence and deep strike. Aircraft condition and loadout carry between sorties; failures restore the pre-sortie snapshot while lowering the medal ceiling. Active deployments and best medal records are stored separately from campaign progress and remain fully offline.

**Dynamic Operations 2.0** adds optional three- or five-sortie deployments, deterministic damaged-runway, limited-visibility, radar-disruption and threatened-recovery modifiers, and persistent carrier/FARP integrity. A local history browser retains the latest 50 selected seeds, supports favourites and replays the correct generator/content/length combination. Existing V1 North Atlantic and V2 Norwegian seed outputs remain unchanged.

Completing Mission 16 unlocks a versioned **Norwegian Sea** operations theatre. It combines the same six archetypes with compatible Arctic terrain, weather, recovery sites and mission presentation while retaining byte-for-byte deterministic results for existing North Atlantic seed codes and saves.

Enemy aircraft now use deterministic tactical doctrines rather than simple patrol reversals. MiG-21s make fast crossing attacks, MiG-23s favour stand-off interception, MiG-29 pairs coordinate their passes and Mi-24s follow terrain at low altitude. Acceleration, turn-rate, clearance and formation limits keep movement readable, while detection, tracking and launch cues give the player time to react. Combat tuning is centralised in immutable Arcade, Pilot and Veteran profiles.

Internal-build Diagnostics V3 records weapon accuracy, damage sources, missile warnings, countermeasure success, survival and combat time without recording identity or raw inputs. The diagnostics view compares results by mission and difficulty, exports versioned JSON and retains only the latest 100 sessions. Normal consumer builds neither collect those sessions nor ship the diagnostics, validation, authoring or encounter-harness UI chunks. Human release sign-off is tracked in `docs/BALANCE_PLAYTEST.md`.

System Settings provides versioned progression export and import for moving between browsers or preserving a local backup. Archives cover campaign, operation, showcase and top-score records, exclude internal evidence, verify a checksum before replacement and retain the previous progression as a one-step rollback backup.

The **North Atlantic Showcase** presents Carrier Qualification, Carrier Fleet Defence and Bastion Headquarters Assault as an isolated three-sortie tour. It uses final signature presentation profiles, curated background plates, a genuinely transparent Invincible-class carrier, layered offline audio and separate versioned progress so showcase play never changes campaign or Dynamic Operations saves.

Development builds also include **Validation Runs**, an isolated 21-scenario human sign-off matrix for Missions 1, 6, 10, 11, 14 and 16 across all difficulties and keyboard, gamepad and touch controls. A local internal build (`pnpm build:internal`) can expose it explicitly with `?playtest=1`; the flag has no effect in a normal consumer build or from a non-loopback host. Validation evidence uses its own versioned store and never updates campaign, showcase, operations, diagnostics or high-score data.

The development-only **Mission Authoring Toolkit** opens from the development menu, or in a local internal build with `?authoring=1`. It creates, imports, edits and exports serialisable V1 mission documents; validates objective and event references, openings, recovery, terrain coverage and bundled assets; previews panorama coverage, landing surfaces, sprite contact footprints and patrol paths; and launches a compiled test sortie without changing the game engine or normal saves.

The campaign has a post-Bastion **chapter layer**. Completing Mission 10 unlocks the six-sortie Norwegian Sea campaign: **Cold Passage**, **Hammerfall Fjord**, **Troms Bridgehead**, **Whiteout Rescue**, **Red Tide** and the staged **North Cape Assault** finale. Mission 16 progresses through a naval picket, linked missile belt, protected command radar, hardened headquarters, command interceptor and carrier recovery before presenting the northern-front epilogue. Aircraft condition, subsystem damage, loadout and pilot history carry across chapters, while each chapter keeps separate completion and score records.

Act III uses four independent painted panoramas and four continuous transparent operational surfaces. The surface alpha profile is shared by rendering, collision, wreck contact, ground-object placement and landing logic, preventing scenery and targets from hovering independently of the terrain. Original generator outputs and the release prompt set are documented in `docs/ACT_THREE_ART.md`.

## Run locally

Prerequisites: Node.js 20+ and pnpm 10+.

```powershell
pnpm install
pnpm dev
```

Open `http://127.0.0.1:4177`. No API key or online image-generation service is required.

## Commands

- `pnpm lint` — TypeScript validation.
- `pnpm test` — deterministic simulation, save and mission-state tests.
- `pnpm build` — production client, service worker and Express server.
- `pnpm build:internal` — local-only production-style build containing diagnostics and developer tools; use query flags only on localhost.
- `pnpm test:e2e` — desktop and mobile-landscape browser flow.
- `pnpm balance:certify` — generate the automated campaign, operation and encounter balance report.
- `pnpm validation:readiness` — verify the Milestone 11 human-validation matrix and report its deliberately separate human sign-off status.
- `pnpm release:norwegian` — certify the sixteen-mission expansion build, Norwegian operations and 45 MiB runtime budget.
- `pnpm release:certify` — run the 1.0 RC campaign matrix, V1–V4 migration, Dynamic Operations V1/V2, media and runtime-pack certification.
- `pnpm legal:generate` — rebuild the checked-in third-party software notice and dependency-licence report from the installed package tree.
- `pnpm legal:audit` — verify the privacy, support and software notices and reject unresolved dependency-licence declarations.
- `pnpm commercial:certify` — run asset-rights, commercial-legal and release-candidate gates together.
- `pnpm consumer:audit` — reject consumer builds containing internal diagnostics, validation, authoring or encounter-harness chunks.
- `pnpm operations:certify` — protect exact V1/V2 fixtures and audit 4,000 V3 deployments across both theatres and lengths.
- `pnpm authoring:certify` — round-trip and compile every campaign mission plus a clean external test mission through the authoring schema.
- `pnpm offline:verify` — reject duplicate precache URLs or bundled public assets missing from the production service worker.
- `pnpm visual:capture` — capture the development visual-integration matrix for all playable missions (requires the development server on port 4178).
- `pnpm effects:capture` — capture launch, impact and staged-destruction acceptance frames for the combat-effects system.
- `pnpm visual:audit` — validate signature assets, transparency metadata and the 45 MiB offline-pack ceiling.
- `pnpm capture:norwegian` — capture expansion desktop, ultrawide and mobile frames plus a short gameplay sequence (requires port 4178).
- `pnpm showcase:capture` — refresh the three signature-sortie screenshots and North Atlantic gameplay sequence.

## Controls

- `W/S` or arrows: pitch.
- `A/D` or left/right arrows: choose the direction to fly. Holding the opposite direction slows the aircraft, turns it at low speed and then accelerates in the new direction.
- `V` or `Shift`: hold VTOL vectoring.
- `Space`: twin 30 mm ADEN cannon.
- `J` or `Z`: selected secondary weapon.
- `Q` or `Tab`: cycle AIM-9L, bomb and rocket loadouts.
- `F` or `E`: countermeasures.
- `I`: toggle expanded HUD instrumentation; `H`: recall the learned control reference.
- `P` or `Escape`: pause.

Touch controls appear automatically on compact screens. Standard gamepads use the left stick/D-pad for flight, A for cannon, B for secondary weapon, shoulder buttons for VTOL/countermeasures and Menu to pause.

## Architecture

- The game runs a fixed 60 Hz simulation independently of render refresh rate.
- Campaign templates are cloned into fresh mutable mission runtimes for every sortie.
- Sixteen playable missions use explicit terrain profiles across the original campaign, Arctic open sea, deep-fjord, coastal-bridgehead, polar-whiteout and North Cape storm theatres. Missions seven onward use immutable authored phases and event scripts reconstructed on every retry.
- Period aircraft use bundled painted sprites for the MiG-21bis, MiG-23ML, MiG-29A and Mi-24D; model selection is mission data rather than a generic enemy-jet skin.
- Enemy aircraft run fixed-timestep doctrine state machines with deterministic formation slots, bounded attitude display and terrain-aware engagement rules.
- The Norwegian expansion toolkit provides five independent painted environment families, deterministic Arctic weather, three-stage Tu-16K, Su-24M, landing-craft, coastal-artillery and submarine-pen art, and sampled terrain contacts shared by collision and presentation.
- A single immutable combat difficulty profile controls detection, accuracy, reload, damage, turn rate, decision delay, player lock assistance and recovery tolerance without changing mission content.
- Campaign progress, chapter ownership, aircraft condition, selected loadout, pilot history, tutorial state, remappable controls and accessibility settings use `CampaignSaveV4`; V1, V2 and V3 saves migrate without losing scores, settings or sector progress.
- Dynamic deployments use separate versioned active-run and records stores, regenerating playable missions from serialised seeds rather than persisting mutable mission functions.
- `SaveArchiveV1` transfers the five consumer progression records without exposing diagnostics or validation stores; imports are size-limited, checksum-validated, sanitised and applied with rollback.
- All release assets are bundled and cached by the generated PWA service worker.
- Commercial-release asset provenance is recorded in `docs/asset-rights-register.json`; `pnpm rights:audit` verifies every shipped image, audio file and manifest and writes a hash-level report under `reports/commercial-release`.
- Player-facing privacy, support and third-party software notices are available from the Flight Manual and System Settings, bundled for offline use under `public/legal`, and maintained in `docs/PRIVACY.md` and `docs/SUPPORT.md`.

The title and fictional conflict are original and do not claim endorsement by any aircraft manufacturer, military organisation or earlier game publisher.

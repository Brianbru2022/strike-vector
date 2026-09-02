# Mission Authoring Toolkit

Milestone 19 adds a development-only data workflow for creating and checking Iron Kestrel '87 missions without directly editing the engine. The authoring surface is available in a development build from **MISSION AUTHORING**, or in a local production build by adding `?authoring=1` to the URL.

## Workflow

1. Select a released mission as a starting point or choose **NEW TEST MISSION**.
2. Use the quick fields for the stable identifier, title, map length and recovery position.
3. Edit the full V1 JSON document for terrain contacts, enemy spawns, objectives, phases and one-shot radio or spawn events.
4. Choose **APPLY JSON**, or use **IMPORT FILE** to load an exported `.mission.json` document.
5. Resolve every red validation blocker. Amber findings are release-quality warnings and do not prevent a local test.
6. Inspect the world preview. It marks launch and landing surfaces, terrain contact, panorama overscan, sprite anchor footprints and deterministic patrol paths.
7. Choose **LAUNCH TEST SORTIE** to compile an immutable definition and run it through the normal briefing and game engine.
8. Choose **EXPORT BUNDLE DATA** to produce deterministic JSON ready for review and bundling.

The generated example at `reports/milestone-19/authoring-test-mission.mission.json` is refreshed by the certification command. It is deliberately kept outside the release asset pack until it is promoted into the campaign.

## Document shape

`MissionAuthoringDocumentV1` contains a schema version, a serialisable mission design and a separate array of initial enemy units. Runtime functions are not stored in JSON. Compilation deep-clones and freezes the design, then reconstructs `spawnEnemies()` so every call returns a fresh deterministic unit array.

Mission events use the existing fixed-timestep director triggers and actions. Timing is expressed in simulation ticks, never wall-clock milliseconds. Retries therefore rebuild the same initial units, phases and one-shot event sequence.

## Validation

Compilation is blocked for:

- invalid schema, identifiers, map bounds or recovery positions;
- unsupported enemy types or bundled panorama assets;
- duplicate or missing object identifiers;
- objectives with too few reachable target units;
- broken objective, enemy or phase references in event scripts;
- invalid event ticks or player-position triggers;
- hostile aircraft inside the protected opening envelope;
- malformed authored terrain samples.

Warnings identify missing explicit landing objectives, generic terrain contact, incomplete terrain coverage and inadequate panorama overscan. These are useful for prototypes but must be cleared or deliberately signed off before release artwork is frozen.

## Art and placement contract

- Panorama paths must be bundled under `/assets/` and registered by a released mission presentation profile.
- Terrain height profiles remain authoritative for collision, wrecks and ground placement.
- Ground and naval artwork must define its contact anchor in the shared sprite placement metadata. Do not compensate for incorrect transparency or padding with mission-specific vertical offsets.
- Patrol destinations and initial velocity are authored in world space and shown in the preview.
- Use the preview at desktop, ultrawide and compact mobile widths before promoting a mission.

## Certification

Run:

```powershell
pnpm authoring:certify
```

The command round-trips every released campaign mission through JSON, validates all references and assets, compiles immutable definitions, checks deterministic fresh spawns and builds a clean authoring-only test mission. It writes JSON and Markdown evidence to `reports/milestone-19`.

The toolkit is excluded from normal production navigation. It does not write campaign, showcase, Dynamic Operations, diagnostics or validation evidence.

# Milestone 18 — Dynamic Operations 2.0

Dynamic Operations 2.0 is isolated from the certified 1.0 campaign baseline. It introduces immutable V3 operation blueprints and V2 active/profile stores while retaining exact V1 and V2 generation.

## Deployment generation

- Three- or five-sortie deployments draw without repetition from the six established archetypes.
- North Atlantic and Norwegian Sea content sets share one V3 contract interface while retaining their compatible terrain, forces and recovery sites.
- Operational modifiers are selected deterministically: limited visibility, radar disruption, threatened recovery and damaged FARP runway. Damaged runway is never assigned to carrier recovery.
- Later stages can introduce a second deterministic formation. Every event remains simulation-tick based.
- Limited visibility changes the authored weather, radar disruption delays reinforcement commitment, damaged runway tightens recovery tolerances and threatened recovery creates a defended carrier or FARP.

## Persistence and records

- Aircraft condition, loadout and carrier/FARP integrity persist between sorties.
- Legacy V1 active deployments migrate into the V2 store with fully serviceable defended assets.
- Existing V1 records migrate into the V2 profile without changing medal, score, time, retries or landing sequence.
- History retains the latest 50 selected operations. Favourites remain pinned in the browser and replay the original generation version, theatre, duration and difficulty.
- Completion records distinguish generation version, content set and sortie count, preventing three- and five-sortie results from overwriting one another.

## Compatibility authority

The exact V1 fixture and V2 hash fixture are automated release gates. V3 generation has property coverage across 1,000 seeds, both lengths, both content sets, terrain bounds, recovery reachability, unique events and ammunition sufficiency.

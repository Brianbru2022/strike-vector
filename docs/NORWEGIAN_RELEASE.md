# Norwegian Expansion Release Pass

Milestone 10 integrates the six-sortie Norwegian Sea chapter into the complete Iron Kestrel '87 release candidate. Content is frozen after this milestone; only blockers, accessibility faults, performance regressions and presentation defects should change before sign-off.

## Integrated release scope

- All sixteen campaign missions remain playable through one save-compatible campaign.
- Missions 11-16 use their authored Arctic presentation in briefings, servicing, debriefs and the Norwegian chapter map.
- Dynamic Operations retains the exact original North Atlantic V1 generator. Completing Mission 16 unlocks the Norwegian Sea V2 generator, with Arctic terrain compatibility, weather, recovery sites and presentation art.
- V1 and V2 seed codes are deterministic within their selected theatre version. Existing operation saves and records without a generation version migrate as V1.
- Campaign, showcase, Dynamic Operations, diagnostics and validation evidence remain isolated from one another.

## Release evidence

Run the complete automated gate with:

```powershell
pnpm lint
pnpm test
pnpm balance:certify
pnpm release:norwegian
pnpm visual:audit
pnpm build
pnpm test:e2e
```

`pnpm capture:norwegian` captures six desktop frames, one ultrawide frame, one compact mobile frame and a short WebM gameplay sequence while the development server is running on port 4178.

Generated certification and media are stored under `reports/norwegian-release`. The certification checks all 16 campaign registrations, all 18 expansion difficulty entries, authoritative recovery and contact data, both operation generations and the 45 MiB runtime budget.

## Manual sign-off still required

Automated runs cannot certify enjoyment, visual taste or human-perceived fairness. Before distributing the release candidate, a tester should complete Missions 11-16 on Arcade, Pilot and Veteran using the offered loadouts, review each recovery, and inspect the promotional captures for cropping, contact, scale and readability. Record genuine observations rather than treating automated browser completion as human evidence.

# Stage 3 — Combat readability overhaul

Stage 3 increases the presentation scale and silhouette separation of aircraft without changing collision geometry. Player and hostile missiles now have distinct motor trails, objective targets use sparse corner brackets instead of large circles, and the optional Smart Combat Camera frames nearby threats without moving any simulation object.

The Smart Combat Camera defaults to off and is disabled by Reduced Effects. It can be selected under **System Settings → Combat Camera**.

## Human gate

Run Missions 1, 6 and 10 at desktop and compact landscape sizes. Complete `reports/stage-3/readability-evidence.json` only from direct observation of the current build. For each scenario, confirm that aircraft type, threat direction and missile launch can be recognised without reading labels or relying on a large target circle.

Run `pnpm stage3:evidence` to verify the evidence and `pnpm stage3:gate` for the complete Stage 3 gate. Automation must not invent the human answers.

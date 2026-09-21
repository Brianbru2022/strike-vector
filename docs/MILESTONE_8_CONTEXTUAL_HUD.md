# Milestone 8 — Contextual HUD reduction

Build target: `IK87-1.2.0-DEV1-20260921-HUD1`

The command aesthetic is unchanged. The HUD now changes density according to gameplay need rather than presenting every instrument continuously.

## Information hierarchy

| Tier | Behaviour |
| --- | --- |
| Always required | Airframe and fuel summary, current objective and active weapon remain visible. |
| Context required | Detailed speed, altitude, nozzle, landing, weapon and mission information appears when relevant. |
| Warning only | Subsystem condition, missile threat and dangerous fuel receive space when action is required. |
| Optional / expanded | Map progress, complete inventory, score and full instrumentation are available on request. |

The player can toggle expanded detail with `I` or the **HUD DETAIL** button. `H` continues to recall the learned control reference independently.

Compact mobile landscape retains an unobtrusive essential-status rail because the desktop corner instruments are intentionally hidden at that viewport.

## Verification

```powershell
pnpm milestone8:hud:audit
pnpm milestone8:prepare
pnpm milestone8:gate
```

The automated audit proves categorisation and runtime wiring. Browser tests verify essential/expanded transitions on desktop and 844×390 mobile landscape. The existing human validation matrix remains the authority for final tactical-understanding sign-off.

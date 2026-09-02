# Combat effects authority

Stage 3 gives each weapon a readable visual signature without changing damage or ammunition balance. `CombatEffects.ts` is the immutable authority for launch trail, impact kind, blast intensity, surface response and staged-damage eligibility.

## Weapon signatures

- **30 mm ADEN:** bright short tracer, compact metal strike, sparks and a restrained dust or water response.
- **AIM-9L:** pale persistent smoke, blue-white motor flame and a sharp medium air/target blast.
- **SNEB rocket:** shorter dirty exhaust, orange motor flame and a tight blast with stronger surface debris.
- **1,000 lb bomb:** visible falling body and terrain shadow, broad shockwave, ground or water plume, fireball and lingering smoke.

Projectile impacts use the same authored ground profile as collision and sprite placement. Falling ordnance no longer waits for the global sea datum when painted terrain is beneath it.

## Damage and destruction

Substantial structures and naval targets have three presentation states: intact, damaged below 68% health and critical below 34%. Component emitters move between meaningful parts of each target, producing light smoke when damaged and fire plus dense smoke when critical.

Fuel stores, bunkers and naval units have deterministic secondary-detonation intervals after destruction. Aircraft produce an initial breakup, separated debris, an uncontrolled fall and a terrain or water impact before their persistent wreck appears. Naval targets burn while settling through their painted waterline.

Reduced-effects mode lowers debris, surface-plume and explosion-particle budgets while preserving the core launch, impact and damage-state cues.

## Visual acceptance

With the development server running on port 4178, run:

```powershell
pnpm effects:capture
```

The report in `reports/combat-effects` captures representative launch/flight signatures, four simultaneous weapon impacts and the damaged-to-destroyed progression. The audit hook is development-only and is absent from the production bundle.

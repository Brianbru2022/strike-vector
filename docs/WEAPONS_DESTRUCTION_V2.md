# Milestone 14: Weapons and Destruction Upgrade

## Readability standard

Every player weapon has a recognisable launch, flight and impact signature:

- ADEN cannon: deterministic dispersion, one bright tracer per three rounds and sharp local impact sparks.
- AIM-9L Sidewinder: sustained motor acceleration, dense early smoke and a compact airburst.
- SNEB rockets: paired launch, short high-energy motor burn, lighter smoke and ballistic coast.
- 1,000 lb bombs: visible rack release, ballistic rotation, broad ground shockwave and the largest non-secondary blast radius.

The hit confirmation reports the weapon, armour aspect and outcome (`GLANCING`, `PENETRATED`, `CRITICAL` or `DESTROYED`). It remains transient and sits below threat and radio warnings.

## Damage authority

`resolveDirectionalDamage()` is the shared authority for armour aspect, damage multiplier, affected subsystem and hit outcome. Ground and naval frontal armour resists shallow attacks; rear and top attacks are more effective. Aircraft rear hits damage the engine while top or underside hits affect flight controls.

Explosive terrain and target impacts use `blastRadiusFor()`. Blast falloff can damage nearby aircraft, vehicles, ships, structures and anti-ship missiles. Nearby airborne ordnance is marked for safe removal on the following weapon update, avoiding mutation of the active collision loop.

## Destruction phases

- Aircraft retain momentum, break up, fall independently and produce a terrain or water impact.
- Armoured wrecks persist and may produce one or two bounded ammunition detonations.
- Ships lose speed, flood, list towards the damaged section, emit foam and smoke, then settle below the water mask.
- Fuel and hardened targets retain their existing bounded secondary sequences.

Cosmetic particle and explosion budgets discard the oldest effects first. Full effects permit 720 particles and 24 explosions; reduced effects permit 220 particles and 10 explosions. Essential HUD warnings are rendered independently above the canvas.

## Automated evidence

The deterministic suite covers weapon profiles, Sidewinder motor acceleration, directional armour, subsystem selection, blast propagation, missile chain detonation, aircraft breakup, progressive sinking, secondary detonations, ground contact and effect-budget limits.

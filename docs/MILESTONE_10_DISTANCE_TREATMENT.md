# Milestone 10 — Distance and atmospheric treatment

Milestone 10 adds a shared, presentation-only depth model to gameplay contacts. It does not change painted environments, physics, collision, targeting range or mission content.

## Depth rules

- **Foreground:** contacts within 240 world units retain full local contrast, saturation, opacity and contact-shadow strength.
- **Engagement:** contacts from 240 to 619 units receive restrained scene matching and slightly lighter shadows.
- **Distant:** contacts at 620 units or more receive reduced saturation, contrast, opacity and shadow strength. Ordinary contacts receive only 0.18 px of softening.
- Selected contacts, mission objectives and live threats remain sharp, retain at least 95% opacity and keep their higher-priority target rim.
- Enemy missiles preserve at least 97% opacity at every distance.

Distance is measured from the player in simulation space. The resulting treatment affects rendering only; it is never written back to an enemy, projectile or mission runtime.

## Coverage

- Enemy aircraft and helicopters.
- Ground units and installations.
- Naval contacts.
- Phase-locked and active objectives.
- Player and enemy projectiles.
- Contact shadows projected onto the authoritative terrain profile.

## Commands

- `pnpm milestone10:depth:audit` checks depth bands, threat overrides and runtime integration.
- `pnpm milestone10:prepare` runs the automated engineering gate.
- `pnpm milestone10:gate` also requires the existing current-build human control evidence.

Static captures can verify gross visibility and scene integration, but final in-motion recognition remains a human acceptance boundary.

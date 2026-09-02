import { describe, expect, it } from 'vitest';
import { ParticleAndEffects } from './ParticleAndEffects';
import { PlayerAircraft } from './PlayerAircraft';
import { WeaponsSystem } from './WeaponsSystem';

describe('player weapon heading', () => {
  it.each([
    { facing: 1 as const, expectedSign: 1 },
    { facing: -1 as const, expectedSign: -1 },
  ])('launches forward-facing weapons when flying $facing', ({ facing, expectedSign }) => {
    const aircraft = new PlayerAircraft();
    const weapons = new WeaponsSystem();
    const effects = new ParticleAndEffects();
    aircraft.stats.facing = facing;
    aircraft.stats.vx = 5 * facing;
    aircraft.stats.pitchAngle = -0.08;

    weapons.fireCannon(aircraft, effects);
    weapons.fireMissile(aircraft, null, effects);
    weapons.fireRockets(aircraft, effects);

    const cannon = weapons.projectiles.find((projectile) => projectile.type === 'CANNON_ROUND');
    const missile = weapons.projectiles.find((projectile) => projectile.type === 'MISSILE');
    const rockets = weapons.projectiles.filter((projectile) => projectile.type === 'ROCKET');

    expect(Math.sign(cannon?.vx ?? 0)).toBe(expectedSign);
    expect(Math.sign(missile?.vx ?? 0)).toBe(expectedSign);
    expect(rockets).toHaveLength(2);
    expect(rockets.every((rocket) => Math.sign(rocket.vx) === expectedSign)).toBe(true);
    expect(Math.sign((cannon?.x ?? aircraft.stats.x) - aircraft.stats.x)).toBe(expectedSign);
  });
});

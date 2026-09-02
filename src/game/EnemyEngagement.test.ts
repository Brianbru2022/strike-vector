import { describe, expect, it } from 'vitest';
import { EnemyManager } from './EnemyManager';
import { PlayerAircraft } from './PlayerAircraft';
import { WeaponsSystem } from './WeaponsSystem';
import { ParticleAndEffects } from './ParticleAndEffects';
import { EnemyUnit } from '../types/game';

const makeSam = (): EnemyUnit => ({
  id: 'sam_test', type: 'SAM_LAUNCHER', category: 'GROUND', name: 'SA-8', x: 1000, y: 500,
  vx: 0, vy: 0, width: 84, height: 44, health: 100, maxHealth: 100, isAlive: true,
  isTargetable: true, pointsValue: 200, rotation: 0, fireCooldown: 0, reloadTime: 240,
  detectionRange: 900, accuracy: 0.8, stateTimer: 0, state: 'SEARCH',
});

describe('fair enemy engagement rules', () => {
  it('telegraphs a SAM track before launching on Pilot difficulty', () => {
    const sam = makeSam();
    const manager = new EnemyManager();
    const player = new PlayerAircraft();
    Object.assign(player.stats, { x: 700, y: 300, isOnCarrier: false, altitudeBand: 'HIGH' });
    const weapons = new WeaponsSystem();
    manager.reset([sam]);
    for (let tick = 0; tick < 60; tick++) manager.update(player, weapons, new ParticleAndEffects(), undefined, undefined, () => 560);
    expect(weapons.projectiles.some((projectile) => projectile.type === 'ENEMY_MISSILE')).toBe(false);
    manager.update(player, weapons, new ParticleAndEffects(), undefined, undefined, () => 560);
    expect(weapons.projectiles.some((projectile) => projectile.type === 'ENEMY_MISSILE')).toBe(true);
  });

  it('does not launch inside the minimum missile range', () => {
    const sam = makeSam();
    const manager = new EnemyManager();
    const player = new PlayerAircraft();
    Object.assign(player.stats, { x: 900, y: 430, isOnCarrier: false, altitudeBand: 'HIGH' });
    const weapons = new WeaponsSystem();
    manager.reset([sam]);
    for (let tick = 0; tick < 180; tick++) manager.update(player, weapons, new ParticleAndEffects(), undefined, undefined, () => 560);
    expect(weapons.projectiles.some((projectile) => projectile.type === 'ENEMY_MISSILE')).toBe(false);
  });
});

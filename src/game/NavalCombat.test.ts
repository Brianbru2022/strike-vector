import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MISSIONS } from './Missions';
import { EnemyManager } from './EnemyManager';
import { PlayerAircraft } from './PlayerAircraft';
import { WeaponsSystem } from './WeaponsSystem';
import { ParticleAndEffects } from './ParticleAndEffects';
import { DefendedAssetState } from '../types/game';

describe('naval combat', () => {
  it('launches exactly two targetable missiles per corvette', () => {
    const corvette = CAMPAIGN_MISSIONS[5].spawnEnemies().find((enemy) => enemy.type === 'MISSILE_CORVETTE')!;
    corvette.fireCooldown = 0;
    const manager = new EnemyManager();
    manager.reset([corvette]);
    const player = new PlayerAircraft();
    const weapons = new WeaponsSystem();
    const effects = new ParticleAndEffects();
    const defended: DefendedAssetState = { type: 'CARRIER', worldX: 8800, integrity: 100, maxIntegrity: 100, failureThreshold: 0, incomingMissiles: 0 };
    for (let tick = 0; tick < 302; tick++) manager.update(player, weapons, effects, undefined, defended);
    expect(corvette.salvosRemaining).toBe(0);
    expect(manager.enemies.filter((enemy) => enemy.type === 'ANTI_SHIP_MISSILE')).toHaveLength(2);
  });

  it('damages the carrier once when a missile reaches it', () => {
    const missile = {
      id: 'test_asm', type: 'ANTI_SHIP_MISSILE' as const, category: 'AIR' as const, name: 'Test missile',
      x: 8708, y: 560, vx: 5.5, vy: 0, width: 38, height: 12, health: 20, maxHealth: 20,
      isAlive: true, isTargetable: true, pointsValue: 300, rotation: 0, fireCooldown: 0, reloadTime: 0,
      detectionRange: 0, accuracy: 1, stateTimer: 0, state: 'SEA_SKIM', targetX: 8800,
    };
    const manager = new EnemyManager();
    manager.reset([missile]);
    const defended: DefendedAssetState = { type: 'CARRIER', worldX: 8800, integrity: 100, maxIntegrity: 100, failureThreshold: 0, incomingMissiles: 1 };
    const args = [new PlayerAircraft(), new WeaponsSystem(), new ParticleAndEffects()] as const;
    manager.update(...args, undefined, defended);
    manager.update(...args, undefined, defended);
    expect(defended.integrity).toBe(75);
  });
});

import { describe, expect, it } from 'vitest';
import { blastRadiusFor, damageAspectFor, damageEmitterOffset, damageStageFor, getWeaponEffectProfile, impactSurfaceAt, resolveDirectionalDamage, secondaryDetonationInterval } from './CombatEffects';
import { CAMPAIGN_MISSIONS } from './Missions';
import { AIRCRAFT_WRECK_LIFETIME_TICKS, EnemyManager, getAircraftWreckOpacity } from './EnemyManager';
import { ParticleAndEffects } from './ParticleAndEffects';
import { PlayerAircraft } from './PlayerAircraft';
import { WeaponsSystem } from './WeaponsSystem';

describe('combat effects authority', () => {
  it('gives every player weapon a distinct readable response', () => {
    const profiles = ['CANNON_ROUND', 'MISSILE', 'BOMB', 'ROCKET'].map((type) => getWeaponEffectProfile(type as 'CANNON_ROUND'));
    expect(new Set(profiles.map((profile) => profile.kind)).size).toBe(4);
    expect(getWeaponEffectProfile('MISSILE').trail).toBe('SIDEWINDER');
    expect(getWeaponEffectProfile('ROCKET').trail).toBe('ROCKET');
    expect(getWeaponEffectProfile('BOMB').intensity).toBe('LARGE');
    expect(new Set(profiles.map((profile) => profile.signature)).size).toBe(4);
    expect(getWeaponEffectProfile('MISSILE').impactRingColor).not.toBe(getWeaponEffectProfile('ROCKET').impactRingColor);
  });

  it('resolves directional armour and subsystem damage consistently', () => {
    const tank = { category: 'GROUND' as const, vx: 1, health: 120, maxHealth: 120 };
    const rearHit = resolveDirectionalDamage(tank, { type: 'ROCKET', vx: 20, vy: 0, damage: 65 });
    const frontHit = resolveDirectionalDamage(tank, { type: 'ROCKET', vx: -20, vy: 0, damage: 65 });
    const topHit = resolveDirectionalDamage(tank, { type: 'BOMB', vx: 2, vy: 10, damage: 100 });
    expect(rearHit.aspect).toBe('REAR');
    expect(rearHit.subsystem).toBe('ENGINE');
    expect(rearHit.damage).toBeGreaterThan(frontHit.damage);
    expect(topHit.aspect).toBe('TOP');
    expect(topHit.subsystem).toBe('TURRET');
    expect(damageAspectFor(tank, { vx: 0, vy: -9 })).toBe('UNDERSIDE');
  });

  it('assigns useful blast radii only to explosive weapons', () => {
    expect(blastRadiusFor('BOMB')).toBeGreaterThan(blastRadiusFor('MISSILE'));
    expect(blastRadiusFor('MISSILE')).toBeGreaterThan(blastRadiusFor('ROCKET'));
    expect(blastRadiusFor('CANNON_ROUND')).toBe(0);
  });

  it('uses two visible damage thresholds only for substantial targets', () => {
    const target = { type: 'MISSILE_CORVETTE' as const, category: 'NAVAL' as const, maxHealth: 300 };
    expect(damageStageFor({ ...target, health: 300 })).toBe(0);
    expect(damageStageFor({ ...target, health: 190 })).toBe(1);
    expect(damageStageFor({ ...target, health: 90 })).toBe(2);
    expect(damageStageFor({ type: 'APC', category: 'GROUND', maxHealth: 80, health: 10 })).toBe(0);
  });

  it('alternates component emitters and schedules secondary detonations', () => {
    const target = { type: 'FUEL_DEPOT' as const, category: 'STRUCTURE' as const, width: 100, height: 60 };
    expect(damageEmitterOffset(target, 0).x).toBeLessThan(0);
    expect(damageEmitterOffset(target, 30).x).toBeGreaterThan(0);
    expect(secondaryDetonationInterval(target)).toBe(12);
  });

  it('distinguishes water from authored ground contact', () => {
    expect(impactSurfaceAt(null, 540)).toBe('WATER');
    expect(impactSurfaceAt(540, 540)).toBe('WATER');
    expect(impactSurfaceAt(492, 540)).toBe('GROUND');
  });

  it('emits progressive smoke and fire from critically damaged ships', () => {
    const corvette = CAMPAIGN_MISSIONS[5].spawnEnemies().find((enemy) => enemy.type === 'MISSILE_CORVETTE')!;
    corvette.health = corvette.maxHealth * 0.25;
    corvette.fireCooldown = 9999;
    const manager = new EnemyManager();
    const effects = new ParticleAndEffects();
    manager.reset([corvette]);
    const player = new PlayerAircraft();
    Object.assign(player.stats, { x: -5000, y: 200, isOnCarrier: false });
    for (let tick = 0; tick < 35; tick++) manager.update(player, new WeaponsSystem(), effects);
    expect(effects.particles.some((particle) => particle.type === 'SMOKE')).toBe(true);
    expect(effects.particles.some((particle) => particle.type === 'FIRE')).toBe(true);
  });

  it('creates an independent aircraft breakup before terrain impact', () => {
    const fighter = CAMPAIGN_MISSIONS[5].spawnEnemies().find((enemy) => enemy.category === 'AIR')!;
    const manager = new EnemyManager();
    const effects = new ParticleAndEffects();
    manager.reset([fighter]);
    manager.killEnemy(fighter, 'MISSILE', effects);
    expect(fighter.deathStage).toBe(0);
    expect(effects.explosions.some((explosion) => explosion.kind === 'AIRCRAFT_BREAKUP')).toBe(true);
    expect(effects.particles.filter((particle) => particle.type === 'DEBRIS').length).toBeGreaterThanOrEqual(4);
  });

  it('expires an aircraft wreck and stops its smoke emitter after impact', () => {
    const fighter = CAMPAIGN_MISSIONS[5].spawnEnemies().find((enemy) => enemy.category === 'AIR')!;
    Object.assign(fighter, { y: 508, vy: 3 });
    const manager = new EnemyManager();
    const effects = new ParticleAndEffects();
    manager.reset([fighter]);
    manager.killEnemy(fighter, 'MISSILE', effects);

    const player = new PlayerAircraft();
    const weapons = new WeaponsSystem();
    manager.update(player, weapons, effects, undefined, undefined, () => 510);
    expect(fighter.deathStage).toBe(2);
    expect(fighter.deathTimer).toBe(AIRCRAFT_WRECK_LIFETIME_TICKS - 1);

    for (let tick = 1; tick < AIRCRAFT_WRECK_LIFETIME_TICKS; tick++) {
      manager.update(player, weapons, effects, undefined, undefined, () => 510);
    }
    expect(fighter.deathTimer).toBe(0);
    expect(getAircraftWreckOpacity(fighter)).toBe(0);

    const smokeCount = effects.particles.filter((particle) => particle.type === 'SMOKE').length;
    for (let tick = 0; tick < 30; tick++) manager.update(player, weapons, effects, undefined, undefined, () => 510);
    expect(effects.particles.filter((particle) => particle.type === 'SMOKE')).toHaveLength(smokeCount);
  });

  it('sinks damaged ships progressively with flooding and list', () => {
    const corvette = CAMPAIGN_MISSIONS[5].spawnEnemies().find((enemy) => enemy.type === 'MISSILE_CORVETTE')!;
    const manager = new EnemyManager();
    const effects = new ParticleAndEffects();
    manager.reset([corvette]);
    manager.killEnemy(corvette, 'BOMB', effects);
    for (let tick = 0; tick < 120; tick++) manager.update(new PlayerAircraft(), new WeaponsSystem(), effects);
    expect(corvette.sinkProgress).toBeGreaterThan(0.35);
    expect(corvette.y).toBeGreaterThan(620);
    expect(Math.abs(corvette.rotation)).toBeGreaterThan(0.01);
    expect(effects.particles.some((particle) => particle.type === 'WATER_SPRAY')).toBe(true);
  });

  it('limits fuel-depot chain reactions to a readable opening sequence', () => {
    const depot = CAMPAIGN_MISSIONS.flatMap((mission) => mission.spawnEnemies()).find((enemy) => enemy.type === 'FUEL_DEPOT')!;
    const manager = new EnemyManager();
    const effects = new ParticleAndEffects();
    const player = new PlayerAircraft();
    manager.reset([depot]);
    manager.killEnemy(depot, 'BOMB', effects);
    for (let tick = 0; tick < 120; tick++) manager.update(player, new WeaponsSystem(), effects);
    const chainBlasts = effects.explosions.filter((explosion) => explosion.kind === 'SECONDARY').length;
    expect(chainBlasts).toBeGreaterThanOrEqual(3);
    expect(chainBlasts).toBeLessThanOrEqual(8);
  });

  it('places bomb impacts on authored ground rather than the sea datum', () => {
    const weapons = new WeaponsSystem();
    const effects = new ParticleAndEffects();
    weapons.projectiles.push({
      id: 'ground_bomb', type: 'BOMB', x: 900, y: 475, vx: 0, vy: 8, source: 'PLAYER',
      damage: 100, radius: 80, life: 30, maxLife: 30, rotation: 0,
    });
    weapons.update(new PlayerAircraft(), [], effects, () => 480);
    expect(weapons.projectiles).toHaveLength(0);
    expect(effects.explosions[0]).toMatchObject({ kind: 'BOMB_BLAST', surface: 'GROUND', y: 480 });
  });

  it('propagates blast damage into nearby vehicles and missiles', () => {
    const prototype = CAMPAIGN_MISSIONS.flatMap((mission) => mission.spawnEnemies()).find((enemy) => enemy.type === 'TANK')!;
    const tank = { ...prototype, id: 'blast_tank', x: 100, y: 500, health: 120, maxHealth: 120, isAlive: true };
    const seaSkimmer = { ...prototype, id: 'blast_missile', type: 'ANTI_SHIP_MISSILE' as const, category: 'AIR' as const, x: 125, y: 490, width: 36, height: 12, health: 20, maxHealth: 20, isAlive: true };
    const manager = new EnemyManager();
    const weapons = new WeaponsSystem();
    const effects = new ParticleAndEffects();
    manager.reset([tank, seaSkimmer]);
    weapons.projectiles.push({ id: 'nearby_enemy_missile', type: 'ENEMY_MISSILE', x: 118, y: 495, vx: -10, vy: 0, source: 'ENEMY', damage: 35, radius: 12, life: 80, maxLife: 80, rotation: 0 });
    const bomb = { id: 'blast_bomb', type: 'BOMB' as const, x: 100, y: 500, vx: 2, vy: 8, source: 'PLAYER' as const, damage: 240, radius: 82, life: 1, maxLife: 180, rotation: 0 };
    manager.applyBlastEvent({ projectile: bomb, x: 100, y: 500, surface: 'GROUND' }, weapons, effects);
    expect(tank.health).toBeLessThan(120);
    expect(seaSkimmer.isAlive).toBe(false);
    expect(weapons.projectiles[0].detonated).toBe(true);
  });

  it('caps cosmetic effects while retaining reduced-effects feedback', () => {
    const effects = new ParticleAndEffects();
    for (let index = 0; index < 120; index++) effects.createDirectionalImpact(index, 200, 10, 0, 'DESTROYED');
    effects.update();
    expect(effects.particles.length).toBeLessThanOrEqual(720);
    effects.setReducedEffects(true);
    for (let index = 0; index < 120; index++) effects.createDirectionalImpact(index, 200, 10, 0, 'DESTROYED');
    effects.update();
    expect(effects.particles.length).toBeLessThanOrEqual(220);
  });

  it('retains an essential launch and impact mark with reduced effects', () => {
    const effects = new ParticleAndEffects();
    effects.setReducedEffects(true);
    for (const type of ['CANNON_ROUND', 'MISSILE', 'BOMB', 'ROCKET'] as const) {
      const beforeLaunch = effects.particles.length;
      effects.createWeaponLaunch(100, 100, type, 0);
      expect(effects.particles.length).toBeGreaterThan(beforeLaunch);
      const beforeImpact = effects.explosions.length;
      effects.createWeaponImpact(120, 120, type, 'GROUND');
      expect(effects.explosions.length).toBeGreaterThan(beforeImpact);
    }
  });

  it('accelerates a Sidewinder through its visible motor-burn phase', () => {
    const weapons = new WeaponsSystem();
    const effects = new ParticleAndEffects();
    const player = new PlayerAircraft();
    weapons.fireMissile(player, null, effects);
    const initialSpeed = Math.hypot(weapons.projectiles[0].vx, weapons.projectiles[0].vy);
    weapons.update(player, [], effects, () => 700);
    const acceleratedSpeed = Math.hypot(weapons.projectiles[0].vx, weapons.projectiles[0].vy);
    expect(acceleratedSpeed).toBeGreaterThan(initialSpeed);
    expect(weapons.projectiles[0].motorTicks).toBe(53);
  });
});

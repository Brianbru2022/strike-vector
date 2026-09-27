import { AircraftSubsystems, AirCombatSnapshot, BlastDamageEvent, DefendedAssetState, DifficultyPreset, EnemyUnit, EnemyType, WeaponType } from '../types/game';
import { GAME_CONSTANTS } from './constants';
import { PlayerAircraft } from './PlayerAircraft';
import { WeaponsSystem } from './WeaponsSystem';
import { ParticleAndEffects } from './ParticleAndEffects';
import { SpriteAssetManager } from './SpriteAssetManager';
import { soundEngine } from '../audio/SoundEngine';
import { getCombatDifficultyProfile } from './CombatBalance';
import { getAirCombatSnapshot, hasTerrainLineOfSight, initialiseAirCombat, updateAirCombat } from './AirCombatAI';
import { calculateTerrainPlacement, getEnemySpritePlacement } from './SpritePlacement';
import { blastRadiusFor, damageEmitterOffset, damageStageFor, getWeaponEffectProfile, resolveDirectionalDamage, secondaryDetonationInterval } from './CombatEffects';
import { RandomSource } from './SeededRandom';
import { getAircraftPresentationScale, getProjectilePresentationScale, getTargetReadabilityPresentation } from './CombatReadability';
import { calculateTerrainShadow, drawTerrainShadow } from './TerrainShadow';
import { getForegroundPresentationProfile, getForegroundTreatment } from './ForegroundPresentation';

export type EnemyCombatEvent =
  | { type: 'AIR_THREAT'; cue: 'DETECTED' | 'TRACKING' | 'FIRING'; enemyId: string; direction: 'LEFT' | 'RIGHT' }
  | { type: 'MISSILE_WARNING'; enemyId: string; direction: 'LEFT' | 'RIGHT' }
  | { type: 'PLAYER_DAMAGED'; source: 'AIRCRAFT_GUN' | 'SAM_MISSILE' | 'FLAK' | 'GROUND_FIRE'; amount: number }
  | { type: 'PLAYER_WEAPON_HIT'; weapon: Exclude<WeaponType, 'FLARE'>; targetId: string; targetName: string; damage: number; aspect: NonNullable<EnemyUnit['lastHitAspect']>; outcome: 'GLANCING' | 'PENETRATED' | 'CRITICAL' | 'DESTROYED' };

export interface EnemyRenderReadabilityContext {
  selectedTargetId: string | null;
  playerX?: number;
  playerY?: number;
  ambientLight: number;
  gameplayCalm?: number;
  reducedEffects?: boolean;
}

const GROUND_SPRITE_HALF_WIDTH: Partial<Record<EnemyType, number>> = {
  RADAR_STATION: 52,
  SAM_LAUNCHER: 42,
  AA_FLAK_GUN: 36,
  TANK: 41,
  APC: 41,
  COMMAND_VEHICLE: 38,
  FUEL_DEPOT: 56,
  CIVILIAN_HARBOUR_BUILDING: 56,
  BRIDGE_SEGMENT: 75,
  COMMAND_BUNKER: 72,
  COASTAL_ARTILLERY: 56,
  SEARCHLIGHT: 24,
  PROTECTED_SETTLEMENT: 86,
};

export const AIRCRAFT_WRECK_LIFETIME_TICKS = 180;
const AIRCRAFT_WRECK_FADE_TICKS = 60;

export function getAircraftWreckOpacity(enemy: EnemyUnit): number {
  if (enemy.isAlive || enemy.category !== 'AIR' || enemy.type === 'ANTI_SHIP_MISSILE' || (enemy.deathStage ?? 0) < 2) return 1;
  const remaining = Math.max(0, enemy.deathTimer ?? 0);
  return Math.min(1, remaining / AIRCRAFT_WRECK_FADE_TICKS);
}

export class EnemyManager {
  public enemies: EnemyUnit[] = [];
  private radarActive = true;
  private commandActive = true;
  private commandDazedTimer = 0;
  private difficulty: DifficultyPreset = 'PILOT';
  private simulationTick = 0;

  constructor(private authoritativeRandom?: RandomSource, private presentationRandom?: RandomSource) {}

  public setRandomSources(authoritative: RandomSource, presentation: RandomSource): void {
    this.authoritativeRandom = authoritative;
    this.presentationRandom = presentation;
  }

  public setDifficulty(difficulty: DifficultyPreset) {
    this.difficulty = difficulty;
  }

  private aimPoint(targetX: number, targetY: number, accuracy: number, seedKey: string, tick: number) {
    const difficultyAccuracy = getCombatDifficultyProfile(this.difficulty).accuracy;
    const spread = Math.max(2, (1 - Math.min(0.98, accuracy * difficultyAccuracy)) * 90);
    return {
      x: targetX + (deterministicNoise(seedKey, tick) - 0.5) * spread,
      y: targetY + (deterministicNoise(seedKey, tick + 997) - 0.5) * spread,
    };
  }

  public reset(spawnList: EnemyUnit[] = []) {
    this.enemies = spawnList;
    this.radarActive = true;
    this.commandActive = true;
    this.commandDazedTimer = 0;
    this.simulationTick = 0;
    const formationCounts = new Map<string, number>();
    this.enemies.forEach((enemy, index) => {
      enemy.damageStage = damageStageFor(enemy);
      enemy.damageEffectTimer = 0;
      if (enemy.type === 'PATROL_FIGHTER' || enemy.type === 'INTERCEPTOR' || enemy.type === 'ATTACK_HELI' || enemy.type === 'HEAVY_BOMBER') {
        enemy.airCombat = initialiseAirCombat(enemy, index, formationCounts);
      }
    });
  }

  public getEnemies(): EnemyUnit[] {
    return this.enemies;
  }

  public getAirCombatSnapshots(): AirCombatSnapshot[] {
    return this.enemies.map(getAirCombatSnapshot).filter((snapshot): snapshot is AirCombatSnapshot => snapshot !== null);
  }

  public addEnemies(spawnList: EnemyUnit[]): void {
    const formationCounts = new Map<string, number>();
    for (const existing of this.enemies) {
      const runtime = existing.airCombat;
      if (runtime) formationCounts.set(runtime.formationId, (formationCounts.get(runtime.formationId) ?? 0) + 1);
    }
    spawnList.forEach((enemy, index) => {
      enemy.damageStage = damageStageFor(enemy);
      enemy.damageEffectTimer = 0;
      if (enemy.type === 'PATROL_FIGHTER' || enemy.type === 'INTERCEPTOR' || enemy.type === 'ATTACK_HELI' || enemy.type === 'HEAVY_BOMBER') {
        enemy.airCombat = initialiseAirCombat(enemy, index, formationCounts);
      }
    });
    this.enemies.push(...spawnList);
  }

  public update(
    player: PlayerAircraft,
    weapons: WeaponsSystem,
    effects: ParticleAndEffects,
    onEnemyKilled?: (enemy: EnemyUnit, weaponType: string) => void,
    defendedAsset?: DefendedAssetState,
    groundYAt?: (worldX: number) => number,
    onCombatEvent?: (event: EnemyCombatEvent) => void
  ) {
    this.simulationTick++;
    const pStats = player.stats;
    const playerAltitude = pStats.altitudeBand;
    const difficultyProfile = getCombatDifficultyProfile(this.difficulty);
    const detectionScale = difficultyProfile.detection;
    const reloadScale = difficultyProfile.reloadTime;

    // Check tactical radar & command status
    const liveRadars = this.enemies.filter(e => e.type === 'RADAR_STATION' && e.isAlive);
    this.radarActive = liveRadars.length > 0;

    if (this.commandDazedTimer > 0) {
      this.commandDazedTimer--;
      this.commandActive = false;
    } else {
      const liveCommands = this.enemies.filter(e => e.type === 'COMMAND_VEHICLE' && e.isAlive);
      this.commandActive = liveCommands.length > 0;
    }

    const launchedUnits: EnemyUnit[] = [];

    // Update each enemy unit
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Handle Staged Destruction
      if (!e.isAlive) {
        if (e.type !== 'ANTI_SHIP_MISSILE' && e.category === 'AIR' && (e.deathStage || 0) < 2) {
          e.deathStage = 1;
          e.x += e.vx * 0.92;
          e.y += e.vy;
          e.vx *= 0.985;
          e.vy += 0.2;
          e.rotation += 0.035;
          const impactY = groundYAt ? groundYAt(e.x) : GAME_CONSTANTS.SEA_LEVEL_Y;
          if (e.y >= impactY) {
            e.y = impactY;
            e.vx = 0;
            e.vy = 0;
            e.deathStage = 2;
            e.deathTimer = AIRCRAFT_WRECK_LIFETIME_TICKS;
            effects.createExplosion(e.x, e.y - 8, 'LARGE', 'AIRCRAFT_BREAKUP', impactY >= GAME_CONSTANTS.SEA_LEVEL_Y ? 'WATER' : 'GROUND');
            soundEngine.playExplosion('LARGE');
          }
        } else if (e.category === 'NAVAL') {
          e.deathStage = 1;
          e.x += e.vx * 0.25;
          e.vx *= 0.985;
          e.sinkProgress = Math.min(1, (e.sinkProgress ?? 0) + 1 / 300);
          e.y = GAME_CONSTANTS.SEA_LEVEL_Y + e.sinkProgress * 42;
          const sinkDirection = e.lastHitAspect === 'REAR' ? -1 : 1;
          e.rotation += (sinkDirection * 0.24 * e.sinkProgress - e.rotation) * 0.035;
          if (e.deathTimer !== undefined && e.deathTimer % 20 === 0) effects.createNavalSinking(e.x, e.y, e.width, e.sinkProgress);
          if (e.sinkProgress >= 0.98) e.deathStage = 2;
        }
        if (e.type !== 'ANTI_SHIP_MISSILE' && e.deathTimer !== undefined && e.deathTimer > 0 && e.deathTimer % 14 === 0) {
          const emitter = damageEmitterOffset(e, e.deathTimer);
          effects.createDamagePlume(e.x + emitter.x, e.y + emitter.y, 2, e.category === 'NAVAL');
        }
        if (e.deathTimer !== undefined && e.deathTimer > 0) {
          e.deathTimer--;
          const secondaryInterval = secondaryDetonationInterval(e);
          const withinSecondaryWindow = e.type === 'FUEL_DEPOT'
            ? e.deathTimer >= 516
            : e.category === 'NAVAL'
              ? e.deathTimer >= 168
              : e.deathTimer >= 480;
          if (secondaryInterval && withinSecondaryWindow && e.deathTimer % secondaryInterval === 0) {
            const emitter = damageEmitterOffset(e, e.deathTimer);
            effects.createExplosion(
              e.x + emitter.x,
              e.y + emitter.y,
              e.type === 'FUEL_DEPOT' ? 'LARGE' : 'MEDIUM',
              'SECONDARY',
              e.category === 'NAVAL' ? 'WATER' : 'TARGET',
            );
            soundEngine.playExplosion(e.type === 'FUEL_DEPOT' ? 'LARGE' : 'MEDIUM');
          }
        }
        continue;
      }

      e.stateTimer++;

      // Larger targets visibly progress from damaged components to critical fires.
      const nextDamageStage = damageStageFor(e);
      if (nextDamageStage > (e.damageStage ?? 0)) {
        const emitter = damageEmitterOffset(e, this.simulationTick);
        effects.createSparks(e.x + emitter.x, e.y + emitter.y, nextDamageStage === 2 ? 14 : 8);
        effects.createExplosion(e.x + emitter.x, e.y + emitter.y, 'SMALL', 'CANNON_IMPACT', 'TARGET');
      }
      e.damageStage = nextDamageStage;
      e.damageEffectTimer = (e.damageEffectTimer ?? 0) + 1;
      if (nextDamageStage > 0) {
        const interval = nextDamageStage === 2 ? 10 : 22;
        if ((e.damageEffectTimer + stableHash(e.id)) % interval === 0) {
          const emitter = damageEmitterOffset(e, this.simulationTick);
          effects.createDamagePlume(e.x + emitter.x, e.y + emitter.y, nextDamageStage as 1 | 2, e.category === 'NAVAL');
        }
      }

      // Radar dish rotation
      if (e.type === 'RADAR_STATION') {
        e.radarDishAngle = (e.radarDishAngle || 0) + 0.04;
      }

      // Distance to player
      const dx = pStats.x - e.x;
      const dy = pStats.y - e.y;
      const dist = Math.hypot(dx, dy);

      // --- ENEMY AI BEHAVIORS ---

      // 1. Mobile SAM Launchers
      if (e.type === 'SAM_LAUNCHER') {
        // High & Medium altitude are detected; Low altitude masks radar unless very close
        const effectiveRange = (this.radarActive ? e.detectionRange : e.detectionRange * 0.45) * detectionScale;
        const canDetect = playerAltitude === 'HIGH' || playerAltitude === 'MEDIUM' || dist < 280;

        const hasClearTrack = canDetect && dist < effectiveRange && dist > 180 && !pStats.isOnCarrier && hasTerrainLineOfSight(e.x, e.y - 18, pStats.x, pStats.y, groundYAt);
        const launchWarningTicks = difficultyProfile.enemyLaunchWarningTicks;
        if (hasClearTrack && e.fireCooldown <= 0 && e.state !== 'TRACKING') {
          e.state = 'TRACKING';
          e.stateTimer = 0;
          soundEngine.playThreatWarning('RADAR');
          soundEngine.playRadioCall(`SAM RADAR TRACK ${e.x < pStats.x ? 'LEFT' : 'RIGHT'}.`);
        }
        if (hasClearTrack && e.fireCooldown <= 0 && e.state === 'TRACKING' && e.stateTimer >= launchWarningTicks) {
          weapons.fireEnemyMissile(e.x, e.y - 14, 'player');
          onCombatEvent?.({ type: 'MISSILE_WARNING', enemyId: e.id, direction: e.x < pStats.x ? 'LEFT' : 'RIGHT' });
          e.fireCooldown = (this.radarActive ? e.reloadTime : e.reloadTime * 1.8) * reloadScale;
          e.state = 'RELOAD';
          e.stateTimer = 0;
          effects.createExplosion(e.x, e.y - 12, 'SMALL');
        } else if (!hasClearTrack && e.state === 'TRACKING') {
          e.state = 'SEARCH';
          e.stateTimer = 0;
        }
      }

      // 2. Anti-Aircraft Flak Guns
      else if (e.type === 'AA_FLAK_GUN') {
        // Lethal at Low & Medium altitudes
        if (dist < e.detectionRange * detectionScale && (playerAltitude === 'LOW' || playerAltitude === 'MEDIUM') && !pStats.isOnCarrier) {
          e.turretAngle = Math.atan2(dy, dx);
          if (e.fireCooldown <= 0) {
            const aim = this.aimPoint(pStats.x, pStats.y, e.accuracy, e.id, e.stateTimer);
            weapons.fireEnemyFlak(e.x + Math.cos(e.turretAngle) * 16, e.y + Math.sin(e.turretAngle) * 16, aim.x, aim.y);
            e.fireCooldown = e.reloadTime * reloadScale + (this.authoritativeRandom?.nextInt(20) ?? 0);
            effects.particles.push({
              x: e.x,
              y: e.y - 10,
              vx: 0,
              vy: -1,
              size: 4,
              maxSize: 8,
              color: '#fde047',
              alpha: 0.9,
              life: 6,
              maxLife: 8,
              rotation: 0,
              vRot: 0,
              type: 'FIRE',
            });
          }
        }
      }

      // Coastal guns fire slow, clearly telegraphed barrage rounds. They are
      // secondary threats rather than disguised high-rate anti-aircraft guns.
      else if (e.type === 'COASTAL_ARTILLERY') {
        const canBombardLandingForce = defendedAsset?.type === 'LANDING_FORCE'
          && Math.abs(e.x - defendedAsset.worldX) < 5200;
        if (canBombardLandingForce && e.fireCooldown <= 0) {
          defendedAsset.integrity = Math.max(0, defendedAsset.integrity - 4);
          e.fireCooldown = e.reloadTime * reloadScale;
          e.state = 'BOMBARDING';
          effects.createExplosion(
            defendedAsset.worldX + (deterministicNoise(e.id, this.simulationTick) - 0.5) * 150,
            (groundYAt?.(defendedAsset.worldX) ?? GAME_CONSTANTS.SEA_LEVEL_Y) - 6,
            'MEDIUM',
            'GENERIC',
            'GROUND',
          );
          soundEngine.playRadioCall('LANDING BEACH UNDER COASTAL FIRE. SILENCE THE BATTERIES.');
          soundEngine.playShipWeapon('NAVAL_GUN');
        }
        const hasClearShot = dist < e.detectionRange * detectionScale
          && dist > 260
          && !pStats.isOnCarrier
          && hasTerrainLineOfSight(e.x, e.y - 24, pStats.x, pStats.y, groundYAt);
        e.turretAngle = Math.atan2(dy, dx);
        if (hasClearShot && e.fireCooldown <= 0) {
          const aim = this.aimPoint(pStats.x, pStats.y, e.accuracy, e.id, e.stateTimer);
          soundEngine.playRadioCall(`COASTAL BATTERY FIRING ${e.x < pStats.x ? 'LEFT' : 'RIGHT'}.`);
          soundEngine.playShipWeapon('NAVAL_GUN');
          weapons.fireEnemyFlak(e.x + Math.cos(e.turretAngle) * 28, e.y + Math.sin(e.turretAngle) * 28, aim.x, aim.y);
          e.fireCooldown = e.reloadTime * reloadScale;
          e.state = 'FIRING';
          e.stateTimer = 0;
          effects.createExplosion(e.x, e.y - 18, 'SMALL', 'CANNON_IMPACT', 'TARGET');
        }
      }

      // Searchlights sweep predictably, then hold the player in a bright cone.
      // The beam and radio call make the threat readable before nearby SAMs fire.
      else if (e.type === 'SEARCHLIGHT') {
        const hasTrack = dist < e.detectionRange * detectionScale
          && (playerAltitude === 'LOW' || playerAltitude === 'MEDIUM')
          && !pStats.isOnCarrier
          && hasTerrainLineOfSight(e.x, e.y - 28, pStats.x, pStats.y, groundYAt);
        if (hasTrack) {
          if (e.state !== 'TRACKING') soundEngine.playRadioCall(`SEARCHLIGHT CONTACT ${e.x < pStats.x ? 'LEFT' : 'RIGHT'}. USE TERRAIN MASKING.`);
          e.state = 'TRACKING';
          e.turretAngle = Math.atan2(dy, dx);
        } else {
          e.state = 'SWEEP';
          e.turretAngle = -Math.PI * 0.72 + Math.sin((this.simulationTick + stableHash(e.id)) * 0.012) * 0.48;
        }
      }

      // 3. Fixed-timestep aircraft doctrines and formation tactics
      else if (e.type === 'PATROL_FIGHTER' || e.type === 'INTERCEPTOR' || e.type === 'ATTACK_HELI' || e.type === 'HEAVY_BOMBER') {
        const strategicTarget = defendedAsset && e.airCombat?.state === 'BASE_STRIKE'
          ? { x: defendedAsset.worldX, y: (groundYAt?.(defendedAsset.worldX) ?? GAME_CONSTANTS.SEA_LEVEL_Y) - 70 }
          : undefined;
        const result = updateAirCombat(e, pStats, this.simulationTick, difficultyProfile, groundYAt, strategicTarget);
        if (result.cue) {
          onCombatEvent?.({ type: 'AIR_THREAT', cue: result.cue, enemyId: e.id, direction: e.x < pStats.x ? 'LEFT' : 'RIGHT' });
        }
        if (result.firedGun && e.fireCooldown <= 0) {
          const aim = this.aimPoint(pStats.x, pStats.y, e.accuracy, e.id, this.simulationTick);
          weapons.fireEnemyBullet(e.x, e.y, aim.x, aim.y);
          e.fireCooldown = e.reloadTime * reloadScale;
        }
        if (result.hitDefendedAsset && defendedAsset && e.fireCooldown <= 0) {
          defendedAsset.integrity = Math.max(0, defendedAsset.integrity - 8);
          e.fireCooldown = e.reloadTime * reloadScale;
          e.strikePassesRemaining = Math.max(0, (e.strikePassesRemaining ?? 1) - 1);
          if (e.strikePassesRemaining <= 0 && e.airCombat) e.airCombat.state = 'PATROL';
          effects.createExplosion(defendedAsset.worldX, strategicTarget?.y ?? GAME_CONSTANTS.SEA_LEVEL_Y - 70, 'MEDIUM');
          soundEngine.playRadioCall('SKELD FARP UNDER ATTACK. DAMAGE REPORTED.');
        }

        // Damaged aircraft remain visually readable and visibly wounded
        // without swapping to a completely different silhouette mid-flight.
        if (e.health / e.maxHealth < 0.5 && (this.presentationRandom?.chance(0.42) ?? false)) {
          effects.particles.push({
            x: e.x + (e.vx > 0 ? -28 : 28),
            y: e.y + 3,
            vx: -e.vx * 0.16,
            vy: -0.25,
            size: 5,
            maxSize: 17,
            color: e.health / e.maxHealth < 0.25 ? '#3f3f46' : '#64748b',
            alpha: 0.72,
            life: 28,
            maxLife: 36,
            rotation: 0,
            vRot: 0,
            type: 'SMOKE',
          });
        }

        // Jet engine trail
        if (this.presentationRandom?.chance(0.3) ?? false) {
          effects.particles.push({
            x: e.x + (e.vx > 0 ? -24 : 24),
            y: e.y,
            vx: -e.vx * 0.2,
            vy: ((this.presentationRandom?.nextFloat() ?? 0.5) - 0.5) * 0.5,
            size: 3,
            maxSize: 10,
            color: '#94a3b8',
            alpha: 0.5,
            life: 18,
            maxLife: 24,
            rotation: 0,
            vRot: 0,
            type: 'SMOKE',
          });
        }
      }

      // 4. Naval units and interceptable sea-skimming missiles
      else if (e.type === 'PATROL_BOAT' || e.type === 'MISSILE_CORVETTE' || e.type === 'LANDING_CRAFT') {
        e.x += e.vx;
        if (e.type === 'LANDING_CRAFT' && e.targetX !== undefined) {
          const reachedBeach = (e.vx >= 0 && e.x >= e.targetX) || (e.vx < 0 && e.x <= e.targetX);
          if (reachedBeach) {
            e.x = e.targetX;
            e.vx = 0;
            e.state = 'BEACHED';
          }
        }
        e.y = GAME_CONSTANTS.SEA_LEVEL_Y - (e.type === 'MISSILE_CORVETTE' ? 18 : e.type === 'LANDING_CRAFT' ? 8 : 13);
        if (Math.abs(e.vx) > 0.05 && e.stateTimer % 5 === 0) {
          effects.particles.push({
            x: e.x - Math.sign(e.vx || 1) * e.width * 0.45,
            y: GAME_CONSTANTS.SEA_LEVEL_Y + 1,
            vx: -e.vx * 0.25,
            vy: -0.15,
            size: 5,
            maxSize: 18,
            color: '#dbeafe',
            alpha: 0.45,
            life: 18,
            maxLife: 24,
            rotation: 0,
            vRot: 0,
            type: 'WATER_SPRAY',
          });
        }
        if (e.type === 'MISSILE_CORVETTE' && defendedAsset && (e.salvosRemaining || 0) > 0 && e.fireCooldown <= 0) {
          launchedUnits.push({
            id: `${e.id}_asm_${e.salvosRemaining}`,
            type: 'ANTI_SHIP_MISSILE',
            category: 'AIR',
            name: 'SS-N-9 Sea-Skimmer',
            x: e.x + 45,
            y: GAME_CONSTANTS.SEA_LEVEL_Y - 46,
            vx: 5.5,
            vy: 0,
            width: 38,
            height: 12,
            health: 20,
            maxHealth: 20,
            isAlive: true,
            isTargetable: true,
            pointsValue: 300,
            rotation: 0,
            fireCooldown: 0,
            reloadTime: 0,
            detectionRange: 0,
            accuracy: 1,
            stateTimer: 0,
            state: 'SEA_SKIM',
            targetX: defendedAsset.worldX,
          });
          e.salvosRemaining = (e.salvosRemaining || 0) - 1;
          e.fireCooldown = e.reloadTime * reloadScale;
          soundEngine.playShipWeapon('MISSILE');
          soundEngine.playRadioCall('INCOMING SEA-SKIMMER. ENGAGE MISSILE!');
        }
        if (e.health / e.maxHealth < 0.5 && e.stateTimer % 8 === 0) {
          effects.particles.push({
            x: e.x,
            y: e.y - 25,
            vx: -0.3,
            vy: -0.8,
            size: 8,
            maxSize: 25,
            color: '#3f3f46',
            alpha: 0.7,
            life: 35,
            maxLife: 45,
            rotation: 0,
            vRot: 0,
            type: 'SMOKE',
          });
        }
      }
      else if (e.type === 'ANTI_SHIP_MISSILE') {
        e.x += 5.5;
        e.y = GAME_CONSTANTS.SEA_LEVEL_Y - 42 + Math.sin(e.stateTimer * 0.13) * 2;
        if (e.stateTimer % 2 === 0) {
          effects.particles.push({
            x: e.x - 18, y: e.y, vx: -1.4, vy: 0, size: 3, maxSize: 9,
            color: '#e2e8f0', alpha: 0.6, life: 14, maxLife: 18,
            rotation: 0, vRot: 0, type: 'SMOKE',
          });
        }
        if (defendedAsset && !e.hasScoredImpact && e.x >= defendedAsset.worldX - 90) {
          e.hasScoredImpact = true;
          e.isAlive = false;
          e.deathTimer = 18;
          defendedAsset.integrity = Math.max(0, defendedAsset.integrity - 25);
          effects.createExplosion(defendedAsset.worldX - 60, GAME_CONSTANTS.SEA_LEVEL_Y - 24, 'LARGE');
          soundEngine.playExplosion('LARGE');
          soundEngine.playRadioCall('CARRIER HIT. DAMAGE CONTROL TEAMS RESPONDING.');
        }
      }

      // 6. Armoured Vehicles & Tanks (Moving Convoys)
      else if (e.type === 'TANK' || e.type === 'APC' || e.type === 'COMMAND_VEHICLE') {
        if (this.commandActive) {
          e.x += e.vx; // convoy moves
        }
        const assaultingLandingForce = defendedAsset?.type === 'LANDING_FORCE'
          && e.targetX !== undefined
          && Math.abs(e.x - defendedAsset.worldX) <= 210;
        if (assaultingLandingForce) {
          if (e.state !== 'ASSAULT') soundEngine.playRadioCall('HOSTILE ARMOUR HAS REACHED THE LANDING ZONE.');
          e.state = 'ASSAULT';
          e.vx = 0;
          if (e.fireCooldown <= 0) {
            defendedAsset.integrity = Math.max(0, defendedAsset.integrity - (e.type === 'TANK' ? 8 : 5));
            e.fireCooldown = e.reloadTime * reloadScale;
            effects.createExplosion(
              defendedAsset.worldX + (deterministicNoise(e.id, this.simulationTick) - 0.5) * 120,
              (groundYAt?.(defendedAsset.worldX) ?? GAME_CONSTANTS.GROUND_SURFACE_Y) - 5,
              'SMALL',
              'CANNON_IMPACT',
              'GROUND',
            );
          }
        }
        if (dist < 320 && playerAltitude === 'LOW' && e.fireCooldown <= 0 && !pStats.isOnCarrier) {
          const aim = this.aimPoint(pStats.x, pStats.y, e.accuracy, e.id, e.stateTimer);
          weapons.fireEnemyBullet(e.x, e.y - 8, aim.x, aim.y);
          e.fireCooldown = e.reloadTime * reloadScale + (this.authoritativeRandom?.nextInt(40) ?? 0);
        }
      }

      // Cooldown timer decay
      if (e.fireCooldown > 0) e.fireCooldown--;
    }

    if (launchedUnits.length > 0) this.enemies.push(...launchedUnits);
    this.separateFormationAircraft();

    // --- PROJECTILE VS ENEMY COLLISIONS ---
    for (let pIdx = weapons.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = weapons.projectiles[pIdx];
      if (proj.source !== 'PLAYER' || proj.detonated) continue;

      for (let eIdx = 0; eIdx < this.enemies.length; eIdx++) {
        const enemy = this.enemies[eIdx];
        if (!enemy.isAlive || !enemy.isTargetable) continue;

        // Collision box
        const halfW = enemy.width * 0.5;
        const halfH = enemy.height * 0.5;
        const inX = proj.x >= enemy.x - halfW && proj.x <= enemy.x + halfW;
        const inY = proj.y >= enemy.y - halfH && proj.y <= enemy.y + halfH;

        if (inX && inY) {
          // Hit!
          const resolution = resolveDirectionalDamage(enemy, proj);
          enemy.lastHitAspect = resolution.aspect;
          enemy.damagedSubsystem = resolution.subsystem;
          enemy.health -= resolution.damage;
          onCombatEvent?.({ type: 'PLAYER_WEAPON_HIT', weapon: projectileWeaponType(proj.type), targetId: enemy.id, targetName: enemy.name, damage: resolution.damage, aspect: resolution.aspect, outcome: resolution.outcome });
          effects.createWeaponImpact(proj.x, proj.y, proj.type, 'TARGET');
          effects.createDirectionalImpact(proj.x, proj.y, proj.vx, proj.vy, resolution.outcome);

          if (proj.type === 'CANNON_ROUND') {
            if (enemy.category === 'AIR') soundEngine.playAircraftGunHit();
            else if (enemy.category === 'STRUCTURE') soundEngine.playSurfaceImpact('GROUND');
            else soundEngine.playArmourHit();
          }

          // Bomb AoE explosion
          if (proj.type === 'BOMB' || proj.type === 'MISSILE' || proj.type === 'ROCKET') {
            soundEngine.playExplosion(getWeaponEffectProfile(proj.type).intensity);

            this.applyBlastDamage(proj, enemy.id, weapons, effects, onEnemyKilled, onCombatEvent);
          }

          if (enemy.health <= 0) {
            this.killEnemy(enemy, proj.type, effects, onEnemyKilled);
          }

          const impactIndex = weapons.projectiles.findIndex((candidate) => candidate.id === proj.id);
          if (impactIndex >= 0) weapons.projectiles.splice(impactIndex, 1);
          break;
        }
      }
    }

    // --- ENEMY BULLETS VS PLAYER COLLISIONS ---
    for (let pIdx = weapons.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = weapons.projectiles[pIdx];
      if (proj.source !== 'ENEMY') continue;

      const pBoxW = GAME_CONSTANTS.PLAYER.WIDTH * 0.5;
      const pBoxH = GAME_CONSTANTS.PLAYER.HEIGHT * 0.5;
      const inX = proj.x >= pStats.x - pBoxW && proj.x <= pStats.x + pBoxW;
      const inY = proj.y >= pStats.y - pBoxH && proj.y <= pStats.y + pBoxH;

      if (inX && inY && !pStats.isOnCarrier) {
        const healthBefore = pStats.health;
        const hitSubsystem = playerSubsystemForImpact(proj.x - pStats.x, proj.y - pStats.y, proj.vx);
        player.applyDamage(proj.damage, hitSubsystem);
        const source = proj.type === 'ENEMY_MISSILE' ? 'SAM_MISSILE' : proj.type === 'ENEMY_FLAK' ? 'FLAK' : nearestAirSource(this.enemies, proj.x, proj.y) ? 'AIRCRAFT_GUN' : 'GROUND_FIRE';
        onCombatEvent?.({ type: 'PLAYER_DAMAGED', source, amount: Math.max(0, healthBefore - pStats.health) });
        effects.createSparks(proj.x, proj.y, 6);
        effects.addScreenShake(0.2);
        weapons.projectiles.splice(pIdx, 1);
      }
    }
  }

  private separateFormationAircraft(): void {
    const aircraft = this.enemies.filter((enemy) => enemy.isAlive && enemy.airCombat);
    for (let firstIndex = 0; firstIndex < aircraft.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < aircraft.length; secondIndex++) {
        const first = aircraft[firstIndex];
        const second = aircraft[secondIndex];
        if (first.airCombat?.formationId !== second.airCombat?.formationId) continue;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= 72) continue;
        const push = (72 - Math.max(1, distance)) * 0.08;
        const direction = dy === 0 ? (first.airCombat.slotIndex < second.airCombat!.slotIndex ? 1 : -1) : Math.sign(dy);
        first.y -= direction * push;
        second.y += direction * push;
      }
    }
  }

  private applyBlastDamage(
    projectile: { id: string; type: import('../types/game').Projectile['type']; x: number; y: number; damage: number },
    excludeId: string,
    weapons: WeaponsSystem,
    effects: ParticleAndEffects,
    onEnemyKilled?: (enemy: EnemyUnit, weaponType: string) => void,
    onCombatEvent?: (event: EnemyCombatEvent) => void,
  ) {
    const radius = blastRadiusFor(projectile.type);
    if (radius <= 0) return;
    for (const other of this.enemies) {
      if (!other.isAlive || other.id === excludeId) continue;
      const dist = Math.hypot(other.x - projectile.x, other.y - projectile.y);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const damage = projectile.damage * 0.72 * falloff;
        other.health -= damage;
        other.lastHitAspect = 'TOP';
        other.damagedSubsystem = other.category === 'AIR' ? 'FLIGHT_CONTROLS' : other.category === 'NAVAL' ? 'WEAPONS' : 'TURRET';
        effects.createDirectionalImpact(other.x, other.y, other.x - projectile.x, other.y - projectile.y, other.health <= 0 ? 'DESTROYED' : 'PENETRATED');
        const outcome = other.health <= 0 ? 'DESTROYED' : other.health / Math.max(1, other.maxHealth) <= 0.34 ? 'CRITICAL' : 'PENETRATED';
        onCombatEvent?.({ type: 'PLAYER_WEAPON_HIT', weapon: projectileWeaponType(projectile.type), targetId: other.id, targetName: other.name, damage, aspect: 'TOP', outcome });
        if (other.health <= 0) {
          this.killEnemy(other, `${projectile.type}_BLAST`, effects, onEnemyKilled);
        }
      }
    }

    // Blast pressure can break nearby missiles and ordnance, allowing cannon
    // or bomb bursts to protect defended assets through deliberate chain hits.
    for (let index = weapons.projectiles.length - 1; index >= 0; index--) {
      const nearby = weapons.projectiles[index];
      if (nearby.id === projectile.id || !['MISSILE', 'ROCKET', 'BOMB', 'ENEMY_MISSILE'].includes(nearby.type)) continue;
      if (Math.hypot(nearby.x - projectile.x, nearby.y - projectile.y) >= radius) continue;
      effects.createWeaponImpact(nearby.x, nearby.y, nearby.type, 'AIR');
      nearby.detonated = true;
      nearby.life = 0;
      nearby.damage = 0;
    }
  }

  public applyBlastEvent(
    event: BlastDamageEvent,
    weapons: WeaponsSystem,
    effects: ParticleAndEffects,
    onEnemyKilled?: (enemy: EnemyUnit, weaponType: string) => void,
    onCombatEvent?: (event: EnemyCombatEvent) => void,
  ): void {
    this.applyBlastDamage({ ...event.projectile, x: event.x, y: event.y }, '', weapons, effects, onEnemyKilled, onCombatEvent);
  }

  public killEnemy(
    enemy: EnemyUnit,
    weaponType: string,
    effects: ParticleAndEffects,
    onEnemyKilled?: (enemy: EnemyUnit, weaponType: string) => void
  ) {
    enemy.isAlive = false;
    enemy.deathTimer = enemy.category === 'NAVAL' ? 360 : 600;
    enemy.deathStage = 0;
    enemy.damageStage = 2;
    enemy.sinkProgress = enemy.category === 'NAVAL' ? 0 : undefined;

    // Cause & Effect consequences
    if (enemy.type === 'RADAR_STATION') {
      soundEngine.playRadioCall('TARGET DESTROYED. ENEMY RADAR NET OFFLINE.');
      effects.createExplosion(enemy.x, enemy.y, 'LARGE', 'SECONDARY', 'TARGET');
      soundEngine.playExplosion('LARGE');
    } else if (enemy.type === 'FUEL_DEPOT') {
      effects.createExplosion(enemy.x, enemy.y, 'COLOSSAL', 'SECONDARY', 'GROUND');
      soundEngine.playFuelCookoff();
      soundEngine.playRadioCall('FUEL DEPOT DETONATED.');
    } else if (enemy.type === 'COMMAND_VEHICLE') {
      this.commandDazedTimer = 360; // 6 seconds dazed
      soundEngine.playRadioCall('COMMAND VEHICLE NEUTRALIZED. CONVOY DISORGANIZED.');
      effects.createExplosion(enemy.x, enemy.y, 'LARGE', 'SECONDARY', 'TARGET');
      soundEngine.playExplosion('LARGE');
    } else if (enemy.isCivilian) {
      soundEngine.playRadioCall('WARNING! ROE VIOLATION. CIVILIAN INFRASTRUCTURE HIT.');
      effects.createExplosion(enemy.x, enemy.y, 'LARGE', 'SECONDARY', enemy.category === 'NAVAL' ? 'WATER' : 'TARGET');
      soundEngine.playExplosion('LARGE');
    } else if (enemy.type === 'ANTI_SHIP_MISSILE') {
      effects.createExplosion(enemy.x, enemy.y, 'SMALL', 'MISSILE_BLAST', 'AIR');
      soundEngine.playExplosion('SMALL');
    } else if (enemy.category === 'AIR') {
      effects.createAircraftBreakup(enemy.x, enemy.y, enemy.vx, enemy.vy);
      soundEngine.playAircraftBreakup();
    } else if (enemy.category === 'NAVAL') {
      effects.createExplosion(enemy.x, enemy.y - enemy.height * 0.25, 'LARGE', 'NAVAL_BLAST', 'WATER');
      soundEngine.playExplosion('LARGE');
      soundEngine.playShipSinking();
    } else {
      const expSize = enemy.category === 'GROUND' ? 'MEDIUM' : 'LARGE';
      effects.createExplosion(enemy.x, enemy.y, expSize, 'GENERIC', enemy.category === 'GROUND' || enemy.category === 'STRUCTURE' ? 'GROUND' : 'TARGET');
      soundEngine.playExplosion(expSize);
    }

    if (onEnemyKilled) {
      onEnemyKilled(enemy, weaponType);
    }
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, groundYAt?: (worldX: number) => number | null, readabilityContext?: EnemyRenderReadabilityContext) {
    const seaY = GAME_CONSTANTS.SEA_LEVEL_Y;

    for (const e of this.enemies) {
      const screenX = e.x - cameraX;
      if (screenX < -140 || screenX > GAME_CONSTANTS.VIEWPORT_WIDTH + 140) continue;
      if (!e.isAlive && e.category === 'AIR' && e.type !== 'ANTI_SHIP_MISSILE' && (e.deathStage ?? 0) >= 2 && (e.deathTimer ?? 0) <= 0) continue;

      const sitsOnLand = e.category === 'GROUND' || e.category === 'STRUCTURE';
      const footprintHalfWidth = GROUND_SPRITE_HALF_WIDTH[e.type] ?? e.width * 0.5;
      const spritePlacement = e.type === 'SEARCHLIGHT' || e.type === 'PROTECTED_SETTLEMENT'
        ? null
        : getEnemySpritePlacement(e.type);
      const foregroundSpriteKey = spritePlacement?.key ?? getEnemyForegroundSpriteKey(e);
      const foregroundProfile = getForegroundPresentationProfile(foregroundSpriteKey);
      const terrainPlacement = sitsOnLand && groundYAt
        ? calculateTerrainPlacement(e.x, footprintHalfWidth, (worldX) => groundYAt(worldX) ?? GAME_CONSTANTS.GROUND_SURFACE_Y, Boolean(spritePlacement?.followsSlope))
        : { contactY: sitsOnLand ? GAME_CONSTANTS.GROUND_SURFACE_Y : e.y, rotation: 0 };
      const contactY = terrainPlacement.contactY;
      const isSelected = readabilityContext?.selectedTargetId === e.id;
      const distanceFromPlayer = Math.hypot(
        e.x - (readabilityContext?.playerX ?? e.x),
        e.y - (readabilityContext?.playerY ?? e.y),
      );
      const readability = getTargetReadabilityPresentation({
        category: e.category,
        isTargetable: e.isTargetable,
        isPrimaryObjective: e.isPrimaryObjective,
        isSecondaryObjective: e.isSecondaryObjective,
        isSelected,
        ambientLight: readabilityContext?.ambientLight ?? 0.8,
        gameplayCalm: readabilityContext?.gameplayCalm,
      });
      const foregroundTreatment = getForegroundTreatment({
        spriteKey: foregroundSpriteKey,
        ambientLight: readabilityContext?.ambientLight ?? 0.8,
        separationFilter: readability.separationFilter,
        damageStage: e.damageStage,
        reducedEffects: readabilityContext?.reducedEffects,
        distanceFromPlayer,
        isSelected,
        isObjective: e.isPrimaryObjective || e.isSecondaryObjective,
        isThreat: e.isTargetable || e.type === 'ANTI_SHIP_MISSILE',
      });

      if (e.isAlive && sitsOnLand) {
        const shadow = calculateTerrainShadow(
          e.x,
          Math.max(15, footprintHalfWidth * foregroundTreatment.shadowFootprint),
          (worldX) => groundYAt?.(worldX) ?? GAME_CONSTANTS.GROUND_SURFACE_Y,
        );
        if (shadow) drawTerrainShadow(ctx, screenX, { ...shadow, alpha: shadow.alpha * foregroundTreatment.shadowOpacity });
      }

      // 2.5D Dynamic Ground / Water Shadow for airborne enemies (Jets, Helis)
      if (e.isAlive && e.category === 'AIR' && e.type !== 'ANTI_SHIP_MISSILE' && e.y < seaY) {
        const shadowSurfaceY = groundYAt?.(e.x) ?? seaY;
        const altitude = Math.max(0, shadowSurfaceY - e.y);
        const shadow = calculateTerrainShadow(
          e.x,
          Math.max(26, e.width * 0.5 * foregroundProfile.shadowFootprint),
          (worldX) => groundYAt?.(worldX) ?? seaY,
          altitude,
        );
        if (shadow) drawTerrainShadow(ctx, screenX, { ...shadow, alpha: shadow.alpha * foregroundTreatment.shadowOpacity });
      }

      ctx.save();
      const isNaval = e.category === 'NAVAL';
      const navalBob = isNaval && e.isAlive ? Math.sin((e.stateTimer + stableHash(e.id)) * 0.045) * (e.type === 'MISSILE_CORVETTE' ? 1.8 : 2.5) : 0;
      ctx.translate(screenX, sitsOnLand ? contactY : isNaval ? (e.isAlive ? seaY + navalBob : e.y) : e.y);
      if (e.isAlive) {
        ctx.globalAlpha *= foregroundTreatment.opacity;
        ctx.filter = e.type === 'ANTI_SHIP_MISSILE'
          ? `${foregroundTreatment.filter} drop-shadow(0 0 4px rgba(255, 245, 210, 0.95)) drop-shadow(0 0 7px rgba(244, 63, 94, 0.72))`
          : foregroundTreatment.filter;
      }

      // Dead unit charred wreckage with smoke
      if (!e.isAlive) {
        ctx.globalAlpha *= getAircraftWreckOpacity(e);
        if (e.category === 'AIR' && e.type !== 'ANTI_SHIP_MISSILE' && (e.deathStage ?? 0) < 2) {
          const fallingSprite = e.type === 'ATTACK_HELI'
            ? 'enemy_heli'
            : e.aircraftVariant === 'MIG_21BIS'
              ? 'enemy_mig21'
              : e.aircraftVariant === 'MIG_29A'
                ? 'enemy_mig29'
                : e.aircraftVariant === 'TU_16K'
                  ? 'enemy_tu16k'
                  : e.aircraftVariant === 'SU_24M'
                    ? 'enemy_su24m'
                : 'enemy_jet';
          const fallingOptions = { rotation: e.rotation, flipX: e.vx < 0, opacity: 0.72 };
          if (e.aircraftVariant === 'TU_16K' || e.aircraftVariant === 'SU_24M') {
            SpriteAssetManager.drawSpriteFrameAnchored(ctx, fallingSprite, Math.max(1, e.damageStage ?? 1), 3, 0, 0, e.aircraftVariant === 'TU_16K' ? 134 : 92, e.aircraftVariant === 'TU_16K' ? 38 : 29, 0.5, 0.52, fallingOptions);
          } else {
          if (e.type === 'ATTACK_HELI') {
            SpriteAssetManager.drawSprite(ctx, fallingSprite, 0, 0, 78, 34, fallingOptions);
          } else {
            SpriteAssetManager.drawSpriteFrame(ctx, fallingSprite, 2, 3, 0, 0, 84, 25, fallingOptions);
          }
          }
        } else if (e.type === 'COMMAND_BUNKER') {
          SpriteAssetManager.drawSpriteFrameAnchored(ctx, 'act_three_objectives', 4, 5, 0, 0, 150, 64, 0.5, 1);
        } else if (e.type !== 'ANTI_SHIP_MISSILE') {
          const wreckFrame = isNaval ? 2 : e.category === 'AIR' ? 0 : 1;
          const wreckWidth = isNaval ? Math.max(130, e.width * 1.15) : Math.max(72, e.width);
          SpriteAssetManager.drawSpriteFrameAnchored(ctx, 'combat_wrecks', wreckFrame, 3, 0, 0, wreckWidth, isNaval ? 48 : 38, 0.5, isNaval ? 0.86 : 0.76, {
            rotation: isNaval ? Math.min(0.2, (e.deathStage || 0) * 0.09) : e.category === 'AIR' && e.deathStage !== 2 ? e.rotation : 0,
          });
        }
        ctx.restore();
        continue;
      }

      // --- BITMAP TEXTURE & BOUNDING BOX FALLBACK RENDERING ---

      if (spritePlacement) {
        if (isNaval && e.isAlive) {
          const direction = e.vx < 0 ? 1 : -1;
          const wakeLength = e.type === 'MISSILE_CORVETTE' ? 105 : 78;
          const wake = ctx.createLinearGradient(0, 0, direction * wakeLength, 0);
          wake.addColorStop(0, 'rgba(226, 242, 245, 0.34)');
          wake.addColorStop(1, 'rgba(226, 242, 245, 0)');
          ctx.fillStyle = wake;
          ctx.beginPath();
          ctx.moveTo(direction * spritePlacement.width * 0.34, 1);
          ctx.lineTo(direction * wakeLength, -5);
          ctx.lineTo(direction * wakeLength, 6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(236, 248, 250, 0.46)';
          ctx.beginPath();
          ctx.ellipse(-direction * spritePlacement.width * 0.44, 0, 13, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        const placementOptions = {
          rotation: terrainPlacement.rotation,
          flipX: isNaval && e.vx < 0,
          opacity: e.isTargetable || e.isFriendly ? 1 : 0.62,
        };
        const presentationWidth = spritePlacement.width * readability.scale;
        const presentationHeight = spritePlacement.height * readability.scale;
        if (spritePlacement.frameIndex !== undefined && spritePlacement.frameCount !== undefined) {
          const frameIndex = spritePlacement.key.startsWith('arctic_') || isNaval ? (e.damageStage ?? 0) : spritePlacement.frameIndex;
          SpriteAssetManager.drawSpriteFrameAnchored(ctx, spritePlacement.key, frameIndex, spritePlacement.frameCount, 0, 0, presentationWidth, presentationHeight, spritePlacement.anchorX, spritePlacement.anchorY, placementOptions);
        } else {
          SpriteAssetManager.drawSpriteAnchored(ctx, spritePlacement.key, 0, 0, presentationWidth, presentationHeight, spritePlacement.anchorX, spritePlacement.anchorY, {
            ...placementOptions,
            fallbackColor: spritePlacement.fallbackColor,
            fallbackLabel: spritePlacement.fallbackLabel,
          });
        }
        ctx.filter = 'none';
      }

      else if (e.type === 'SEARCHLIGHT') {
        const beamAngle = e.turretAngle ?? -Math.PI * 0.65;
        const beamLength = e.state === 'TRACKING' ? 760 : 520;
        const beamWidth = e.state === 'TRACKING' ? 0.075 : 0.13;
        ctx.save();
        ctx.rotate(beamAngle);
        const beam = ctx.createLinearGradient(0, 0, beamLength, 0);
        beam.addColorStop(0, 'rgba(255, 244, 190, 0.5)');
        beam.addColorStop(0.45, 'rgba(228, 238, 210, 0.16)');
        beam.addColorStop(1, 'rgba(210, 225, 232, 0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(beamLength, -beamLength * beamWidth);
        ctx.lineTo(beamLength, beamLength * beamWidth);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#26343b';
        ctx.fillRect(-5, -34, 10, 34);
        ctx.fillStyle = e.state === 'TRACKING' ? '#fff2a8' : '#d8e1c4';
        ctx.beginPath();
        ctx.arc(0, -36, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f1720';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      else if (e.type === 'PROTECTED_SETTLEMENT') {
        ctx.fillStyle = '#2a3740';
        ctx.fillRect(-76, -29, 44, 29);
        ctx.fillRect(-22, -37, 46, 37);
        ctx.fillRect(34, -25, 40, 25);
        ctx.fillStyle = '#6f3027';
        for (const x of [-80, -26, 30]) {
          ctx.beginPath();
          ctx.moveTo(x, x === -26 ? -37 : -29);
          ctx.lineTo(x + 22, x === -26 ? -53 : -43);
          ctx.lineTo(x + 48, x === -26 ? -37 : -29);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = '#ffd98a';
        for (const x of [-64, -8, 49]) ctx.fillRect(x, -19, 7, 8);
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.8)';
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(-88, -62, 176, 64);
        ctx.setLineDash([]);
        ctx.fillStyle = '#a5f3fc';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PROTECTED SETTLEMENT', 0, -68);
      }

      else if (e.type === 'PATROL_FIGHTER' || e.type === 'INTERCEPTOR' || e.type === 'HEAVY_BOMBER') {
        const jetSprite = e.aircraftVariant === 'MIG_21BIS'
          ? 'enemy_mig21'
          : e.aircraftVariant === 'MIG_29A'
            ? 'enemy_mig29'
            : e.aircraftVariant === 'TU_16K'
              ? 'enemy_tu16k'
              : e.aircraftVariant === 'SU_24M'
                ? 'enemy_su24m'
            : 'enemy_jet';
        const facingLeft = e.vx < 0;
        const velocityPitch = e.airCombat?.displayedPitch ?? Math.atan2(e.vy, Math.max(1, Math.abs(e.vx)));
        const levelRotation = Math.max(-0.42, Math.min(0.42, facingLeft ? -velocityPitch : velocityPitch));
        if (Math.abs(e.vx) > 7.1) {
          const exhaustDirection = facingLeft ? 1 : -1;
          const exhaust = ctx.createLinearGradient(exhaustDirection * 34, 0, exhaustDirection * 68, 0);
          exhaust.addColorStop(0, 'rgba(247, 185, 75, 0.62)');
          exhaust.addColorStop(0.35, 'rgba(111, 184, 235, 0.34)');
          exhaust.addColorStop(1, 'rgba(40, 88, 125, 0)');
          ctx.fillStyle = exhaust;
          ctx.beginPath();
          ctx.moveTo(exhaustDirection * 31, -2);
          ctx.lineTo(exhaustDirection * 70, 0);
          ctx.lineTo(exhaustDirection * 31, 3);
          ctx.closePath();
          ctx.fill();
        }
        const aircraftScale = getAircraftPresentationScale(e.aircraftVariant, e.type) * readability.scale;
        const jetWidth = (e.aircraftVariant === 'TU_16K' ? 134 : e.aircraftVariant === 'SU_24M' ? 92 : e.aircraftVariant === 'MIG_29A' ? 86 : 82) * aircraftScale;
        const jetHeight = (e.aircraftVariant === 'TU_16K' ? 38 : e.aircraftVariant === 'SU_24M' ? 29 : 24) * aircraftScale;
        const arcticDamageSheet = e.aircraftVariant === 'TU_16K' || e.aircraftVariant === 'SU_24M';
        const jetOptions = {
          rotation: levelRotation,
          flipX: facingLeft,
          fallbackColor: '#ef4444',
          fallbackLabel: e.aircraftVariant ?? 'MIG-23ML',
        };
        if (arcticDamageSheet) {
          SpriteAssetManager.drawSpriteFrameAnchored(ctx, jetSprite, e.damageStage ?? 0, 3, 0, 0, jetWidth, jetHeight, 0.5, 0.52, jetOptions);
        } else {
          SpriteAssetManager.drawSpriteFrame(ctx, jetSprite, e.damageStage ?? 0, 3, 0, 0, jetWidth, jetHeight, jetOptions);
        }
      }

      else if (e.type === 'ATTACK_HELI') {
        const aircraftScale = getAircraftPresentationScale(e.aircraftVariant, e.type) * readability.scale;
        SpriteAssetManager.drawSprite(ctx, 'enemy_heli', 0, 0, 96 * aircraftScale, 30 * aircraftScale, {
          flipX: e.vx < 0,
          fallbackColor: '#22c55e',
          fallbackLabel: 'GUNSHIP [MI-24]',
        });
      }

      else if (e.type === 'ANTI_SHIP_MISSILE') {
        ctx.save();
        ctx.rotate(Math.atan2(e.vy, e.vx));
        const missileScale = getProjectilePresentationScale('ENEMY_MISSILE') * readability.scale;
        ctx.scale(missileScale, missileScale);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(-15, -2.5, 25, 5);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(10, -3.5);
        ctx.lineTo(18, 0);
        ctx.lineTo(10, 3.5);
        ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(-19, -1.5, 5, 3);
        ctx.restore();
      }

      else if (e.type === 'DOWNED_PILOT') {
        SpriteAssetManager.drawSprite(ctx, 'pilot_raft', 0, 0, 40, 36, {
          fallbackColor: '#eab308',
          fallbackLabel: 'PILOT [RESCUE]',
        });
      }

      ctx.filter = 'none';
      ctx.globalAlpha = 1;

      // Objective indicators use sparse corner brackets so the painted
      // silhouette stays readable instead of being buried inside a large ring.
      const indicatorY = sitsOnLand ? -e.height * 0.5 : 0;
      if (e.type === 'DOWNED_PILOT' && e.isPrimaryObjective) {
        ctx.strokeStyle = '#67e8f9';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, indicatorY, Math.max(e.width, e.height) * 0.85, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#cffafe';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RESCUE CREW', 0, indicatorY - 26);
      } else if (!e.isTargetable && (e.isPrimaryObjective || e.isSecondaryObjective)) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-Math.max(28, e.width * 0.62), indicatorY - 18, Math.max(56, e.width * 1.24), 36);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(203, 213, 225, 0.78)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PHASE LOCK', 0, indicatorY - 23);
      } else if (e.isPrimaryObjective) {
        drawObjectiveBrackets(ctx, indicatorY, e, '#fb7185', false, readability.scale);
      } else if (e.isSecondaryObjective) {
        drawObjectiveBrackets(ctx, indicatorY, e, '#facc15', true, readability.scale);
      }

      ctx.restore();
    }
  }
}

function getEnemyForegroundSpriteKey(enemy: EnemyUnit): string {
  if (enemy.type === 'ATTACK_HELI') return 'enemy_heli';
  if (enemy.type === 'ANTI_SHIP_MISSILE') return 'enemy_missile';
  if (enemy.aircraftVariant === 'MIG_21BIS') return 'enemy_mig21';
  if (enemy.aircraftVariant === 'MIG_29A') return 'enemy_mig29';
  if (enemy.aircraftVariant === 'TU_16K') return 'enemy_tu16k';
  if (enemy.aircraftVariant === 'SU_24M') return 'enemy_su24m';
  if (enemy.category === 'AIR') return 'enemy_jet';
  if (enemy.type === 'PROTECTED_SETTLEMENT') return 'protected_settlement';
  if (enemy.type === 'SEARCHLIGHT') return 'enemy_searchlight';
  return 'foreground_contact';
}

function drawObjectiveBrackets(ctx: CanvasRenderingContext2D, centreY: number, enemy: EnemyUnit, colour: string, secondary: boolean, readabilityScale = 1): void {
  const aircraftScale = enemy.category === 'AIR' ? getAircraftPresentationScale(enemy.aircraftVariant, enemy.type) * readabilityScale : readabilityScale;
  const halfWidth = enemy.category === 'AIR' ? Math.max(42, enemy.width * 0.7 * aircraftScale) : Math.max(26, enemy.width * 0.58);
  const halfHeight = enemy.category === 'AIR' ? Math.max(18, enemy.height * 0.72 * aircraftScale) : Math.max(16, enemy.height * 0.5);
  const corner = Math.max(7, Math.min(14, halfWidth * 0.22));
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = secondary ? 1.4 : 2;
  if (secondary) ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(-halfWidth + corner, centreY - halfHeight); ctx.lineTo(-halfWidth, centreY - halfHeight); ctx.lineTo(-halfWidth, centreY - halfHeight + corner);
  ctx.moveTo(halfWidth - corner, centreY - halfHeight); ctx.lineTo(halfWidth, centreY - halfHeight); ctx.lineTo(halfWidth, centreY - halfHeight + corner);
  ctx.moveTo(-halfWidth, centreY + halfHeight - corner); ctx.lineTo(-halfWidth, centreY + halfHeight); ctx.lineTo(-halfWidth + corner, centreY + halfHeight);
  ctx.moveTo(halfWidth, centreY + halfHeight - corner); ctx.lineTo(halfWidth, centreY + halfHeight); ctx.lineTo(halfWidth - corner, centreY + halfHeight);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, centreY - halfHeight - 7); ctx.lineTo(-4, centreY - halfHeight - 13); ctx.lineTo(4, centreY - halfHeight - 13); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function deterministicNoise(key: string, tick: number): number {
  let hash = tick | 0;
  for (let index = 0; index < key.length; index++) hash = Math.imul(hash ^ key.charCodeAt(index), 0x45d9f3b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0xffffffff;
}

function projectileWeaponType(type: string): Exclude<WeaponType, 'FLARE'> {
  if (type === 'MISSILE') return 'MISSILE';
  if (type === 'BOMB') return 'BOMB';
  if (type === 'ROCKET') return 'ROCKET';
  return 'CANNON';
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

function playerSubsystemForImpact(localX: number, localY: number, projectileVx: number): keyof AircraftSubsystems {
  if (Math.abs(localY) > 7) return 'flightControls';
  if (localX < -10 || projectileVx > 0) return 'engine';
  return 'weapons';
}

function nearestAirSource(enemies: EnemyUnit[], x: number, y: number): EnemyUnit | undefined {
  return enemies.find((enemy) => enemy.isAlive && enemy.category === 'AIR' && Math.hypot(enemy.x - x, enemy.y - y) < 220);
}

import { BlastDamageEvent, Projectile, EnemyUnit } from '../types/game';
import { GAME_CONSTANTS } from './constants';
import { PlayerAircraft } from './PlayerAircraft';
import { ParticleAndEffects } from './ParticleAndEffects';
import { soundEngine } from '../audio/SoundEngine';
import { getWeaponEffectProfile, impactSurfaceAt } from './CombatEffects';
import { getProjectilePresentationScale } from './CombatReadability';
import { getForegroundTreatment } from './ForegroundPresentation';

export interface ProjectilePresentationContext {
  playerX: number;
  playerY: number;
  ambientLight: number;
  reducedEffects?: boolean;
}

export class WeaponsSystem {
  public projectiles: Projectile[] = [];
  private playerShotsFired = { CANNON: 0, MISSILE: 0, BOMB: 0, ROCKET: 0, FLARE: 0 };
  private countermeasureSuccesses = 0;
  private missileWarnings = 0;
  private warningAcknowledgements = 0;
  private damageEvents: Array<{ source: 'FLAK'; amount: number }> = [];
  private projectileSequence = 0;
  private blastEvents: BlastDamageEvent[] = [];

  public reset() {
    this.projectiles = [];
    this.playerShotsFired = { CANNON: 0, MISSILE: 0, BOMB: 0, ROCKET: 0, FLARE: 0 };
    this.countermeasureSuccesses = 0;
    this.missileWarnings = 0;
    this.warningAcknowledgements = 0;
    this.damageEvents = [];
    this.projectileSequence = 0;
    this.blastEvents = [];
  }

  public getTelemetrySnapshot() {
    return { shotsFired: { ...this.playerShotsFired }, countermeasureSuccesses: this.countermeasureSuccesses, missileWarnings: this.missileWarnings, warningAcknowledgements: this.warningAcknowledgements };
  }

  public drainDamageEvents() {
    const events = this.damageEvents;
    this.damageEvents = [];
    return events;
  }

  public drainBlastEvents(): BlastDamageEvent[] {
    const events = this.blastEvents;
    this.blastEvents = [];
    return events;
  }

  public fireCannon(player: PlayerAircraft, effects: ParticleAndEffects) {
    if (!player.canFireCannon()) return;

    player.onFiredCannon();
    this.playerShotsFired.CANNON++;
    const s = player.stats;
    const w = GAME_CONSTANTS.WEAPONS.CANNON;
    const direction = s.facing;
    const firingAngle = direction === 1 ? s.pitchAngle : Math.PI - s.pitchAngle;

    // Slight tracer spread & elevation
    const shotIndex = this.projectileSequence++;
    const spreadY = Math.sin(shotIndex * 2.399) * 0.72;
    const bulletVx = Math.cos(firingAngle) * w.SPEED + s.vx;
    const bulletVy = Math.sin(firingAngle) * w.SPEED + spreadY;

    this.projectiles.push({
      id: `p_can_${shotIndex}`,
      type: 'CANNON_ROUND',
      x: s.x + 36 * direction,
      y: s.y + 2,
      vx: bulletVx,
      vy: bulletVy,
      source: 'PLAYER',
      damage: w.DAMAGE,
      radius: w.RADIUS,
      life: w.LIFE,
      maxLife: w.LIFE,
      rotation: firingAngle,
      ageTicks: 0,
      tracer: shotIndex % 3 === 0,
    });

    effects.createWeaponLaunch(s.x + 38 * direction, s.y + 2, 'CANNON_ROUND', firingAngle);

    soundEngine.playCannon();
  }

  public fireMissile(player: PlayerAircraft, targetId: string | null, effects: ParticleAndEffects): boolean {
    const s = player.stats;
    if (s.missiles <= 0) return false;

    s.missiles--;
    this.playerShotsFired.MISSILE++;
    const w = GAME_CONSTANTS.WEAPONS.MISSILE;
    const direction = s.facing;

    this.projectiles.push({
      id: `p_msl_${this.projectileSequence++}`,
      type: 'MISSILE',
      x: s.x + 10 * direction,
      y: s.y + 8,
      vx: s.vx + 6 * direction,
      vy: 1.5,
      source: 'PLAYER',
      targetId: targetId,
      damage: w.DAMAGE,
      radius: w.RADIUS,
      life: w.LIFE,
      maxLife: w.LIFE,
      rotation: direction === 1 ? 0 : Math.PI,
      homingStrength: w.HOMING_STRENGTH * (0.5 + 0.5 * s.subsystems.targeting),
      trailTimer: 0,
      ageTicks: 0,
      motorTicks: 54,
    });

    effects.createWeaponLaunch(s.x + 10 * direction, s.y + 8, 'MISSILE', direction === 1 ? 0 : Math.PI);

    soundEngine.playMissileLaunch();
    soundEngine.playRadioCall('FOX TWO.');
    return true;
  }

  public fireBomb(player: PlayerAircraft, effects: ParticleAndEffects): boolean {
    const s = player.stats;
    if (s.bombs <= 0) return false;

    s.bombs--;
    this.playerShotsFired.BOMB++;
    const w = GAME_CONSTANTS.WEAPONS.BOMB;

    this.projectiles.push({
      id: `p_bmb_${this.projectileSequence++}`,
      type: 'BOMB',
      x: s.x,
      y: s.y + 10,
      vx: s.vx * 0.95,
      vy: w.INITIAL_VY + s.vy * 0.3,
      source: 'PLAYER',
      damage: w.DAMAGE,
      radius: w.RADIUS,
      life: w.LIFE,
      maxLife: w.LIFE,
      rotation: 0,
      ageTicks: 0,
    });

    effects.createWeaponLaunch(s.x, s.y + 10, 'BOMB', Math.PI * 0.5);
    soundEngine.playBombRelease();
    return true;
  }

  public fireRockets(player: PlayerAircraft, effects: ParticleAndEffects): boolean {
    const s = player.stats;
    if (s.rockets <= 0) return false;

    const count = Math.min(2, s.rockets);
    s.rockets -= count;
    this.playerShotsFired.ROCKET += count;
    const w = GAME_CONSTANTS.WEAPONS.ROCKET;
    const direction = s.facing;
    const headingAngle = direction === 1 ? s.pitchAngle : Math.PI - s.pitchAngle;

    for (let i = 0; i < count; i++) {
      const angle = headingAngle + (i === 0 ? -0.05 : 0.08) * direction;
      this.projectiles.push({
        id: `p_rkt_${this.projectileSequence++}_${i}`,
        type: 'ROCKET',
        x: s.x + 20 * direction,
        y: s.y + 4 + i * 6,
        vx: Math.cos(angle) * w.SPEED + s.vx * 0.5,
        vy: Math.sin(angle) * w.SPEED + s.vy * 0.5,
        source: 'PLAYER',
        damage: w.DAMAGE,
        radius: w.RADIUS,
        life: w.LIFE,
        maxLife: w.LIFE,
        rotation: angle,
        trailTimer: 0,
        ageTicks: 0,
        motorTicks: 18,
      });
      effects.createWeaponLaunch(s.x + 20 * direction, s.y + 4 + i * 6, 'ROCKET', angle);
    }

    soundEngine.playRocketLaunch();
    return true;
  }

  public deployFlares(player: PlayerAircraft, effects: ParticleAndEffects): boolean {
    const s = player.stats;
    if (s.flares <= 0) return false;

    if (this.projectiles.some((projectile) => projectile.type === 'ENEMY_MISSILE' && !projectile.detonated)) this.warningAcknowledgements++;
    s.flares--;
    this.playerShotsFired.FLARE++;
    for (let i = 0; i < 4; i++) {
      this.projectiles.push({
        id: `p_flr_${this.projectileSequence++}_${i}`,
        type: 'FLARE',
        x: s.x - 15 * s.facing,
        y: s.y + 6,
        vx: (-4.2 - i * 0.55) * s.facing + s.vx * 0.2,
        vy: (i - 1.5) * 0.75 + 1,
        source: 'PLAYER',
        damage: 0,
        radius: 20,
        life: 60,
        maxLife: 60,
        rotation: 0,
      });
    }

    soundEngine.playCountermeasure();
    return true;
  }

  public fireEnemyBullet(x: number, y: number, targetX: number, targetY: number) {
    const w = GAME_CONSTANTS.WEAPONS.ENEMY_BULLET;
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = w.SPEED;

    this.projectiles.push({
      id: `e_bul_${this.projectileSequence++}`,
      type: 'ENEMY_BULLET',
      x,
      y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      source: 'ENEMY',
      damage: w.DAMAGE,
      radius: w.RADIUS,
      life: w.LIFE,
      maxLife: w.LIFE,
      rotation: Math.atan2(dy, dx),
    });
  }

  public fireEnemyMissile(x: number, y: number, targetId: string = 'player') {
    const w = GAME_CONSTANTS.WEAPONS.ENEMY_MISSILE;
    this.projectiles.push({
      id: `e_msl_${this.projectileSequence++}`,
      type: 'ENEMY_MISSILE',
      x,
      y,
      vx: -w.SPEED * 0.8,
      vy: -4,
      source: 'ENEMY',
      targetId,
      damage: w.DAMAGE,
      radius: w.RADIUS,
      life: w.LIFE,
      maxLife: w.LIFE,
      rotation: -Math.PI * 0.5,
      homingStrength: w.HOMING_STRENGTH,
      trailTimer: 0,
      ageTicks: 0,
      motorTicks: 70,
    });
    soundEngine.playMissileWarning();
    this.missileWarnings++;
  }

  public fireEnemyFlak(x: number, y: number, targetX: number, targetY: number) {
    const w = GAME_CONSTANTS.WEAPONS.ENEMY_FLAK;
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.hypot(dx, dy) || 1;
    const flightTime = Math.min(60, Math.max(25, dist / w.SPEED));

    this.projectiles.push({
      id: `e_flk_${this.projectileSequence++}`,
      type: 'ENEMY_FLAK',
      x,
      y,
      vx: (dx / flightTime),
      vy: (dy / flightTime),
      source: 'ENEMY',
      damage: w.DAMAGE,
      radius: w.RADIUS,
      life: Math.round(flightTime),
      maxLife: Math.round(flightTime),
      rotation: Math.atan2(dy, dx),
    });
  }

  public update(
    player: PlayerAircraft,
    enemies: EnemyUnit[],
    effects: ParticleAndEffects,
    groundYAt?: (worldX: number) => number | null,
  ) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.detonated) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.life--;
      p.ageTicks = (p.ageTicks ?? 0) + 1;

      // Each weapon keeps its own readable energy signature: Sidewinders
      // accelerate through a sustained motor burn; rockets surge briefly and
      // then coast; bombs remain purely ballistic.
      if ((p.type === 'MISSILE' || p.type === 'ENEMY_MISSILE') && (p.motorTicks ?? 0) > 0) {
        const speed = Math.hypot(p.vx, p.vy) || 1;
        const targetSpeed = p.type === 'MISSILE' ? 22 : 15;
        const accelerated = Math.min(targetSpeed, speed + (p.type === 'MISSILE' ? 0.34 : 0.22));
        p.vx = (p.vx / speed) * accelerated;
        p.vy = (p.vy / speed) * accelerated;
        p.motorTicks = Math.max(0, (p.motorTicks ?? 0) - 1);
      } else if (p.type === 'ROCKET') {
        const speed = Math.hypot(p.vx, p.vy) || 1;
        if ((p.motorTicks ?? 0) > 0) {
          const accelerated = Math.min(25, speed + 0.28);
          p.vx = (p.vx / speed) * accelerated;
          p.vy = (p.vy / speed) * accelerated;
          p.motorTicks = Math.max(0, (p.motorTicks ?? 0) - 1);
        } else {
          p.vx *= 0.997;
          p.vy += 0.035;
        }
      }

      // Gravity & Drag for bombs
      if (p.type === 'BOMB') {
        p.vy += GAME_CONSTANTS.WEAPONS.BOMB.GRAVITY;
        p.vx *= GAME_CONSTANTS.WEAPONS.BOMB.DRAG;
        p.rotation = Math.atan2(p.vy, p.vx);
      }

      // Homing navigation for Player Missile
      if (p.type === 'MISSILE' && p.homingStrength) {
        let target: { x: number; y: number } | null = null;
        if (p.targetId) {
          const found = enemies.find(e => e.id === p.targetId && e.isAlive);
          if (found) target = found;
        }
        if (!target) {
          // Find nearest forward enemy
          const ahead = enemies.filter(e => e.isAlive && e.x > p.x && Math.hypot(e.x - p.x, e.y - p.y) < 650);
          if (ahead.length > 0) {
            target = ahead[0];
          }
        }

        if (target) {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const desiredAngle = Math.atan2(dy, dx);
          const currentAngle = Math.atan2(p.vy, p.vx);
          let angleDiff = desiredAngle - currentAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          const turn = Math.max(-p.homingStrength, Math.min(p.homingStrength, angleDiff));
          const newAngle = currentAngle + turn;
          const speed = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(newAngle) * speed;
          p.vy = Math.sin(newAngle) * speed;
        }
        p.rotation = Math.atan2(p.vy, p.vx);
      }

      // Homing navigation for Enemy Missile
      if (p.type === 'ENEMY_MISSILE' && p.homingStrength) {
        // Check if distracted by player flares
        const nearbyFlares = this.projectiles.filter(f => f.type === 'FLARE' && Math.hypot(f.x - p.x, f.y - p.y) < 300);
        let targetX = player.stats.x;
        let targetY = player.stats.y;

        if (nearbyFlares.length > 0) {
          targetX = nearbyFlares[0].x;
          targetY = nearbyFlares[0].y;
          if (!p.divertedByFlare) {
            p.divertedByFlare = true;
            this.countermeasureSuccesses++;
          }
        }

        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const desiredAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(p.vy, p.vx);
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const turn = Math.max(-p.homingStrength, Math.min(p.homingStrength, angleDiff));
        const newAngle = currentAngle + turn;
        const speed = Math.hypot(p.vx, p.vy) || 10;
        p.vx = Math.cos(newAngle) * speed;
        p.vy = Math.sin(newAngle) * speed;
        p.rotation = newAngle;
      }

      // Position update
      p.x += p.vx;
      p.y += p.vy;

      // Trail particles
      if (p.type === 'MISSILE' || p.type === 'ENEMY_MISSILE' || p.type === 'ROCKET') {
        p.trailTimer = (p.trailTimer || 0) + 1;
        const motorBurning = (p.motorTicks ?? 0) > 0;
        const smokeInterval = p.type === 'ROCKET' ? 3 : motorBurning ? 2 : 5;
        if (p.trailTimer % smokeInterval === 0) effects.createMissileTrail(p.x, p.y, p.vx, p.vy, p.type);
      } else if (p.type === 'FLARE') {
        effects.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: 4,
          maxSize: 12,
          color: '#fde047',
          alpha: 0.9,
          life: 14,
          maxLife: 20,
          rotation: 0,
          vRot: 0,
          type: 'FIRE',
        });
      }

      // Flak burst expiration
      if (p.type === 'ENEMY_FLAK' && p.life <= 0) {
        effects.createFlakCloud(p.x, p.y);
        soundEngine.playFlakBurst();
        // Area damage against player if within blast radius
        const distToPlayer = Math.hypot(p.x - player.stats.x, p.y - player.stats.y);
        if (distToPlayer < p.radius) {
          const healthBefore = player.stats.health;
          player.applyDamage(p.damage * (1 - distToPlayer / p.radius));
          this.damageEvents.push({ source: 'FLAK', amount: Math.max(0, healthBefore - player.stats.health) });
          effects.addScreenShake(0.25);
        }
      }

      // Authoritative terrain / water impact check.
      const sampledGround = groundYAt?.(p.x) ?? null;
      const impactY = sampledGround ?? GAME_CONSTANTS.SEA_LEVEL_Y;
      if (p.y >= impactY) {
        if (p.type !== 'FLARE' && p.type !== 'ENEMY_FLAK') {
          const profile = getWeaponEffectProfile(p.type);
          effects.createWeaponImpact(p.x, impactY, p.type, impactSurfaceAt(sampledGround, GAME_CONSTANTS.SEA_LEVEL_Y));
          if (p.type === 'BOMB' || p.type === 'MISSILE' || p.type === 'ROCKET' || p.type === 'ENEMY_MISSILE') {
            soundEngine.playExplosion(profile.intensity);
            if (p.source === 'PLAYER') this.blastEvents.push({ projectile: { ...p }, x: p.x, y: impactY, surface: impactSurfaceAt(sampledGround, GAME_CONSTANTS.SEA_LEVEL_Y) });
          }
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, groundYAt?: (worldX: number) => number | null, presentation?: ProjectilePresentationContext) {
    const seaY = GAME_CONSTANTS.SEA_LEVEL_Y;

    for (const p of this.projectiles) {
      const screenX = p.x - cameraX;
      if (screenX < -50 || screenX > ctx.canvas.width + 50) continue;

      // 2.5D Ground / Sea Shadow for Falling Bombs & Heavy Ordnance
      if (p.type === 'BOMB' && p.y < seaY) {
        const shadowSurfaceY = groundYAt?.(p.x) ?? seaY;
        const altitude = Math.max(0, shadowSurfaceY - p.y);
        const shadowScale = Math.max(0.3, 1.0 - (altitude / 500) * 0.6);
        ctx.save();
        ctx.translate(screenX + (altitude * 0.1), shadowSurfaceY - 2);
        ctx.scale(shadowScale, shadowScale * 0.3);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(screenX, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(getProjectilePresentationScale(p.type), getProjectilePresentationScale(p.type));
      const distanceFromPlayer = presentation ? Math.hypot(p.x - presentation.playerX, p.y - presentation.playerY) : 0;
      const projectileTreatment = getForegroundTreatment({
        spriteKey: 'projectile',
        ambientLight: presentation?.ambientLight ?? 0.8,
        distanceFromPlayer,
        reducedEffects: presentation?.reducedEffects,
        isThreat: p.type === 'ENEMY_MISSILE' || p.type === 'ENEMY_BULLET',
      });
      ctx.filter = projectileTreatment.filter;
      ctx.globalAlpha *= p.type === 'ENEMY_MISSILE' ? Math.max(0.97, projectileTreatment.opacity) : projectileTreatment.opacity;

      if (p.type === 'CANNON_ROUND') {
        // High-velocity bright tracer with luminescence
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        const tracerLength = p.tracer ? 34 : 19;
        ctx.fillRect(-tracerLength * 0.5, p.tracer ? -2 : -1, tracerLength, p.tracer ? 4 : 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, -1, 10, 2);
      } else if (p.type === 'MISSILE') {
        const motor = ctx.createLinearGradient(-42, 0, -13, 0);
        motor.addColorStop(0, 'rgba(56, 189, 248, 0)');
        motor.addColorStop(0.72, 'rgba(125, 211, 252, 0.46)');
        motor.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
        ctx.fillStyle = motor;
        ctx.fillRect(-42, -2.2, 29, 4.4);
        // Period AIM-9L Sidewinder with metallic fuselage and cruciform fins
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-14, -3, 28, 6);
        // Guidance fins
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(8, -7);
        ctx.lineTo(14, -3);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();
        // Rocket exhaust plume
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(-16, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'BOMB') {
        // Mk-82 500lb bomb body with 2.5D metallic gradient & tail cruciform fins
        const bombGrad = ctx.createLinearGradient(0, -6, 0, 6);
        bombGrad.addColorStop(0, '#64748b');
        bombGrad.addColorStop(1, '#334155');
        ctx.fillStyle = bombGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        // Yellow explosive warning nose band
        ctx.fillStyle = '#eab308';
        ctx.fillRect(6, -5, 4, 10);
        // Tail fins
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-16, -6, 4, 12);
      } else if (p.type === 'ROCKET') {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.52)';
        ctx.fillRect(-31, -2, 18, 4);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-10, -2.5, 20, 5);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-14, -2, 5, 4);
      } else if (p.type === 'ENEMY_BULLET') {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 8;
        ctx.fillRect(-8, -2, 16, 4);
      } else if (p.type === 'ENEMY_MISSILE') {
        const warningTrail = ctx.createLinearGradient(-45, 0, -11, 0);
        warningTrail.addColorStop(0, 'rgba(251, 113, 133, 0)');
        warningTrail.addColorStop(0.7, 'rgba(251, 113, 133, 0.58)');
        warningTrail.addColorStop(1, 'rgba(255, 245, 210, 1)');
        ctx.fillStyle = warningTrail;
        ctx.fillRect(-45, -2.5, 34, 5);
        ctx.shadowColor = '#fb7185';
        ctx.shadowBlur = 9;
        ctx.fillStyle = '#f87171';
        ctx.fillRect(-12, -3.5, 24, 7);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(8, -3.5, 4, 7);
        ctx.beginPath();
        ctx.moveTo(4, -8); ctx.lineTo(11, -3); ctx.lineTo(2, -2); ctx.closePath();
        ctx.moveTo(4, 8); ctx.lineTo(11, 3); ctx.lineTo(2, 2); ctx.closePath();
        ctx.fill();
      } else if (p.type === 'ENEMY_FLAK') {
        ctx.fillStyle = '#71717a';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'FLARE') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

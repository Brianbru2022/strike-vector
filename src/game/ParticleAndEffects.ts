import { CombatEffectKind, ImpactSurface, Particle, Explosion, Projectile, RenderQuality } from '../types/game';
import { SpriteAssetManager } from './SpriteAssetManager';
import { getWeaponEffectProfile } from './CombatEffects';
import { GAME_CONSTANTS } from './constants';

export class ParticleAndEffects {
  public particles: Particle[] = [];
  public explosions: Explosion[] = [];
  public screenShakeTrauma = 0;
  public flashAlpha = 0;
  public flashColor = '#ffffff';
  private reducedEffects = false;
  private effectSequence = 0;
  private renderQuality: RenderQuality = 'HIGH';

  public setRenderQuality(quality: RenderQuality) {
    this.renderQuality = quality;
  }

  public setReducedEffects(reduced: boolean) {
    this.reducedEffects = reduced;
    if (reduced) this.screenShakeTrauma = 0;
  }

  public reset() {
    this.particles = [];
    this.explosions = [];
    this.screenShakeTrauma = 0;
    this.flashAlpha = 0;
    this.effectSequence = 0;
  }

  public addScreenShake(amount: number) {
    if (this.reducedEffects) return;
    this.screenShakeTrauma = Math.min(1.0, this.screenShakeTrauma + amount);
  }

  public triggerFlash(color: string = '#ffffff', alpha: number = 0.45) {
    this.flashColor = color;
    this.flashAlpha = this.reducedEffects ? Math.min(0.12, alpha) : alpha;
  }

  public createExplosion(
    x: number,
    y: number,
    intensity: 'SMALL' | 'MEDIUM' | 'LARGE' | 'COLOSSAL' = 'MEDIUM',
    kind: CombatEffectKind = 'GENERIC',
    surface: ImpactSurface = 'TARGET',
  ) {
    const baseRadius = intensity === 'COLOSSAL' ? 95 : intensity === 'LARGE' ? 65 : intensity === 'MEDIUM' ? 42 : 24;
    const radiusScale = kind === 'BOMB_BLAST' ? 1.18 : kind === 'ROCKET_BLAST' ? 0.82 : kind === 'CANNON_IMPACT' ? 0.58 : 1;
    const maxRadius = baseRadius * radiusScale;
    const baseDuration = intensity === 'COLOSSAL' ? 70 : intensity === 'LARGE' ? 50 : intensity === 'MEDIUM' ? 35 : 22;
    const duration = kind === 'CANNON_IMPACT' ? Math.min(15, baseDuration) : kind === 'BOMB_BLAST' ? baseDuration + 10 : baseDuration;

    this.explosions.push({
      id: `exp_${this.effectSequence++}`,
      x,
      y,
      radius: 4,
      maxRadius,
      stage: 0,
      life: duration,
      maxLife: duration,
      intensity: intensity === 'COLOSSAL' ? 4 : intensity === 'LARGE' ? 3 : intensity === 'MEDIUM' ? 2 : 1,
      kind,
      surface,
    });

    this.addScreenShake(intensity === 'COLOSSAL' ? 0.7 : intensity === 'LARGE' ? 0.45 : intensity === 'MEDIUM' ? 0.25 : 0.1);
    if (intensity === 'LARGE' || intensity === 'COLOSSAL') {
      this.triggerFlash('#ffe4a0', intensity === 'COLOSSAL' ? 0.5 : 0.3);
    }

    // Fireball & debris particles
    const normalCount = intensity === 'COLOSSAL' ? 45 : intensity === 'LARGE' ? 28 : intensity === 'MEDIUM' ? 16 : 8;
    const particleCount = this.reducedEffects ? Math.max(4, Math.round(normalCount * 0.35)) : normalCount;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * (intensity === 'COLOSSAL' ? 8 : 5);
      const isFire = Math.random() > 0.4;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2, // slight upward draft
        size: isFire ? 8 + Math.random() * 14 : 3 + Math.random() * 5,
        maxSize: isFire ? 18 + Math.random() * 18 : 6,
        color: isFire ? (Math.random() > 0.5 ? '#ff4500' : '#ffa500') : '#333333',
        alpha: 0.95,
        life: 25 + Math.random() * 35,
        maxLife: 60,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.15,
        type: isFire ? 'FIRE' : 'DEBRIS',
        gravity: isFire ? -0.04 : 0.18,
        drag: 0.94,
      });
    }

    // High velocity sparks
    for (let i = 0; i < particleCount * 0.75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 2,
        maxSize: 3,
        color: '#fff3b0',
        alpha: 1.0,
        life: 15 + Math.random() * 20,
        maxLife: 35,
        rotation: 0,
        vRot: 0,
        type: 'SPARK',
        gravity: 0.22,
        drag: 0.97,
      });
    }

    // Rising lingering smoke columns for ground / large hits
    if (intensity === 'LARGE' || intensity === 'COLOSSAL' || intensity === 'MEDIUM') {
      for (let i = 0; i < (intensity === 'COLOSSAL' ? 12 : 6); i++) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.2 - Math.random() * 1.8,
          size: 14 + Math.random() * 12,
          maxSize: 45 + Math.random() * 30,
          color: '#1a1a1e',
          alpha: 0.75,
          life: 70 + Math.random() * 60,
          maxLife: 130,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.04,
          type: 'SMOKE',
          gravity: -0.015,
          drag: 0.985,
        });
      }
    }
  }

  public createWeaponLaunch(x: number, y: number, type: Projectile['type'], rotation: number) {
    const profile = getWeaponEffectProfile(type);
    if (profile.trail === 'NONE' && type !== 'CANNON_ROUND' && type !== 'BOMB') return;
    const backwards = rotation + Math.PI;
    const fullCount = profile.signature === 'SHARP' ? 2 : profile.signature === 'HEAVY_DROP' ? 2 : profile.signature === 'SALVO' ? 5 : 7;
    const count = this.reducedEffects ? Math.max(1, Math.ceil(fullCount * 0.55)) : fullCount;
    for (let index = 0; index < count; index++) {
      const spread = (index - count * 0.5) * 0.055;
      this.particles.push({
        x,
        y,
        vx: Math.cos(backwards + spread) * (2.2 + index * 0.22),
        vy: Math.sin(backwards + spread) * (2.2 + index * 0.22),
        size: profile.signature === 'SHARP' ? 4 : profile.signature === 'HEAVY_DROP' ? 2.5 : profile.signature === 'SALVO' ? 4.2 : 5.5,
        maxSize: profile.signature === 'SHARP' ? 12 : profile.signature === 'HEAVY_DROP' ? 8 : profile.signature === 'SALVO' ? 13 : 18,
        color: type === 'BOMB' ? '#cbd5e1' : profile.flashColor,
        alpha: type === 'BOMB' ? 0.5 : 1,
        life: type === 'CANNON_ROUND' ? 5 : type === 'BOMB' ? 12 : 9,
        maxLife: type === 'CANNON_ROUND' ? 5 : type === 'BOMB' ? 12 : 9,
        rotation,
        vRot: 0,
        type: type === 'BOMB' ? 'SMOKE' : 'FIRE',
        drag: 0.9,
      });
    }
  }

  public createWeaponImpact(x: number, y: number, type: Projectile['type'], surface: ImpactSurface = 'TARGET') {
    const profile = getWeaponEffectProfile(type);
    if (type === 'FLARE') return;
    if (type === 'ENEMY_FLAK') {
      this.createFlakCloud(x, y);
      return;
    }
    this.createExplosion(x, y, profile.intensity, profile.kind, surface);
    this.createSparks(x, y, profile.signature === 'SHARP' ? 6 : profile.signature === 'HEAVY_DROP' ? 16 : 11);

    // Each family retains one essential silhouette in reduced-effects mode.
    // These markers are short-lived particles, not collision geometry.
    if (profile.signature === 'MOTOR' || profile.signature === 'SALVO') {
      this.particles.push({
        x, y, vx: 0, vy: profile.signature === 'MOTOR' ? -1.1 : -0.65,
        size: profile.signature === 'MOTOR' ? 7 : 5,
        maxSize: profile.signature === 'MOTOR' ? 24 : 16,
        color: profile.flashColor, alpha: 0.92, life: 12, maxLife: 12,
        rotation: 0, vRot: 0, type: 'FIRE', gravity: -0.02, drag: 0.92,
      });
    }

    if (surface === 'GROUND' || surface === 'WATER') {
      const count = this.reducedEffects ? 3 : Math.max(4, Math.round(8 * profile.dustScale));
      for (let index = 0; index < count; index++) {
        const direction = Math.PI + (index / Math.max(1, count - 1)) * Math.PI;
        this.particles.push({
          x,
          y: y - 1,
          vx: Math.cos(direction) * (1.4 + (index % 3) * 0.8),
          vy: -1.5 - (index % 4) * 0.55,
          size: 4 + profile.dustScale * 3,
          maxSize: 15 + profile.dustScale * 16,
          color: surface === 'WATER' ? '#dbeafe' : '#9a8066',
          alpha: 0.72,
          life: 24 + index * 2,
          maxLife: 42,
          rotation: 0,
          vRot: 0,
          type: 'WATER_SPRAY',
          gravity: surface === 'WATER' ? 0.16 : 0.09,
          drag: 0.95,
        });
      }
    }
  }

  public createDamagePlume(x: number, y: number, severity: 1 | 2, isNaval = false) {
    this.particles.push({
      x,
      y,
      vx: isNaval ? -0.18 : 0.08,
      vy: severity === 2 ? -1.25 : -0.8,
      size: severity === 2 ? 12 : 8,
      maxSize: severity === 2 ? 42 : 28,
      color: severity === 2 ? '#18181b' : '#3f3f46',
      alpha: severity === 2 ? 0.82 : 0.58,
      life: severity === 2 ? 74 : 52,
      maxLife: severity === 2 ? 74 : 52,
      rotation: (this.effectSequence++ % 7) * 0.17,
      vRot: severity === 2 ? 0.012 : 0.006,
      type: 'SMOKE',
      gravity: -0.01,
      drag: 0.985,
    });
    if (severity === 2) {
      this.particles.push({
        x,
        y: y + 4,
        vx: 0,
        vy: -0.45,
        size: 7,
        maxSize: 17,
        color: '#fb6a22',
        alpha: 0.86,
        life: 22,
        maxLife: 22,
        rotation: 0,
        vRot: 0,
        type: 'FIRE',
        gravity: -0.03,
        drag: 0.96,
      });
    }
  }

  public createAircraftBreakup(x: number, y: number, vx: number, vy: number) {
    this.createExplosion(x, y, 'MEDIUM', 'AIRCRAFT_BREAKUP', 'AIR');
    const fragments = this.reducedEffects ? 4 : 9;
    for (let index = 0; index < fragments; index++) {
      const angle = (index / fragments) * Math.PI * 2 + 0.2;
      const speed = 1.8 + (index % 4) * 0.9;
      this.particles.push({
        x,
        y,
        vx: vx * 0.35 + Math.cos(angle) * speed,
        vy: vy * 0.35 + Math.sin(angle) * speed - 0.8,
        size: 3 + (index % 3) * 2,
        maxSize: 7 + (index % 2) * 3,
        color: index % 3 === 0 ? '#9ca3af' : '#25282c',
        alpha: 1,
        life: 48 + index * 3,
        maxLife: 75,
        rotation: angle,
        vRot: index % 2 === 0 ? 0.18 : -0.14,
        type: 'DEBRIS',
        gravity: 0.17,
        drag: 0.985,
      });
    }
  }

  public createDirectionalImpact(x: number, y: number, incomingVx: number, incomingVy: number, outcome: 'GLANCING' | 'PENETRATED' | 'CRITICAL' | 'DESTROYED') {
    const speed = Math.hypot(incomingVx, incomingVy) || 1;
    const nx = incomingVx / speed;
    const ny = incomingVy / speed;
    const count = this.reducedEffects ? 3 : outcome === 'GLANCING' ? 5 : outcome === 'PENETRATED' ? 9 : 13;
    for (let index = 0; index < count; index++) {
      const spread = (index - (count - 1) * 0.5) * 0.11;
      const angle = Math.atan2(ny, nx) + Math.PI + spread;
      const velocity = 2.8 + (index % 4) * 1.15;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 0.5,
        size: outcome === 'GLANCING' ? 1.5 : 2.2,
        maxSize: 3,
        color: outcome === 'GLANCING' ? '#f8fafc' : '#ffd36b',
        alpha: 1,
        life: 12 + index,
        maxLife: 26,
        rotation: angle,
        vRot: 0,
        type: 'SPARK',
        gravity: 0.2,
        drag: 0.96,
      });
    }
  }

  public createNavalSinking(x: number, y: number, width: number, progress: number) {
    const count = this.reducedEffects ? 2 : 5;
    for (let index = 0; index < count; index++) {
      const offset = ((index + this.effectSequence) % count) / Math.max(1, count - 1) - 0.5;
      this.particles.push({
        x: x + offset * width * 0.72,
        y: y - 4 + (index % 2) * 3,
        vx: offset * 0.45,
        vy: -0.45 - progress * 0.35,
        size: 3 + progress * 4,
        maxSize: 12 + progress * 12,
        color: index % 2 === 0 ? '#dbeafe' : '#334155',
        alpha: 0.68,
        life: 24 + index * 3,
        maxLife: 42,
        rotation: 0,
        vRot: 0,
        type: 'WATER_SPRAY',
        gravity: 0.03,
        drag: 0.96,
      });
    }
    this.effectSequence++;
  }

  public createJetExhaust(x: number, y: number, vx: number, vy: number, isVtol: boolean, isAfterburner: boolean, facing: -1 | 1 = 1) {
    if (isVtol) {
      // Downward vectoring thrust
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + 8,
          vx: (Math.random() - 0.5) * 1.2 + vx * 0.2,
          vy: 4.5 + Math.random() * 3.5,
          size: 4 + Math.random() * 4,
          maxSize: 16,
          color: Math.random() > 0.5 ? '#38bdf8' : '#f97316',
          alpha: 0.8,
          life: 14 + Math.random() * 8,
          maxLife: 22,
          rotation: 0,
          vRot: 0,
          type: 'FIRE',
          gravity: 0.05,
          drag: 0.95,
        });
      }
    } else {
      // Horizontal reheat exhaust
      this.particles.push({
        x: x - 26 * facing,
        y: y + (Math.random() - 0.5) * 4,
        vx: (-5.5 - Math.random() * 4) * facing + vx * 0.3,
        vy: (Math.random() - 0.5) * 0.8 + vy * 0.2,
        size: isAfterburner ? 7 : 4,
        maxSize: isAfterburner ? 18 : 12,
        color: isAfterburner ? '#60a5fa' : '#fb923c',
        alpha: 0.75,
        life: isAfterburner ? 12 : 8,
        maxLife: 15,
        rotation: 0,
        vRot: 0,
        type: 'FIRE',
        gravity: -0.02,
        drag: 0.93,
      });
    }
  }

  public createMissileTrail(x: number, y: number, vx: number, vy: number, type: Projectile['type'] = 'MISSILE') {
    const profile = getWeaponEffectProfile(type);
    const speed = Math.hypot(vx, vy) || 1;
    const nx = vx / speed;
    const ny = vy / speed;
    const hostile = profile.trail === 'HOSTILE';
    const rocket = profile.trail === 'ROCKET';
    this.particles.push({
      x: x - nx * (rocket ? 10 : 14),
      y: y - ny * (rocket ? 10 : 14),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.2,
      size: rocket ? 2.5 : 3.5 + Math.random() * 2,
      maxSize: rocket ? 9 : 16,
      color: hostile ? '#71717a' : rocket ? '#c4b49e' : '#e4e4e7',
      alpha: hostile ? 0.72 : rocket ? 0.48 : 0.68,
      life: rocket ? 17 : 28 + Math.random() * 14,
      maxLife: rocket ? 24 : 42,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.05,
      type: 'SMOKE',
      gravity: -0.01,
      drag: 0.97,
    });
    this.particles.push({
      x: x - nx * 10,
      y: y - ny * 10,
      vx: -nx * 1.1,
      vy: -ny * 1.1,
      size: rocket ? 3 : 4,
      maxSize: rocket ? 9 : 11,
      color: hostile ? '#ff5d4a' : rocket ? '#ff8a2b' : '#b9e5ff',
      alpha: 0.92,
      life: 5,
      maxLife: 5,
      rotation: Math.atan2(vy, vx),
      vRot: 0,
      type: 'FIRE',
      drag: 0.88,
    });
  }

  public createWaterOrDustKickup(x: number, y: number, isWater: boolean) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 35,
        y: y,
        vx: (Math.random() - 0.5) * 4.5,
        vy: -1.5 - Math.random() * 2.5,
        size: 5 + Math.random() * 6,
        maxSize: 22,
        color: isWater ? '#bae6fd' : '#d4b996',
        alpha: 0.55,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        rotation: 0,
        vRot: 0,
        type: 'WATER_SPRAY',
        gravity: 0.12,
        drag: 0.95,
      });
    }
  }

  public createFlakCloud(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8 - 0.2,
        size: 8 + Math.random() * 8,
        maxSize: 28,
        color: '#27272a',
        alpha: 0.85,
        life: 40 + Math.random() * 25,
        maxLife: 65,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.03,
        type: 'FLAK_SMOKE',
        gravity: -0.005,
        drag: 0.98,
      });
    }
  }

  public createSparks(x: number, y: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 2,
        maxSize: 2.5,
        color: '#fef08a',
        alpha: 1.0,
        life: 10 + Math.random() * 12,
        maxLife: 22,
        rotation: 0,
        vRot: 0,
        type: 'SPARK',
        gravity: 0.25,
        drag: 0.96,
      });
    }
  }

  public update() {
    // Screen shake trauma decay
    this.screenShakeTrauma = Math.max(0, this.screenShakeTrauma - 0.035);
    this.flashAlpha = Math.max(0, this.flashAlpha - 0.04);

    // Explosions update
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.life--;
      const progress = 1 - exp.life / exp.maxLife;
      exp.radius = 4 + (exp.maxRadius - 4) * Math.sin(progress * Math.PI * 0.7);

      if (progress < 0.2) {
        exp.stage = 0; // flash
      } else if (progress < 0.45) {
        exp.stage = 1; // shockwave & fireball
      } else if (progress < 0.75) {
        exp.stage = 2; // smoke & embers
      } else {
        exp.stage = 3;
      }

      if (exp.life <= 0) {
        this.explosions.splice(i, 1);
      }
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      p.x += p.vx;
      p.y += p.vy;

      if (p.drag) {
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      if (p.gravity) {
        p.vy += p.gravity;
      }

      p.rotation += p.vRot;
      const progress = 1 - p.life / p.maxLife;
      p.size = p.size + (p.maxSize - p.size) * 0.08;
      p.alpha = Math.max(0, 1 - progress);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Preserve combat readability and warning visibility during chain
    // reactions by discarding the oldest cosmetic effects first.
    const qualityParticleBudget = this.renderQuality === 'LOW' ? 260 : this.renderQuality === 'MEDIUM' ? 480 : 720;
    const qualityExplosionBudget = this.renderQuality === 'LOW' ? 12 : this.renderQuality === 'MEDIUM' ? 18 : 24;
    const particleBudget = this.reducedEffects ? Math.min(220, qualityParticleBudget) : qualityParticleBudget;
    const explosionBudget = this.reducedEffects ? Math.min(10, qualityExplosionBudget) : qualityExplosionBudget;
    if (this.particles.length > particleBudget) this.particles.splice(0, this.particles.length - particleBudget);
    if (this.explosions.length > explosionBudget) this.explosions.splice(0, this.explosions.length - explosionBudget);
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number) {
    // Render explosions
    for (const exp of this.explosions) {
      const screenX = exp.x - cameraX;
      if (screenX < -150 || screenX > GAME_CONSTANTS.VIEWPORT_WIDTH + 150) continue;

      const progress = 1 - exp.life / exp.maxLife;
      ctx.save();

      // Shockwave pressure ring. Bombs retain a broad low-frequency ring while
      // cannon strikes stay sharp and local.
      if (exp.stage <= 2 && exp.kind !== 'CANNON_IMPACT') {
        ctx.beginPath();
        ctx.arc(screenX, exp.y, exp.radius * 1.35, 0, Math.PI * 2);
        const ring = exp.kind === 'MISSILE_BLAST' ? '210, 241, 255' : exp.kind === 'ROCKET_BLAST' ? '255, 174, 86' : '241, 198, 141';
        ctx.strokeStyle = `rgba(${ring}, ${Math.max(0, (1 - progress * 1.5) * 0.55)})`;
        ctx.lineWidth = exp.kind === 'BOMB_BLAST' || exp.kind === 'SECONDARY' ? 4 : 2.5;
        ctx.stroke();
      }

      // Painted fireball and smoke stages, with procedural sparks and shockwave layered above.
      const stagedExplosion = SpriteAssetManager.getSprite('fx_explosion_stages');
      if (exp.kind === 'CANNON_IMPACT') {
        const glow = ctx.createRadialGradient(screenX, exp.y, 0, screenX, exp.y, Math.max(7, exp.radius));
        glow.addColorStop(0, 'rgba(255,255,255,0.95)');
        glow.addColorStop(0.32, 'rgba(255,220,125,0.82)');
        glow.addColorStop(1, 'rgba(255,112,24,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(screenX, exp.y, Math.max(7, exp.radius), 0, Math.PI * 2);
        ctx.fill();
      } else if (stagedExplosion) {
        const frameCount = 6;
        const frame = Math.min(frameCount - 1, Math.floor(progress * frameCount));
        const frameWidth = stagedExplosion.naturalWidth / frameCount;
        const kindScale = exp.kind === 'BOMB_BLAST' ? 1.2 : exp.kind === 'ROCKET_BLAST' ? 0.82 : exp.kind === 'AIRCRAFT_BREAKUP' ? 0.9 : 1;
        const drawSize = exp.radius * (exp.intensity >= 3 ? 3 : 2.6) * kindScale;
        ctx.filter = exp.kind === 'MISSILE_BLAST'
          ? 'saturate(0.88) brightness(1.08)'
          : exp.kind === 'ROCKET_BLAST'
            ? 'sepia(0.18) saturate(1.2)'
            : exp.kind === 'BOMB_BLAST' || exp.kind === 'SECONDARY'
              ? 'contrast(1.08) saturate(1.25)'
              : 'none';
        ctx.globalAlpha = Math.max(0.18, 1 - Math.max(0, progress - 0.78) * 4.2);
        ctx.drawImage(
          stagedExplosion,
          frame * frameWidth,
          0,
          frameWidth,
          stagedExplosion.naturalHeight,
          screenX - drawSize * 0.5,
          exp.y - drawSize * 0.54,
          drawSize,
          drawSize
        );
      } else if (exp.stage <= 1) {
        SpriteAssetManager.drawSprite(ctx, 'fx_explosion', screenX, exp.y, exp.radius * 2.5, exp.radius * 2.3, {
          opacity: Math.max(0.28, 1 - progress * 1.15),
          fallbackColor: '#f97316',
          fallbackLabel: 'BOOM',
        });
      } else {
        SpriteAssetManager.drawSprite(
          ctx,
          'fx_explosion_smoke',
          screenX,
          exp.y - exp.radius * 0.42,
          exp.radius * 1.65,
          exp.radius * 2.5,
          {
            opacity: Math.max(0, 1 - progress),
            fallbackColor: '#292524',
            fallbackLabel: 'SMOKE',
          }
        );
      }
      ctx.restore();
    }

    // Render particles
    for (const p of this.particles) {
      const screenX = p.x - cameraX;
      if (screenX < -60 || screenX > GAME_CONSTANTS.VIEWPORT_WIDTH + 60) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'FIRE') {
        SpriteAssetManager.drawSprite(ctx, 'fx_explosion', screenX, p.y, p.size * 2.3, p.size * 2.1, {
          rotation: p.rotation,
          opacity: 0.5,
          fallbackColor: p.color,
        });
      } else if (p.type === 'SMOKE' || p.type === 'FLAK_SMOKE') {
        SpriteAssetManager.drawSprite(
          ctx,
          'fx_explosion_smoke',
          screenX,
          p.y - p.size * 0.35,
          p.size * 1.45,
          p.size * 2.2,
          {
            rotation: p.rotation * 0.2,
            opacity: 0.38,
            fallbackColor: p.color,
          }
        );
      } else if (p.type === 'SPARK') {
        ctx.fillStyle = p.color;
        ctx.fillRect(screenX - p.size * 0.5, p.y - p.size * 0.5, p.size * 1.5, p.size * 1.5);
      } else if (p.type === 'DEBRIS') {
        ctx.translate(screenX, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size * 1.6);
      } else if (p.type === 'WATER_SPRAY') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(screenX, p.y - p.size * 0.35, Math.max(1, p.size * 0.38), p.size, p.rotation, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

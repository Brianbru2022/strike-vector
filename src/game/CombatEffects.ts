import { CombatEffectKind, DamageAspect, DamageSubsystem, EnemyType, EnemyUnit, HitOutcome, ImpactSurface, Projectile } from '../types/game';

export interface WeaponEffectProfile {
  kind: CombatEffectKind;
  intensity: 'SMALL' | 'MEDIUM' | 'LARGE' | 'COLOSSAL';
  trail: 'NONE' | 'SIDEWINDER' | 'ROCKET' | 'HOSTILE';
  flashColor: string;
  dustScale: number;
  signature: 'SHARP' | 'MOTOR' | 'SALVO' | 'HEAVY_DROP' | 'DECOY' | 'FLAK';
  impactRingColor: string;
}

export interface DamageResolution {
  aspect: DamageAspect;
  subsystem: DamageSubsystem;
  multiplier: number;
  damage: number;
  outcome: HitOutcome;
}

const WEAPON_EFFECTS: Record<Projectile['type'], WeaponEffectProfile> = {
  CANNON_ROUND: { kind: 'CANNON_IMPACT', intensity: 'SMALL', trail: 'NONE', flashColor: '#fff3b0', dustScale: 0.35, signature: 'SHARP', impactRingColor: '#fff0bd' },
  MISSILE: { kind: 'MISSILE_BLAST', intensity: 'MEDIUM', trail: 'SIDEWINDER', flashColor: '#dff5ff', dustScale: 0.75, signature: 'MOTOR', impactRingColor: '#d9f3ff' },
  BOMB: { kind: 'BOMB_BLAST', intensity: 'LARGE', trail: 'NONE', flashColor: '#ffe0a3', dustScale: 1.4, signature: 'HEAVY_DROP', impactRingColor: '#f1c68d' },
  ROCKET: { kind: 'ROCKET_BLAST', intensity: 'MEDIUM', trail: 'ROCKET', flashColor: '#ff9d43', dustScale: 0.9, signature: 'SALVO', impactRingColor: '#ffb35f' },
  ENEMY_BULLET: { kind: 'CANNON_IMPACT', intensity: 'SMALL', trail: 'NONE', flashColor: '#ffb4a8', dustScale: 0.35, signature: 'SHARP', impactRingColor: '#ffb4a8' },
  ENEMY_MISSILE: { kind: 'MISSILE_BLAST', intensity: 'MEDIUM', trail: 'HOSTILE', flashColor: '#ff7468', dustScale: 0.75, signature: 'MOTOR', impactRingColor: '#ff7468' },
  ENEMY_FLAK: { kind: 'GENERIC', intensity: 'SMALL', trail: 'NONE', flashColor: '#d4d4d8', dustScale: 0, signature: 'FLAK', impactRingColor: '#a1a1aa' },
  FLARE: { kind: 'GENERIC', intensity: 'SMALL', trail: 'NONE', flashColor: '#fde047', dustScale: 0, signature: 'DECOY', impactRingColor: '#fde047' },
};

const LARGE_TARGETS = new Set<EnemyType>([
  'RADAR_STATION',
  'FUEL_DEPOT',
  'BRIDGE_SEGMENT',
  'COMMAND_BUNKER',
  'PATROL_BOAT',
  'MISSILE_CORVETTE',
  'CIVILIAN_CARGO_SHIP',
  'CIVILIAN_HARBOUR_BUILDING',
]);

export function getWeaponEffectProfile(type: Projectile['type']): WeaponEffectProfile {
  return WEAPON_EFFECTS[type];
}

export function damageAspectFor(enemy: Pick<EnemyUnit, 'category' | 'vx'>, projectile: Pick<Projectile, 'vx' | 'vy'>): DamageAspect {
  if (Math.abs(projectile.vy) > Math.abs(projectile.vx) * 0.72) return projectile.vy >= 0 ? 'TOP' : 'UNDERSIDE';
  const facing = enemy.vx < 0 ? -1 : 1;
  return Math.sign(projectile.vx || facing) === facing ? 'REAR' : 'FRONT';
}

export function resolveDirectionalDamage(
  enemy: Pick<EnemyUnit, 'category' | 'vx' | 'health' | 'maxHealth'>,
  projectile: Pick<Projectile, 'vx' | 'vy' | 'damage' | 'type'>,
): DamageResolution {
  const aspect = damageAspectFor(enemy, projectile);
  const multiplier = enemy.category === 'AIR'
    ? aspect === 'REAR' ? 1.2 : aspect === 'TOP' || aspect === 'UNDERSIDE' ? 1.08 : 0.9
    : enemy.category === 'NAVAL'
      ? aspect === 'TOP' ? 1.28 : aspect === 'REAR' ? 1.14 : aspect === 'FRONT' ? 0.78 : 1
      : enemy.category === 'GROUND'
        ? aspect === 'TOP' ? 1.35 : aspect === 'REAR' ? 1.24 : aspect === 'FRONT' ? 0.74 : 1
        : aspect === 'TOP' ? 1.12 : 1;
  const weaponFactor = projectile.type === 'CANNON_ROUND' && enemy.category !== 'AIR' ? 0.88 : 1;
  const damage = projectile.damage * multiplier * weaponFactor;
  const remaining = enemy.health - damage;
  const ratio = enemy.maxHealth <= 0 ? 0 : remaining / enemy.maxHealth;
  const outcome: HitOutcome = remaining <= 0 ? 'DESTROYED' : ratio <= 0.34 ? 'CRITICAL' : multiplier >= 1 || damage / Math.max(1, enemy.maxHealth) >= 0.16 ? 'PENETRATED' : 'GLANCING';
  const subsystem: DamageSubsystem = enemy.category === 'AIR'
    ? aspect === 'REAR' ? 'ENGINE' : aspect === 'TOP' || aspect === 'UNDERSIDE' ? 'FLIGHT_CONTROLS' : 'WEAPONS'
    : enemy.category === 'NAVAL'
      ? aspect === 'REAR' ? 'PROPULSION' : aspect === 'TOP' ? 'WEAPONS' : 'COMMAND'
      : aspect === 'REAR' ? 'ENGINE' : aspect === 'TOP' ? 'TURRET' : 'TRACKS';
  return { aspect, subsystem, multiplier, damage, outcome };
}

export function blastRadiusFor(type: Projectile['type']): number {
  if (type === 'BOMB') return 82;
  if (type === 'MISSILE' || type === 'ENEMY_MISSILE') return 48;
  if (type === 'ROCKET') return 34;
  return 0;
}

export function impactSurfaceAt(groundY: number | null, seaY: number): ImpactSurface {
  return groundY === null || Math.abs(groundY - seaY) < 1 ? 'WATER' : 'GROUND';
}

export function supportsStagedDamage(enemy: Pick<EnemyUnit, 'type' | 'category' | 'maxHealth'>): boolean {
  return LARGE_TARGETS.has(enemy.type) || enemy.category === 'NAVAL' || enemy.maxHealth >= 260;
}

export function damageStageFor(enemy: Pick<EnemyUnit, 'health' | 'maxHealth' | 'type' | 'category'>): 0 | 1 | 2 {
  if (!supportsStagedDamage(enemy)) return 0;
  const ratio = enemy.maxHealth <= 0 ? 0 : enemy.health / enemy.maxHealth;
  if (ratio <= 0.34) return 2;
  if (ratio <= 0.68) return 1;
  return 0;
}

export function damageEmitterOffset(enemy: Pick<EnemyUnit, 'type' | 'category' | 'width' | 'height' | 'damagedSubsystem'>, tick: number): { x: number; y: number } {
  const side = Math.floor(tick / 30) % 2 === 0 ? -1 : 1;
  if (enemy.category === 'AIR') {
    if (enemy.damagedSubsystem === 'ENGINE') return { x: -enemy.width * 0.34, y: 2 };
    if (enemy.damagedSubsystem === 'FLIGHT_CONTROLS') return { x: side * enemy.width * 0.18, y: -enemy.height * 0.28 };
    return { x: enemy.width * 0.18, y: 0 };
  }
  if (enemy.category === 'NAVAL') return { x: side * enemy.width * 0.24, y: -enemy.height * 0.48 };
  if (enemy.type === 'RADAR_STATION') return { x: 0, y: -enemy.height * 0.62 };
  if (enemy.type === 'FUEL_DEPOT') return { x: side * enemy.width * 0.2, y: -enemy.height * 0.42 };
  if (enemy.type === 'BRIDGE_SEGMENT') return { x: side * enemy.width * 0.3, y: -enemy.height * 0.2 };
  return { x: side * enemy.width * 0.16, y: -enemy.height * 0.38 };
}

export function secondaryDetonationInterval(enemy: Pick<EnemyUnit, 'type' | 'category'>): number | null {
  if (enemy.type === 'FUEL_DEPOT') return 12;
  if (enemy.type === 'COMMAND_BUNKER') return 34;
  if (enemy.category === 'NAVAL') return 48;
  if (enemy.type === 'TANK' || enemy.type === 'COMMAND_VEHICLE') return 78;
  if (enemy.type === 'APC') return 96;
  return null;
}

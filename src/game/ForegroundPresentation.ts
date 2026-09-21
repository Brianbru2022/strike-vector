/**
 * Presentation authority for foreground gameplay art. These values may alter
 * visual scale, filtering and shadows, but never collision or terrain contact.
 */
export type ForegroundRole = 'PLAYER_AIRCRAFT' | 'ENEMY_AIRCRAFT' | 'GROUND_UNIT' | 'NAVAL_UNIT' | 'STRUCTURE' | 'RECOVERY_SITE' | 'PROJECTILE';

export interface ForegroundPresentationProfile {
  role: ForegroundRole;
  silhouetteScale: number;
  shadowFootprint: number;
  contactAnchorY: number;
  supportsDamageFrames: boolean;
}

export interface ForegroundTreatmentInput {
  spriteKey: string;
  ambientLight: number;
  separationFilter?: string;
  damageStage?: number;
  reducedEffects?: boolean;
}

const DEFAULT_PROFILE: Readonly<ForegroundPresentationProfile> = Object.freeze({
  role: 'STRUCTURE', silhouetteScale: 1, shadowFootprint: 0.82, contactAnchorY: 1, supportsDamageFrames: false,
});

export const FOREGROUND_PRESENTATION_PROFILES: Readonly<Record<string, Readonly<ForegroundPresentationProfile>>> = Object.freeze({
  player_jet: Object.freeze({ role: 'PLAYER_AIRCRAFT', silhouetteScale: 1.16, shadowFootprint: 0.82, contactAnchorY: 0.78, supportsDamageFrames: true }),
  player_turn: Object.freeze({ role: 'PLAYER_AIRCRAFT', silhouetteScale: 1.16, shadowFootprint: 0.82, contactAnchorY: 0.5, supportsDamageFrames: false }),
  enemy_jet: Object.freeze({ role: 'ENEMY_AIRCRAFT', silhouetteScale: 1.2, shadowFootprint: 0.78, contactAnchorY: 0.52, supportsDamageFrames: true }),
  enemy_mig21: Object.freeze({ role: 'ENEMY_AIRCRAFT', silhouetteScale: 1.2, shadowFootprint: 0.72, contactAnchorY: 0.5, supportsDamageFrames: true }),
  enemy_mig29: Object.freeze({ role: 'ENEMY_AIRCRAFT', silhouetteScale: 1.18, shadowFootprint: 0.76, contactAnchorY: 0.5, supportsDamageFrames: true }),
  enemy_heli: Object.freeze({ role: 'ENEMY_AIRCRAFT', silhouetteScale: 1.16, shadowFootprint: 0.82, contactAnchorY: 0.58, supportsDamageFrames: false }),
  enemy_tu16k: Object.freeze({ role: 'ENEMY_AIRCRAFT', silhouetteScale: 1.12, shadowFootprint: 0.84, contactAnchorY: 0.52, supportsDamageFrames: true }),
  enemy_su24m: Object.freeze({ role: 'ENEMY_AIRCRAFT', silhouetteScale: 1.16, shadowFootprint: 0.8, contactAnchorY: 0.52, supportsDamageFrames: true }),
  enemy_sam: Object.freeze({ role: 'GROUND_UNIT', silhouetteScale: 1, shadowFootprint: 0.88, contactAnchorY: 1, supportsDamageFrames: false }),
  enemy_flak: Object.freeze({ role: 'GROUND_UNIT', silhouetteScale: 1, shadowFootprint: 0.86, contactAnchorY: 1, supportsDamageFrames: false }),
  enemy_tank: Object.freeze({ role: 'GROUND_UNIT', silhouetteScale: 1, shadowFootprint: 0.9, contactAnchorY: 1, supportsDamageFrames: false }),
  enemy_radar: Object.freeze({ role: 'GROUND_UNIT', silhouetteScale: 1, shadowFootprint: 0.86, contactAnchorY: 1, supportsDamageFrames: false }),
  enemy_oil: Object.freeze({ role: 'STRUCTURE', silhouetteScale: 1, shadowFootprint: 0.9, contactAnchorY: 1, supportsDamageFrames: false }),
  friendly_supplies: Object.freeze({ role: 'STRUCTURE', silhouetteScale: 1, shadowFootprint: 0.9, contactAnchorY: 1, supportsDamageFrames: false }),
  act_three_objectives: Object.freeze({ role: 'STRUCTURE', silhouetteScale: 1, shadowFootprint: 0.92, contactAnchorY: 1, supportsDamageFrames: true }),
  arctic_coastal_artillery: Object.freeze({ role: 'GROUND_UNIT', silhouetteScale: 1, shadowFootprint: 0.88, contactAnchorY: 0.92, supportsDamageFrames: true }),
  arctic_submarine_pen: Object.freeze({ role: 'STRUCTURE', silhouetteScale: 1, shadowFootprint: 0.96, contactAnchorY: 0.94, supportsDamageFrames: true }),
  carrier_ship: Object.freeze({ role: 'RECOVERY_SITE', silhouetteScale: 1, shadowFootprint: 0.96, contactAnchorY: 0.93, supportsDamageFrames: true }),
  forward_base: Object.freeze({ role: 'RECOVERY_SITE', silhouetteScale: 1, shadowFootprint: 0.94, contactAnchorY: 0.91, supportsDamageFrames: false }),
  enemy_ship: Object.freeze({ role: 'NAVAL_UNIT', silhouetteScale: 1, shadowFootprint: 0.92, contactAnchorY: 0.74, supportsDamageFrames: false }),
  enemy_patrol_boat: Object.freeze({ role: 'NAVAL_UNIT', silhouetteScale: 1, shadowFootprint: 0.9, contactAnchorY: 0.92, supportsDamageFrames: true }),
  enemy_corvette: Object.freeze({ role: 'NAVAL_UNIT', silhouetteScale: 1, shadowFootprint: 0.92, contactAnchorY: 0.92, supportsDamageFrames: true }),
  arctic_landing_craft: Object.freeze({ role: 'NAVAL_UNIT', silhouetteScale: 1, shadowFootprint: 0.92, contactAnchorY: 0.8, supportsDamageFrames: true }),
});

export function getForegroundPresentationProfile(spriteKey: string): Readonly<ForegroundPresentationProfile> {
  return FOREGROUND_PRESENTATION_PROFILES[spriteKey] ?? DEFAULT_PROFILE;
}

/**
 * Matches a foreground sprite to the scene without allowing it to disappear.
 * A dark contact shadow supplies physical separation; the existing target rim
 * remains the final, higher-priority layer when present.
 */
export function getForegroundTreatment(input: ForegroundTreatmentInput): { filter: string; shadowFootprint: number } {
  const profile = getForegroundPresentationProfile(input.spriteKey);
  const ambient = clamp(input.ambientLight, 0.2, 1);
  const damage = clamp(input.damageStage ?? 0, 0, 2);
  const brightness = clamp(0.82 + ambient * 0.18 - damage * 0.035, 0.74, 1);
  const saturation = clamp(0.84 + ambient * 0.12 - damage * 0.08, 0.68, 0.98);
  const contrast = profile.role === 'GROUND_UNIT' || profile.role === 'STRUCTURE' ? 1.08 : 1.05;
  const localShadow = input.reducedEffects
    ? 'drop-shadow(0 1px 1px rgba(1, 5, 9, 0.72))'
    : 'drop-shadow(0 2px 2px rgba(1, 5, 9, 0.82))';
  const separation = input.separationFilter && input.separationFilter !== 'none' ? ` ${input.separationFilter}` : '';
  return {
    filter: `brightness(${brightness.toFixed(3)}) saturate(${saturation.toFixed(3)}) contrast(${contrast.toFixed(3)}) ${localShadow}${separation}`,
    shadowFootprint: profile.shadowFootprint,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

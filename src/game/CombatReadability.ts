import { AircraftVariant, EnemyUnit, Projectile } from '../types/game';
import { GAME_CONSTANTS } from './constants';

export const PLAYER_AIRCRAFT_PRESENTATION_SCALE = 1.16;

const AIRCRAFT_PRESENTATION_SCALE: Partial<Record<AircraftVariant, number>> = Object.freeze({
  MIG_21BIS: 1.2, MIG_23ML: 1.2, MIG_29A: 1.18, MI_24D: 1.16, TU_16K: 1.12, SU_24M: 1.16,
});

const PROJECTILE_PRESENTATION_SCALE: Partial<Record<Projectile['type'], number>> = Object.freeze({
  MISSILE: 1.24, ROCKET: 1.2, ENEMY_MISSILE: 1.34, ENEMY_BULLET: 1.12, FLARE: 1.12,
});

export interface CombatFocusContact { x: number; y: number; priority: number }
export interface CombatZoomFrame { factor: number; focusX: number; focusY: number; contactCount: number }
export interface TargetReadabilityInput {
  category: EnemyUnit['category'];
  isTargetable: boolean;
  isPrimaryObjective?: boolean;
  isSecondaryObjective?: boolean;
  isSelected: boolean;
  ambientLight: number;
  gameplayCalm?: number;
}
export interface TargetReadabilityPresentation {
  scale: number;
  rimColour: string;
  rimBlur: number;
  separationFilter: string;
}

export function getAircraftPresentationScale(variant: AircraftVariant | undefined, type?: EnemyUnit['type']): number {
  if (type === 'ATTACK_HELI') return AIRCRAFT_PRESENTATION_SCALE.MI_24D ?? 1.16;
  return variant ? AIRCRAFT_PRESENTATION_SCALE[variant] ?? 1.18 : 1.18;
}

export function getProjectilePresentationScale(type: Projectile['type']): number {
  return PROJECTILE_PRESENTATION_SCALE[type] ?? 1;
}

/**
 * Presentation-only target treatment. Scale is deliberately returned to the
 * renderer instead of being written to EnemyUnit width/height, so targeting,
 * collision, blast damage and terrain contact retain authoritative geometry.
 */
export function getTargetReadabilityPresentation(input: TargetReadabilityInput): TargetReadabilityPresentation {
  if (!input.isTargetable) return { scale: 1, rimColour: 'rgba(0, 0, 0, 0)', rimBlur: 0, separationFilter: 'none' };

  const darkness = clamp(1 - input.ambientLight, 0, 0.75);
  const backgroundActivity = clamp(1 - (input.gameplayCalm ?? 0.55), 0, 1);
  const scale = input.isSelected
    ? input.category === 'AIR' ? 1.13 : input.category === 'NAVAL' ? 1.1 : 1.12
    : input.isPrimaryObjective
      ? input.category === 'AIR' ? 1.08 : 1.07
      : input.isSecondaryObjective ? 1.045 : 1.025;
  const rimBlur = Math.round((input.isSelected ? 6 : input.isPrimaryObjective ? 4 : 2) + darkness * 3 + backgroundActivity * 2);
  const rimColour = input.isSelected
    ? `rgba(165, 243, 252, ${Math.min(0.96, 0.76 + darkness * 0.22)})`
    : input.isPrimaryObjective
      ? `rgba(255, 218, 170, ${Math.min(0.88, 0.54 + darkness * 0.3)})`
      : input.isSecondaryObjective
        ? `rgba(253, 224, 71, ${Math.min(0.8, 0.42 + darkness * 0.28)})`
        : `rgba(226, 232, 240, ${Math.min(0.62, 0.3 + darkness * 0.24)})`;
  const separationAlpha = Math.min(0.96, 0.72 + darkness * 0.2 + backgroundActivity * 0.12);
  return {
    scale,
    rimColour,
    rimBlur,
    separationFilter: `drop-shadow(0 2px 2px rgba(1, 5, 9, ${separationAlpha})) drop-shadow(0 0 ${rimBlur}px ${rimColour})`,
  };
}

export function calculateSmartCombatZoom(input: {
  enabled: boolean;
  reducedEffects: boolean;
  playerX: number;
  playerY: number;
  cameraX: number;
  contacts: readonly CombatFocusContact[];
}): CombatZoomFrame {
  const playerScreenX = input.playerX - input.cameraX;
  if (!input.enabled || input.reducedEffects || !input.contacts.length) {
    return { factor: 1, focusX: clamp(playerScreenX, 220, GAME_CONSTANTS.VIEWPORT_WIDTH - 220), focusY: clamp(input.playerY, 120, 600), contactCount: 0 };
  }
  const viable = input.contacts
    .map((contact) => ({ contact, distance: Math.hypot(contact.x - input.playerX, contact.y - input.playerY) }))
    .filter(({ distance }) => distance <= 1050)
    .sort((left, right) => (right.contact.priority - left.contact.priority) || (left.distance - right.distance));
  const selected = viable[0];
  if (!selected) return { factor: 1, focusX: clamp(playerScreenX, 220, 1060), focusY: clamp(input.playerY, 120, 600), contactCount: 0 };
  const contactScreenX = selected.contact.x - input.cameraX;
  const factor = selected.distance < 180 ? 1.06 : selected.distance < 520 ? 1.1 : 1.12;
  return {
    factor,
    focusX: clamp((playerScreenX + contactScreenX) * 0.5, 260, GAME_CONSTANTS.VIEWPORT_WIDTH - 260),
    focusY: clamp((input.playerY + selected.contact.y) * 0.5, 135, 585),
    contactCount: viable.length,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

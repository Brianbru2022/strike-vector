export type HudNotificationTone = 'TRAINING' | 'DANGER' | 'WARNING' | 'INFO' | 'OBJECTIVE';

export interface HudNotification {
  id: string;
  priority: number;
  tone: HudNotificationTone;
  label: string;
  message: string;
  action?: string;
}

export const HUD_NOTIFICATION_PRIORITY = Object.freeze({
  MISSILE: 110,
  DAMAGE: 100,
  FIGHTER_FIRING: 90,
  FIGHTER_TRACKING: 80,
  TRAINING: 70,
  RECOVERY_UNSAFE: 60,
  RECOVERY_STABLE: 50,
  RADIO: 40,
  COMBAT_RESULT: 30,
});

export function selectHudNotification(candidates: Array<HudNotification | null | undefined>): HudNotification | null {
  const unique = new Map<string, HudNotification>();
  candidates
    .filter((candidate): candidate is HudNotification => Boolean(candidate?.message.trim()))
    .forEach((candidate) => {
      const existing = unique.get(candidate.id);
      if (!existing || candidate.priority > existing.priority) unique.set(candidate.id, candidate);
    });
  return [...unique.values()]
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))[0] ?? null;
}

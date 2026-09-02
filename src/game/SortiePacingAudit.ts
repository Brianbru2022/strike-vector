import { MissionDefinition } from '../types/game';

export interface SortiePacingEntry {
  missionId: string;
  mapLength: number;
  phaseCount: number;
  largestContactGap: number;
  returnDistance: number;
  longSortie: boolean;
  deadTravelRisk: boolean;
  lateFailureRisk: boolean;
  phaseRebriefAvailable: boolean;
}

export function auditSortiePacing(mission: MissionDefinition): SortiePacingEntry {
  const initial = mission.spawnEnemies().map((enemy) => enemy.x);
  const scripted = (mission.events ?? []).flatMap((event) => event.actions.flatMap((action) => action.type === 'SPAWN' ? action.enemies.map((enemy) => enemy.x) : []));
  const routeBeats = (mission.events ?? []).flatMap((event) => {
    if (event.trigger.type !== 'PLAYER_X') return [];
    return event.actions.some((action) => action.type === 'RADIO' || action.type === 'SET_PHASE') ? [event.trigger.worldX] : [];
  });
  const contacts = [...new Set([mission.carrierX, ...initial, ...scripted, ...routeBeats, mission.carrierLandingX])].sort((a, b) => a - b);
  const largestContactGap = contacts.length > 1 ? Math.max(...contacts.slice(1).map((position, index) => position - contacts[index])) : mission.mapLength;
  const furthestContact = Math.max(mission.carrierX, ...initial, ...scripted);
  const returnDistance = Math.abs(furthestContact - mission.carrierLandingX);
  const phaseCount = mission.phases?.length ?? 1;
  const longSortie = mission.mapLength >= 14000 || phaseCount >= 4;
  return {
    missionId: mission.id,
    mapLength: mission.mapLength,
    phaseCount,
    largestContactGap,
    returnDistance,
    longSortie,
    deadTravelRisk: longSortie && largestContactGap > 4500,
    lateFailureRisk: longSortie && returnDistance > 7000,
    phaseRebriefAvailable: phaseCount > 1,
  };
}

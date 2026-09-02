import { MissionRuntime, MissionTemplate } from '../types/game';

/** Creates a clean, mutable sortie from an immutable campaign template. */
export function instantiateMission(template: MissionTemplate): MissionRuntime {
  return {
    ...template,
    weather: { ...template.weather },
    timeOfDay: { ...template.timeOfDay },
    tacticalNotes: [...template.tacticalNotes],
    objectives: template.objectives.map((objective) => ({
      ...objective,
      completed: false,
      currentCount: 0,
    })),
    phases: template.phases?.map((phase) => ({ ...phase })),
    events: template.events?.map((event) => ({
      ...event,
      trigger: event.trigger.type === 'OBJECTIVES_COMPLETE'
        ? { ...event.trigger, objectiveIds: [...event.trigger.objectiveIds] }
        : event.trigger.type === 'ENEMY_CROSSED_X'
          ? { ...event.trigger, enemyIds: [...event.trigger.enemyIds] }
          : { ...event.trigger },
      actions: event.actions.map((action) => action.type === 'SPAWN'
        ? { ...action, enemies: action.enemies.map((enemy) => ({ ...enemy })) }
        : action.type === 'ACTIVATE_TARGETS'
          ? { ...action, enemyIds: [...action.enemyIds] }
          : { ...action }),
    })),
    alertProfile: template.alertProfile ? { ...template.alertProfile } : undefined,
    terrainContact: template.terrainContact ? { ...template.terrainContact } : undefined,
    spawnEnemies: () => template.spawnEnemies().map((enemy) => ({ ...enemy })),
  };
}

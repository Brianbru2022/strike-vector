import {
  DefendedAssetState,
  EnemyUnit,
  MissionAction,
  MissionDefinition,
  MissionDirectorState,
  MissionEvent,
  MissionObjective,
  PlayerStats,
} from '../types/game';

export interface MissionDirectorContext {
  player: PlayerStats;
  objectives: MissionObjective[];
  enemies: EnemyUnit[];
  defendedAsset: DefendedAssetState | null;
}

export class MissionDirector {
  public state: MissionDirectorState;
  private readonly events: MissionEvent[];
  private readonly phaseLabels = new Map<string, string>();
  private readonly fired = new Set<string>();

  constructor(private readonly mission: MissionDefinition) {
    this.events = mission.events || [];
    for (const phase of mission.phases || []) this.phaseLabels.set(phase.id, phase.label);
    const initialPhase = mission.phases?.[0];
    this.state = {
      elapsedTicks: 0,
      phaseId: initialPhase?.id || 'ACTIVE',
      phaseLabel: initialPhase?.label || 'MISSION ACTIVE',
      firedEventIds: [],
      alertLevel: 0,
      nextWaveTicks: this.findNextWaveTicks(0),
      failureMessage: null,
    };
  }

  public update(context: MissionDirectorContext): MissionAction[] {
    this.state.elapsedTicks++;
    this.updateAlert(context);
    const actions: MissionAction[] = [];
    for (const event of this.events) {
      if (this.fired.has(event.id) || !this.isTriggered(event, context)) continue;
      this.fired.add(event.id);
      actions.push(...event.actions);
    }
    this.state.firedEventIds = [...this.fired];
    this.state.nextWaveTicks = this.findNextWaveTicks(this.state.elapsedTicks);
    return actions;
  }

  public applyAction(action: MissionAction): void {
    if (action.type === 'SET_PHASE') {
      this.state.phaseId = action.phaseId;
      this.state.phaseLabel = this.phaseLabels.get(action.phaseId) || action.phaseId;
    } else if (action.type === 'SET_ALERT') {
      this.state.alertLevel = Math.max(0, Math.min(100, action.level));
    } else if (action.type === 'FAIL_MISSION') {
      this.state.failureMessage = action.message;
    }
  }

  private updateAlert(context: MissionDirectorContext): void {
    const profile = this.mission.alertProfile;
    if (!profile || this.state.alertLevel >= 100) return;
    const radarAlive = context.enemies.some((enemy) => enemy.type === profile.radarType && enemy.isAlive);
    let gain = profile.baseGainPerTick;
    if (context.player.x >= profile.exposureStartX && context.player.altitudeBand !== 'LOW') gain += profile.exposedGainPerTick;
    if (context.player.x >= profile.proximityX) gain += profile.proximityGainPerTick;
    if (!radarAlive) gain *= profile.radarDestroyedMultiplier;
    this.state.alertLevel = Math.min(100, this.state.alertLevel + gain);
  }

  private isTriggered(event: MissionEvent, context: MissionDirectorContext): boolean {
    const trigger = event.trigger;
    if (trigger.type === 'ELAPSED_TICKS') return this.state.elapsedTicks >= trigger.ticks;
    if (trigger.type === 'PLAYER_X') return context.player.x >= trigger.worldX;
    if (trigger.type === 'OBJECTIVE_COMPLETE') return Boolean(context.objectives.find((objective) => objective.id === trigger.objectiveId)?.completed);
    if (trigger.type === 'OBJECTIVES_COMPLETE') return trigger.objectiveIds.every((objectiveId) => context.objectives.find((objective) => objective.id === objectiveId)?.completed);
    if (trigger.type === 'ALERT_AT_LEAST') return this.state.alertLevel >= trigger.level;
    if (trigger.type === 'DEFENDED_ASSET_AT_MOST') return Boolean(context.defendedAsset && context.defendedAsset.integrity <= trigger.integrity);
    if (trigger.type === 'ENEMY_DESTROYED') return context.enemies.some((enemy) => trigger.enemyIds.includes(enemy.id) && !enemy.isAlive);
    return context.enemies.some((enemy) => trigger.enemyIds.includes(enemy.id) && enemy.isAlive && enemy.x >= trigger.worldX);
  }

  private findNextWaveTicks(elapsedTicks: number): number | null {
    const pending = this.events
      .filter((event) => !this.fired.has(event.id) && event.trigger.type === 'ELAPSED_TICKS' && event.actions.some((action) => action.type === 'SPAWN'))
      .map((event) => (event.trigger as Extract<MissionEvent['trigger'], { type: 'ELAPSED_TICKS' }>).ticks - elapsedTicks)
      .filter((ticks) => ticks >= 0);
    return pending.length > 0 ? Math.min(...pending) : null;
  }
}

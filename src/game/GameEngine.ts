import { AccessibilitySettings, AircraftCondition, AirCombatSnapshot, ArcticWeatherState, CombatDiagnosticMetrics, CombatFeedbackState, DefendedAssetState, DiagnosticSessionV3, DiagnosticSessionV4, EnemyUnit, GameScoreBreakdown, GameState, InputAction, InputDevice, LoadoutPreset, MissionAction, MissionDefinition, MissionDirectorState, MissionLaunchContext, OperationArchetype, PerformanceSnapshot, RecoveryFailureReason, RecoveryGuidance, RenderQuality, RenderQualityPreference, DifficultyPreset, RescueBeaconState, TrainingRuntimeState, WeaponType } from '../types/game';
import { buildPhaseRestartGuidance, PhaseRestartGuidance } from './PhaseRestartGuidance';
import { GAME_CONSTANTS } from './constants';
import { PlayerAircraft } from './PlayerAircraft';
import { WeaponsSystem } from './WeaponsSystem';
import { EnemyManager } from './EnemyManager';
import { TerrainSystem } from './TerrainSystem';
import { ParticleAndEffects } from './ParticleAndEffects';
import { CombatFlowManager } from './CombatFlow';
import { SpriteAssetManager } from './SpriteAssetManager';
import { assetManager } from './AssetManager';
import { soundEngine } from '../audio/SoundEngine';
import { instantiateMission } from './missionRuntime';
import { FixedStepClock } from './FixedStepClock';
import { AircraftLossSequence, AircraftLossSnapshot } from './AircraftLossSequence';
import { conditionFromStats } from './ServiceSystem';
import { applyMissionLaunchState, shouldEnableGuidedTraining } from './LaunchContract';
import { MissionDirector } from './MissionDirector';
import { TrainingDirector } from './TrainingDirector';
import { getCombatDifficultyProfile } from './CombatBalance';
import { EnemyCombatEvent } from './EnemyManager';
import { updateContactIdentification } from './ContactIdentification';
import { calculateRescueBeacon } from './RescueBeacon';
import { AdaptiveQualityController } from './PerformanceManager';
import { hashSeed, SimulationRandom } from './SeededRandom';
import { RELEASE_INFO } from './Release';
import { calculateSmartCombatZoom } from './CombatReadability';
import { COMBAT_FEEDBACK_PROFILE, ENCOUNTER_PACING_PROFILE, getRecoveryAssistProfile } from './PlayabilityProfiles';

export class GameEngine {
  public player: PlayerAircraft;
  public weapons: WeaponsSystem;
  public enemies: EnemyManager;
  public terrain: TerrainSystem;
  public effects: ParticleAndEffects;
  public combatFlow: CombatFlowManager;

  public currentMission: MissionDefinition;
  public cameraX = 0;
  public gameState: GameState = 'MENU';
  public isRunning = false;
  private animFrameId: number | null = null;
  private renderContext: CanvasRenderingContext2D | null = null;
  private readonly clock = new FixedStepClock(1 / 60);
  private renderQuality: RenderQuality = 'HIGH';
  private readonly performanceController = new AdaptiveQualityController();
  private renderFrame = 0;
  private hudTick = 0;
  private heldActions = new Set<InputAction>();
  public defendedAsset: DefendedAssetState | null = null;
  private lossSequence: AircraftLossSequence | null = null;
  private lossSnapshot: AircraftLossSnapshot | null = null;
  private lossImpactSurface: 'GROUND' | 'WATER' = 'WATER';
  private missionDirector: MissionDirector;
  private trainingDirector = new TrainingDirector(false);
  private trainingHeldEnemies = new Map<string, Pick<EnemyUnit, 'vx' | 'vy' | 'state' | 'isTargetable'>>();
  private terrainContactCooldown = 0;
  private simulationTicks = 0;
  private difficulty: DifficultyPreset = 'PILOT';
  private accessibility: AccessibilitySettings = { radioCaptions: true, highContrastHud: false, hudContrast: 'STANDARD', textContrast: 'STANDARD', reducedEffects: false, screenShake: 1, hudScale: 'AUTO' };
  private deathCause: DiagnosticSessionV3['deathCause'] = null;
  private weaponsUsed: Record<WeaponType, number> = { CANNON: 0, MISSILE: 0, BOMB: 0, ROCKET: 0, FLARE: 0 };
  private combatMetrics: CombatDiagnosticMetrics = createEmptyCombatMetrics();
  private feedback: CombatFeedbackState = createEmptyCombatFeedback();
  private fighterWarnings = 0;
  private rescueBeacon: RescueBeaconState | null = null;
  private rescueCrewLocated = false;
  private missionContactRadioPlayed = false;
  private lockAcquiredCuePlayed = false;
  private simulationSeed: number;
  private readonly random: SimulationRandom;
  private combatZoom = 1;
  private combatZoomFocusX = GAME_CONSTANTS.VIEWPORT_WIDTH * 0.5;
  private combatZoomFocusY = GAME_CONSTANTS.VIEWPORT_HEIGHT * 0.5;
  private combatZoomContacts = 0;
  private lastInputDevice: InputDevice | null = null;
  private controlDeviceTransitions = 0;
  private encounterIdleTicks = 0;

  // Active keyboard / touch inputs
  public input = {
    up: false,
    down: false,
    left: false,
    right: false,
    vtol: false,
    fireCannon: false,
    fireMissile: false,
    fireBomb: false,
    fireRocket: false,
    deployFlare: false,
  };

  public onStateChange?: (newState: GameState, scoreData?: GameScoreBreakdown) => void;
  public onHUDUpdate?: () => void;
  public onPerformanceUpdate?: (snapshot: PerformanceSnapshot) => void;

  constructor(initialMission: MissionDefinition) {
    SpriteAssetManager.init();
    assetManager.init();
    this.currentMission = instantiateMission(initialMission);
    this.simulationSeed = hashSeed(initialMission.id, this.difficulty);
    this.random = new SimulationRandom(this.simulationSeed);
    this.player = new PlayerAircraft(this.random.authoritative);
    this.weapons = new WeaponsSystem();
    this.enemies = new EnemyManager(this.random.authoritative, this.random.presentation);
    this.terrain = new TerrainSystem();
    this.effects = new ParticleAndEffects();
    this.combatFlow = new CombatFlowManager();
    this.missionDirector = new MissionDirector(this.currentMission);
    soundEngine.onRadioCall = (phrase) => {
      this.feedback.radioCaption = phrase;
      this.feedback.radioCaptionTicks = COMBAT_FEEDBACK_PROFILE.radioCaptionTicks;
      this.onHUDUpdate?.();
    };
  }

  public initMission(mission: MissionDefinition, condition?: AircraftCondition, loadout: LoadoutPreset = 'FLEET_CAP', guidedTraining = false, launchContext: MissionLaunchContext = {}) {
    this.currentMission = instantiateMission(mission);
    this.simulationSeed = launchContext.simulationSeed === undefined
      ? hashSeed(mission.id, this.difficulty)
      : launchContext.simulationSeed >>> 0;
    this.random.reset(this.simulationSeed);
    this.player.setRandomSource(this.random.authoritative);
    this.enemies.setRandomSources(this.random.authoritative, this.random.presentation);
    this.terrain.beginMission();
    this.cameraX = 0;
    this.combatZoom = 1;
    this.combatZoomFocusX = GAME_CONSTANTS.VIEWPORT_WIDTH * 0.5;
    this.combatZoomFocusY = GAME_CONSTANTS.VIEWPORT_HEIGHT * 0.5;
    this.combatZoomContacts = 0;
    this.player.reset(mission.carrierX + 80);
    this.player.setRecoveryToleranceModifier(mission.operationModifiers?.includes('DAMAGED_RUNWAY') ? 0.88 : 1);
    applyMissionLaunchState(this.player.stats, condition, loadout);
    if (mission.launchSite === 'FORWARD_BASE') {
      this.player.stats.x = mission.carrierX + 245;
      this.player.stats.y = this.terrain.getGroundY(mission.carrierX + 245, mission) - 22;
      this.player.stats.vx = 0.8;
      this.player.stats.vy = 0;
      this.player.stats.vtolTransition = 1;
      this.player.stats.vtolMode = true;
    }
    this.weapons.reset();
    this.enemies.reset(this.currentMission.spawnEnemies());
    this.trainingDirector = new TrainingDirector(shouldEnableGuidedTraining(mission.id, guidedTraining));
    this.trainingHeldEnemies.clear();
    if (this.trainingDirector.getState().enabled) this.holdTrainingEnemies();
    this.effects.reset();
    this.combatFlow.startMission();
    this.missionDirector = new MissionDirector(this.currentMission);
    this.terrainContactCooldown = 0;
    this.simulationTicks = 0;
    this.deathCause = null;
    this.weaponsUsed = { CANNON: 0, MISSILE: 0, BOMB: 0, ROCKET: 0, FLARE: 0 };
    this.combatMetrics = createEmptyCombatMetrics();
    this.feedback = createEmptyCombatFeedback();
    this.fighterWarnings = 0;
    this.rescueBeacon = null;
    this.rescueCrewLocated = false;
    this.missionContactRadioPlayed = false;
    this.lockAcquiredCuePlayed = false;
    this.lastInputDevice = null;
    this.controlDeviceTransitions = 0;
    this.encounterIdleTicks = 0;
    this.defendedAsset = mission.defendedAsset ? {
      type: mission.defendedAsset.type,
      worldX: mission.defendedAsset.worldX,
      integrity: mission.defendedAsset.startingIntegrity,
      maxIntegrity: mission.defendedAsset.startingIntegrity,
      failureThreshold: mission.defendedAsset.failureThreshold,
      incomingMissiles: 0,
    } : null;
    this.lossSequence = null;
    this.lossSnapshot = null;
    this.lossImpactSurface = 'WATER';
    this.gameState = 'PLAYING';
    this.clearInput();

    soundEngine.init();
    soundEngine.resume();
    soundEngine.setMissionContext(this.currentMission.id);
    soundEngine.startJetEngine();
    soundEngine.setAtmosphere(this.currentMission.weather.condition, this.currentMission.weather.windSpeed);
    soundEngine.startMusic(this.currentMission.launchSite !== 'FORWARD_BASE');
  }

  public beginLandingPractice(technique: 'ROLLING' | 'VERTICAL') {
    const mission = this.currentMission;
    const site = mission.recoverySite === 'FORWARD_BASE' ? 'FORWARD_BASE' : 'CARRIER';
    const deckY = site === 'FORWARD_BASE'
      ? this.terrain.getGroundY(mission.carrierLandingX + 245, mission)
      : GAME_CONSTANTS.CARRIER.DECK_Y;
    this.player.beginLandingPractice(site, technique, mission.carrierLandingX, deckY);
    soundEngine.setMissionContext(null);
    this.cameraX = Math.max(0, this.player.stats.x - GAME_CONSTANTS.VIEWPORT_WIDTH * 0.35);
  }

  public getRecoveryGuidance(): RecoveryGuidance | null {
    const mission = this.currentMission;
    const recoveryObjective = mission.objectives.find((objective) => objective.targetType === 'LANDING');
    if (!mission.hasCarrierRecovery || recoveryObjective?.active === false) return null;
    const site = mission.recoverySite === 'FORWARD_BASE' ? 'FORWARD_BASE' : 'CARRIER';
    const startX = site === 'FORWARD_BASE' ? mission.carrierLandingX + 105 : mission.carrierLandingX + GAME_CONSTANTS.CARRIER.LANDING_ZONE_START_X;
    const endX = site === 'FORWARD_BASE' ? mission.carrierLandingX + 350 : mission.carrierLandingX + GAME_CONSTANTS.CARRIER.LANDING_ZONE_END_X;
    const centre = (startX + endX) * 0.5;
    const s = this.player.stats;
    const deckOffset = centre - s.x;
    const distance = Math.max(0, Math.abs(deckOffset) - (endX - startX) * 0.5);
    const recovery = getRecoveryAssistProfile(this.difficulty);
    const tolerance = recovery.toleranceMultiplier * (mission.operationModifiers?.includes('DAMAGED_RUNWAY') ? 0.88 : 1);
    let status: RecoveryGuidance['status'] = 'STABLE';
    if (distance > recovery.approachInterceptDistance) status = 'INTERCEPT';
    else if (Math.abs(deckOffset) > recovery.alignmentOffset && distance < 40) status = 'ALIGN';
    else if (Math.abs(s.vx) > recovery.safeForwardSpeed * tolerance) status = 'REDUCE_SPEED';
    else if (s.vy > recovery.safeDescentRate * tolerance) status = 'CHECK_SINK';
    return { site, distance: Math.round(distance), deckOffset: Math.round(deckOffset), forwardSpeed: Math.abs(s.vx), descentRate: s.vy, nozzleAngle: Math.round(s.vtolTransition * 90), status };
  }

  public start(ctx?: CanvasRenderingContext2D) {
    if (this.isRunning) return;
    if (ctx) this.renderContext = ctx;
    this.isRunning = true;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;
      const elapsedSeconds = Math.min(0.25, (currentTime - lastTime) / 1000);
      lastTime = currentTime;
      if ((this.gameState === 'PLAYING' || this.gameState === 'EJECTING') && !document.hidden) {
        const adaptiveQuality = this.performanceController.observeFrame(elapsedSeconds * 1000);
        if (adaptiveQuality) {
          this.applyRenderQuality(adaptiveQuality);
          this.onPerformanceUpdate?.(this.performanceController.getSnapshot());
        } else if (this.renderFrame % 120 === 0) {
          this.onPerformanceUpdate?.(this.performanceController.getSnapshot());
        }
      }

      if (this.gameState === 'PLAYING' || this.gameState === 'EJECTING') {
        this.clock.advance(elapsedSeconds, (dtSeconds) => {
          if (this.gameState === 'EJECTING') this.updateLossSequence();
          else this.update(dtSeconds);
        });
      }

      this.renderFrame++;
      const shouldRender = this.renderQuality !== 'LOW' || this.renderFrame % 2 === 0;
      if (this.renderContext && shouldRender) {
        this.renderContext.imageSmoothingEnabled = this.renderQuality !== 'LOW';
        this.render(this.renderContext);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    soundEngine.stopAll();
  }

  public pause() {
    if (this.gameState !== 'PLAYING') return;
    this.gameState = 'PAUSED';
    this.clock.reset();
    this.clearInput();
    soundEngine.pause();
  }

  public resume() {
    if (this.gameState !== 'PAUSED') return;
    this.gameState = 'PLAYING';
    this.clock.reset();
    soundEngine.resume();
  }

  public setDifficulty(difficulty: DifficultyPreset) {
    this.difficulty = difficulty;
    this.player.setDifficulty(difficulty);
    this.enemies.setDifficulty(difficulty);
    this.terrain.setDifficulty(difficulty);
  }

  private applyRenderQuality(quality: RenderQuality) {
    this.renderQuality = quality;
    this.effects.setRenderQuality(quality);
    this.terrain.setRenderQuality(quality);
  }

  public setRenderQuality(quality: RenderQualityPreference) {
    this.applyRenderQuality(this.performanceController.setPreference(quality));
    this.onPerformanceUpdate?.(this.performanceController.getSnapshot());
  }

  public getPerformanceSnapshot(): PerformanceSnapshot {
    return this.performanceController.getSnapshot();
  }

  public setAccessibility(settings: AccessibilitySettings) {
    this.accessibility = { ...settings };
    this.effects.setReducedEffects(settings.reducedEffects);
    this.terrain.setReducedEffects(settings.reducedEffects);
    if (settings.combatZoom !== 'SMART' || settings.reducedEffects) this.combatZoom = 1;
  }

  public getCombatPresentationSnapshot() {
    return {
      zoomFactor: this.combatZoom,
      focusX: this.combatZoomFocusX,
      focusY: this.combatZoomFocusY,
      contactCount: this.combatZoomContacts,
    };
  }

  public setInputAction(action: InputAction, pressed: boolean) {
    if (pressed && this.heldActions.has(action) && ['SECONDARY_FIRE', 'CYCLE_WEAPON', 'COUNTERMEASURE', 'PAUSE'].includes(action)) return;
    const trainingStepBefore = this.trainingDirector.getState().currentStep?.id;
    if (pressed) this.heldActions.add(action);
    else this.heldActions.delete(action);
    if (action === 'PITCH_UP') this.input.up = pressed;
    if (action === 'PITCH_DOWN') this.input.down = pressed;
    if (action === 'THROTTLE_DOWN') this.input.left = pressed;
    if (action === 'THROTTLE_UP') this.input.right = pressed;
    if (action === 'VTOL') this.input.vtol = pressed;
    if (action === 'PRIMARY_FIRE') this.input.fireCannon = pressed;
    if (action === 'COUNTERMEASURE') this.input.deployFlare = pressed;
    if (pressed) {
      this.trainingDirector.onAction(action, this.player.stats);
      if (trainingStepBefore === 'CANNON') this.releaseTrainingEnemies();
      if (action === 'PRIMARY_FIRE') this.weaponsUsed.CANNON++;
      if (action === 'COUNTERMEASURE') this.weaponsUsed.FLARE++;
    }
    if (action === 'CYCLE_WEAPON' && pressed) {
      const order: WeaponType[] = ['MISSILE', 'BOMB', 'ROCKET'];
      const current = order.indexOf(this.player.stats.selectedWeapon);
      this.player.stats.selectedWeapon = order[(current + 1) % order.length];
    }
    if (action === 'SECONDARY_FIRE' && pressed) {
      const weapon = this.player.stats.selectedWeapon;
      this.weaponsUsed[weapon]++;
      this.input.fireMissile = weapon === 'MISSILE';
      this.input.fireBomb = weapon === 'BOMB';
      this.input.fireRocket = weapon === 'ROCKET';
    }
  }

  private clearInput() {
    for (const key of Object.keys(this.input) as Array<keyof typeof this.input>) this.input[key] = false;
    this.heldActions.clear();
  }

  public update(_dtSeconds: number = 1 / 60) {
    this.simulationTicks++;
    const s = this.player.stats;
    const mission = this.currentMission;

    // Camera follow player with forward lookahead bias
    const targetCameraX = s.x - GAME_CONSTANTS.VIEWPORT_WIDTH * 0.35 + s.vx * 16;
    this.cameraX += (targetCameraX - this.cameraX) * 0.08;
    this.cameraX = Math.max(0, Math.min(mission.mapLength - GAME_CONSTANTS.VIEWPORT_WIDTH, this.cameraX));
    this.updateCombatPresentation();

    // Player Update
    const isForwardBaseRecovery = mission.recoverySite === 'FORWARD_BASE';
    const recoveryObjective = mission.objectives.find((objective) => objective.targetType === 'LANDING');
    const recoveryAvailable = recoveryObjective?.active !== false;
    const recoveryBounds = mission.hasCarrierRecovery && recoveryAvailable
      ? isForwardBaseRecovery
        ? {
            startX: mission.carrierLandingX + 105,
            endX: mission.carrierLandingX + 350,
            deckY: this.terrain.getGroundY(mission.carrierLandingX + 245, mission),
            siteType: 'FORWARD_BASE' as const,
          }
        : {
            startX: mission.carrierLandingX + GAME_CONSTANTS.CARRIER.LANDING_ZONE_START_X,
            endX: mission.carrierLandingX + GAME_CONSTANTS.CARRIER.LANDING_ZONE_END_X,
            deckY: GAME_CONSTANTS.CARRIER.DECK_Y,
            siteType: 'CARRIER' as const,
          }
      : undefined;

    this.player.update(this.input, this.effects, recoveryBounds);
    s.x = Math.max(24, Math.min(mission.mapLength - 24, s.x));

    this.trainingDirector.update(s, mission.carrierX);
    if (this.trainingDirector.getState().currentIndex >= 4) this.releaseTrainingEnemies();

    this.enforceTerrainContact(recoveryBounds);
    this.updateIdentificationContacts();

    const directorActions = this.missionDirector.update({
      player: s,
      objectives: mission.objectives,
      enemies: this.enemies.getEnemies(),
      defendedAsset: this.defendedAsset,
    });
    for (const action of directorActions) {
      if (this.executeMissionAction(action)) return;
    }
    const pendingPrimaryObjectives = mission.objectives.filter((objective) => objective.isPrimary && objective.active !== false && !objective.completed);
    soundEngine.setRecoveryMusic(pendingPrimaryObjectives.length > 0 && pendingPrimaryObjectives.every((objective) => objective.targetType === 'LANDING'));

    // Low altitude combat flow score bonus
    if (s.altitudeBand === 'LOW' && !s.isOnCarrier && s.health > 0) {
      this.combatFlow.onLowAltitudeTick();
    }

    // Weapons Firing Handlers
    if (this.input.fireCannon) {
      this.weapons.fireCannon(this.player, this.effects);
    }
    if (this.input.fireMissile) {
      this.weapons.fireMissile(this.player, s.targetLockedId, this.effects);
      this.input.fireMissile = false; // single trigger
    }
    if (this.input.fireBomb) {
      this.weapons.fireBomb(this.player, this.effects);
      this.input.fireBomb = false;
    }
    if (this.input.fireRocket) {
      this.weapons.fireRockets(this.player, this.effects);
      this.input.fireRocket = false;
    }
    if (this.input.deployFlare) {
      this.weapons.deployFlares(this.player, this.effects);
      this.input.deployFlare = false;
    }

    // Missile Lock-on Tracking
    this.updateTargetLock();

    // Weapons & Projectiles Update
    this.weapons.update(this.player, this.enemies.getEnemies(), this.effects, (worldX) => this.terrain.getGroundContactY(worldX, mission));
    for (const event of this.weapons.drainDamageEvents()) {
      this.combatMetrics.damageReceived[event.source] += event.amount;
    }

    const handleEnemyKilled = (killedEnemy: EnemyUnit, weaponType: string) => {
      this.combatFlow.onEnemyKilled(killedEnemy, weaponType);
      this.checkObjectivesOnKill(killedEnemy);
      this.feedback.hitMarkerTicks = Math.max(this.feedback.hitMarkerTicks, COMBAT_FEEDBACK_PROFILE.hitGlancingTicks);
      if (killedEnemy.category === 'AIR' && killedEnemy.type !== 'ANTI_SHIP_MISSILE') this.combatMetrics.enemyAircraftDestroyed++;
    };
    for (const blast of this.weapons.drainBlastEvents()) {
      this.enemies.applyBlastEvent(blast, this.weapons, this.effects, handleEnemyKilled, (event) => this.handleEnemyCombatEvent(event));
    }

    // Enemies AI & Hit Testing
    const healthBeforeEnemyUpdate = s.health;
    this.enemies.update(this.player, this.weapons, this.effects, handleEnemyKilled, this.defendedAsset || undefined, (worldX) => this.terrain.getGroundY(worldX, mission), (event) => this.handleEnemyCombatEvent(event));
    if (s.health < healthBeforeEnemyUpdate) {
      const nearestThreat = this.enemies.getEnemies().filter((enemy) => enemy.isAlive).sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0];
      this.feedback.damageWarningTicks = COMBAT_FEEDBACK_PROFILE.damageWarningTicks;
      this.feedback.threatDirection = nearestThreat ? (nearestThreat.x < s.x ? 'LEFT' : 'RIGHT') : null;
      if (healthBeforeEnemyUpdate >= 50 && s.health < 50) soundEngine.playMasterDamageWarning();
    }
    const nearestMissile = this.enemies.getEnemies().filter((enemy) => enemy.isAlive && enemy.type === 'ANTI_SHIP_MISSILE').sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0];
    this.feedback.incomingMissileDirection = nearestMissile ? (nearestMissile.x < s.x ? 'LEFT' : 'RIGHT') : null;

    if (this.defendedAsset) {
      this.defendedAsset.incomingMissiles = this.enemies.getEnemies().filter((enemy) => enemy.type === 'ANTI_SHIP_MISSILE' && enemy.isAlive).length;
      this.combatFlow.scoreData.carrierIntegrity = this.defendedAsset.integrity;
      const defendObjective = mission.objectives.find((objective) => objective.targetType === 'DEFEND_ASSET');
      const threatsRemain = this.enemies.getEnemies().some((enemy) => enemy.isAlive && (
        enemy.type === 'PATROL_FIGHTER' || enemy.type === 'MISSILE_CORVETTE' || enemy.type === 'ANTI_SHIP_MISSILE'
      ));
      if (defendObjective && !mission.events?.length && !threatsRemain && this.defendedAsset.integrity > this.defendedAsset.failureThreshold) {
        defendObjective.completed = true;
        defendObjective.currentCount = 1;
      }
      if (this.defendedAsset.integrity <= this.defendedAsset.failureThreshold) {
        this.deathCause = 'DEFENDED_ASSET_LOST';
        soundEngine.playRadioCall(this.defendedAsset.type === 'CARRIER'
          ? 'HMS INVINCIBLE LOST. MISSION FAILED.'
          : this.defendedAsset.type === 'LANDING_FORCE'
            ? 'TROMS LANDING FORCE OVERRUN. MISSION FAILED.'
            : 'FORWARD BASE DESTROYED. MISSION FAILED.');
        const scoreData = this.finalizeScore(false, null);
        this.gameState = 'GAME_OVER';
        this.onStateChange?.('GAME_OVER', scoreData);
        return;
      }
    }

    // Terrain & Particle Updates
    this.terrain.update(mission.weather);
    if (this.terrain.consumeLightningStarted()) soundEngine.playThunder();
    this.effects.update();
    this.combatFlow.update();
    this.feedback.hitMarkerTicks = Math.max(0, this.feedback.hitMarkerTicks - 1);
    if (this.feedback.hitMarkerTicks === 0) {
      this.feedback.hitWeapon = null;
      this.feedback.hitOutcome = null;
      this.feedback.hitAspect = null;
      this.feedback.hitTargetName = null;
    }
    this.feedback.damageWarningTicks = Math.max(0, this.feedback.damageWarningTicks - 1);
    this.feedback.radioCaptionTicks = Math.max(0, this.feedback.radioCaptionTicks - 1);
    this.feedback.airThreatTicks = Math.max(0, this.feedback.airThreatTicks - 1);
    if (this.feedback.radioCaptionTicks === 0) this.feedback.radioCaption = null;
    if (this.feedback.airThreatTicks === 0) {
      this.feedback.airThreatState = null;
      this.feedback.airThreatDirection = null;
    }
    const activeCombat = this.enemies.getEnemies().some((enemy) => enemy.isAlive && ((enemy.category === 'AIR' && Math.abs(enemy.x - s.x) < ENCOUNTER_PACING_PROFILE.activeCombatRange) || enemy.type === 'ANTI_SHIP_MISSILE'));
    if (activeCombat) {
      this.combatMetrics.combatTicks++;
    } else if (!s.isOnCarrier && !this.trainingDirector.getState().enabled) {
      this.encounterIdleTicks++;
    }

    // Rescue Objective evaluation
    const downedPilot = this.enemies.getEnemies().find(e => e.type === 'DOWNED_PILOT' && e.isAlive);
    if (downedPilot && !s.isOnCarrier) {
      const dist = Math.hypot(s.x - downedPilot.x, s.y - downedPilot.y);
      const horizontalDistance = Math.abs(s.x - downedPilot.x);
      if (!this.rescueCrewLocated && horizontalDistance <= 850) {
        this.rescueCrewLocated = true;
        soundEngine.playRadioCall(mission.id === 'm14_whiteout_rescue'
          ? 'BEACON VISUAL. RECON CREW LOCATED. COMMENCE VTOL PICKUP.'
          : 'RESCUE BEACON VISUAL.');
      }
      this.rescueBeacon = calculateRescueBeacon(s.x, downedPilot.x, downedPilot.stateTimer, this.rescueCrewLocated);
      if (dist < 80 && s.vtolTransition > 0.6 && Math.abs(s.vx) < 2.5) {
        downedPilot.stateTimer++;
        if (downedPilot.stateTimer > 180) { // 3 seconds hover
          downedPilot.isAlive = false;
          soundEngine.playRadioCall(mission.id === 'm14_whiteout_rescue'
            ? 'RECON CREW EXTRACTED. BOTH SURVIVORS ABOARD. RTB TROMS.'
            : 'PILOT EXTRACTED! RESCUE COMPLETE. RTB.');
          this.combatFlow.addAction(mission.id === 'm14_whiteout_rescue' ? 'CREW RECOVERED! +3000' : 'PILOT RESCUED! +2000', 35);
          const obj = mission.objectives.find(o => o.targetType === 'DOWNED_PILOT');
          if (obj) {
            obj.completed = true;
            obj.currentCount = 1;
          }
          this.rescueBeacon = calculateRescueBeacon(s.x, downedPilot.x, 180, true, true);
        }
      }
    }

    // Carrier Landing Victory Check
    if (s.isOnCarrier && s.carrierLandingGrade && s.x > mission.carrierLandingX - 50) {
      const allPrimaryDone = mission.objectives.filter(o => o.isPrimary && o.targetType !== 'LANDING').every(o => o.completed);
      const landingObj = mission.objectives.find(o => o.targetType === 'LANDING');
      if (landingObj) landingObj.completed = true;

      this.combatFlow.onLanding(s.carrierLandingGrade);
      const scoreData = this.finalizeScore(allPrimaryDone, true);
      
      this.gameState = allPrimaryDone ? 'VICTORY' : 'DEBRIEFING';
      if (this.onStateChange) {
        this.onStateChange(this.gameState, scoreData);
      }
      return;
    }

    // Death / Crash Condition
    if (s.health <= 0 || s.y >= GAME_CONSTANTS.SEA_LEVEL_Y + 5) {
      this.beginAircraftLoss();
      return;
    }

    this.hudTick++;
    if (this.onHUDUpdate && this.hudTick % 3 === 0) {
      this.onHUDUpdate();
    }
  }

  private updateCombatPresentation() {
    const contacts = this.enemies.getEnemies()
      .filter((enemy) => enemy.isAlive && (enemy.category === 'AIR' || enemy.type === 'ANTI_SHIP_MISSILE'))
      .map((enemy) => ({
        x: enemy.x,
        y: enemy.y,
        priority: enemy.type === 'ANTI_SHIP_MISSILE' ? 7 : enemy.airCombat?.state === 'ATTACK_PASS' ? 5 : 3,
      }));
    for (const projectile of this.weapons.projectiles) {
      if (projectile.source === 'ENEMY' && projectile.type === 'ENEMY_MISSILE' && !projectile.detonated) {
        contacts.push({ x: projectile.x, y: projectile.y, priority: 8 });
      }
    }
    const frame = calculateSmartCombatZoom({
      enabled: this.accessibility.combatZoom === 'SMART',
      reducedEffects: this.accessibility.reducedEffects,
      playerX: this.player.stats.x,
      playerY: this.player.stats.y,
      cameraX: this.cameraX,
      contacts,
    });
    this.combatZoom += (frame.factor - this.combatZoom) * 0.06;
    this.combatZoomFocusX += (frame.focusX - this.combatZoomFocusX) * 0.08;
    this.combatZoomFocusY += (frame.focusY - this.combatZoomFocusY) * 0.08;
    this.combatZoomContacts = frame.contactCount;
  }

  private updateTargetLock() {
    const s = this.player.stats;
    const threatPriority: Record<string, number> = {
      ANTI_SHIP_MISSILE: 10,
      SAM_LAUNCHER: 5,
      INTERCEPTOR: 4,
      PATROL_FIGHTER: 4,
      AA_FLAK_GUN: 3,
      ATTACK_HELI: 3,
      RADAR_STATION: 2,
    };
    const targets = this.enemies.getEnemies()
      .filter((e) => {
        if (!e.isAlive || !e.isTargetable) return false;
        const forwardDistance = (e.x - s.x) * s.facing;
        return forwardDistance > 0 && forwardDistance < GAME_CONSTANTS.PLAYER.LOCK_ON_RANGE;
      })
      .sort((a, b) => {
        const aScore = (threatPriority[a.type] || 1) * 120 - Math.hypot(a.x - s.x, a.y - s.y);
        const bScore = (threatPriority[b.type] || 1) * 120 - Math.hypot(b.x - s.x, b.y - s.y);
        return bScore - aScore;
      });

    if (targets.length > 0) {
      if (!this.missionContactRadioPlayed) {
        soundEngine.playMissionRadio('CONTACT');
        this.missionContactRadioPlayed = true;
      }
      const nearest = targets[0];
      if (s.targetLockedId === nearest.id) {
        const difficultyLockFactor = getCombatDifficultyProfile(this.difficulty).playerLockTime;
        const wasLocked = s.lockProgress >= 1.0;
        s.lockProgress = Math.min(1.0, s.lockProgress + 1.0 / (GAME_CONSTANTS.PLAYER.LOCK_ON_TIME * difficultyLockFactor * (1.5 - 0.5 * s.subsystems.targeting)));
        if (!wasLocked && s.lockProgress >= 1.0 && !this.lockAcquiredCuePlayed) {
          this.lockAcquiredCuePlayed = true;
          soundEngine.playLockOnBeep(true);
        }
      } else {
        s.targetLockedId = nearest.id;
        s.lockProgress = 0.1;
        this.lockAcquiredCuePlayed = false;
        soundEngine.playLockOnBeep(false);
      }
    } else {
      s.targetLockedId = null;
      s.lockProgress = 0;
      this.lockAcquiredCuePlayed = false;
    }
  }

  private updateIdentificationContacts(): void {
    const player = this.player.stats;
    const contacts = this.enemies.getEnemies().filter((enemy) => enemy.isAlive && enemy.identificationRequired);
    const result = updateContactIdentification(contacts, player, this.defendedAsset);
    for (const contact of result.newlyIdentified) {
      soundEngine.playRadioCall(`${contact.name.toUpperCase()} POSITIVELY IDENTIFIED HOSTILE. WEAPONS FREE.`);
      this.combatFlow.addAction('HOSTILE CONTACT IDENTIFIED', 12);
    }
    if (result.newlyEstablishedTracks.length > 0) {
      soundEngine.playRadioCall('HOSTILE TARGETING TRACK TRANSMITTED. FLEET TAKING STAND-OFF FIRE.');
      this.combatFlow.addAction('TARGETING TRACK ESTABLISHED', 8);
    }
    this.feedback.unidentifiedContacts = result.unidentifiedContacts;
    this.feedback.identificationProgress = result.identificationProgress;
    this.feedback.targetingTrackProgress = result.targetingTrackProgress;
  }

  private beginAircraftLoss() {
    if (this.lossSequence) return;
    const stats = this.player.stats;
    if (!this.deathCause) this.deathCause = stats.fuel <= 0 ? 'FUEL' : 'ENEMY_FIRE';
    const groundContactY = this.terrain.getGroundContactY(stats.x, this.currentMission);
    const impactY = groundContactY ?? GAME_CONSTANTS.SEA_LEVEL_Y;
    this.lossImpactSurface = groundContactY === null ? 'WATER' : 'GROUND';
    this.lossSequence = new AircraftLossSequence(stats.x, stats.y, stats.vx, stats.vy, stats.rotation, impactY, stats.facing);
    this.combatMetrics.aircraftLossPhase = impactY - stats.y >= 80 ? 'EJECTION' : 'LOW_ALTITUDE_IMPACT';
    this.gameState = 'EJECTING';
    this.clearInput();
    soundEngine.playRadioCall('MAYDAY! KESTREL ONE DOWN. EJECTING.');
    this.effects.createExplosion(stats.x, stats.y, 'LARGE');
    soundEngine.playAircraftBreakup();
  }

  private updateLossSequence() {
    if (!this.lossSequence) return;
    this.lossSnapshot = this.lossSequence.update();
    if (this.lossSnapshot.pilotSurvived && this.lossSnapshot.frame === 15) {
      soundEngine.playEjectionCanopy();
      soundEngine.playEjectionSeat();
    }
    if (this.lossSnapshot.pilotSurvived && this.lossSnapshot.frame === 42) soundEngine.playParachuteOpen();
    if (this.lossSnapshot.impactStarted) {
      this.effects.createExplosion(this.lossSnapshot.aircraftX, this.lossSnapshot.aircraftY, 'COLOSSAL');
      soundEngine.playAircraftCrash(this.lossImpactSurface);
    }
    this.terrain.update(this.currentMission.weather);
    if (this.terrain.consumeLightningStarted()) soundEngine.playThunder();
    this.effects.update();
    if (this.lossSnapshot.complete) {
      const scoreData = this.finalizeScore(false, this.lossSnapshot.pilotSurvived);
      this.gameState = 'GAME_OVER';
      this.onStateChange?.('GAME_OVER', scoreData);
    }
  }

  private finalizeScore(isVictory: boolean, pilotSurvived: boolean | null): GameScoreBreakdown {
    const objectives = this.currentMission.objectives.filter((objective) => objective.completed);
    this.combatFlow.scoreData.objectivesCompleted = objectives.length;
    this.combatFlow.scoreData.objectivePoints = objectives.reduce((sum, objective) => sum + objective.points, 0);
    this.combatFlow.scoreData.carrierIntegrity = this.defendedAsset?.integrity ?? null;
    this.combatFlow.scoreData.pilotSurvived = pilotSurvived;
    return this.combatFlow.finalizeScore(isVictory, this.simulationTicks);
  }

  public getAircraftCondition(): AircraftCondition {
    return conditionFromStats(this.player.stats);
  }

  private checkObjectivesOnKill(enemy: { type: string; isPrimaryObjective?: boolean; isSecondaryObjective?: boolean }) {
    for (const obj of this.currentMission.objectives) {
      if (obj.active !== false && obj.targetType === enemy.type) {
        obj.currentCount++;
        if (obj.currentCount >= obj.requiredCount) {
          obj.completed = true;
          this.combatFlow.addAction(`OBJECTIVE COMPLETE: ${obj.description}`, 25);
          soundEngine.playObjectiveComplete();
          soundEngine.playRadioCall('OBJECTIVE COMPLETE.');
        }
      }
    }
  }

  private executeMissionAction(action: MissionAction): boolean {
    this.missionDirector.applyAction(action);
    if (action.type === 'SPAWN') {
      this.enemies.addEnemies(action.enemies.map((enemy) => ({ ...enemy })));
    } else if (action.type === 'ACTIVATE_TARGETS') {
      for (const enemy of this.enemies.enemies) {
        if (!action.enemyIds.includes(enemy.id)) continue;
        enemy.isTargetable = true;
        enemy.state = enemy.category === 'AIR' ? enemy.state : 'ACTIVE';
      }
    } else if (action.type === 'UNLOCK_OBJECTIVE') {
      const objective = this.currentMission.objectives.find((item) => item.id === action.objectiveId);
      if (objective) objective.active = true;
    } else if (action.type === 'COMPLETE_OBJECTIVE') {
      const objective = this.currentMission.objectives.find((item) => item.id === action.objectiveId);
      if (objective && !objective.completed) {
        objective.active = true;
        objective.completed = true;
        objective.currentCount = objective.requiredCount;
        soundEngine.playObjectiveComplete();
      }
    } else if (action.type === 'RADIO') {
      soundEngine.playRadioCall(action.message);
      this.combatFlow.addAction(action.message, 12);
    } else if (action.type === 'FAIL_MISSION') {
      soundEngine.playRadioCall(action.message);
      this.combatFlow.addAction(action.message, 0);
      const scoreData = this.finalizeScore(false, null);
      this.gameState = 'GAME_OVER';
      this.onStateChange?.('GAME_OVER', scoreData);
      return true;
    }
    return false;
  }

  private enforceTerrainContact(recoveryBounds?: { startX: number; endX: number; deckY: number; siteType: 'CARRIER' | 'FORWARD_BASE' }) {
    if (this.terrainContactCooldown > 0) this.terrainContactCooldown--;
    const stats = this.player.stats;
    const groundY = this.terrain.getGroundContactY(stats.x, this.currentMission);
    if (groundY === null || stats.isOnCarrier) return;
    const clearance = this.currentMission.terrainContact?.collisionClearance ?? 15;
    const insideRecovery = recoveryBounds && stats.x >= recoveryBounds.startX && stats.x <= recoveryBounds.endX;
    if (insideRecovery) return;
    if (stats.y + clearance >= groundY && this.terrainContactCooldown <= 0) {
      this.deathCause = 'TERRAIN';
      this.combatMetrics.damageReceived.IMPACT += stats.health;
      stats.y = groundY - clearance;
      stats.health = 0;
      this.terrainContactCooldown = 30;
      soundEngine.playRadioCall('TERRAIN IMPACT. EJECT!');
    }
  }

  public getMissionDirectorState(): MissionDirectorState {
    return this.missionDirector.state;
  }

  public getPhaseRestartGuidance(): PhaseRestartGuidance | null {
    return buildPhaseRestartGuidance(this.currentMission, this.missionDirector.state);
  }

  public getRescueBeaconState(): RescueBeaconState | null {
    return this.rescueBeacon ? { ...this.rescueBeacon } : null;
  }

  public getArcticWeatherState(): ArcticWeatherState | null {
    return this.terrain.getArcticWeatherState(this.currentMission);
  }

  public getTrainingState(): TrainingRuntimeState {
    return this.trainingDirector.getState();
  }

  public skipTraining() {
    this.trainingDirector.skip();
    this.releaseTrainingEnemies();
  }

  public getCombatFeedbackState(): CombatFeedbackState {
    return { ...this.feedback };
  }

  public getAirCombatSnapshots(): AirCombatSnapshot[] {
    return this.enemies.getAirCombatSnapshots();
  }

  public noteInputDevice(device: InputDevice): void {
    if (this.lastInputDevice && this.lastInputDevice !== device) this.controlDeviceTransitions++;
    this.lastInputDevice = device;
  }

  public getDiagnosticSession(result: DiagnosticSessionV4['result'], operation?: { seed: number; archetype: OperationArchetype; sortieIndex: number; retries: number }): DiagnosticSessionV4 {
    const training = this.trainingDirector.getState();
    const weaponTelemetry = this.weapons.getTelemetrySnapshot();
    const flightTelemetry = this.player.getFlightTelemetrySnapshot();
    const warningCount = weaponTelemetry.missileWarnings;
    return {
      version: 4,
      buildId: RELEASE_INFO.buildId,
      missionId: this.currentMission.id,
      difficulty: this.difficulty,
      simulationTicks: this.simulationTicks,
      result,
      completedObjectiveIds: this.currentMission.objectives.filter((objective) => objective.completed).map((objective) => objective.id),
      deathCause: result === 'VICTORY' ? null : this.deathCause ?? 'OTHER',
      weaponsUsed: weaponTelemetry.shotsFired,
      landingGrade: this.player.stats.carrierLandingGrade,
      tutorialStepsCompleted: training.completedSteps,
      tutorialSkipped: training.skipped,
      operationSeed: operation?.seed ?? null,
      operationArchetype: operation?.archetype ?? null,
      operationSortieIndex: operation?.sortieIndex ?? null,
      operationRetryCount: operation?.retries ?? 0,
      damageReceived: { ...this.combatMetrics.damageReceived },
      weaponHits: { ...this.combatMetrics.weaponHits },
      enemyAircraftDestroyed: this.combatMetrics.enemyAircraftDestroyed,
      missileWarnings: weaponTelemetry.missileWarnings,
      warningAcknowledgements: weaponTelemetry.warningAcknowledgements,
      countermeasureSuccesses: weaponTelemetry.countermeasureSuccesses,
      combatTicks: this.combatMetrics.combatTicks,
      aircraftLossPhase: this.combatMetrics.aircraftLossPhase,
      reversalsCompleted: flightTelemetry.reversalsCompleted,
      averageReversalTicks: flightTelemetry.averageReversalTicks,
      controlDeviceTransitions: this.controlDeviceTransitions,
      recoveryFailureReason: this.getRecoveryFailureReason(result),
      warningResponsePercent: warningCount ? Math.round(Math.min(warningCount, weaponTelemetry.warningAcknowledgements) / warningCount * 100) : 0,
      encounterIdleTicks: this.encounterIdleTicks,
    };
  }

  private getRecoveryFailureReason(result: DiagnosticSessionV4['result']): RecoveryFailureReason {
    if (result === 'VICTORY' || this.player.stats.carrierLandingGrade) return null;
    if (this.combatMetrics.aircraftLossPhase !== 'NONE') return 'AIRCRAFT_LOST';
    if (!this.player.stats.isLanding) return null;
    const guidance = this.getRecoveryGuidance();
    if (!guidance) return null;
    if (this.player.stats.vtolTransition <= 0.22) return 'NOZZLE_NOT_VECTORED';
    if (guidance.status === 'REDUCE_SPEED') return 'EXCESS_FORWARD_SPEED';
    if (guidance.status === 'CHECK_SINK') return 'EXCESS_DESCENT_RATE';
    if (guidance.status === 'ALIGN') return 'MISALIGNED';
    return null;
  }

  public getValidationWarningExposure(): { fighterWarnings: number; missileWarnings: number } {
    return {
      fighterWarnings: this.fighterWarnings,
      missileWarnings: this.weapons.getTelemetrySnapshot().missileWarnings,
    };
  }

  private handleEnemyCombatEvent(event: EnemyCombatEvent) {
    if (event.type === 'PLAYER_DAMAGED') {
      this.combatMetrics.damageReceived[event.source] += event.amount;
      if ((event.source === 'AIRCRAFT_GUN' || event.source === 'GROUND_FIRE') && event.amount > 0) soundEngine.playAircraftGunHit();
      return;
    }
    if (event.type === 'PLAYER_WEAPON_HIT') {
      this.combatMetrics.weaponHits[event.weapon]++;
      this.feedback.hitMarkerTicks = event.outcome === 'DESTROYED'
        ? COMBAT_FEEDBACK_PROFILE.hitDestroyedTicks
        : event.outcome === 'CRITICAL'
          ? COMBAT_FEEDBACK_PROFILE.hitCriticalTicks
          : COMBAT_FEEDBACK_PROFILE.hitGlancingTicks;
      this.feedback.hitWeapon = event.weapon;
      this.feedback.hitOutcome = event.outcome;
      this.feedback.hitAspect = event.aspect;
      this.feedback.hitTargetName = event.targetName;
      return;
    }
    if (event.type === 'MISSILE_WARNING') {
      this.feedback.incomingMissileDirection = event.direction;
      return;
    }
    this.feedback.airThreatState = event.cue;
    this.feedback.airThreatDirection = event.direction;
    this.feedback.airThreatTicks = event.cue === 'DETECTED'
      ? COMBAT_FEEDBACK_PROFILE.fighterDetectedTicks
      : event.cue === 'TRACKING'
        ? COMBAT_FEEDBACK_PROFILE.fighterTrackingTicks
        : COMBAT_FEEDBACK_PROFILE.fighterFiringTicks;
    if (event.cue === 'DETECTED') {
      this.fighterWarnings++;
      soundEngine.playThreatWarning('FIGHTER');
      soundEngine.playRadioCall(`BANDIT ${event.direction}. CONTACT.`);
    }
    if (event.cue === 'FIRING') {
      soundEngine.playThreatWarning('FIGHTER');
      soundEngine.playRadioCall(`BREAK ${event.direction}. GUNS!`);
    }
  }

  private holdTrainingEnemies() {
    for (const enemy of this.enemies.enemies) {
      if (enemy.category !== 'AIR') continue;
      this.trainingHeldEnemies.set(enemy.id, { vx: enemy.vx, vy: enemy.vy, state: enemy.state, isTargetable: enemy.isTargetable });
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.state = 'TRAINING_HOLD';
      enemy.isTargetable = false;
    }
  }

  private releaseTrainingEnemies() {
    if (!this.trainingHeldEnemies.size) return;
    for (const enemy of this.enemies.enemies) {
      const original = this.trainingHeldEnemies.get(enemy.id);
      if (!original) continue;
      Object.assign(enemy, original);
    }
    this.trainingHeldEnemies.clear();
  }

  public render(ctx: CanvasRenderingContext2D) {
    const width = GAME_CONSTANTS.VIEWPORT_WIDTH;
    const height = GAME_CONSTANTS.VIEWPORT_HEIGHT;
    const renderScale = Math.max(0.35, Number(ctx.canvas.dataset.renderScale) || 1);

    ctx.save();
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Apply Screen Shake
    ctx.save();
    if (this.effects.screenShakeTrauma > 0 && this.accessibility.screenShake > 0 && !this.accessibility.reducedEffects) {
      const shakeX = (this.random.presentation.nextFloat() - 0.5) * this.effects.screenShakeTrauma * 16 * this.accessibility.screenShake;
      const shakeY = (this.random.presentation.nextFloat() - 0.5) * this.effects.screenShakeTrauma * 16 * this.accessibility.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    ctx.save();
    if (this.combatZoom > 1.001) {
      ctx.translate(this.combatZoomFocusX, this.combatZoomFocusY);
      ctx.scale(this.combatZoom, this.combatZoom);
      ctx.translate(-this.combatZoomFocusX, -this.combatZoomFocusY);
    }

    // 1. Render Sky, Mountains, Hills, Terrain & Sea
    this.terrain.render(ctx, this.cameraX, this.currentMission);

    // 2. Render Enemies & Structures
    this.enemies.render(ctx, this.cameraX, (worldX) => this.terrain.getGroundContactY(worldX, this.currentMission), {
      selectedTargetId: this.player.stats.targetLockedId,
      playerX: this.player.stats.x,
      playerY: this.player.stats.y,
      ambientLight: this.currentMission.timeOfDay.ambientLight,
      gameplayCalm: this.currentMission.presentation?.gameplayCalm,
      reducedEffects: this.accessibility.reducedEffects,
    });

    // Naval hulls are drawn first, then a final water mask immerses their waterline.
    this.terrain.renderForegroundWater(ctx, this.currentMission);

    // 3. Render Player Aircraft
    if (this.gameState === 'EJECTING' && this.lossSnapshot) {
      const loss = this.lossSnapshot;
      if (!loss.impacted) {
        SpriteAssetManager.drawSprite(ctx, 'player_jet', loss.aircraftX - this.cameraX, loss.aircraftY, 96, 32, {
          rotation: loss.aircraftRotation,
          opacity: 0.82,
          flipX: loss.facing === -1,
        });
      } else {
        SpriteAssetManager.drawSpriteFrame(ctx, 'combat_wrecks', 0, 3, loss.aircraftX - this.cameraX, loss.aircraftY - 11, 105, 48);
      }
      if (loss.pilotSurvived) {
        SpriteAssetManager.drawSpriteFrame(ctx, 'harrier_ejection', loss.ejectionFrame, 4, loss.pilotX - this.cameraX, loss.pilotY, loss.ejectionFrame === 3 ? 78 : 54, loss.ejectionFrame === 3 ? 105 : 70);
      }
    } else if (this.player.stats.health > 0) {
      this.player.render(
        ctx,
        this.cameraX,
        (worldX) => this.terrain.getGroundContactY(worldX, this.currentMission),
        this.currentMission.timeOfDay.ambientLight,
        this.accessibility.reducedEffects,
      );
    }

    // 4. Render Weapons & Projectiles
    this.weapons.render(ctx, this.cameraX, (worldX) => this.terrain.getGroundContactY(worldX, this.currentMission), {
      playerX: this.player.stats.x,
      playerY: this.player.stats.y,
      ambientLight: this.currentMission.timeOfDay.ambientLight,
      reducedEffects: this.accessibility.reducedEffects,
    });

    // 5. Render Layered Explosions & Particles
    this.effects.render(ctx, this.cameraX);

    ctx.restore();

    // 6. Impact Flash Overlay
    if (this.effects.flashAlpha > 0) {
      ctx.fillStyle = this.effects.flashColor;
      ctx.globalAlpha = this.effects.flashAlpha;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
    ctx.restore();
  }
}

function createEmptyCombatFeedback(): CombatFeedbackState {
  return {
    hitMarkerTicks: 0,
    hitWeapon: null,
    hitOutcome: null,
    hitAspect: null,
    hitTargetName: null,
    damageWarningTicks: 0,
    threatDirection: null,
    incomingMissileDirection: null,
    radioCaption: null,
    radioCaptionTicks: 0,
    airThreatState: null,
    airThreatDirection: null,
    airThreatTicks: 0,
    unidentifiedContacts: 0,
    identificationProgress: 0,
    targetingTrackProgress: 0,
  };
}

function createEmptyCombatMetrics(): CombatDiagnosticMetrics {
  return {
    damageReceived: { AIRCRAFT_GUN: 0, SAM_MISSILE: 0, FLAK: 0, GROUND_FIRE: 0, IMPACT: 0 },
    weaponHits: { CANNON: 0, MISSILE: 0, BOMB: 0, ROCKET: 0 },
    enemyAircraftDestroyed: 0,
    missileWarnings: 0,
    warningAcknowledgements: 0,
    countermeasureSuccesses: 0,
    combatTicks: 0,
    aircraftLossPhase: 'NONE',
  };
}

export type GameState = 'MENU' | 'MISSION_AUTHORING' | 'LANDING_PRACTICE' | 'SHOWCASE_SELECT' | 'SHOWCASE_COMPLETE' | 'CONTROL_CONCEPT_TEST' | 'CONTROL_CONCEPT_REVIEW' | 'VALIDATION_RUNS' | 'CAMPAIGN_VALIDATION' | 'VALIDATION_REVIEW' | 'CHAPTER_SELECT' | 'CAMPAIGN_MAP' | 'NORWEGIAN_MAP' | 'OPERATIONS_BOARD' | 'OPERATION_DOSSIER' | 'OPERATION_AFTER_ACTION' | 'BRIEFING' | 'PLAYING' | 'PAUSED' | 'EJECTING' | 'SERVICING' | 'DEBRIEFING' | 'GAME_OVER' | 'VICTORY' | 'EPILOGUE';

export type WeaponType = 'CANNON' | 'MISSILE' | 'BOMB' | 'ROCKET' | 'FLARE';

export type AltitudeBand = 'LOW' | 'MEDIUM' | 'HIGH';

export type DifficultyPreset = 'ARCADE' | 'PILOT' | 'VETERAN';

export interface CombatDifficultyProfile {
  difficulty: DifficultyPreset;
  detection: number;
  accuracy: number;
  reloadTime: number;
  incomingDamage: number;
  landingTolerance: number;
  aircraftTurnRate: number;
  decisionDelay: number;
  playerLockTime: number;
  enemyLaunchWarningTicks: number;
}

export type RenderQuality = 'LOW' | 'MEDIUM' | 'HIGH';
export type RenderQualityPreference = 'AUTO' | RenderQuality;

export interface PerformanceSnapshot {
  preference: RenderQualityPreference;
  activeQuality: RenderQuality;
  averageFrameMs: number;
  p95FrameMs: number;
  effectiveFps: number;
  longFramePercent: number;
  sampleCount: number;
  deviceClass: 'MOBILE' | 'DESKTOP';
  resolutionScale: number;
  particleBudget: number;
}

export interface IssueReportV1 {
  version: 1;
  release: { version: string; buildId: string; channel: 'RELEASE_CANDIDATE' | 'DEVELOPMENT' };
  generatedAt: string;
  runtime: {
    viewport: { width: number; height: number; devicePixelRatio: number };
    online: boolean;
    standalone: boolean;
    inputDevice: InputDevice;
  };
  campaign: {
    saveVersion: number;
    activeChapter: CampaignChapterId;
    completedMissionCount: number;
    difficulty: DifficultyPreset;
    renderQuality: RenderQualityPreference;
    accessibility: AccessibilitySettings;
  };
  operation: { active: boolean; generationVersion: OperationGenerationVersion | null; sortieIndex: number | null };
  performance: PerformanceSnapshot | null;
  recentDiagnostics: Omit<DiagnosticSessionV3, 'operationSeed'>[];
}

export type LoadoutPreset = 'FLEET_CAP' | 'STRIKE' | 'CLOSE_SUPPORT';

export type InputAction =
  | 'PITCH_UP'
  | 'PITCH_DOWN'
  | 'THROTTLE_DOWN'
  | 'THROTTLE_UP'
  | 'VTOL'
  | 'PRIMARY_FIRE'
  | 'SECONDARY_FIRE'
  | 'CYCLE_WEAPON'
  | 'COUNTERMEASURE'
  | 'PAUSE';

export type InputDevice = 'KEYBOARD' | 'GAMEPAD' | 'TOUCH';

export type LandingPracticeType = 'CARRIER_ROLLING' | 'CARRIER_VERTICAL' | 'FARP_VERTICAL';

export interface RecoveryGuidance {
  site: 'CARRIER' | 'FORWARD_BASE';
  distance: number;
  deckOffset: number;
  forwardSpeed: number;
  descentRate: number;
  nozzleAngle: number;
  status: 'INTERCEPT' | 'ALIGN' | 'REDUCE_SPEED' | 'CHECK_SINK' | 'STABLE';
}

export interface InputBindingProfile {
  keyboard: Record<InputAction, string[]>;
  gamepad: Partial<Record<InputAction, number>>;
}

export interface AccessibilitySettings {
  radioCaptions: boolean;
  /** Retained for V3/V4 save compatibility; mirrors hudContrast. */
  highContrastHud: boolean;
  hudContrast: ContrastPreset;
  textContrast: ContrastPreset;
  reducedEffects: boolean;
  screenShake: number;
  hudScale: HudScalePreset;
  /** Presentation-only camera framing; never changes simulation geometry. */
  combatZoom?: CombatZoomPreset;
}

export type HudScalePreset = 'AUTO' | 'COMPACT' | 'STANDARD' | 'LARGE';
export type ContrastPreset = 'STANDARD' | 'HIGH';
export type CombatZoomPreset = 'OFF' | 'SMART';

export type TrainingStepId = 'LAUNCH' | 'PITCH' | 'THROTTLE' | 'CANNON' | 'TARGET' | 'SIDEWINDER' | 'COUNTERMEASURE' | 'VTOL' | 'RECOVERY';

export interface TrainingStep {
  id: TrainingStepId;
  action?: InputAction;
  title: string;
  instruction: string;
}

export interface TrainingRuntimeState {
  enabled: boolean;
  completed: boolean;
  skipped: boolean;
  currentIndex: number;
  currentStep: TrainingStep | null;
}

export interface CombatFeedbackState {
  hitMarkerTicks: number;
  hitWeapon: Exclude<WeaponType, 'FLARE'> | null;
  hitOutcome: HitOutcome | null;
  hitAspect: DamageAspect | null;
  hitTargetName: string | null;
  damageWarningTicks: number;
  threatDirection: 'LEFT' | 'RIGHT' | null;
  incomingMissileDirection: 'LEFT' | 'RIGHT' | null;
  radioCaption: string | null;
  radioCaptionTicks: number;
  airThreatState: 'DETECTED' | 'TRACKING' | 'FIRING' | null;
  airThreatDirection: 'LEFT' | 'RIGHT' | null;
  airThreatTicks: number;
  unidentifiedContacts: number;
  identificationProgress: number;
  targetingTrackProgress: number;
}

export interface AircraftSubsystems {
  engine: number;        // 1.0 = healthy, 0 = ruined (reduces max speed & acceleration)
  flightControls: number; // 1.0 = healthy (affects pitch responsiveness)
  targeting: number;      // 1.0 = healthy (affects missile lock speed)
  weapons: number;        // 1.0 = healthy (affects cannon heat dissipation & jam risk)
  hydraulics: number;    // 1.0 = healthy (affects VTOL transition speed)
  fuelTank: number;      // 1.0 = healthy (below 0.5 creates fuel leak)
}

export interface PlayerStats {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Stable visual and weapon heading. Changes only during a controlled low-speed reversal. */
  facing: -1 | 1;
  rotation: number; // in radians
  pitchAngle: number;
  thrust: number; // 0 to 1
  vtolMode: boolean; // true = hover / VTOL vectoring mode
  vtolTransition: number; // 0.0 (horizontal) to 1.0 (full VTOL hover)
  health: number; // 0 to 100
  maxHealth: number;
  fuel: number; // 0 to 100
  maxFuel: number;
  cannonHeat: number; // 0 to 100
  cannonOverheated: boolean;
  missiles: number;
  maxMissiles: number;
  bombs: number;
  maxBombs: number;
  rockets: number;
  maxRockets: number;
  flares: number;
  maxFlares: number;
  selectedWeapon: WeaponType;
  subsystems: AircraftSubsystems;
  gearDown: boolean;
  gearProgress: number; // 0.0 (up) to 1.0 (down)
  isOnCarrier: boolean;
  isTakingOff: boolean;
  isLanding: boolean;
  carrierLandingGrade: 'PERFECT' | 'SAFE' | 'HARD' | 'FAILED' | null;
  targetLockedId: string | null;
  lockProgress: number; // 0 to 1
  altitudeBand: AltitudeBand;
  speedKnots: number;
}

export type EnemyCategory = 'GROUND' | 'AIR' | 'NAVAL' | 'STRUCTURE';

export type DamageAspect = 'FRONT' | 'REAR' | 'TOP' | 'UNDERSIDE';
export type HitOutcome = 'GLANCING' | 'PENETRATED' | 'CRITICAL' | 'DESTROYED';
export type DamageSubsystem = 'ENGINE' | 'FLIGHT_CONTROLS' | 'WEAPONS' | 'TRACKS' | 'TURRET' | 'PROPULSION' | 'COMMAND';

export type AircraftVariant = 'MIG_21BIS' | 'MIG_23ML' | 'MIG_29A' | 'MI_24D' | 'TU_16K' | 'SU_24M';

export type AirCombatState =
  | 'FORMATION_INGRESS'
  | 'PATROL'
  | 'DETECTION'
  | 'PURSUIT'
  | 'ATTACK_PASS'
  | 'OVERSHOOT'
  | 'DISENGAGE'
  | 'REJOIN'
  | 'BASE_STRIKE'
  | 'STRIKE_EGRESS';

export type AirCombatDoctrine = 'BOOM_AND_ZOOM' | 'STANDOFF_INTERCEPT' | 'COORDINATED_FIGHTER' | 'TERRAIN_GUNSHIP';
export type FormationRole = 'LEAD' | 'ELEMENT' | 'TRAIL' | 'SOLO';

export interface EnemyAircraftProfile {
  doctrine: AirCombatDoctrine;
  cruiseSpeed: number;
  attackSpeed: number;
  detectionRange: number;
  attackRange: number;
  minimumAttackRange: number;
  acceleration: number;
  maximumTurnRate: number;
  terrainClearance: number;
  disengageTicks: number;
  decisionDelayTicks: number;
}

export interface AirCombatRuntimeState {
  state: AirCombatState;
  doctrine: AirCombatDoctrine;
  formationRole: FormationRole;
  formationId: string;
  slotIndex: number;
  decisionTick: number;
  stateEnteredTick: number;
  desiredHeading: number;
  displayedPitch: number;
  firedThisPass: boolean;
  warningIssued: boolean;
}

export interface AirCombatSnapshot {
  enemyId: string;
  state: AirCombatState;
  doctrine: AirCombatDoctrine;
  formationRole: FormationRole;
  formationId: string;
  decisionTick: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  displayedPitch: number;
}

export type TerrainProfile =
  | 'COASTAL_STRIKE'
  | 'FJORD_PASS'
  | 'COAST_ROAD'
  | 'NIGHT_AIRBASE'
  | 'BEACHHEAD'
  | 'OPEN_SEA'
  | 'ISLAND_CAUSEWAY'
  | 'FORWARD_BASE'
  | 'FORTRESS'
  | 'ARCTIC_OPEN_SEA'
  | 'ARCTIC_DEEP_FJORD'
  | 'ARCTIC_BRIDGEHEAD'
  | 'POLAR_NIGHT_PLATEAU'
  | 'NORTH_CAPE_FORTRESS';

export type EnemyType =
  | 'RADAR_STATION'
  | 'SAM_LAUNCHER'
  | 'AA_FLAK_GUN'
  | 'TANK'
  | 'APC'
  | 'COMMAND_VEHICLE'
  | 'FUEL_DEPOT'
  | 'BRIDGE_SEGMENT'
  | 'COMMAND_BUNKER'
  | 'PATROL_FIGHTER'
  | 'INTERCEPTOR'
  | 'ATTACK_HELI'
  | 'COMBAT_DRONE'
  | 'HEAVY_BOMBER'
  | 'LANDING_CRAFT'
  | 'COASTAL_ARTILLERY'
  | 'SEARCHLIGHT'
  | 'PROTECTED_SETTLEMENT'
  | 'SUBMARINE_PEN'
  | 'PATROL_BOAT'
  | 'MISSILE_CORVETTE'
  | 'ANTI_SHIP_MISSILE'
  | 'CIVILIAN_CARGO_SHIP'
  | 'CIVILIAN_HARBOUR_BUILDING'
  | 'DOWNED_PILOT';

export interface EnemyUnit {
  id: string;
  type: EnemyType;
  category: EnemyCategory;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  isTargetable: boolean;
  isPrimaryObjective?: boolean;
  isSecondaryObjective?: boolean;
  isCivilian?: boolean; // ROE penalty if destroyed!
  isFriendly?: boolean;
  pointsValue: number;
  rotation: number;
  radarDishAngle?: number;
  turretAngle?: number;
  fireCooldown: number;
  reloadTime: number;
  detectionRange: number;
  accuracy: number;
  stateTimer: number;
  state: string;
  flakBurstCount?: number;
  customColor?: string;
  aircraftVariant?: AircraftVariant;
  deathStage?: number;
  deathTimer?: number;
  salvosRemaining?: number;
  targetX?: number;
  hasScoredImpact?: boolean;
  strikePassesRemaining?: number;
  airCombat?: AirCombatRuntimeState;
  damageStage?: 0 | 1 | 2;
  damageEffectTimer?: number;
  identificationRequired?: boolean;
  identificationTicksRequired?: number;
  identificationProgress?: number;
  identified?: boolean;
  targetingTrackTicksRequired?: number;
  targetingTrackProgress?: number;
  targetingTrackEstablished?: boolean;
  targetingTrackDamage?: number;
  lastHitAspect?: DamageAspect;
  damagedSubsystem?: DamageSubsystem;
  sinkProgress?: number;
}

export interface Projectile {
  id: string;
  type: 'CANNON_ROUND' | 'MISSILE' | 'BOMB' | 'ROCKET' | 'ENEMY_BULLET' | 'ENEMY_MISSILE' | 'ENEMY_FLAK' | 'FLARE';
  x: number;
  y: number;
  vx: number;
  vy: number;
  source: 'PLAYER' | 'ENEMY';
  targetId?: string | null;
  damage: number;
  radius: number;
  life: number;
  maxLife: number;
  rotation: number;
  homingStrength?: number;
  trailTimer?: number;
  divertedByFlare?: boolean;
  ageTicks?: number;
  motorTicks?: number;
  tracer?: boolean;
  detonated?: boolean;
}

export interface BlastDamageEvent {
  projectile: Projectile;
  x: number;
  y: number;
  surface: ImpactSurface;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  type: 'SMOKE' | 'FIRE' | 'SPARK' | 'DEBRIS' | 'WATER_SPRAY' | 'SHOCKWAVE' | 'CLOUD' | 'TRACER_GLOW' | 'RAIN' | 'FLAK_SMOKE';
  gravity?: number;
  drag?: number;
}

export interface Explosion {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  stage: number; // 0: flash, 1: shockwave, 2: fireball, 3: secondary fire, 4: smoke column
  life: number;
  maxLife: number;
  intensity: number;
  kind?: CombatEffectKind;
  surface?: ImpactSurface;
}

export type CombatEffectKind =
  | 'GENERIC'
  | 'CANNON_IMPACT'
  | 'MISSILE_BLAST'
  | 'ROCKET_BLAST'
  | 'BOMB_BLAST'
  | 'SECONDARY'
  | 'AIRCRAFT_BREAKUP'
  | 'NAVAL_BLAST';

export type ImpactSurface = 'AIR' | 'GROUND' | 'WATER' | 'TARGET';

export interface CombatFlowState {
  multiplier: number; // 1.0 to 5.0
  meter: number;      // 0 to 100
  decayTimer: number;
  streakCount: number;
  lastActionText: string;
  lastActionTimer: number;
}

export interface MissionObjective {
  id: string;
  description: string;
  isPrimary: boolean;
  completed: boolean;
  requiredCount: number;
  currentCount: number;
  targetType: EnemyType | 'RESCUE' | 'LANDING' | 'DAMAGE_ALL' | 'DEFEND_ASSET';
  points: number;
  active?: boolean;
}

export type MissionTrigger =
  | { type: 'ELAPSED_TICKS'; ticks: number }
  | { type: 'PLAYER_X'; worldX: number }
  | { type: 'OBJECTIVE_COMPLETE'; objectiveId: string }
  | { type: 'OBJECTIVES_COMPLETE'; objectiveIds: string[] }
  | { type: 'ALERT_AT_LEAST'; level: number }
  | { type: 'DEFENDED_ASSET_AT_MOST'; integrity: number }
  | { type: 'ENEMY_DESTROYED'; enemyIds: string[] }
  | { type: 'ENEMY_CROSSED_X'; enemyIds: string[]; worldX: number };

export type MissionAction =
  | { type: 'SPAWN'; enemies: EnemyUnit[] }
  | { type: 'ACTIVATE_TARGETS'; enemyIds: string[] }
  | { type: 'UNLOCK_OBJECTIVE'; objectiveId: string }
  | { type: 'COMPLETE_OBJECTIVE'; objectiveId: string }
  | { type: 'SET_PHASE'; phaseId: string }
  | { type: 'SET_ALERT'; level: number }
  | { type: 'RADIO'; message: string }
  | { type: 'FAIL_MISSION'; message: string };

export interface MissionEvent {
  id: string;
  trigger: MissionTrigger;
  actions: MissionAction[];
}

export interface MissionPhase {
  id: string;
  label: string;
}

export interface MissionDirectorState {
  elapsedTicks: number;
  phaseId: string;
  phaseLabel: string;
  firedEventIds: string[];
  alertLevel: number;
  nextWaveTicks: number | null;
  failureMessage: string | null;
}

export interface TerrainContactProfile {
  surfaceOffset?: number;
  collisionClearance?: number;
  backdropKey?: 'JANUS_CAUSEWAY' | 'JANUS_AIRBASE' | 'SKELD_DEFENCE' | 'BASTION_FORTRESS';
  heightProfile?: AuthoredTerrainHeightProfile;
}

export interface AuthoredTerrainHeightProfile {
  startWorldX: number;
  endWorldX: number;
  samples: Array<number | null>;
}

export type ArcticWeatherKind = 'SNOW' | 'FREEZING_RAIN' | 'WHITEOUT' | 'SEA_FOG' | 'ICE_SPRAY' | 'LOW_WINTER_SUN';

export interface ArcticWeatherProfile {
  id: string;
  kind: ArcticWeatherKind;
  seed: number;
  intensity: number;
  visibilityFloor: number;
  cycleTicks: number;
  windDirection: -1 | 1;
  essentialCueOpacity: number;
}

export interface ArcticWeatherState {
  tick: number;
  phase: number;
  visibility: number;
  precipitation: number;
  fog: number;
  iceSpray: number;
}

export interface RescueBeaconState {
  bearing: 'LEFT' | 'RIGHT' | 'ON_STATION';
  strength: number;
  distance: number;
  pickupProgress: number;
  crewLocated: boolean;
  crewAboard: boolean;
}

export interface MissionAlertProfile {
  exposureStartX: number;
  proximityX: number;
  radarType: EnemyType;
  baseGainPerTick: number;
  exposedGainPerTick: number;
  proximityGainPerTick: number;
  radarDestroyedMultiplier: number;
}

export interface WeatherEffect {
  condition: 'CLEAR' | 'OVERCAST' | 'RAIN' | 'THUNDERSTORM' | 'MIST';
  windSpeed: number; // affects bomb drop drift slightly
  cloudsDensity: number;
  lightningFrequency: number;
}

export interface TimeOfDay {
  time: 'DAWN' | 'DAY' | 'SUNSET' | 'NIGHT';
  ambientLight: number; // 0.2 to 1.0
  skyTopColor: string;
  skyBottomColor: string;
  sunColor: string;
  fogColor: string;
}

export type SeaState = 'CALM' | 'MODERATE' | 'HEAVY';

export interface EnvironmentPresentationProfile {
  id: string;
  backdropAsset: string;
  backdropFilter: string;
  overlayColour: string;
  vignetteStrength: number;
  parallax: number;
  overscan: number;
  seaState: SeaState;
  hazeDensity: number;
  sprayIntensity: number;
  rainDensity: number;
  /** Extra source crop used only for very wide displays to keep action framed. */
  ultrawideFocus?: number;
  /** Gentle contrast suppression through the flight corridor, from 0 to 1. */
  gameplayCalm?: number;
}

export interface SpriteAnimationClip {
  name: string;
  frames: number[];
  framesPerSecond: number;
  loop: boolean;
}

export interface SpriteEffectAttachment {
  id: string;
  x: number;
  y: number;
}

export interface SpritePresentationMetadata {
  contactAnchor: { x: number; y: number };
  shadowFootprint: { width: number; offsetY: number };
  animationClips: SpriteAnimationClip[];
  damageFrames: Partial<Record<'DAMAGED' | 'CRITICAL' | 'DESTROYED', number>>;
  effectAttachments: SpriteEffectAttachment[];
}

export type AudioMixerCategory = 'ENGINE' | 'WEAPONS' | 'IMPACTS' | 'WARNINGS' | 'RADIO' | 'AMBIENCE' | 'INTERFACE';

export interface AudioCueDefinition {
  id: string;
  category: AudioMixerCategory;
  gain: number;
  playbackRateMin: number;
  playbackRateMax: number;
  maximumVoices: number;
  priority?: 'BACKGROUND' | 'STANDARD' | 'CRITICAL';
  duckingSeconds?: number;
  samplePath?: string;
  loop?: boolean;
}

export interface EngineAudioState {
  throttleRatio: number;
  speedRatio: number;
  vtolRatio: number;
  damageRatio: number;
}

export interface PegasusLayerMix {
  coreGain: number;
  turbineGain: number;
  exhaustGain: number;
  windGain: number;
  vtolGain: number;
  damageGain: number;
  coreFrequency: number;
  turbineFrequency: number;
  exhaustCutoff: number;
  windCutoff: number;
}

export type MissionRadioMoment = 'LAUNCH' | 'CONTACT' | 'RECOVERY';

export interface MissionRadioCallDefinition {
  id: string;
  missionId: string;
  moment: MissionRadioMoment;
  speaker: 'INVINCIBLE' | 'SKELD' | 'MAGIC' | 'STRIKE_CONTROL' | 'RESCUE_CONTROL';
  caption: string;
}

export interface MissionDefinition {
  id: string;
  codeName: string;
  title: string;
  dayNumber: number;
  timeString: string;
  theater: string;
  terrainProfile?: TerrainProfile;
  weather: WeatherEffect;
  timeOfDay: TimeOfDay;
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  briefingText: string;
  tacticalNotes: string[];
  rulesOfEngagement: string;
  mapLength: number; // in world coordinates (e.g. 14000)
  hasCarrierLaunch: boolean;
  hasCarrierRecovery: boolean;
  launchSite?: 'CARRIER' | 'FORWARD_BASE';
  recoverySite?: 'CARRIER' | 'FORWARD_BASE';
  carrierX: number;
  carrierLandingX: number;
  defendedAsset?: {
    type: 'CARRIER' | 'FORWARD_BASE' | 'LANDING_FORCE';
    worldX: number;
    startingIntegrity: number;
    failureThreshold: number;
  };
  phases?: MissionPhase[];
  events?: MissionEvent[];
  alertProfile?: MissionAlertProfile;
  terrainContact?: TerrainContactProfile;
  arcticWeather?: ArcticWeatherProfile;
  operationModifiers?: OperationalModifier[];
  presentation?: EnvironmentPresentationProfile;
  objectives: MissionObjective[];
  spawnEnemies: () => EnemyUnit[];
}

export interface MissionLaunchContext {
  simulationSeed?: number;
}

export interface VisualCaptureManifestV1 {
  version: 1;
  releaseVersion: string;
  buildId: string;
  generatedAt: string;
  servedTitle: string;
  sourceUrl: string;
  captures: Array<{
    file: string;
    sha256: string;
    missionId: string;
    missionNumber: number;
    viewport: string;
    width: number;
    height: number;
    routeProgress: number | null;
  }>;
}

export interface ReleaseDefectV1 {
  version: 1;
  id: string;
  title: string;
  severity: 'BLOCKER' | 'MAJOR' | 'MINOR';
  affectedBuild: string;
  status: 'OPEN' | 'RESOLVED' | 'HUMAN_VALIDATION_REQUIRED';
  reproduction: string;
  resolution: string | null;
  verification: string[];
}

export type MissionTemplate = MissionDefinition;
export type MissionRuntime = MissionDefinition;

export interface CampaignSectorState {
  id: string;
  name: string;
  missionIds: string[];
  secured: boolean;
  forwardBase: boolean;
}

export interface CampaignSaveV1 {
  version: 1;
  unlockedMission: number;
  completedMissionIds: string[];
  bestScores: Record<string, number>;
  campaignFlags: string[];
  sectors: CampaignSectorState[];
  difficulty: DifficultyPreset;
  renderQuality: RenderQualityPreference;
  controlScale: number;
  controlOpacity: number;
  leftHanded: boolean;
}

export interface AircraftCondition {
  health: number;
  fuel: number;
  subsystems: AircraftSubsystems;
}

export interface ServiceResult {
  siteType: 'CARRIER' | 'FORWARD_BASE';
  incoming: AircraftCondition;
  outgoing: AircraftCondition;
  loadout: LoadoutPreset;
}

export interface DefendedAssetState {
  type: 'CARRIER' | 'FORWARD_BASE' | 'LANDING_FORCE';
  worldX: number;
  integrity: number;
  maxIntegrity: number;
  failureThreshold: number;
  incomingMissiles: number;
}

export interface CampaignSaveV2 extends Omit<CampaignSaveV1, 'version'> {
  version: 2;
  aircraftCondition: AircraftCondition;
  selectedLoadout: LoadoutPreset;
}

export interface CampaignSaveV3 extends Omit<CampaignSaveV2, 'version'> {
  version: 3;
  tutorialCompleted: boolean;
  tutorialDismissed: boolean;
  inputBindings: InputBindingProfile;
  accessibility: AccessibilitySettings;
  diagnosticsEnabled: boolean;
}

export type CampaignChapterId = 'NORTHERN_LANCE' | 'NORWEGIAN_SEA';
export type CampaignMissionStatus = 'PLAYABLE' | 'IN_PRODUCTION';

export interface CampaignChapterMissionEntry {
  missionId: string;
  number: number;
  title: string;
  operationName: string;
  sector: string;
  summary: string;
  status: CampaignMissionStatus;
}

export interface CampaignChapterDefinition {
  id: CampaignChapterId;
  title: string;
  subtitle: string;
  year: number;
  missionIds: readonly string[];
  missions: readonly CampaignChapterMissionEntry[];
  unlockAfterMissionId: string | null;
}

export interface CampaignChapterProgress {
  chapterId: CampaignChapterId;
  unlocked: boolean;
  completedMissionIds: string[];
  bestScores: Record<string, number>;
  completedAt: string | null;
}

export interface PilotRecordV1 {
  sorties: number;
  victories: number;
  ejections: number;
  losses: number;
}

export interface CampaignSaveV4 extends Omit<CampaignSaveV3, 'version'> {
  version: 4;
  activeChapter: CampaignChapterId;
  chapterProgress: Record<CampaignChapterId, CampaignChapterProgress>;
  pilotRecord: PilotRecordV1;
  touchSafeInset: number;
  touchLift: number;
  touchClearView: boolean;
}

export type CampaignSave = CampaignSaveV4;

export interface ShowcaseMissionEntry {
  missionId: string;
  strapline: string;
  artwork: string;
  accent: 'CYAN' | 'AMBER' | 'RED';
  loadout: LoadoutPreset;
}

export interface ShowcaseManifest {
  version: 1;
  title: string;
  missionIds: string[];
  entries: ShowcaseMissionEntry[];
}

export interface ShowcaseProgress {
  version: 1;
  completedMissionIds: string[];
  bestScores: Record<string, number>;
  completedAt: string | null;
}

export interface DemoManifest {
  version: 1;
  buildId: string;
  title: string;
  storageNamespace: 'IRON_KESTREL_DEMO_';
  initialDownloadBudgetBytes: number;
  missionIds: ['m1_coastal_strike', 'm6_fleet_defence'];
  entries: [ShowcaseMissionEntry, ShowcaseMissionEntry];
  commercialEditionUrl: string;
}

export interface DemoProgress {
  version: 1;
  completedMissionIds: string[];
  bestScores: Record<string, number>;
  guidedTrainingCompleted: boolean;
  completedAt: string | null;
}

export interface DemoTransferV1 {
  format: 'IRON_KESTREL_DEMO_TRANSFER';
  version: 1;
  exportedAt: string;
  progress: DemoProgress;
}

export type OperationArchetype = 'FLEET_CAP' | 'SEAD' | 'ARMOURED_INTERDICTION' | 'PILOT_RESCUE' | 'FARP_DEFENCE' | 'DEEP_STRIKE';

export type MedalTier = 'BRONZE' | 'SILVER' | 'GOLD';

export type OperationLength = 3 | 5;
export type OperationContentSet = 'NORTH_ATLANTIC' | 'NORWEGIAN_SEA';
export type OperationalModifier = 'DAMAGED_RUNWAY' | 'LIMITED_VISIBILITY' | 'RADAR_DISRUPTION' | 'THREATENED_RECOVERY';

export interface OperationSortie {
  index: number;
  missionSeed: number;
  archetype: OperationArchetype;
  title: string;
  terrainProfile: TerrainProfile;
  weather: WeatherEffect['condition'];
  timeOfDay: TimeOfDay['time'];
  recoverySite: 'CARRIER' | 'FORWARD_BASE';
  expectedThreats: string[];
  recommendedLoadout: LoadoutPreset;
  modifiers?: OperationalModifier[];
}

export interface OperationBlueprintV1 {
  version: 1;
  seed: number;
  seedCode: string;
  codeName: string;
  theater: string;
  difficulty: DifficultyPreset;
  sorties: OperationSortie[];
}

export interface OperationBlueprintV2 {
  version: 2;
  contentSet: 'NORWEGIAN_SEA';
  seed: number;
  seedCode: string;
  codeName: string;
  theater: string;
  difficulty: DifficultyPreset;
  sorties: OperationSortie[];
}

export interface OperationBlueprintV3 {
  version: 3;
  contentSet: OperationContentSet;
  sortieCount: OperationLength;
  seed: number;
  seedCode: string;
  codeName: string;
  theater: string;
  difficulty: DifficultyPreset;
  sorties: OperationSortie[];
}

export type OperationGenerationVersion = 1 | 2 | 3;
export type OperationBlueprint = OperationBlueprintV1 | OperationBlueprintV2 | OperationBlueprintV3;

export interface OperationSortieResultV1 {
  sortieIndex: number;
  archetype: OperationArchetype;
  score: number;
  simulationTicks: number;
  optionalObjectivesCompleted: number;
  landingGrade: GameScoreBreakdown['carrierLandingGrade'];
  pilotSurvived: boolean;
  defendedAssetIntegrity: number | null;
}

export interface OperationRunStateV1 {
  version: 1;
  blueprint: OperationBlueprint;
  currentSortieIndex: number;
  aircraftCondition: AircraftCondition;
  selectedLoadout: LoadoutPreset;
  retries: number;
  results: OperationSortieResultV1[];
}

export interface OperationDefendedAssetCondition {
  CARRIER: number;
  FORWARD_BASE: number;
}

export interface OperationRunStateV2 extends Omit<OperationRunStateV1, 'version'> {
  version: 2;
  defendedAssets: OperationDefendedAssetCondition;
}

export type OperationRunState = OperationRunStateV2;

export interface OperationRecordV1 {
  version: 1;
  generationVersion?: OperationGenerationVersion;
  seed: number;
  seedCode: string;
  difficulty: DifficultyPreset;
  medal: MedalTier;
  totalScore: number;
  simulationTicks: number;
  retries: number;
  landingGrades: Array<GameScoreBreakdown['carrierLandingGrade']>;
}

export interface OperationRecordV2 extends Omit<OperationRecordV1, 'version'> {
  version: 2;
  sortieCount: OperationLength;
  contentSet: OperationContentSet;
}

export interface OperationHistoryEntryV1 {
  seed: number;
  seedCode: string;
  generationVersion: OperationGenerationVersion;
  contentSet: OperationContentSet;
  sortieCount: OperationLength;
  difficulty: DifficultyPreset;
  codeName: string;
  lastPlayedAt: string;
  favourite: boolean;
}

export interface OperationsProfileV1 {
  version: 1;
  records: OperationRecordV1[];
  abandonedRuns: number;
}

export interface OperationsProfileV2 {
  version: 2;
  records: OperationRecordV2[];
  history: OperationHistoryEntryV1[];
  abandonedRuns: number;
}

export interface DiagnosticSessionV1 {
  version: 1;
  missionId: string;
  difficulty: DifficultyPreset;
  simulationTicks: number;
  result: 'VICTORY' | 'FAILURE' | 'ABORTED';
  completedObjectiveIds: string[];
  deathCause: 'TERRAIN' | 'ENEMY_FIRE' | 'DEFENDED_ASSET_LOST' | 'FUEL' | 'OTHER' | null;
  weaponsUsed: Record<WeaponType, number>;
  landingGrade: GameScoreBreakdown['carrierLandingGrade'];
  tutorialStepsCompleted: number;
  tutorialSkipped: boolean;
}

export interface DiagnosticSessionV2 extends Omit<DiagnosticSessionV1, 'version'> {
  version: 2;
  operationSeed: number | null;
  operationArchetype: OperationArchetype | null;
  operationSortieIndex: number | null;
  operationRetryCount: number;
}

export interface CombatDiagnosticMetrics {
  damageReceived: Record<'AIRCRAFT_GUN' | 'SAM_MISSILE' | 'FLAK' | 'GROUND_FIRE' | 'IMPACT', number>;
  weaponHits: Record<Exclude<WeaponType, 'FLARE'>, number>;
  enemyAircraftDestroyed: number;
  missileWarnings: number;
  warningAcknowledgements: number;
  countermeasureSuccesses: number;
  combatTicks: number;
  aircraftLossPhase: 'NONE' | 'EJECTION' | 'LOW_ALTITUDE_IMPACT';
}

export interface DiagnosticSessionV3 extends Omit<DiagnosticSessionV2, 'version'>, CombatDiagnosticMetrics {
  version: 3;
  buildId?: string | null;
}

export type DiagnosticSession = DiagnosticSessionV3;

export type ValidationDeviceClass = 'DESKTOP_KEYBOARD' | 'DESKTOP_GAMEPAD' | 'MOBILE_TOUCH';
export type ValidationInputProfile = 'DEFAULT' | 'REMAPPED';

export interface ValidationScenario {
  id: string;
  order: number;
  title: string;
  missionId: string;
  difficulty: DifficultyPreset;
  deviceClass: ValidationDeviceClass;
  inputProfile: ValidationInputProfile;
  guidedTraining: boolean;
  loadout: LoadoutPreset;
  accessibility: AccessibilitySettings;
  instruction: string;
  requiresCombatDamage: boolean;
}

export interface PlaytestRunResult {
  result: DiagnosticSessionV3['result'];
  simulationTicks: number;
  completedObjectiveIds: string[];
  retries: number;
  observedInputDevice: InputDevice;
  fighterWarnings: number;
  missileWarnings: number;
  damageReceived: CombatDiagnosticMetrics['damageReceived'];
  weaponsUsed: Record<WeaponType, number>;
  weaponHits: CombatDiagnosticMetrics['weaponHits'];
  ammunitionRemaining?: {
    missiles: number;
    bombs: number;
    rockets: number;
    flares: number;
  };
  landingGrade: DiagnosticSessionV3['landingGrade'];
  tutorialStepsCompleted: number;
  tutorialSkipped: boolean;
  aircraftLossPhase: DiagnosticSessionV3['aircraftLossPhase'];
}

export interface PlaytestResponse {
  warningNoticed: boolean;
  controlsClear: boolean;
  objectivesClear: boolean;
  failureReasonUnderstood: boolean;
  targetsReadable: boolean;
  ammunitionSufficient: boolean;
  recoveryAchievable: boolean;
  openingAttackFair: boolean;
  aircraftMovementNatural: boolean;
  externalHelpUsed: boolean;
  physicalInputConfirmed: boolean;
  hardwareDescription: string;
  observations: string;
  blockers: {
    unavoidableAttack: boolean;
    objectiveBlocker: boolean;
    impossibleRecovery: boolean;
    terrainPenetration: boolean;
    inputFailure: boolean;
  };
}

export interface PlaytestEvidenceV1 {
  version: 1;
  buildId: string;
  completedAt: string;
  scenarioId: string;
  run: PlaytestRunResult;
  response: PlaytestResponse;
}

export interface GameScoreBreakdown {
  aircraftDestroyed: number;
  aircraftPoints: number;
  groundUnitsDestroyed: number;
  groundPoints: number;
  navalUnitsDestroyed: number;
  navalPoints: number;
  objectivesCompleted: number;
  objectivePoints: number;
  precisionBombingBonus: number;
  flightStyleBonus: number;
  carrierLandingGrade: 'PERFECT' | 'SAFE' | 'HARD' | 'FAILED' | null;
  carrierLandingPoints: number;
  collateralDamageCount: number;
  collateralPenalty: number;
  maxCombatFlow: number;
  finalScore: number;
  timeTakenSeconds: number;
  isVictory: boolean;
  missilesIntercepted: number;
  carrierIntegrity: number | null;
  pilotSurvived: boolean | null;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  radioVoiceEnabled: boolean;
}

export interface GameOptions {
  crtMode: boolean;
  showFlightAssists: boolean;
  vibrationFeedback: boolean;
  difficulty: DifficultyPreset;
  renderQuality: RenderQualityPreference;
  audio: AudioSettings;
}

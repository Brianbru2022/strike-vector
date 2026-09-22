import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameEngine } from './game/GameEngine';
import { CAMPAIGN_MISSIONS } from './game/Missions';
import { CAMPAIGN_CHAPTERS } from './game/CampaignChapters';
import { AircraftCondition, CampaignChapterId, InputDevice, MissionDefinition, GameState, GameScoreBreakdown, OperationBlueprint, OperationRecordV2, OperationRunState, PerformanceSnapshot, PlaytestEvidenceV1, PlaytestResponse, PlaytestRunResult, ValidationScenario } from './types/game';
import { GAME_CONSTANTS } from './game/constants';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { BriefingScreen } from './components/BriefingScreen';
import { DebriefingScreen } from './components/DebriefingScreen';
import { HowToPlayModal } from './components/HowToPlayModal';
import { OptionsMenu } from './components/OptionsMenu';
import { TouchControls } from './components/TouchControls';
import { CampaignMap } from './components/CampaignMap';
import { loadCampaign, persistCampaign, recordMissionVictory, recordPilotSortie, setActiveCampaignChapter } from './game/Campaign';
import { actionForCode, detectInitialInputDevice } from './game/inputBindings';
import { InputAction } from './types/game';
import { Play, RotateCcw, Settings } from 'lucide-react';
import { soundEngine } from './audio/SoundEngine';
import { ServicingScreen } from './components/ServicingScreen';
import { CampaignEpilogue } from './components/CampaignEpilogue';
import { appendDiagnostic } from './game/Diagnostics';
import { generateOperationMission } from './game/DynamicOperations';
import { advanceOperation, clearActiveOperation, createOperationRecord, createOperationRun, incrementOperationRetry, loadActiveOperation, loadOperationsProfile, persistActiveOperation, recordAbandonedOperation, recordCompletedOperation, recordOperationSelection, resultFromScore, toggleOperationFavourite } from './game/Operations';
import { createShowcaseProgress, loadShowcaseProgress, persistShowcaseProgress, recordShowcaseVictory, SHOWCASE_MANIFEST } from './game/Showcase';
import { ShowcaseComplete, ShowcaseScreen } from './components/ShowcaseScreen';
import { DEFAULT_INPUT_BINDINGS } from './game/inputBindings';
import { appendPlaytestEvidence, clearPlaytestEvidence, loadPlaytestEvidence, VALIDATION_BUILD_ID, VALIDATION_REMAPPED_BINDINGS } from './game/Validation';
import { appendCampaignValidationEvidence, CAMPAIGN_VALIDATION_BUILD_ID, CampaignValidationEvidenceV1, clearCampaignValidationEvidence, loadCampaignValidationEvidence } from './game/CampaignValidation';
import { createLandingPracticeMission, LANDING_PRACTICES, LandingPracticeConfig } from './game/LandingPractice';
import { DEMO_BUILD, INTERNAL_TOOLS_COMPILED, ITCH_BUILD, RELEASE_FEATURES } from './game/ReleaseFeatures';
import { hashSeed } from './game/SeededRandom';
import { flushPlatformStorage, onPlatformLifecycleEvent } from './game/PlatformRuntime';
import { useControllerNavigation } from './game/useControllerNavigation';
import { GamepadInputState } from './game/GamepadInputState';
import { createDemoProgress, DEMO_MANIFEST, exportDemoTransfer, loadDemoProgress, persistDemoProgress, recordDemoVictory } from './game/Demo';
import { recordBetaEvent } from './game/BetaEvidence';
import { appendControlConceptEvidence, clearControlConceptEvidence, ControlConceptEvidenceV1, ControlConceptResponseV1, ControlConceptSlot, createControlConceptScenario, loadControlConceptEvidence } from './game/ControlConceptPlaytest';
import { RELEASE_INFO } from './game/Release';

const EXPERIENCE_MANIFEST = DEMO_BUILD ? DEMO_MANIFEST : SHOWCASE_MANIFEST;

const OperationsBoard = !DEMO_BUILD ? React.lazy(() => import('./components/OperationsBoard').then((module) => ({ default: module.OperationsBoard }))) : null;
const OperationDossier = !DEMO_BUILD ? React.lazy(() => import('./components/OperationDossier').then((module) => ({ default: module.OperationDossier }))) : null;
const OperationAfterAction = !DEMO_BUILD ? React.lazy(() => import('./components/OperationAfterAction').then((module) => ({ default: module.OperationAfterAction }))) : null;
const ValidationRunsScreen = INTERNAL_TOOLS_COMPILED
  ? React.lazy(() => import('./components/ValidationRunsScreen').then((module) => ({ default: module.ValidationRunsScreen })))
  : null;
const ValidationReview = INTERNAL_TOOLS_COMPILED
  ? React.lazy(() => import('./components/ValidationRunsScreen').then((module) => ({ default: module.ValidationReview })))
  : null;
const ControlConceptPlaytestScreen = INTERNAL_TOOLS_COMPILED
  ? React.lazy(() => import('./components/ControlConceptPlaytestScreen').then((module) => ({ default: module.ControlConceptPlaytestScreen })))
  : null;
const ControlConceptReview = INTERNAL_TOOLS_COMPILED
  ? React.lazy(() => import('./components/ControlConceptPlaytestScreen').then((module) => ({ default: module.ControlConceptReview })))
  : null;
const CampaignValidationScreen = INTERNAL_TOOLS_COMPILED
  ? React.lazy(() => import('./components/CampaignValidationScreen').then((module) => ({ default: module.CampaignValidationScreen })))
  : null;
const ChapterSelectScreen = !DEMO_BUILD ? React.lazy(() => import('./components/ChapterSelectScreen').then((module) => ({ default: module.ChapterSelectScreen }))) : null;
const NorwegianCampaignMap = !DEMO_BUILD ? React.lazy(() => import('./components/NorwegianCampaignMap').then((module) => ({ default: module.NorwegianCampaignMap }))) : null;
const LandingPracticeScreen = !DEMO_BUILD ? React.lazy(() => import('./components/LandingPracticeScreen').then((module) => ({ default: module.LandingPracticeScreen }))) : null;
const MissionAuthoringScreen = INTERNAL_TOOLS_COMPILED
  ? React.lazy(() => import('./components/MissionAuthoringScreen').then((module) => ({ default: module.MissionAuthoringScreen })))
  : null;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentMission, setCurrentMission] = useState<MissionDefinition>(CAMPAIGN_MISSIONS[0]);
  const [missionIndex, setMissionIndex] = useState(0);
  const [scoreData, setScoreData] = useState<GameScoreBreakdown | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [campaign, setCampaign] = useState(loadCampaign);
  const campaignRef = useRef(campaign);
  const [recoveredCondition, setRecoveredCondition] = useState<AircraftCondition | null>(null);
  const [activeOperation, setActiveOperation] = useState<OperationRunState | null>(loadActiveOperation);
  const activeOperationRef = useRef(activeOperation);
  const [operationsProfile, setOperationsProfile] = useState(loadOperationsProfile);
  const [completedOperation, setCompletedOperation] = useState<{ run: OperationRunState; record: OperationRecordV2 } | null>(null);
  const [showcaseProgress, setShowcaseProgress] = useState(() => DEMO_BUILD ? loadDemoProgress() : loadShowcaseProgress());
  const [showcasePosition, setShowcasePosition] = useState<number | null>(null);
  const showcasePositionRef = useRef<number | null>(null);
  const [playtestEvidence, setPlaytestEvidence] = useState<PlaytestEvidenceV1[]>(loadPlaytestEvidence);
  const [controlConceptEvidence, setControlConceptEvidence] = useState<ControlConceptEvidenceV1[]>(loadControlConceptEvidence);
  const [controlConceptSlot, setControlConceptSlot] = useState<ControlConceptSlot | null>(null);
  const controlConceptSlotRef = useRef<ControlConceptSlot | null>(null);
  const [campaignValidationEvidence, setCampaignValidationEvidence] = useState<CampaignValidationEvidenceV1[]>(loadCampaignValidationEvidence);
  const [validationScenario, setValidationScenario] = useState<ValidationScenario | null>(null);
  const validationScenarioRef = useRef<ValidationScenario | null>(null);
  const [validationRunResult, setValidationRunResult] = useState<PlaytestRunResult | null>(null);
  const validationRetriesRef = useRef(0);
  const landingPracticeRef = useRef<LandingPracticeConfig | null>(null);
  const authoringMissionRef = useRef(false);
  const [landingPracticeResult, setLandingPracticeResult] = useState<GameScoreBreakdown | null>(null);
  const initialInputDevice = useMemo(detectInitialInputDevice, []);
  const inputDeviceRef = useRef<InputDevice>(initialInputDevice);
  const gamepadInputRef = useRef(new GamepadInputState());
  const noteControllerNavigation = useCallback(() => setInputDevice((current) => current === 'GAMEPAD' ? current : 'GAMEPAD'), []);

  // Modals & Options
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  useControllerNavigation(gameState !== 'PLAYING' && gameState !== 'EJECTING', noteControllerNavigation);
  const [crtEnabled, setCrtEnabled] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [inputDevice, setInputDevice] = useState<InputDevice>(initialInputDevice);
  const [controllerNotice, setControllerNotice] = useState<string | null>(null);
  const [guidedTraining, setGuidedTraining] = useState(true);
  const [performanceSnapshot, setPerformanceSnapshot] = useState<PerformanceSnapshot | null>(null);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const effectiveAccessibility = useMemo(() => ({ ...campaign.accessibility, reducedEffects: campaign.accessibility.reducedEffects || systemReducedMotion }), [campaign.accessibility, systemReducedMotion]);
  const activeAccessibility = validationScenario?.accessibility ?? effectiveAccessibility;
  const activeInputBindings = validationScenario
    ? validationScenario.inputProfile === 'REMAPPED' ? VALIDATION_REMAPPED_BINDINGS : DEFAULT_INPUT_BINDINGS
    : campaign.inputBindings;
  const validationAvailable = RELEASE_FEATURES.validation;
  const authoringAvailable = RELEASE_FEATURES.authoring;

  // Periodic HUD state sync
  const [, setTick] = useState(0);

  useEffect(() => {
    campaignRef.current = campaign;
  }, [campaign]);

  useEffect(() => {
    if (ITCH_BUILD) recordBetaEvent('SESSION_STARTED');
  }, []);

  useEffect(() => {
    activeOperationRef.current = activeOperation;
  }, [activeOperation]);

  useEffect(() => {
    if (!controllerNotice) return;
    const timeout = window.setTimeout(() => setControllerNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [controllerNotice]);

  useEffect(() => {
    showcasePositionRef.current = showcasePosition;
  }, [showcasePosition]);

  useEffect(() => {
    validationScenarioRef.current = validationScenario;
  }, [validationScenario]);

  useEffect(() => {
    inputDeviceRef.current = inputDevice;
    engineRef.current?.noteInputDevice(inputDevice);
  }, [inputDevice]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setSystemReducedMotion(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  // Initialize Game Engine on mount
  useEffect(() => {
    const engine = new GameEngine(CAMPAIGN_MISSIONS[0]);
    engine.noteInputDevice(inputDeviceRef.current);
    engineRef.current = engine;
    setHighScore(engine.combatFlow.getBestScore());

    engine.onStateChange = (newState, finalScore) => {
      if (finalScore) {
        setScoreData(finalScore);
        if (landingPracticeRef.current) {
          setLandingPracticeResult(finalScore);
          setGameState('LANDING_PRACTICE');
          soundEngine.stopAll();
          return;
        }
        setHighScore(engine.combatFlow.getBestScore());
        const validation = validationScenarioRef.current;
        if (validation) {
          const diagnostic = engine.getDiagnosticSession(finalScore.isVictory ? 'VICTORY' : 'FAILURE');
          const warnings = engine.getValidationWarningExposure();
          const runResult: PlaytestRunResult = {
            result: diagnostic.result,
            simulationTicks: diagnostic.simulationTicks,
            completedObjectiveIds: diagnostic.completedObjectiveIds,
            retries: validationRetriesRef.current,
            observedInputDevice: inputDeviceRef.current,
            fighterWarnings: warnings.fighterWarnings,
            missileWarnings: warnings.missileWarnings,
            damageReceived: diagnostic.damageReceived,
            weaponsUsed: diagnostic.weaponsUsed,
            weaponHits: diagnostic.weaponHits,
            ammunitionRemaining: {
              missiles: engine.player.stats.missiles,
              bombs: engine.player.stats.bombs,
              rockets: engine.player.stats.rockets,
              flares: engine.player.stats.flares,
            },
            landingGrade: diagnostic.landingGrade,
            tutorialStepsCompleted: diagnostic.tutorialStepsCompleted,
            tutorialSkipped: diagnostic.tutorialSkipped,
            aircraftLossPhase: diagnostic.aircraftLossPhase,
          };
          setValidationRunResult(runResult);
          setGameState(controlConceptSlotRef.current ? 'CONTROL_CONCEPT_REVIEW' : 'VALIDATION_REVIEW');
          return;
        }
        setGameState(newState);
        if (ITCH_BUILD) recordBetaEvent('SORTIE_ENDED', {
          missionId: engine.currentMission.id,
          difficulty: campaignRef.current.difficulty,
          result: finalScore.isVictory ? 'VICTORY' : 'FAILURE',
          simulationTicks: engine.getDiagnosticSession(finalScore.isVictory ? 'VICTORY' : 'FAILURE').simulationTicks,
        });
        const operation = activeOperationRef.current;
        const operationSortie = operation?.blueprint.sorties[operation.currentSortieIndex];
        if (RELEASE_FEATURES.diagnostics && campaignRef.current.diagnosticsEnabled) {
          appendDiagnostic(engine.getDiagnosticSession(finalScore.isVictory ? 'VICTORY' : 'FAILURE', operation && operationSortie ? { seed: operation.blueprint.seed, archetype: operationSortie.archetype, sortieIndex: operation.currentSortieIndex, retries: operation.retries + (finalScore.isVictory ? 0 : 1) } : undefined));
        }
        const isOperationMission = Boolean(operation && engine.currentMission.id.startsWith(`op_${operation.blueprint.seed}_`));
        const campaignMissionIndex = CAMPAIGN_MISSIONS.findIndex((mission) => mission.id === engine.currentMission.id);
        const isShowcaseMission = showcasePositionRef.current !== null && EXPERIENCE_MANIFEST.missionIds.includes(engine.currentMission.id);
        const isCampaignRun = campaignMissionIndex >= 0 && !isShowcaseMission && !isOperationMission;
        if (finalScore.isVictory) {
          const landedCondition = engine.getAircraftCondition();
          if (isShowcaseMission) {
            setShowcaseProgress((previous) => {
              const next = DEMO_BUILD
                ? recordDemoVictory(previous as import('./types/game').DemoProgress, engine.currentMission.id, finalScore.finalScore, engine.getTrainingState().completed)
                : recordShowcaseVictory(previous as import('./types/game').ShowcaseProgress, engine.currentMission.id, finalScore.finalScore);
              if (DEMO_BUILD) persistDemoProgress(next as import('./types/game').DemoProgress); else persistShowcaseProgress(next as import('./types/game').ShowcaseProgress);
              return next;
            });
          } else {
            setRecoveredCondition(landedCondition);
          }
          if (isCampaignRun) {
            setCampaign((previous) => {
              const next = {
                ...recordPilotSortie(recordMissionVictory(previous, engine.currentMission.id, campaignMissionIndex, finalScore.finalScore), true, finalScore.pilotSurvived),
                aircraftCondition: landedCondition,
                tutorialCompleted: previous.tutorialCompleted || engine.getTrainingState().completed,
              };
              persistCampaign(next);
              return next;
            });
          }
        } else if (isOperationMission) {
          const failedRun = incrementOperationRetry(operation);
          activeOperationRef.current = failedRun;
          setActiveOperation(failedRun);
          persistActiveOperation(failedRun);
        } else if (isCampaignRun) {
          setCampaign((previous) => {
            const next = recordPilotSortie(previous, false, finalScore.pilotSurvived);
            persistCampaign(next);
            return next;
          });
        }
      } else setGameState(newState);
    };

    engine.onHUDUpdate = () => {
      setTick((t) => (t + 1) % 1000);
    };
    engine.onPerformanceUpdate = setPerformanceSnapshot;

    const ctx = canvasRef.current?.getContext('2d') || undefined;
    engine.start(ctx);

    const visualWindow = window as Window & { __STRIKE_VECTOR_VISUAL_AUDIT__?: {
      openMission: (index: number, routeProgress?: number) => { missionId: string; focusX: number };
      showCombatEffects: (mode: 'LAUNCH' | 'IMPACT' | 'DESTRUCTION') => void;
      inputSnapshot: () => typeof engine.input & { selectedWeapon: string; missiles: number; bombs: number; rockets: number; flares: number; health: number; trainingEnabled: boolean };
      effectsSnapshot: () => { projectiles: string[]; particles: number };
      setCombatZoom: (enabled: boolean) => void;
      combatPresentationSnapshot: () => ReturnType<typeof engine.getCombatPresentationSnapshot>;
      headingSnapshot: () => ReturnType<typeof engine.player.getHeadingPresentation> & { facing: -1 | 1; vx: number };
      stagePlayerTurnFrame: (frame: number) => void;
    }; __STRIKE_VECTOR_VALIDATION__?: { completeCurrent: (victory: boolean) => void } };
    if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true) {
      visualWindow.__STRIKE_VECTOR_VISUAL_AUDIT__ = {
        openMission: (index: number, routeProgress?: number) => {
          const mission = CAMPAIGN_MISSIONS[Math.max(0, Math.min(CAMPAIGN_MISSIONS.length - 1, Math.round(index)))];
          engine.setDifficulty('PILOT');
          engine.initMission(mission, undefined, 'CLOSE_SUPPORT', false);
          engine.player.launchFromCarrier(mission.launchSite);
          const initialTargets = engine.enemies.getEnemies().filter((enemy) => enemy.category !== 'AIR' && enemy.type !== 'ANTI_SHIP_MISSILE');
          const requestedFocus = routeProgress === undefined
            ? undefined
            : mission.mapLength * Math.max(0.08, Math.min(0.92, routeProgress));
          const focusX = requestedFocus ?? initialTargets[0]?.x ?? mission.mapLength * 0.5;
          const playerX = Math.max(200, focusX - 380);
          const groundY = engine.terrain.getGroundContactY(playerX, mission) ?? GAME_CONSTANTS.SEA_LEVEL_Y;
          Object.assign(engine.player.stats, { x: playerX, y: Math.max(100, groundY - 175), vx: 5.5, vy: 0, isOnCarrier: false, isTakingOff: false });
          engine.cameraX = Math.max(0, Math.min(mission.mapLength - GAME_CONSTANTS.VIEWPORT_WIDTH, playerX - 430));
          setCurrentMission(mission);
          setMissionIndex(index);
          setGuidedTraining(false);
          setGameState('PLAYING');
          return { missionId: mission.id, focusX };
        },
        showCombatEffects: (mode) => {
          visualWindow.__STRIKE_VECTOR_VISUAL_AUDIT__?.openMission(1, mode === 'DESTRUCTION' ? undefined : 0.5);
          engine.effects.reset();
          const stagedTarget = mode === 'DESTRUCTION'
            ? engine.enemies.getEnemies().find((enemy) => enemy.isAlive && (enemy.maxHealth >= 200 || enemy.type === 'RADAR_STATION'))
            : undefined;
          if (stagedTarget) {
            stagedTarget.health = stagedTarget.maxHealth * 0.25;
            stagedTarget.damageStage = 0;
            stagedTarget.damageEffectTimer = 9;
          }
          const centreX = stagedTarget?.x ?? engine.player.stats.x + 300;
          const groundY = engine.terrain.getGroundY(centreX, engine.currentMission);
          if (mode === 'LAUNCH') {
            engine.weapons.projectiles = [
              { id: 'audit_cannon', type: 'CANNON_ROUND', x: centreX - 280, y: 215, vx: 0, vy: 0, source: 'PLAYER', damage: 1, radius: 1, life: 180, maxLife: 180, rotation: 0 },
              { id: 'audit_missile', type: 'MISSILE', x: centreX - 70, y: 260, vx: 0, vy: 0, source: 'PLAYER', damage: 1, radius: 1, life: 180, maxLife: 180, rotation: -0.05 },
              { id: 'audit_bomb', type: 'BOMB', x: centreX + 125, y: 315, vx: 0, vy: 0, source: 'PLAYER', damage: 1, radius: 1, life: 180, maxLife: 180, rotation: 0.45 },
              { id: 'audit_rocket', type: 'ROCKET', x: centreX + 300, y: 265, vx: 0, vy: 0, source: 'PLAYER', damage: 1, radius: 1, life: 180, maxLife: 180, rotation: 0.04 },
            ];
            engine.effects.createWeaponLaunch(centreX - 305, 215, 'CANNON_ROUND', 0);
            engine.effects.createWeaponLaunch(centreX - 95, 260, 'MISSILE', -0.05);
            for (let index = 0; index < 5; index++) engine.effects.createMissileTrail(centreX - 95 - index * 13, 262 + index, 12, -0.6, 'MISSILE');
            engine.effects.createWeaponLaunch(centreX + 275, 265, 'ROCKET', 0.04);
            for (let index = 0; index < 4; index++) engine.effects.createMissileTrail(centreX + 275 - index * 12, 266 - index, 14, 0.5, 'ROCKET');
          } else if (mode === 'IMPACT') {
            engine.effects.createWeaponImpact(centreX - 300, groundY, 'CANNON_ROUND', 'GROUND');
            engine.effects.createWeaponImpact(centreX - 100, groundY, 'ROCKET', 'GROUND');
            engine.effects.createWeaponImpact(centreX + 120, groundY, 'MISSILE', 'GROUND');
            engine.effects.createWeaponImpact(centreX + 340, groundY, 'BOMB', 'GROUND');
          } else {
            engine.effects.createDamagePlume(centreX, groundY - 48, 2);
            engine.effects.createExplosion(centreX + 220, groundY - 24, 'LARGE', 'SECONDARY', 'GROUND');
            engine.effects.createAircraftBreakup(centreX + 390, 265, 6, 1);
          }
        },
        inputSnapshot: () => ({
          ...engine.input,
          selectedWeapon: engine.player.stats.selectedWeapon,
          missiles: engine.player.stats.missiles,
          bombs: engine.player.stats.bombs,
          rockets: engine.player.stats.rockets,
          flares: engine.player.stats.flares,
          health: engine.player.stats.health,
          trainingEnabled: engine.getTrainingState().enabled,
        }),
        effectsSnapshot: () => ({ projectiles: engine.weapons.projectiles.map((projectile) => projectile.type), particles: engine.effects.particles.length }),
        setCombatZoom: (enabled) => engine.setAccessibility({ ...effectiveAccessibility, combatZoom: enabled ? 'SMART' : 'OFF' }),
        combatPresentationSnapshot: () => engine.getCombatPresentationSnapshot(),
        headingSnapshot: () => ({ ...engine.player.getHeadingPresentation(), facing: engine.player.stats.facing, vx: engine.player.stats.vx }),
        stagePlayerTurnFrame: (frame) => {
          engine.pause();
          const clampedFrame = Math.max(0, Math.min(4, Math.round(frame)));
          const blend = 2 / 3 - (clampedFrame / 4) * (4 / 3);
          engine.player.stats.facing = blend < 0 ? -1 : 1;
          engine.player.stageHeadingPresentationForAudit(blend);
        },
      };
      visualWindow.__STRIKE_VECTOR_VALIDATION__ = {
        completeCurrent: (victory) => {
          if (!validationScenarioRef.current) return;
          const score = engine.combatFlow.finalizeScore(victory, 600);
          engine.onStateChange?.(victory ? 'VICTORY' : 'GAME_OVER', score);
        },
      };
    }

    return () => {
      if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true) {
        delete visualWindow.__STRIKE_VECTOR_VISUAL_AUDIT__;
        delete visualWindow.__STRIKE_VECTOR_VALIDATION__;
      }
      engine.stop();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setDifficulty(campaign.difficulty);
    engineRef.current?.setRenderQuality(campaign.renderQuality);
    engineRef.current?.setAccessibility(activeAccessibility);
  }, [campaign.difficulty, campaign.renderQuality, activeAccessibility]);

  useEffect(() => {
    let frame = 0;
    let pauseWasPressed = false;
    const pollGamepad = () => {
      const engine = engineRef.current;
      const pad = navigator.getGamepads?.().find(Boolean) ?? null;
      if (engine) {
        const update = gamepadInputRef.current.update(pad, activeInputBindings);
        update.released.forEach((action) => engine.setInputAction(action, false));
        update.pressed.forEach((action) => engine.setInputAction(action, true));
        if (update.active.length) setInputDevice((current) => current === 'GAMEPAD' ? current : 'GAMEPAD');
        if (update.connectionChanged) {
          setControllerNotice(update.connected ? 'CONTROLLER CONNECTED — XBOX-COMPATIBLE PROFILE ACTIVE' : 'CONTROLLER DISCONNECTED — KEYBOARD OR TOUCH CONTROL RESTORED');
          if (update.connected) setInputDevice('GAMEPAD');
          else setInputDevice((current) => current === 'GAMEPAD' ? detectInitialInputDevice() : current);
        }
        const pausePressed = update.pausePressed;
        if (pausePressed && !pauseWasPressed) {
          if (engine.gameState === 'PLAYING') {
            engine.pause();
            setGameState('PAUSED');
          } else if (engine.gameState === 'PAUSED') {
            engine.resume();
            setGameState('PLAYING');
          }
        }
        pauseWasPressed = pausePressed;
      }
      frame = requestAnimationFrame(pollGamepad);
    };
    frame = requestAnimationFrame(pollGamepad);
    return () => {
      cancelAnimationFrame(frame);
      const engine = engineRef.current;
      gamepadInputRef.current.update(null, activeInputBindings).released.forEach((action) => engine?.setInputAction(action, false));
    };
  }, [activeInputBindings]);

  // Keyboard input is resolved entirely through the configurable semantic map.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const action = actionForCode(e.code, activeInputBindings);
      if (!action) return;
      setInputDevice((current) => current === 'KEYBOARD' ? current : 'KEYBOARD');
      if (action === 'PAUSE') {
        if (gameState === 'PLAYING') {
          engine.pause();
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          engine.resume();
          setGameState('PLAYING');
        }
        e.preventDefault();
        return;
      }
      if (gameState !== 'PLAYING') return;
      engine.setInputAction(action, true);
      e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const action = actionForCode(e.code, activeInputBindings);
      if (action && action !== 'PAUSE') engine.setInputAction(action, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeInputBindings, gameState]);

  useEffect(() => {
    const preserveLocalState = () => {
      persistCampaign(campaignRef.current);
      if (activeOperationRef.current) persistActiveOperation(activeOperationRef.current);
      void flushPlatformStorage();
    };
    const pauseForInterruption = () => {
      if (document.hidden && engineRef.current?.gameState === 'PLAYING') {
        engineRef.current.pause();
        setGameState('PAUSED');
      }
      if (document.hidden) preserveLocalState();
    };
    const pauseForOrientation = () => {
      if (engineRef.current?.gameState === 'PLAYING') {
        engineRef.current.pause();
        setGameState('PAUSED');
      }
      preserveLocalState();
    };
    document.addEventListener('visibilitychange', pauseForInterruption);
    window.addEventListener('orientationchange', pauseForOrientation);
    window.addEventListener('blur', pauseForOrientation);
    window.addEventListener('pagehide', preserveLocalState);
    document.addEventListener('freeze', preserveLocalState);
    let disposeDesktopLifecycle = () => undefined;
    void onPlatformLifecycleEvent(() => pauseForOrientation()).then((dispose) => { disposeDesktopLifecycle = dispose; });
    return () => {
      document.removeEventListener('visibilitychange', pauseForInterruption);
      window.removeEventListener('orientationchange', pauseForOrientation);
      window.removeEventListener('blur', pauseForOrientation);
      window.removeEventListener('pagehide', preserveLocalState);
      document.removeEventListener('freeze', preserveLocalState);
      disposeDesktopLifecycle();
    };
  }, []);

  // Touch & Pointer Controls Handler
  const handleTouchInput = useCallback((action: InputAction, pressed: boolean) => {
    const engine = engineRef.current;
    if (!engine || gameState !== 'PLAYING') return;
    if (pressed) setInputDevice('TOUCH');
    engine.setInputAction(action, pressed);
  }, [gameState]);

  // Launch Current Mission
  const startMission = (mission: MissionDefinition) => {
    authoringMissionRef.current = false;
    landingPracticeRef.current = null;
    showcasePositionRef.current = null;
    setShowcasePosition(null);
    validationScenarioRef.current = null;
    setValidationScenario(null);
    setCurrentMission(mission);
    setGuidedTraining(mission.id === 'm1_coastal_strike' && !campaign.tutorialCompleted && !campaign.tutorialDismissed);
    setGameState('BRIEFING');
  };

  const startAuthoredTestMission = (mission: MissionDefinition) => {
    authoringMissionRef.current = true;
    showcasePositionRef.current = null;
    validationScenarioRef.current = null;
    setCurrentMission(mission);
    setMissionIndex(-1);
    setGuidedTraining(false);
    setScoreData(null);
    setRecoveredCondition(null);
    setGameState('BRIEFING');
  };

  const startShowcaseMission = (position: number) => {
    const safePosition = Math.max(0, Math.min(EXPERIENCE_MANIFEST.entries.length - 1, Math.round(position)));
    const entry = EXPERIENCE_MANIFEST.entries[safePosition];
    const mission = CAMPAIGN_MISSIONS.find((candidate) => candidate.id === entry.missionId);
    if (!mission) return;
    showcasePositionRef.current = safePosition;
    setShowcasePosition(safePosition);
    validationScenarioRef.current = null;
    setValidationScenario(null);
    setCurrentMission(mission);
    setMissionIndex(CAMPAIGN_MISSIONS.findIndex((candidate) => candidate.id === mission.id));
    setGuidedTraining(safePosition === 0);
    setScoreData(null);
    setRecoveredCondition(null);
    setGameState('BRIEFING');
  };

  const startValidationScenario = (scenario: ValidationScenario, conceptSlot: ControlConceptSlot | null = null) => {
    const mission = CAMPAIGN_MISSIONS.find((candidate) => candidate.id === scenario.missionId);
    if (!mission) return;
    showcasePositionRef.current = null;
    setShowcasePosition(null);
    validationScenarioRef.current = scenario;
    setValidationScenario(scenario);
    controlConceptSlotRef.current = conceptSlot;
    setControlConceptSlot(conceptSlot);
    validationRetriesRef.current = 0;
    setValidationRunResult(null);
    setCurrentMission(mission);
    setMissionIndex(CAMPAIGN_MISSIONS.findIndex((candidate) => candidate.id === mission.id));
    setGuidedTraining(scenario.guidedTraining);
    setInputDevice(scenario.deviceClass === 'MOBILE_TOUCH' ? 'TOUCH' : scenario.deviceClass === 'DESKTOP_GAMEPAD' ? 'GAMEPAD' : 'KEYBOARD');
    setScoreData(null);
    setRecoveredCondition(null);
    setGameState('BRIEFING');
  };

  const startControlConceptTest = (slot: ControlConceptSlot, device: InputDevice) => {
    startValidationScenario(createControlConceptScenario(slot, device), slot);
  };

  const setAndPersistOperation = (run: OperationRunState) => {
    activeOperationRef.current = run;
    setActiveOperation(run);
    persistActiveOperation(run);
  };

  const operationContext = (retryOffset = 0) => {
    const run = activeOperationRef.current;
    const sortie = run?.blueprint.sorties[run.currentSortieIndex];
    return run && sortie ? { seed: run.blueprint.seed, archetype: sortie.archetype, sortieIndex: run.currentSortieIndex, retries: run.retries + retryOffset } : undefined;
  };

  const launchSortie = () => {
    if (!engineRef.current) return;
    const validation = validationScenarioRef.current;
    const operation = activeOperationRef.current;
    const isOperationMission = Boolean(operation && currentMission.id.startsWith(`op_${operation.blueprint.seed}_`));
    const activeShowcaseEntry = showcasePositionRef.current === null ? null : EXPERIENCE_MANIFEST.entries[showcasePositionRef.current];
    const isShowcaseMission = Boolean(activeShowcaseEntry?.missionId === currentMission.id);
    engineRef.current.combatFlow.setPersistence(!validation);
    engineRef.current.setDifficulty(validation?.difficulty ?? (isOperationMission ? operation!.blueprint.difficulty : campaign.difficulty));
    engineRef.current.initMission(
      currentMission,
      validation ? undefined : isShowcaseMission ? undefined : isOperationMission ? operation!.aircraftCondition : campaign.aircraftCondition,
      validation?.loadout ?? (isShowcaseMission ? activeShowcaseEntry!.loadout : isOperationMission ? operation!.selectedLoadout : campaign.selectedLoadout),
      validation?.guidedTraining ?? guidedTraining,
      {
        simulationSeed: validation
          ? hashSeed('VALIDATION', validation.id, validation.difficulty)
          : isOperationMission
            ? hashSeed('OPERATION', operation!.blueprint.seed, operation!.currentSortieIndex)
            : undefined,
      },
    );
    engineRef.current.setAccessibility(validation?.accessibility ?? effectiveAccessibility);
    engineRef.current.player.launchFromCarrier(currentMission.launchSite);
    if (ITCH_BUILD && !validation) recordBetaEvent('MISSION_STARTED', {
      missionId: currentMission.id,
      difficulty: isOperationMission ? operation!.blueprint.difficulty : campaign.difficulty,
    });
    setValidationRunResult(null);
    setGameState('PLAYING');
  };

  const launchLandingPractice = (config: LandingPracticeConfig) => {
    const engine = engineRef.current;
    if (!engine) return;
    const definition = LANDING_PRACTICES.find((candidate) => candidate.id === config.type) ?? LANDING_PRACTICES[0];
    const mission = createLandingPracticeMission(config.type);
    landingPracticeRef.current = config;
    showcasePositionRef.current = null;
    validationScenarioRef.current = null;
    setCurrentMission(mission);
    setScoreData(null);
    setLandingPracticeResult(null);
    engine.combatFlow.setPersistence(false);
    engine.setDifficulty(config.difficulty);
    const condition = config.damaged ? { health: 58, fuel: 0.72, subsystems: { engine: 0.68, flightControls: 0.62, targeting: 0.74, weapons: 0.78, hydraulics: 0.64, fuelTank: 0.72 } } : undefined;
    engine.initMission(mission, condition, 'FLEET_CAP', false);
    engine.setAccessibility(effectiveAccessibility);
    engine.beginLandingPractice(definition.technique);
    setGameState('PLAYING');
  };

  const submitValidationEvidence = (response: PlaytestResponse, retry: boolean) => {
    const scenario = validationScenarioRef.current;
    if (!scenario || !validationRunResult) return;
    const evidence: PlaytestEvidenceV1 = {
      version: 1,
      buildId: scenario.id.startsWith('CV-') ? CAMPAIGN_VALIDATION_BUILD_ID : VALIDATION_BUILD_ID,
      completedAt: new Date().toISOString(),
      scenarioId: scenario.id,
      run: validationRunResult,
      response,
    };
    if (scenario.id.startsWith('CV-')) setCampaignValidationEvidence(appendCampaignValidationEvidence(evidence));
    else setPlaytestEvidence(appendPlaytestEvidence(evidence));
    if (retry) {
      validationRetriesRef.current++;
      launchSortie();
    } else {
      setValidationRunResult(null);
      setGameState(scenario.id.startsWith('CV-') ? 'CAMPAIGN_VALIDATION' : 'VALIDATION_RUNS');
    }
  };

  const submitControlConceptEvidence = (response: ControlConceptResponseV1) => {
    const slot = controlConceptSlotRef.current;
    if (!slot || !validationRunResult) return;
    setControlConceptEvidence(appendControlConceptEvidence({
      version: 1,
      buildId: RELEASE_INFO.buildId,
      slotId: slot.id,
      experience: slot.experience,
      completedAt: new Date().toISOString(),
      cleanSnapshot: true,
      guidedMission: true,
      run: validationRunResult,
      response,
    }));
    setValidationRunResult(null);
    setGameState('CONTROL_CONCEPT_TEST');
  };

  const handleNextMission = () => {
    if (ITCH_BUILD) recordBetaEvent('CONTINUE_REQUESTED', { missionId: currentMission.id, difficulty: campaign.difficulty });
    if (showcasePositionRef.current !== null && scoreData?.isVictory) {
      const nextPosition = showcasePositionRef.current + 1;
      if (nextPosition >= EXPERIENCE_MANIFEST.entries.length) {
        showcasePositionRef.current = null;
        setShowcasePosition(null);
        setGameState('SHOWCASE_COMPLETE');
      } else {
        startShowcaseMission(nextPosition);
      }
      return;
    }
    if (!recoveredCondition) return;
    const operation = activeOperationRef.current;
    if (operation && currentMission.id.startsWith(`op_${operation.blueprint.seed}_`) && scoreData) {
      const result = resultFromScore(operation, scoreData, engineRef.current?.currentMission.objectives.filter((objective) => objective.completed).map((objective) => objective.id) || []);
      if (operation.currentSortieIndex === operation.blueprint.sorties.length - 1) {
        const finishedRun = advanceOperation(operation, result, recoveredCondition, operation.selectedLoadout);
        const record = createOperationRecord(finishedRun);
        setOperationsProfile(recordCompletedOperation(record));
        clearActiveOperation();
        activeOperationRef.current = null;
        setActiveOperation(null);
        setCompletedOperation({ run: finishedRun, record });
        setRecoveredCondition(null);
        setGameState('OPERATION_AFTER_ACTION');
        return;
      }
      setGameState('SERVICING');
      return;
    }
    if (currentMission.id === 'm10_hq_assault' || currentMission.id === 'm16_north_cape_assault') {
      setGameState('EPILOGUE');
      return;
    }
    setGameState('SERVICING');
  };

  const completeServicing = (condition: AircraftCondition, loadout: typeof campaign.selectedLoadout) => {
    const operation = activeOperationRef.current;
    if (operation && currentMission.id.startsWith(`op_${operation.blueprint.seed}_`) && scoreData) {
      const result = resultFromScore(operation, scoreData, engineRef.current?.currentMission.objectives.filter((objective) => objective.completed).map((objective) => objective.id) || []);
      const nextRun = advanceOperation(operation, result, condition, loadout);
      setAndPersistOperation(nextRun);
      setRecoveredCondition(null);
      setGameState('OPERATION_DOSSIER');
      return;
    }
    const nextCampaign = { ...campaign, aircraftCondition: condition, selectedLoadout: loadout };
    persistCampaign(nextCampaign);
    campaignRef.current = nextCampaign;
    setCampaign(nextCampaign);
    setRecoveredCondition(null);
    if (CAMPAIGN_CHAPTERS.NORWEGIAN_SEA.missionIds.includes(currentMission.id)) {
      setGameState('NORWEGIAN_MAP');
      return;
    }
    const campaignMissionIndex = CAMPAIGN_MISSIONS.findIndex((mission) => mission.id === currentMission.id);
    if (campaignMissionIndex < 0) {
      setGameState('MENU');
      return;
    }
    const nextIdx = Math.min(campaignMissionIndex + 1, CAMPAIGN_MISSIONS.length - 1);
    setMissionIndex(nextIdx);
    startMission(CAMPAIGN_MISSIONS[nextIdx]);
  };

  const selectOperation = (blueprint: OperationBlueprint) => {
    const run = createOperationRun(blueprint, undefined, campaign.selectedLoadout);
    setAndPersistOperation(run);
    setOperationsProfile(recordOperationSelection(blueprint));
    setCompletedOperation(null);
    setGameState('OPERATION_DOSSIER');
  };

  const openOperationBriefing = () => {
    const run = activeOperationRef.current;
    if (!run) return;
    startMission(generateOperationMission(run.blueprint, run.currentSortieIndex, run.defendedAssets));
  };

  const abandonOperation = () => {
    setOperationsProfile(recordAbandonedOperation());
    clearActiveOperation();
    activeOperationRef.current = null;
    setActiveOperation(null);
  };

  const openCampaignChapter = (chapterId: CampaignChapterId) => {
    const next = setActiveCampaignChapter(campaignRef.current, chapterId);
    campaignRef.current = next;
    setCampaign(next);
    persistCampaign(next);
    setGameState(chapterId === 'NORWEGIAN_SEA' ? 'NORWEGIAN_MAP' : 'CAMPAIGN_MAP');
  };

  const engine = engineRef.current;

  return (
    <div className={`harrier-shell relative w-screen h-screen bg-zinc-950 flex items-center justify-center overflow-hidden font-sans select-none ${activeAccessibility.hudContrast === 'HIGH' || activeAccessibility.highContrastHud ? 'high-contrast-mode' : ''} ${activeAccessibility.textContrast === 'HIGH' ? 'high-text-contrast-mode' : ''} ${activeAccessibility.reducedEffects ? 'reduced-effects-mode' : ''}`}>
      {controllerNotice ? <div role="status" aria-live="assertive" className="absolute left-1/2 top-3 z-[80] -translate-x-1/2 rounded border border-cyan-200 bg-black/95 px-4 py-2 text-center font-mono-tech text-[11px] font-black text-white shadow-xl">▣ {controllerNotice}</div> : null}
      {/* 16:9 Aspect Ratio Arcade Stage */}
      <div className="game-stage relative bg-black shadow-2xl overflow-hidden flex-shrink-0">
        {/* Main 2.5D Canvas */}
        <canvas
          ref={canvasRef}
          width={GAME_CONSTANTS.VIEWPORT_WIDTH}
          height={GAME_CONSTANTS.VIEWPORT_HEIGHT}
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            soundEngine.resume();
            if (gameState === 'PLAYING' && engineRef.current) {
              setInputDevice('KEYBOARD');
              if (e.button === 0) engineRef.current.setInputAction('PRIMARY_FIRE', true);
              if (e.button === 2) engineRef.current.setInputAction('SECONDARY_FIRE', true);
            }
          }}
          onPointerUp={(e) => {
            if (engineRef.current) {
              if (e.button === 0) engineRef.current.setInputAction('PRIMARY_FIRE', false);
              if (e.button === 2) engineRef.current.setInputAction('SECONDARY_FIRE', false);
            }
          }}
          onPointerCancel={() => {
            engineRef.current?.setInputAction('PRIMARY_FIRE', false);
            engineRef.current?.setInputAction('SECONDARY_FIRE', false);
          }}
          className="absolute inset-0 w-full h-full object-contain block bg-zinc-950 cursor-crosshair focus:outline-none"
        />

        {/* Optional 1980s phosphor and scanline treatment */}
        {crtEnabled && (
          <div className="absolute inset-0 pointer-events-none z-40 crt-mode" />
        )}

        {/* --- STATE OVERLAYS --- */}

        {/* 1. Main Menu */}
        {gameState === 'MENU' && (
          <MainMenu
            onStartCampaign={() => {
              if (DEMO_BUILD) { startShowcaseMission(0); return; }
              if (!campaign.tutorialCompleted && campaign.completedMissionIds.length === 0 && campaign.unlockedMission === 0) {
                setCurrentMission(CAMPAIGN_MISSIONS[0]);
                setMissionIndex(0);
                setGuidedTraining(true);
                setGameState('BRIEFING');
              } else {
                setGameState(campaign.chapterProgress.NORWEGIAN_SEA.unlocked ? 'CHAPTER_SELECT' : 'CAMPAIGN_MAP');
              }
            }}
            onStartSortie={() => { if (!DEMO_BUILD) setGameState('OPERATIONS_BOARD'); }}
            onStartShowcase={() => DEMO_BUILD ? startShowcaseMission(1) : setGameState('SHOWCASE_SELECT')}
            onStartLandingPractice={() => {
              landingPracticeRef.current = null;
              setLandingPracticeResult(null);
              setGameState('LANDING_PRACTICE');
            }}
            onOpenValidation={validationAvailable ? () => setGameState('VALIDATION_RUNS') : undefined}
            onOpenControlConceptTest={validationAvailable ? () => setGameState('CONTROL_CONCEPT_TEST') : undefined}
            onOpenAuthoring={authoringAvailable ? () => setGameState('MISSION_AUTHORING') : undefined}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
            onOpenOptions={() => setShowOptions(true)}
            highScore={highScore}
            sortieUnlocked={campaign.completedMissionIds.includes('m10_hq_assault')}
            firstRun={!campaign.tutorialCompleted && campaign.completedMissionIds.length === 0 && campaign.unlockedMission === 0}
            demoMode={DEMO_BUILD}
            onExportDemo={DEMO_BUILD ? () => {
              const url = URL.createObjectURL(new Blob([exportDemoTransfer(showcaseProgress)], { type: 'application/json' }));
              const link = document.createElement('a'); link.href = url; link.download = 'iron-kestrel-demo-record-v1.json'; link.click(); URL.revokeObjectURL(url);
            } : undefined}
          />
        )}

        {gameState === 'MISSION_AUTHORING' && authoringAvailable && MissionAuthoringScreen ? (
          <React.Suspense fallback={null}><MissionAuthoringScreen onLaunch={startAuthoredTestMission} onClose={() => setGameState('MENU')} /></React.Suspense>
        ) : null}

        {gameState === 'LANDING_PRACTICE' && LandingPracticeScreen ? (
          <React.Suspense fallback={null}>
            <LandingPracticeScreen result={landingPracticeResult} onLaunch={launchLandingPractice} onClose={() => { landingPracticeRef.current = null; setLandingPracticeResult(null); setGameState('MENU'); }} />
          </React.Suspense>
        ) : null}

        {gameState === 'SHOWCASE_SELECT' && (
          <ShowcaseScreen
            manifest={EXPERIENCE_MANIFEST}
            progress={showcaseProgress}
            missions={CAMPAIGN_MISSIONS.filter((mission) => EXPERIENCE_MANIFEST.missionIds.includes(mission.id))}
            onLaunch={startShowcaseMission}
            onReset={() => {
              const next = DEMO_BUILD ? createDemoProgress() : createShowcaseProgress();
              if (DEMO_BUILD) persistDemoProgress(next as import('./types/game').DemoProgress); else persistShowcaseProgress(next as import('./types/game').ShowcaseProgress);
              setShowcaseProgress(next);
            }}
            onClose={() => setGameState('MENU')}
          />
        )}

        {gameState === 'SHOWCASE_COMPLETE' && (
          <ShowcaseComplete manifest={EXPERIENCE_MANIFEST} progress={showcaseProgress} onRefly={() => setGameState('SHOWCASE_SELECT')} onMenu={() => setGameState('MENU')} />
        )}

        {gameState === 'VALIDATION_RUNS' && validationAvailable && ValidationRunsScreen ? (
          <React.Suspense fallback={null}>
            <ValidationRunsScreen
              evidence={playtestEvidence}
              onLaunch={startValidationScenario}
              onClear={() => {
                clearPlaytestEvidence();
                setPlaytestEvidence([]);
              }}
              onOpenCampaignValidation={() => setGameState('CAMPAIGN_VALIDATION')}
              onClose={() => {
                validationScenarioRef.current = null;
                setValidationScenario(null);
                setGameState('MENU');
              }}
            />
          </React.Suspense>
        ) : null}

        {gameState === 'CONTROL_CONCEPT_TEST' && validationAvailable && ControlConceptPlaytestScreen ? (
          <React.Suspense fallback={null}>
            <ControlConceptPlaytestScreen
              evidence={controlConceptEvidence}
              onLaunch={startControlConceptTest}
              onClear={() => {
                clearControlConceptEvidence();
                setControlConceptEvidence([]);
              }}
              onClose={() => {
                controlConceptSlotRef.current = null;
                setControlConceptSlot(null);
                validationScenarioRef.current = null;
                setValidationScenario(null);
                setGameState('MENU');
              }}
            />
          </React.Suspense>
        ) : null}

        {gameState === 'CAMPAIGN_VALIDATION' && validationAvailable && CampaignValidationScreen ? (
          <React.Suspense fallback={null}>
            <CampaignValidationScreen
              evidence={campaignValidationEvidence}
              onLaunch={startValidationScenario}
              onClear={() => {
                clearCampaignValidationEvidence();
                setCampaignValidationEvidence([]);
              }}
              onBack={() => setGameState('VALIDATION_RUNS')}
              onClose={() => {
                validationScenarioRef.current = null;
                setValidationScenario(null);
                setGameState('MENU');
              }}
            />
          </React.Suspense>
        ) : null}

        {gameState === 'CAMPAIGN_MAP' && (
          <CampaignMap
            missions={CAMPAIGN_MISSIONS.slice(0, 10)}
            save={campaign}
            onSelectMission={(mission, index) => {
              setMissionIndex(index);
              startMission(mission);
            }}
            onClose={() => setGameState(campaign.chapterProgress.NORWEGIAN_SEA.unlocked ? 'CHAPTER_SELECT' : 'MENU')}
          />
        )}

        {gameState === 'CHAPTER_SELECT' && ChapterSelectScreen && (
          <React.Suspense fallback={null}>
            <ChapterSelectScreen campaign={campaign} onSelect={openCampaignChapter} onClose={() => setGameState('MENU')} />
          </React.Suspense>
        )}

        {gameState === 'NORWEGIAN_MAP' && NorwegianCampaignMap && (
          <React.Suspense fallback={null}>
            <NorwegianCampaignMap campaign={campaign} onBack={() => setGameState('CHAPTER_SELECT')} onSelectMission={(mission, index) => { setMissionIndex(index); startMission(mission); }} />
          </React.Suspense>
        )}

        {gameState === 'OPERATIONS_BOARD' && OperationsBoard && (
          <React.Suspense fallback={null}>
            <OperationsBoard
              difficulty={campaign.difficulty}
              norwegianOperationsUnlocked={campaign.completedMissionIds.includes('m16_north_cape_assault')}
              activeRun={activeOperation}
              profile={operationsProfile}
              onSelect={selectOperation}
              onResume={() => setGameState('OPERATION_DOSSIER')}
              onAbandon={abandonOperation}
              onToggleFavourite={(entry) => setOperationsProfile(toggleOperationFavourite(entry))}
              onClose={() => setGameState('MENU')}
            />
          </React.Suspense>
        )}

        {gameState === 'OPERATION_DOSSIER' && activeOperation && OperationDossier && (
          <React.Suspense fallback={null}><OperationDossier run={activeOperation} onLaunch={openOperationBriefing} onBack={() => setGameState('OPERATIONS_BOARD')} /></React.Suspense>
        )}

        {gameState === 'OPERATION_AFTER_ACTION' && completedOperation && OperationAfterAction && (
          <React.Suspense fallback={null}><OperationAfterAction run={completedOperation.run} record={completedOperation.record} onOperations={() => { setCompletedOperation(null); setGameState('OPERATIONS_BOARD'); }} /></React.Suspense>
        )}

        {/* 2. Tactical Mission Briefing */}
        {gameState === 'BRIEFING' && (
          <BriefingScreen
            mission={currentMission}
            onLaunch={launchSortie}
            onBack={() => setGameState(authoringMissionRef.current ? 'MISSION_AUTHORING' : controlConceptSlotRef.current ? 'CONTROL_CONCEPT_TEST' : validationScenarioRef.current ? validationScenarioRef.current.id.startsWith('CV-') ? 'CAMPAIGN_VALIDATION' : 'VALIDATION_RUNS' : showcasePositionRef.current !== null ? 'SHOWCASE_SELECT' : activeOperation && currentMission.id.startsWith(`op_${activeOperation.blueprint.seed}_`) ? 'OPERATION_DOSSIER' : 'MENU')}
            guidedTraining={guidedTraining}
            onGuidedTrainingChange={(guided) => {
              setGuidedTraining(guided);
              if (!validationScenarioRef.current) {
                const next = { ...campaign, tutorialDismissed: !guided };
                persistCampaign(next);
                setCampaign(next);
              }
            }}
            tutorialCompleted={validationScenarioRef.current ? false : campaign.tutorialCompleted}
            trainingModeLocked={Boolean(controlConceptSlotRef.current)}
          />
        )}

        {/* 3. In-Game Flight HUD */}
        {engine && (gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'EJECTING') && (
          <>
            <HUD
              playerStats={engine.player.stats}
              combatFlow={engine.combatFlow.flow}
              mission={engine.currentMission}
              score={engine.combatFlow.scoreData.finalScore}
              cameraX={engine.cameraX}
              showTouchControls={showTouchControls}
              onToggleTouchControls={() => setShowTouchControls((prev) => !prev)}
              onPauseToggle={() => {
                if (gameState === 'PLAYING') {
                  engine.pause();
                  setGameState('PAUSED');
                } else {
                  engine.resume();
                  setGameState('PLAYING');
                }
              }}
              defendedAsset={engine.defendedAsset}
              directorState={engine.getMissionDirectorState()}
              trainingState={engine.getTrainingState()}
              inputDevice={inputDevice}
              inputBindings={activeInputBindings}
              accessibility={activeAccessibility}
              feedback={engine.getCombatFeedbackState()}
              rescueBeacon={engine.getRescueBeaconState()}
              arcticWeather={engine.getArcticWeatherState()}
              recoveryGuidance={engine.getRecoveryGuidance()}
              onSkipTraining={() => {
                engine.skipTraining();
                setGuidedTraining(false);
                if (!validationScenarioRef.current) {
                  const next = { ...campaign, tutorialDismissed: true };
                  persistCampaign(next);
                  setCampaign(next);
                }
              }}
              tutorialUnderstood={campaign.tutorialCompleted || campaign.tutorialDismissed}
            />
            {/* On-screen Touch & Pointer controls */}
            <TouchControls
              onInput={handleTouchInput}
              visible={showTouchControls || (typeof window !== 'undefined' && window.innerWidth < 900)}
              selectedWeapon={engine.player.stats.selectedWeapon}
              scale={validationScenario ? 1 : campaign.controlScale}
              opacity={validationScenario ? 0.82 : campaign.controlOpacity}
              leftHanded={validationScenario ? false : campaign.leftHanded}
              safeInset={validationScenario ? 12 : campaign.touchSafeInset}
              lift={validationScenario ? 0 : campaign.touchLift}
              clearView={validationScenario ? true : campaign.touchClearView}
            />
          </>
        )}

        {/* 4. Pause Menu */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 z-30 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 font-mono-tech select-none">
            <div className="w-full max-w-sm bg-zinc-900 border-2 border-cyan-500/50 p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 text-center">
              <h2 className="text-2xl font-display font-black text-cyan-400 tracking-wider">
                OPERATION PAUSED
              </h2>
              <p className="text-xs text-zinc-400">Tactical simulation temporarily frozen.</p>
              <div className="flex flex-col gap-2.5 w-full mt-2">
                <button
                  onClick={() => {
                    soundEngine.playUIClick();
                    engineRef.current?.resume();
                    setGameState('PLAYING');
                  }}
                  className="w-full py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-display font-black text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-zinc-950" /> RESUME SORTIE
                </button>
                <button
                  onClick={() => {
                    soundEngine.playUIClick();
                    if (landingPracticeRef.current) {
                      launchLandingPractice(landingPracticeRef.current);
                      return;
                    }
                    if (validationScenarioRef.current) validationRetriesRef.current++;
                    const operation = activeOperationRef.current;
                    if (operation && currentMission.id.startsWith(`op_${operation.blueprint.seed}_`)) setAndPersistOperation(incrementOperationRetry(operation));
                    if (ITCH_BUILD) recordBetaEvent('RETRY_REQUESTED', { missionId: currentMission.id, difficulty: campaign.difficulty });
                    launchSortie();
                  }}
                  className="w-full py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> RESTART MISSION
                </button>
                {!validationScenario ? (
                  <button
                    onClick={() => {
                      soundEngine.playUIClick();
                      setShowOptions(true);
                    }}
                    className="w-full py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" /> OPTIONS
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    soundEngine.playUIClick();
                    if (landingPracticeRef.current) {
                      setLandingPracticeResult(null);
                      setGameState('LANDING_PRACTICE');
                      soundEngine.stopAll();
                      return;
                    }
                    if (validationScenarioRef.current) {
                      setValidationRunResult(null);
                      setGameState(controlConceptSlotRef.current ? 'CONTROL_CONCEPT_TEST' : validationScenarioRef.current.id.startsWith('CV-') ? 'CAMPAIGN_VALIDATION' : 'VALIDATION_RUNS');
                      soundEngine.stopAll();
                      return;
                    }
                    const operation = activeOperationRef.current;
                    if (RELEASE_FEATURES.diagnostics && campaign.diagnosticsEnabled && engineRef.current) appendDiagnostic(engineRef.current.getDiagnosticSession('ABORTED', operationContext(operation ? 1 : 0)));
                    if (operation && currentMission.id.startsWith(`op_${operation.blueprint.seed}_`)) {
                      setAndPersistOperation(incrementOperationRetry(operation));
                      setGameState('OPERATION_DOSSIER');
                    } else {
                      setGameState(showcasePositionRef.current !== null ? 'SHOWCASE_SELECT' : 'MENU');
                    }
                    soundEngine.stopAll();
                  }}
                  className="w-full py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-rose-300 font-bold text-xs cursor-pointer"
                >
                  ABORT TO MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Post-Mission Debriefing & Victory */}
        {(gameState === 'DEBRIEFING' || gameState === 'VICTORY' || gameState === 'GAME_OVER') && scoreData && (
          <DebriefingScreen
            scoreData={scoreData}
            mission={engineRef.current?.currentMission || currentMission}
            restartGuidance={engineRef.current?.getPhaseRestartGuidance()}
            onNextMission={handleNextMission}
            onRetry={() => {
              if (ITCH_BUILD) recordBetaEvent('RETRY_REQUESTED', { missionId: currentMission.id, difficulty: campaign.difficulty });
              launchSortie();
            }}
            onMenu={() => setGameState(showcasePositionRef.current !== null ? 'SHOWCASE_SELECT' : activeOperation && currentMission.id.startsWith(`op_${activeOperation.blueprint.seed}_`) ? 'OPERATIONS_BOARD' : 'MENU')}
          />
        )}

        {gameState === 'VALIDATION_REVIEW' && validationScenario && validationRunResult && ValidationReview ? (
          <React.Suspense fallback={null}>
            <ValidationReview scenario={validationScenario} run={validationRunResult} onSubmit={submitValidationEvidence} />
          </React.Suspense>
        ) : null}

        {gameState === 'CONTROL_CONCEPT_REVIEW' && controlConceptSlot && validationRunResult && ControlConceptReview ? (
          <React.Suspense fallback={null}>
            <ControlConceptReview slot={controlConceptSlot} run={validationRunResult} onSubmit={submitControlConceptEvidence} />
          </React.Suspense>
        ) : null}

        {gameState === 'SERVICING' && recoveredCondition && (
          <ServicingScreen
            mission={activeOperation && currentMission.id.startsWith(`op_${activeOperation.blueprint.seed}_`)
              ? generateOperationMission(activeOperation.blueprint, Math.min(activeOperation.currentSortieIndex + 1, activeOperation.blueprint.sorties.length - 1), activeOperation.defendedAssets)
              : CAMPAIGN_MISSIONS[Math.min(CAMPAIGN_MISSIONS.findIndex((mission) => mission.id === currentMission.id) + 1, CAMPAIGN_MISSIONS.length - 1)] ?? currentMission}
            recoveredCondition={recoveredCondition}
            selectedLoadout={activeOperation && currentMission.id.startsWith(`op_${activeOperation.blueprint.seed}_`) ? activeOperation.selectedLoadout : campaign.selectedLoadout}
            onComplete={completeServicing}
          />
        )}

        {gameState === 'EPILOGUE' && scoreData && (
          <CampaignEpilogue
            campaign={campaign}
            finalScore={scoreData}
            chapterId={currentMission.id === 'm16_north_cape_assault' ? 'NORWEGIAN_SEA' : 'NORTHERN_LANCE'}
            onCampaignMap={() => setGameState('CAMPAIGN_MAP')}
            onProceduralSortie={() => setGameState('OPERATIONS_BOARD')}
            onChapterSelect={() => setGameState('CHAPTER_SELECT')}
          />
        )}

        {/* --- MODALS --- */}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} onStartTraining={() => { setShowHowToPlay(false); if (DEMO_BUILD) startShowcaseMission(0); else { setCurrentMission(CAMPAIGN_MISSIONS[0]); setMissionIndex(0); setGuidedTraining(true); setGameState('BRIEFING'); } }} />}

        {showOptions && (
          <OptionsMenu
            crtEnabled={crtEnabled}
            onToggleCrt={setCrtEnabled}
            onClose={() => setShowOptions(false)}
            campaign={campaign}
            performance={performanceSnapshot ?? engineRef.current?.getPerformanceSnapshot() ?? null}
            inputDevice={inputDevice}
            onSaveImported={() => {
              const importedCampaign = loadCampaign();
              const importedOperation = loadActiveOperation();
              campaignRef.current = importedCampaign;
              activeOperationRef.current = importedOperation;
              setCampaign(importedCampaign);
              setActiveOperation(importedOperation);
              setOperationsProfile(loadOperationsProfile());
              setShowcaseProgress(loadShowcaseProgress());
              setHighScore(engineRef.current?.combatFlow.getBestScore() ?? 0);
              setRecoveredCondition(null);
              setScoreData(null);
              setCompletedOperation(null);
              setShowcasePosition(null);
              soundEngine.stopAll();
              setShowOptions(false);
              setGameState('MENU');
            }}
            onPreserveLocalState={() => {
              persistCampaign(campaignRef.current);
              if (activeOperationRef.current) persistActiveOperation(activeOperationRef.current);
            }}
            onCampaignChange={(next) => {
              persistCampaign(next);
              setCampaign(next);
            }}
          />
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { AccessibilitySettings, ArcticWeatherState, CombatFeedbackState, PlayerStats, CombatFlowState, DefendedAssetState, InputBindingProfile, InputDevice, MissionDefinition, MissionDirectorState, RecoveryGuidance, RescueBeaconState, TrainingRuntimeState } from '../types/game';
import { Shield, Flame, Crosshair, AlertTriangle, CloudSnow, Radio, Navigation, Gauge, Zap } from 'lucide-react';
import { bindingLabel } from '../game/inputBindings';
import { HUD_NOTIFICATION_PRIORITY, selectHudNotification } from '../game/HudNotifications';
import { DIRECTIONAL_FLIGHT_COPY } from '../game/DirectionalFlightCopy';
import { activeWeaponLabel, deriveHudVisibility } from '../game/HudContext';

export function getVerticalSpeedReadout(verticalVelocity: number): { feetPerMinute: number; unsafeDescent: boolean } {
  return {
    feetPerMinute: Math.round(-verticalVelocity * 600),
    unsafeDescent: verticalVelocity > 2.2,
  };
}

export function getHudNotificationRegion(notificationId: string): 'radio-caption' | 'training-banner' | 'central-notification' {
  if (notificationId === 'radio') return 'radio-caption';
  if (notificationId === 'training') return 'training-banner';
  return 'central-notification';
}

interface HUDProps {
  playerStats: PlayerStats;
  combatFlow: CombatFlowState;
  mission: MissionDefinition;
  score: number;
  cameraX: number;
  onPauseToggle?: () => void;
  showTouchControls?: boolean;
  onToggleTouchControls?: () => void;
  defendedAsset?: DefendedAssetState | null;
  directorState?: MissionDirectorState;
  trainingState?: TrainingRuntimeState;
  inputDevice: InputDevice;
  inputBindings: InputBindingProfile;
  accessibility: AccessibilitySettings;
  feedback?: CombatFeedbackState;
  rescueBeacon?: RescueBeaconState | null;
  arcticWeather?: ArcticWeatherState | null;
  recoveryGuidance?: RecoveryGuidance | null;
  onSkipTraining?: () => void;
  tutorialUnderstood?: boolean;
}

const defendedAssetLabel = (type: DefendedAssetState['type']): string => {
  if (type === 'CARRIER') return 'HMS INVINCIBLE';
  if (type === 'LANDING_FORCE') return 'TROMS LANDING FORCE';
  return 'FORWARD BASE';
};

export const HUD: React.FC<HUDProps> = ({
  playerStats: s,
  combatFlow: flow,
  mission,
  score,
  cameraX,
  onPauseToggle,
  showTouchControls,
  onToggleTouchControls,
  defendedAsset,
  directorState,
  trainingState,
  inputDevice,
  inputBindings,
  accessibility,
  feedback,
  rescueBeacon,
  arcticWeather,
  recoveryGuidance,
  onSkipTraining,
  tutorialUnderstood = false,
}) => {
  const [controlsRecalled, setControlsRecalled] = React.useState(false);
  const [hudExpanded, setHudExpanded] = React.useState(false);
  React.useEffect(() => {
    const recall = (event: KeyboardEvent) => {
      if (event.code === 'KeyH' && !event.repeat) setControlsRecalled((visible) => !visible);
      if (event.code === 'KeyI' && !event.repeat) setHudExpanded((visible) => !visible);
    };
    window.addEventListener('keydown', recall);
    return () => window.removeEventListener('keydown', recall);
  }, []);
  const verticalSpeed = getVerticalSpeedReadout(s.vy);
  const hudVisibility = deriveHudVisibility({
    player: s,
    flow,
    feedback,
    recoveryGuidance,
    training: trainingState,
    expanded: hudExpanded,
    controlsRecalled,
    tutorialUnderstood,
  });
  const altitudeBandColor =
    s.altitudeBand === 'LOW'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
      : s.altitudeBand === 'HIGH'
      ? 'text-rose-400 border-rose-500/40 bg-rose-950/40'
      : 'text-sky-400 border-sky-500/40 bg-sky-950/40';

  const recoveryAvailable = mission.objectives.find((objective) => objective.targetType === 'LANDING')?.active !== false;
  const isRecoverySiteNear = mission.hasCarrierRecovery && recoveryAvailable && s.x > mission.carrierLandingX - 1200;
  const distanceToRecovery = mission.hasCarrierRecovery ? Math.max(0, Math.round(mission.carrierLandingX - s.x)) : 0;
  const isForwardBaseRecovery = mission.recoverySite === 'FORWARD_BASE';
  const tromsFarpOperational = mission.id === 'm13_troms_bridgehead'
    && mission.objectives.find((objective) => objective.id === 'm13_recover')?.active !== false;
  const showColdPassagePanel = hudExpanded || Boolean(feedback && (feedback.unidentifiedContacts > 0 || feedback.identificationProgress > 0));
  const showHammerfallPanel = hudExpanded || s.altitudeBand !== 'LOW';
  const showTromsPanel = hudExpanded || Boolean(defendedAsset && defendedAsset.integrity <= 50) || !tromsFarpOperational;
  const showRedTidePanel = hudExpanded || Boolean(defendedAsset && (defendedAsset.incomingMissiles > 0 || defendedAsset.integrity <= 50));
  const showNorthCapePanel = hudExpanded || Boolean(defendedAsset && (defendedAsset.incomingMissiles > 0 || defendedAsset.integrity <= 50));
  const redTideCorvettes = mission.objectives.find((objective) => objective.id === 'm15_corvettes');
  const redTideInterceptions = mission.objectives.find((objective) => objective.id === 'm15_missiles');
  const northCapeObjectives = mission.objectives.filter((objective) => ['m16_picket', 'm16_sams', 'm16_radar', 'm16_hq', 'm16_fighter'].includes(objective.id));
  const currentObjective = mission.objectives.find((objective) => objective.active !== false && !objective.completed && objective.isPrimary)
    ?? mission.objectives.find((objective) => objective.active !== false && !objective.completed);
  const trainingAction = trainingState?.phase === 'INSTRUCTION' && trainingState.currentStep?.action ? bindingLabel(inputBindings, trainingState.currentStep.action, inputDevice) : trainingState?.phase === 'INSTRUCTION' ? 'FOLLOW HUD CUE' : undefined;
  const primaryNotification = selectHudNotification([
    feedback?.incomingMissileDirection ? { id: 'missile', priority: HUD_NOTIFICATION_PRIORITY.MISSILE, tone: 'DANGER', label: `◆ MISSILE ${feedback.incomingMissileDirection}`, message: 'Break away and deploy countermeasures.', action: bindingLabel(inputBindings, 'COUNTERMEASURE', inputDevice) } : null,
    feedback?.damageWarningTicks ? { id: 'damage', priority: HUD_NOTIFICATION_PRIORITY.DAMAGE, tone: 'DANGER', label: '✦ AIRFRAME HIT', message: `Threat bearing ${feedback.threatDirection ?? 'unknown'}.` } : null,
    feedback?.airThreatState === 'FIRING' ? { id: 'fighter-fire', priority: HUD_NOTIFICATION_PRIORITY.FIGHTER_FIRING, tone: 'DANGER', label: `△ BANDIT FIRING ${feedback.airThreatDirection ?? ''}`, message: 'Change altitude and aspect immediately.' } : null,
    feedback?.airThreatState === 'TRACKING' ? { id: 'fighter-track', priority: HUD_NOTIFICATION_PRIORITY.FIGHTER_TRACKING, tone: 'WARNING', label: `△ BANDIT TRACKING ${feedback.airThreatDirection ?? ''}`, message: 'Prepare to evade.' } : null,
    trainingState?.enabled && trainingState.currentStep ? { id: 'training', priority: HUD_NOTIFICATION_PRIORITY.TRAINING, tone: 'TRAINING', label: trainingState.phase === 'SUCCESS' ? `✓ LESSON ${trainingState.currentIndex + 1} COMPLETE` : `FLIGHT SCHOOL ${trainingState.currentIndex + 1}/9`, message: trainingState.phase === 'SUCCESS' ? trainingState.successMessage ?? 'Action confirmed.' : `${trainingState.currentStep.title.toUpperCase()} — ${trainingState.currentStep.instruction}`, action: trainingAction } : null,
    isRecoverySiteNear && recoveryGuidance ? { id: 'recovery', priority: recoveryGuidance.status === 'STABLE' ? HUD_NOTIFICATION_PRIORITY.RECOVERY_STABLE : HUD_NOTIFICATION_PRIORITY.RECOVERY_UNSAFE, tone: recoveryGuidance.status === 'STABLE' ? 'INFO' : 'WARNING', label: `○ ${isForwardBaseRecovery ? 'FORWARD SITE' : 'INVINCIBLE'} APPROACH`, message: recoveryGuidance.status === 'STABLE' ? 'Approach stable — continue to touchdown.' : recoveryGuidance.status.replaceAll('_', ' ') } : null,
    accessibility.radioCaptions && feedback?.radioCaption ? { id: 'radio', priority: HUD_NOTIFICATION_PRIORITY.RADIO, tone: 'INFO', label: 'RADIO', message: feedback.radioCaption } : null,
    flow.lastActionTimer > 0 ? { id: 'score', priority: HUD_NOTIFICATION_PRIORITY.COMBAT_RESULT, tone: 'INFO', label: 'COMBAT RESULT', message: flow.lastActionText } : null,
  ]);
  const notificationTone = primaryNotification?.tone === 'DANGER' ? 'border-rose-300 bg-rose-950/95 text-rose-100' : primaryNotification?.tone === 'WARNING' ? 'border-amber-300 bg-amber-950/95 text-amber-100' : primaryNotification?.tone === 'TRAINING' ? 'border-emerald-300 bg-emerald-950/95 text-emerald-50' : primaryNotification?.tone === 'OBJECTIVE' ? 'border-cyan-300 bg-slate-950/94 text-cyan-50' : 'border-cyan-400 bg-slate-950/94 text-zinc-100';
  const notificationRegion = primaryNotification ? getHudNotificationRegion(primaryNotification.id) : null;
  const notificationPlacement = notificationRegion === 'radio-caption'
    ? 'right-2 top-[24%] w-[min(42%,480px)] min-[900px]:right-4 min-[900px]:top-[15%]'
    : notificationRegion === 'training-banner'
      ? 'left-1/2 top-3 w-[min(92%,480px)] -translate-x-1/2 min-[900px]:top-6'
      : 'left-1/2 top-[54%] w-[min(88%,520px)] -translate-x-1/2 min-[900px]:top-[26%]';

  return (
    <div id="game-hud" data-hud-mode={hudVisibility.mode} data-hud-scale={accessibility.hudScale} data-hud-contrast={accessibility.hudContrast} data-text-contrast={accessibility.textContrast} className={`absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-2 sm:p-4 font-mono-tech ${accessibility.highContrastHud || accessibility.hudContrast === 'HIGH' ? 'contrast-125 saturate-150' : ''}`}>
      {primaryNotification ? <div data-hud-region={notificationRegion ?? undefined} data-notification-id={primaryNotification.id} data-training-phase={primaryNotification.id === 'training' ? trainingState?.phase : undefined} className={`pointer-events-auto absolute z-30 rounded-lg border-2 px-4 py-2.5 text-center shadow-2xl ${notificationPlacement} ${notificationTone}`} role="status" aria-live={primaryNotification.tone === 'DANGER' ? 'assertive' : 'polite'} aria-atomic="true">
        <div className="text-[10px] font-black tracking-[.2em]">{primaryNotification.label}</div><div className="mt-1 text-[11px] font-bold leading-relaxed text-white">{primaryNotification.message}</div>
        {primaryNotification.id === 'recovery' && recoveryGuidance ? <div className="mt-2 grid grid-cols-4 gap-2 border-t border-white/15 pt-1.5 text-[9px] text-zinc-300"><span>RANGE <b className="text-white">{distanceToRecovery}m</b></span><span>FWD <b className={recoveryGuidance.forwardSpeed > 4 ? 'text-amber-200' : 'text-emerald-200'}>{recoveryGuidance.forwardSpeed.toFixed(1)}</b></span><span>DESC <b className={recoveryGuidance.descentRate > 2.2 ? 'text-rose-200' : 'text-emerald-200'}>{recoveryGuidance.descentRate.toFixed(1)}</b></span><span>NOZZLE <b className="text-cyan-100">{recoveryGuidance.nozzleAngle}°</b></span></div> : null}
        {primaryNotification.action ? <span className="mt-1.5 inline-block rounded bg-white/90 px-2 py-1 text-[10px] font-black text-slate-950">{primaryNotification.action}</span> : null}
        {primaryNotification.id === 'training' && trainingState?.phase === 'INSTRUCTION' ? <button type="button" onClick={onSkipTraining} className="ml-3 text-[10px] font-bold text-zinc-300 underline hover:text-white focus-visible:outline-2 focus-visible:outline-white">SKIP TRAINING</button> : null}
      </div> : null}
      {feedback?.hitMarkerTicks ? <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" aria-live="polite"><div className={`text-2xl font-black drop-shadow-[0_0_5px_#22d3ee] ${feedback.hitOutcome === 'DESTROYED' ? 'text-amber-200' : feedback.hitOutcome === 'CRITICAL' ? 'text-rose-200' : 'text-white'}`}>×</div>{!primaryNotification && feedback.hitOutcome && feedback.hitWeapon ? <div className="mt-1 max-w-56 rounded border border-white/20 bg-black/75 px-2 py-0.5 text-center text-[8px] font-black tracking-wider text-zinc-100"><div>{feedback.hitWeapon} // {feedback.hitAspect} // {feedback.hitOutcome}</div>{feedback.hitTargetName ? <div className="mt-0.5 truncate font-normal text-zinc-400">{feedback.hitTargetName}</div> : null}</div> : null}</div> : null}
      {feedback?.damageWarningTicks && feedback.threatDirection ? <div className={`absolute top-1/2 z-20 -translate-y-1/2 animate-pulse text-4xl font-black text-rose-400 ${feedback.threatDirection === 'LEFT' ? 'left-4' : 'right-4'}`}>{feedback.threatDirection === 'LEFT' ? '‹' : '›'}</div> : null}
      {feedback?.incomingMissileDirection ? <div aria-label={`Missile threat from ${feedback.incomingMissileDirection.toLowerCase()}`} className={`absolute top-[42%] z-20 rounded border-2 border-dashed border-rose-200 bg-black/90 px-2 py-1 text-[10px] font-black text-white ${feedback.incomingMissileDirection === 'LEFT' ? 'left-3' : 'right-3'}`}><span aria-hidden="true">◆ {feedback.incomingMissileDirection === 'LEFT' ? '◀' : '▶'}</span> MISSILE</div> : null}
      {feedback?.airThreatState && feedback.airThreatDirection ? <div aria-label={`Fighter ${feedback.airThreatState.toLowerCase()} from ${feedback.airThreatDirection.toLowerCase()}`} className={`absolute top-[34%] z-20 rounded border-4 border-double px-2 py-1 text-[9px] font-black tracking-wider ${feedback.airThreatState === 'FIRING' ? 'animate-pulse border-rose-200 bg-rose-950/95 text-white' : feedback.airThreatState === 'TRACKING' ? 'border-amber-200 bg-black/90 text-white' : 'border-cyan-200 bg-black/90 text-white'} ${feedback.airThreatDirection === 'LEFT' ? 'left-3' : 'right-3'}`}><span aria-hidden="true">△ {feedback.airThreatDirection === 'LEFT' ? '◀' : '▶'}</span> BANDIT {feedback.airThreatState}</div> : null}
      {mission.id === 'm11_cold_passage' && feedback && showColdPassagePanel ? (
        <div className="absolute left-2 top-[112px] z-20 w-64 rounded border border-amber-300/55 bg-slate-950/92 px-3 py-2 shadow-xl sm:left-4" aria-live="polite">
          <div className="flex items-center justify-between text-[9px] font-bold tracking-[.16em] text-cyan-200"><span>LONG-RANGE CONTACTS</span><span>{feedback.unidentifiedContacts} UNKNOWN</span></div>
          <div className="mt-2 flex items-center gap-2 text-[8px] text-slate-400"><span className="w-20">VISUAL ID</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-800"><div className="h-full bg-cyan-300" style={{ width: `${Math.round(feedback.identificationProgress * 100)}%` }} /></div></div>
          <div className="mt-1 flex items-center gap-2 text-[8px] text-amber-200"><span className="w-20">TARGET TRACK</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-800"><div className={`h-full ${feedback.targetingTrackProgress >= 0.75 ? 'animate-pulse bg-rose-400' : 'bg-amber-300'}`} style={{ width: `${Math.round(feedback.targetingTrackProgress * 100)}%` }} /></div></div>
        </div>
      ) : null}
      {mission.id === 'm12_hammerfall_fjord' && showHammerfallPanel ? (
        <div className="absolute left-2 top-[112px] z-20 w-72 rounded border border-cyan-300/55 bg-slate-950/92 px-3 py-2 shadow-xl sm:left-4" aria-live="polite">
          <div className="flex items-center justify-between text-[9px] font-bold tracking-[.14em] text-cyan-200"><span>HAMMERFALL CORRIDOR</span><span className={s.altitudeBand === 'LOW' ? 'text-emerald-300' : 'animate-pulse text-amber-300'}>{s.altitudeBand === 'LOW' ? 'TERRAIN MASKED' : 'RADAR EXPOSED'}</span></div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[8px]">
            {mission.objectives.filter((objective) => objective.id.startsWith('m12_relay_')).map((objective) => <div key={objective.id} className={`rounded border px-2 py-1 ${objective.completed ? 'border-emerald-400/50 bg-emerald-950/35 text-emerald-200' : objective.active === false ? 'border-slate-700 bg-black/35 text-slate-500' : 'border-amber-300/50 bg-amber-950/25 text-amber-100'}`}>{objective.id.endsWith('alpha') ? 'RELAY ALPHA' : 'RELAY BRAVO'} · {objective.completed ? 'SILENT' : objective.active === false ? 'PHASE LOCK' : 'ACTIVE'}</div>)}
          </div>
        </div>
      ) : null}
      {mission.id === 'm13_troms_bridgehead' && showTromsPanel ? (
        <div className="absolute left-2 top-[112px] z-20 w-72 rounded border border-cyan-300/55 bg-slate-950/92 px-3 py-2 shadow-xl sm:left-4" aria-live="polite">
          <div className="flex items-center justify-between text-[8px] font-bold tracking-[.12em] text-cyan-200"><span>TROMS LANDING FORCE INTEGRITY</span><span className={defendedAsset && defendedAsset.integrity <= 30 ? 'animate-pulse text-rose-300' : 'text-emerald-300'}>{defendedAsset?.integrity ?? 100}%</span></div>
          <div className="mt-1 flex items-center justify-between text-[8px] font-bold tracking-[.14em] text-slate-400"><span>TROMS BRIDGEHEAD</span><span className={tromsFarpOperational ? 'text-emerald-300' : 'text-amber-300'}>{tromsFarpOperational ? 'FARP OPERATIONAL' : 'FARP CLOSED'}</span></div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[8px]">
            {mission.objectives.filter((objective) => ['m13_artillery', 'm13_armour', 'm13_bridges'].includes(objective.id)).map((objective) => <div key={objective.id} className={`rounded border px-1 py-1 ${objective.completed ? 'border-emerald-400/50 bg-emerald-950/35 text-emerald-200' : 'border-amber-300/45 bg-amber-950/20 text-amber-100'}`}><span className="block text-[7px] text-slate-400">{objective.id.replace('m13_', '').toUpperCase()}</span>{objective.currentCount}/{objective.requiredCount}</div>)}
          </div>
        </div>
      ) : null}
      {mission.id === 'm14_whiteout_rescue' && rescueBeacon ? (
        <div className="absolute left-2 top-[112px] z-20 w-72 rounded border border-cyan-200/65 bg-slate-950/94 px-3 py-2 shadow-[0_0_24px_rgba(125,211,252,.18)] sm:left-4" aria-live="polite">
          <div className="flex items-center justify-between text-[8px] font-bold tracking-[.14em] text-cyan-100"><span className="flex items-center gap-1"><Navigation className="h-3 w-3" /> EMERGENCY BEACON</span><span className={rescueBeacon.crewAboard ? 'text-emerald-300' : rescueBeacon.crewLocated ? 'text-amber-200' : 'text-cyan-200'}>{rescueBeacon.crewAboard ? 'CREW ABOARD' : rescueBeacon.crewLocated ? 'CREW LOCATED' : `${rescueBeacon.bearing === 'LEFT' ? '◀' : rescueBeacon.bearing === 'RIGHT' ? '▶' : '◆'} ${rescueBeacon.distance}m`}</span></div>
          <div className="mt-2 flex items-center gap-2 text-[8px] text-slate-400"><span className="w-16">STRENGTH</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-800"><div className="h-full bg-cyan-200" style={{ width: `${Math.round(rescueBeacon.strength * 100)}%` }} /></div><span className="w-7 text-right text-cyan-100">{Math.round(rescueBeacon.strength * 100)}%</span></div>
          {rescueBeacon.crewLocated && !rescueBeacon.crewAboard ? <div className="mt-1 flex items-center gap-2 text-[8px] text-amber-100"><span className="w-16">WINCH</span><div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-800"><div className="h-full bg-amber-300" style={{ width: `${Math.round(rescueBeacon.pickupProgress * 100)}%` }} /></div><span className="w-7 text-right">{Math.round(rescueBeacon.pickupProgress * 100)}%</span></div> : null}
          <div className="mt-1 flex items-center justify-between border-t border-cyan-100/15 pt-1 text-[8px] text-slate-400"><span className="flex items-center gap-1"><CloudSnow className="h-3 w-3" /> WHITEOUT VISIBILITY</span><span className="font-bold text-slate-100">{Math.round((arcticWeather?.visibility ?? 1) * 100)}%</span></div>
        </div>
      ) : null}
      {mission.id === 'm15_red_tide' && defendedAsset && showRedTidePanel ? (
        <div className="absolute left-2 top-[112px] z-20 w-72 rounded border border-rose-300/65 bg-slate-950/94 px-3 py-2 shadow-[0_0_26px_rgba(251,113,133,.16)] sm:left-4" aria-live="polite">
          <div className="flex items-center justify-between text-[8px] font-bold tracking-[.13em] text-rose-200"><span className="flex items-center gap-1"><Shield className="h-3 w-3" /> RED TIDE FLEET DEFENCE</span><span className={defendedAsset.integrity <= 50 ? 'animate-pulse text-rose-300' : 'text-emerald-300'}>{defendedAsset.integrity}%</span></div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[8px]">
            <div className="rounded border border-amber-300/35 bg-amber-950/25 px-1 py-1"><span className="block text-[7px] text-slate-400">INCOMING</span><strong className={defendedAsset.incomingMissiles > 0 ? 'animate-pulse text-rose-300' : 'text-slate-300'}>{defendedAsset.incomingMissiles}</strong></div>
            <div className="rounded border border-cyan-300/35 bg-cyan-950/25 px-1 py-1"><span className="block text-[7px] text-slate-400">INTERCEPTED</span><strong className="text-cyan-200">{redTideInterceptions?.currentCount ?? 0}/{redTideInterceptions?.requiredCount ?? 4}</strong></div>
            <div className="rounded border border-rose-300/35 bg-rose-950/25 px-1 py-1"><span className="block text-[7px] text-slate-400">CORVETTES</span><strong className="text-rose-200">{redTideCorvettes?.currentCount ?? 0}/{redTideCorvettes?.requiredCount ?? 4}</strong></div>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1 text-[8px] text-slate-400"><span>NEXT THREAT WAVE</span><span className="font-bold text-amber-200">{directorState?.nextWaveTicks === null || directorState?.nextWaveTicks === undefined ? 'ACTIVE' : `${Math.ceil(directorState.nextWaveTicks / 60)}s`}</span></div>
        </div>
      ) : null}
      {mission.id === 'm16_north_cape_assault' && defendedAsset && showNorthCapePanel ? (
        <div className="absolute left-2 top-[112px] z-20 w-[min(92vw,360px)] rounded border border-amber-200/65 bg-slate-950/95 px-3 py-2 shadow-[0_0_28px_rgba(251,191,36,.14)] sm:left-4" aria-live="polite">
          <div className="flex items-center justify-between text-[8px] font-bold tracking-[.13em] text-amber-100"><span className="flex items-center gap-1"><Shield className="h-3 w-3" /> NORTH CAPE ASSAULT</span><span className={defendedAsset.integrity <= 50 ? 'animate-pulse text-rose-300' : 'text-emerald-300'}>INVINCIBLE {defendedAsset.integrity}%</span></div>
          <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[7px]">
            {northCapeObjectives.map((objective) => <div key={objective.id} className={`rounded border px-1 py-1 ${objective.completed ? 'border-emerald-400/45 bg-emerald-950/35 text-emerald-200' : objective.active === false ? 'border-slate-700 bg-black/40 text-slate-500' : 'border-amber-300/45 bg-amber-950/25 text-amber-100'}`}><span className="block text-[6px] text-slate-400">{objective.id.replace('m16_', '').toUpperCase()}</span>{objective.completed ? 'CLEAR' : objective.active === false ? 'LOCKED' : `${objective.currentCount}/${objective.requiredCount}`}</div>)}
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1 text-[8px] text-slate-400"><span>{directorState?.phaseLabel ?? 'SEA APPROACH'}</span><span className={defendedAsset.incomingMissiles > 0 ? 'animate-pulse font-black text-rose-300' : 'text-cyan-200'}>{defendedAsset.incomingMissiles > 0 ? `${defendedAsset.incomingMissiles} MISSILE INBOUND` : 'FLEET SCREEN CLEAR'}</span></div>
        </div>
      ) : null}
      {/* --- TOP BAR: RADAR, MISSION INFO, COMBAT FLOW & SCORE --- */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Tactical Compass & Operation Info */}
        <div className="flex max-w-[58vw] flex-col gap-1 bg-zinc-950/80 backdrop-blur-sm border border-cyan-500/30 p-2 sm:p-2.5 rounded shadow-lg text-[10px] sm:text-xs text-zinc-300">
          <div className="flex items-center gap-2 text-cyan-400 font-display font-bold text-sm tracking-wider">
            <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
            <span>OP {mission.codeName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
              {mission.timeString}
            </span>
          </div>
          {hudExpanded ? <div className="text-[11px] text-zinc-400">
            LOC: <span className="text-zinc-200">{mission.theater}</span>
          </div> : null}
          {directorState && mission.phases?.length ? <div className="flex flex-wrap gap-x-2 border-t border-white/10 pt-1 text-[9px] font-bold"><span className="text-emerald-300">{directorState.phaseLabel}</span>{mission.alertProfile ? <span className={directorState.alertLevel >= 80 ? 'animate-pulse text-rose-300' : 'text-amber-300'}>ALERT {Math.round(directorState.alertLevel)}%</span> : null}{directorState.nextWaveTicks !== null ? <span className="text-cyan-300">WAVE {Math.ceil(directorState.nextWaveTicks / 60)}s</span> : null}{mission.id === 'm7_bridge_strike' ? <span className="text-amber-300">CONVOY ROUTE ACTIVE</span> : null}</div> : null}
          {defendedAsset && mission.id !== 'm13_troms_bridgehead' && mission.id !== 'm15_red_tide' && mission.id !== 'm16_north_cape_assault' ? <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-1 text-[9px] font-bold"><span className="text-cyan-300">{defendedAssetLabel(defendedAsset.type)} {defendedAsset.integrity}%</span>{defendedAsset.incomingMissiles > 0 ? <span className="animate-pulse text-rose-300">◆ MISSILES ×{defendedAsset.incomingMissiles}</span> : null}</div> : null}
          {currentObjective ? <div className="max-w-[360px] truncate border-t border-white/10 pt-1 text-[9px] text-emerald-100/80">OBJ: {currentObjective.description}</div> : null}
          {hudVisibility.mapProgress ? <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
            <span>MAP PROGRESS:</span>
            <div className="w-28 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
              <div
                className="h-full bg-cyan-500 transition-all duration-150"
                style={{ width: `${Math.min(100, (s.x / mission.mapLength) * 100)}%` }}
              />
            </div>
            <span>{Math.round(s.x)}m</span>
          </div> : null}
        </div>

        {/* Top-Right: Combat Flow & Score + Quick Controls */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={hudExpanded}
              onClick={() => setHudExpanded((visible) => !visible)}
              className="hidden lg:flex px-2.5 py-1.5 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold shadow items-center gap-1 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-cyan-200"
              title="Toggle expanded HUD detail (I)"
            >
              {hudExpanded ? '− ESSENTIAL HUD' : '+ HUD DETAIL'} [I]
            </button>
            {onToggleTouchControls && (
              <button
                type="button"
                onClick={onToggleTouchControls}
                className="hidden lg:flex px-2.5 py-1.5 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold shadow items-center gap-1 cursor-pointer transition-colors"
                title="Toggle On-Screen Controls"
              >
                🎮 {showTouchControls ? 'HIDE ON-SCREEN CONTROLS' : 'TOUCH / MOUSE CONTROLS'}
              </button>
            )}
            {onPauseToggle && (
              <button
                type="button"
                onClick={onPauseToggle}
                className="px-2.5 py-1.5 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-bold shadow flex items-center gap-1 cursor-pointer transition-colors"
                title="Pause Game (P / ESC)"
              >
                ⏸ PAUSE [ESC]
              </button>
            )}
          </div>

          {hudVisibility.scoreDetail ? <div className="hidden lg:flex items-center gap-3 bg-zinc-950/85 backdrop-blur-md border border-amber-500/40 p-2.5 rounded-lg shadow-xl text-right">
            <div>
              <div className="text-[10px] tracking-widest text-zinc-400 font-bold uppercase">Combat Flow</div>
              <div className="text-xl font-display font-black tracking-wider text-amber-400 flex items-center justify-end gap-1">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                FLOW x{flow.multiplier.toFixed(1)}
              </div>
            </div>
            <div className="h-9 w-px bg-zinc-800" />
            <div>
              <div className="text-[10px] tracking-widest text-zinc-400 font-bold uppercase">Tactical Score</div>
              <div className="text-xl font-display font-black text-zinc-100 tracking-wide">
                {score.toLocaleString()}
              </div>
            </div>
          </div> : null}

        </div>
      </div>

      {/* --- CENTER: AVIATION PITCH LADDER, CARRIER ILS & RETICLE --- */}
      <div className="relative flex-1 flex items-center justify-center">
        {/* Left Flight Tape: Airspeed & VTOL Mode */}
        {hudVisibility.detailedFlight ? <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-2 bg-zinc-950/80 backdrop-blur-sm border border-cyan-500/30 p-2.5 rounded text-xs">
          <div className="text-zinc-400 text-[10px] font-bold">AIRSPEED</div>
          <div className="text-lg font-bold font-display text-cyan-300" aria-label={`${s.speedKnots} knots, flying ${s.facing === -1 ? 'left' : 'right'}`}>
            <span aria-hidden="true">{s.facing === -1 ? '\u25c0' : '\u25b6'} </span>{s.speedKnots} <span className="text-[10px] font-normal text-zinc-400">KTS</span>
          </div>
          
          <div className="mt-1 flex flex-col gap-1 text-[11px]">
            <div className="text-[10px] text-zinc-400 font-bold">FLIGHT MODE</div>
            <div
              className={`px-2 py-0.5 rounded font-bold text-center border ${
                s.vtolMode
                  ? 'border-amber-400 bg-amber-950/60 text-amber-300 animate-pulse'
                  : 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
              }`}
            >
              {s.vtolMode ? 'VTOL HOVER' : 'CTOL JET'}
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
            <span>GEAR:</span>
            <span className={s.gearDown ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {s.gearDown ? 'DOWN' : 'UP'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>NOZZLES:</span>
            <span className={s.vtolTransition > 0.65 ? 'font-bold text-amber-300' : 'text-cyan-300'}>
              {Math.round(s.vtolTransition * 98)}°
            </span>
          </div>
        </div> : null}

        {/* Right Flight Tape: Altitude Band & Vertical Speed */}
        {hudVisibility.detailedFlight ? <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-2 bg-zinc-950/80 backdrop-blur-sm border border-cyan-500/30 p-2.5 rounded text-xs text-right">
          <div className="text-zinc-400 text-[10px] font-bold">BARO ALTITUDE</div>
          <div className="text-lg font-bold font-display text-cyan-300">
            {Math.round(620 - s.y)} <span className="text-[10px] font-normal text-zinc-400">FT</span>
          </div>
          <div className={`text-[10px] font-bold ${verticalSpeed.unsafeDescent ? 'text-rose-400' : 'text-emerald-300'}`}>
            V/S {verticalSpeed.feetPerMinute >= 0 ? '+' : ''}{verticalSpeed.feetPerMinute} FT/MIN
          </div>

          <div className="mt-1 flex flex-col gap-1 text-[11px] items-end">
            <div className="text-[10px] text-zinc-400 font-bold">ALTITUDE ENVELOPE</div>
            <div className={`px-2 py-0.5 rounded font-bold border ${altitudeBandColor}`}>
              {s.altitudeBand === 'LOW' && 'LOW — MASKED'}
              {s.altitudeBand === 'MEDIUM' && 'MED — BALANCED'}
              {s.altitudeBand === 'HIGH' && 'HIGH — SAM RISK'}
            </div>
          </div>

        </div> : null}

        {/* Target Lock Reticle (Center-Forward) */}
        {s.targetLockedId && (
          <div className="absolute flex flex-col items-center gap-1">
            <div className={`relative flex h-14 w-14 items-center justify-center ${s.lockProgress >= 1 ? 'animate-pulse' : ''}`} aria-hidden="true">
              <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-rose-300" />
              <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-rose-300" />
              <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-rose-300" />
              <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-rose-300" />
              <Crosshair className="h-6 w-6 text-rose-200 drop-shadow-[0_0_5px_rgba(251,113,133,0.9)]" />
            </div>
            <div className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500 text-[10px] text-rose-200 font-bold">
              {s.lockProgress >= 1.0 ? 'LOCK-ON // FOX-2 READY' : `ACQUIRING... ${Math.round(s.lockProgress * 100)}%`}
            </div>
          </div>
        )}
      </div>

      {/* --- BOTTOM BAR: SUB-SYSTEM STATUS, FUEL, CANNON HEAT, WEAPONS BAY --- */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex w-[min(76%,420px)] -translate-x-1/2 items-center justify-between gap-2 rounded border border-cyan-500/35 bg-zinc-950/88 px-2 py-1 text-[9px] shadow-lg backdrop-blur-sm lg:hidden" aria-label="Essential aircraft and weapon status">
        <span className={s.health < 35 ? 'font-black text-rose-300' : 'font-bold text-cyan-200'}>AIRFRAME {Math.round(s.health)}%</span>
        <span className={hudVisibility.dangerousFuel ? 'animate-pulse font-black text-rose-300' : 'font-bold text-amber-200'}>FUEL {Math.round(s.fuel)}%</span>
        <span className="truncate font-black text-emerald-200">{activeWeaponLabel(s)}</span>
      </div>
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Subsystem Health & Fuel Gauge */}
        <div className="hidden lg:flex flex-col gap-2 bg-zinc-950/85 backdrop-blur-md border border-cyan-500/40 p-2.5 rounded-lg shadow-xl text-xs w-56">
          {/* Main Airframe Health */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="flex items-center gap-1.5 text-zinc-200">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> AIRFRAME INTEGRITY
              </span>
              <span className={s.health < 35 ? 'text-rose-400 animate-pulse font-black' : 'text-cyan-300'}>
                {Math.round(s.health)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
              <div
                className={`h-full transition-all duration-150 ${
                  s.health < 30 ? 'bg-rose-500' : s.health < 60 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${s.health}%` }}
              />
            </div>
          </div>

          {/* Fuel Status */}
          {hudVisibility.dangerousFuel || hudExpanded ? <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="flex items-center gap-1.5 text-zinc-200">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> JET FUEL
              </span>
              <span className={s.fuel < 20 ? 'text-rose-400 animate-pulse font-black' : 'text-amber-300'}>
                {Math.round(s.fuel)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
              <div
                className={`h-full transition-all duration-150 ${s.fuel < 20 ? 'bg-rose-500' : 'bg-amber-500'}`}
                style={{ width: `${s.fuel}%` }}
              />
            </div>
          </div> : <div className="flex items-center justify-between border-t border-zinc-800 pt-1 text-[10px]"><span className="flex items-center gap-1 text-zinc-400"><Flame className="h-3 w-3 text-amber-400" /> FUEL</span><span className="font-bold text-amber-300">{Math.round(s.fuel)}%</span></div>}

          {/* Subsystem Micro Grid Warnings */}
          {hudVisibility.subsystemDetail ? <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-zinc-800 text-[10px]" aria-label="Subsystem damage status">
            <div className={`p-1 rounded border text-center ${s.subsystems.engine < 0.6 ? 'border-rose-500 bg-rose-950/50 text-rose-300' : 'border-zinc-800 text-zinc-400'}`}>
              ENG: {Math.round(s.subsystems.engine * 100)}%
            </div>
            <div className={`p-1 rounded border text-center ${s.subsystems.flightControls < 0.6 ? 'border-rose-500 bg-rose-950/50 text-rose-300' : 'border-zinc-800 text-zinc-400'}`}>
              FCS: {Math.round(s.subsystems.flightControls * 100)}%
            </div>
            <div className={`p-1 rounded border text-center ${s.subsystems.targeting < 0.6 ? 'border-rose-500 bg-rose-950/50 text-rose-300' : 'border-zinc-800 text-zinc-400'}`}>
              AVN: {Math.round(s.subsystems.targeting * 100)}%
            </div>
          </div> : null}
        </div>

        {/* Bottom-Centre: contextual control reference. */}
        <div className="pointer-events-auto hidden lg:flex flex-col items-center gap-1">
          {hudVisibility.controlReference ? <div className="bg-zinc-950/90 backdrop-blur-sm border border-cyan-500/40 px-3 py-1.5 rounded text-[10px] text-zinc-300 shadow-lg" aria-label="Flight control reference">
          <div className="flex items-center gap-3 text-cyan-300 font-semibold">
            <span><strong className="text-zinc-100">{bindingLabel(inputBindings, 'PITCH_UP', inputDevice)}/{bindingLabel(inputBindings, 'PITCH_DOWN', inputDevice)}</strong> PITCH</span>
            <span><strong className="text-zinc-100">{bindingLabel(inputBindings, 'THROTTLE_DOWN', inputDevice)}/{bindingLabel(inputBindings, 'THROTTLE_UP', inputDevice)}</strong> {DIRECTIONAL_FLIGHT_COPY.hudLabel}</span>
            <span><strong className="text-amber-300">{bindingLabel(inputBindings, 'VTOL', inputDevice)}</strong> VTOL</span>
            <span><strong className="text-cyan-200">{bindingLabel(inputBindings, 'PRIMARY_FIRE', inputDevice)}</strong> ADEN</span>
            <span><strong className="text-rose-300">{bindingLabel(inputBindings, 'SECONDARY_FIRE', inputDevice)}</strong> SECONDARY</span>
            <span><strong className="text-amber-300">{bindingLabel(inputBindings, 'CYCLE_WEAPON', inputDevice)}</strong> CYCLE</span>
            <span><strong className="text-emerald-300">{bindingLabel(inputBindings, 'COUNTERMEASURE', inputDevice)}</strong> FLARE</span>
          </div>
          </div> : null}
          <button type="button" aria-expanded={!tutorialUnderstood || Boolean(trainingState?.enabled) || controlsRecalled} onClick={() => setControlsRecalled((visible) => !visible)} className="rounded border border-zinc-600 bg-black/80 px-2 py-1 text-[10px] font-bold text-zinc-200 hover:border-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-200">CONTROLS [H]</button>
        </div>

        {/* Bottom-Right: Weapons Loadout & Autocannon Heat */}
        <div className="hidden lg:flex flex-col gap-2 bg-zinc-950/85 backdrop-blur-md border border-cyan-500/40 p-2.5 rounded-lg shadow-xl text-xs w-56 text-right">
          <div className="flex items-center justify-between gap-3" aria-label={`Active weapon ${activeWeaponLabel(s)}`}>
            <span className="text-[9px] font-bold tracking-wider text-zinc-400">ACTIVE WEAPON</span>
            <span className="font-display text-xs font-black text-cyan-200">{activeWeaponLabel(s)}</span>
          </div>
          {hudVisibility.weaponDetail ? <>
          {/* Twin 30mm ADEN cannon heat gauge */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className={s.cannonOverheated ? 'text-rose-400 animate-pulse font-black' : 'text-zinc-200'}>
                {s.cannonOverheated ? 'GUN OVERHEAT LOCKOUT!' : '30mm ADEN HEAT'}
              </span>
              <span className={s.cannonHeat > 75 ? 'text-rose-400' : 'text-cyan-300'}>
                {Math.round(s.cannonHeat)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
              <div
                className={`h-full transition-all duration-100 ${
                  s.cannonOverheated ? 'bg-rose-600 animate-pulse' : s.cannonHeat > 75 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${s.cannonHeat}%` }}
              />
            </div>
          </div>

          {/* Weapon Ammo Pods */}
          <div className="grid grid-cols-4 gap-1 pt-1 border-t border-zinc-800 text-[9px]">
            <div className="p-1.5 rounded border border-cyan-500/40 bg-cyan-950/20 flex flex-col items-center">
              <span className="text-zinc-400">GUN</span>
              <span className="text-cyan-300 font-bold text-xs">∞</span>
              <span className="text-[9px] text-zinc-500">[SPACE]</span>
            </div>
            <div className="p-1.5 rounded border border-rose-500/40 bg-rose-950/20 flex flex-col items-center">
              <span className="text-zinc-400">AIM-9L</span>
              <span className="text-rose-300 font-bold text-xs">{s.missiles}</span>
              <span className="text-[9px] text-zinc-500">[J]</span>
            </div>
            <div className="p-1.5 rounded border border-amber-500/40 bg-amber-950/20 flex flex-col items-center">
              <span className="text-zinc-400">1000 LB</span>
              <span className="text-amber-300 font-bold text-xs">{s.bombs}</span>
              <span className="text-[9px] text-zinc-500">[K]</span>
            </div>
            <div className="p-1.5 rounded border border-emerald-500/40 bg-emerald-950/20 flex flex-col items-center">
              <span className="text-zinc-400">FLARE</span>
              <span className="text-emerald-300 font-bold text-xs">{s.flares}</span>
              <span className="text-[9px] text-zinc-500">[F]</span>
            </div>
          </div>
          </> : null}
        </div>
      </div>
    </div>
  );
};

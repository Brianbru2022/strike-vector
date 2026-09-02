import React, { useState } from 'react';
import { GameScoreBreakdown, MissionDefinition } from '../types/game';
import { Award, CheckCircle2, XCircle, RotateCcw, ArrowRight, Zap, Target, Shield, AlertTriangle } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { isNorwegianMission, missionPresentationArtwork } from '../game/MissionPresentation';
import { PhaseRestartGuidance } from '../game/PhaseRestartGuidance';

interface DebriefingScreenProps {
  scoreData: GameScoreBreakdown;
  mission: MissionDefinition;
  onNextMission?: () => void;
  onRetry: () => void;
  onMenu: () => void;
  restartGuidance?: PhaseRestartGuidance | null;
}

export const DebriefingScreen: React.FC<DebriefingScreenProps> = ({
  scoreData,
  mission,
  onNextMission,
  onRetry,
  onMenu,
  restartGuidance,
}) => {
  const [showRebrief, setShowRebrief] = useState(false);
  const isVictory = scoreData.isVictory;
  const norwegianSortie = isNorwegianMission(mission);
  const consequence = mission.id === 'm4_night_raid'
    ? 'Enemy armour route broken. Faroe Approaches secured and Skeld resupplied.'
    : mission.id === 'm5_pilot_rescue'
      ? 'Viper One recovered. Squadron intelligence and pilot strength preserved.'
      : mission.id === 'm6_fleet_defence'
        ? 'Carrier group protected. The Skeld sector is secure for the next advance.'
        : mission.id === 'm3_convoy_hunter'
          ? 'Skeld FARP captured. Forward rearming and limited repairs are now available.'
          : mission.id === 'm13_troms_bridgehead'
            ? 'Troms bridgehead secured. The expeditionary FARP is operational for the northern advance.'
          : mission.id === 'm14_whiteout_rescue'
            ? 'Both reconnaissance crew recovered. Their North Cape observations survived the whiteout.'
          : mission.id === 'm15_red_tide'
            ? 'The massed missile attack is broken. HMS Invincible retains the sea lane for the North Cape assault.'
          : mission.id === 'm16_north_cape_assault'
            ? 'North Cape command is destroyed. The Norwegian Sea is secure and the northern campaign is complete.'
          : null;

  return (
    <div
      id="debriefing-screen"
      className="mission-screen-enter absolute inset-0 z-20 w-full h-full flex items-center justify-center p-4 md:p-8 bg-zinc-950/90 backdrop-blur-md font-mono-tech select-none overflow-y-auto"
    >
      <img src={missionPresentationArtwork(mission)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className={`absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/86 ${norwegianSortie ? 'to-cyan-950/55' : 'to-emerald-950/50'}`} />
      <div className="relative w-full max-w-2xl bg-zinc-900/95 border-2 border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Top Header */}
        <div className={`p-4 md:px-6 border-b flex items-center justify-between ${
          isVictory ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-rose-950/40 border-rose-500/40'
        }`}>
          <div className="flex items-center gap-3">
            {isVictory ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            ) : (
              <XCircle className="w-7 h-7 text-rose-400" />
            )}
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">
                TACTICAL MISSION DEBRIEFING
              </div>
              <h1 className="text-2xl font-display font-black tracking-wider text-zinc-100">
                {isVictory ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED — SORTIE LOST'}
              </h1>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="text-zinc-400">{mission.title}</div>
            <div className="text-cyan-400 font-bold">TIME: {scoreData.timeTakenSeconds}s</div>
          </div>
        </div>

        {/* Score Breakdown Table */}
        <div className="p-4 md:p-6 flex flex-col gap-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            {scoreData.missilesIntercepted > 0 && (
              <div className="p-2.5 bg-zinc-950/70 border border-cyan-700/50 rounded flex justify-between items-center">
                <span className="text-zinc-400">MISSILES INTERCEPTED</span>
                <span className="text-cyan-300 font-bold font-display">{scoreData.missilesIntercepted}</span>
              </div>
            )}
            {scoreData.carrierIntegrity !== null && (
              <div className="p-2.5 bg-zinc-950/70 border border-cyan-700/50 rounded flex justify-between items-center">
                <span className="text-zinc-400">{mission.defendedAsset?.type === 'FORWARD_BASE' ? 'FARP INTEGRITY' : mission.defendedAsset?.type === 'LANDING_FORCE' ? 'LANDING FORCE INTEGRITY' : 'CARRIER INTEGRITY'}</span>
                <span className={`font-bold font-display ${scoreData.carrierIntegrity > 25 ? 'text-emerald-300' : 'text-rose-400'}`}>{scoreData.carrierIntegrity}%</span>
              </div>
            )}
            {scoreData.pilotSurvived !== null && (
              <div className="p-2.5 bg-zinc-950/70 border border-cyan-700/50 rounded flex justify-between items-center col-span-2">
                <span className="text-zinc-400">PILOT STATUS</span>
                <span className={`font-bold font-display ${scoreData.pilotSurvived ? 'text-emerald-300' : 'text-rose-400'}`}>{scoreData.pilotSurvived ? 'EJECTED — RECOVERY BEACON ACTIVE' : 'LOST WITH AIRCRAFT'}</span>
              </div>
            )}
            {/* Aircraft Points */}
            <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded flex justify-between items-center">
              <span className="text-zinc-400">AIRCRAFT DESTROYED ({scoreData.aircraftDestroyed})</span>
              <span className="text-cyan-300 font-bold font-display">+{scoreData.aircraftPoints.toLocaleString()}</span>
            </div>

            {/* Ground Targets Points */}
            <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded flex justify-between items-center">
              <span className="text-zinc-400">GROUND TARGETS ({scoreData.groundUnitsDestroyed})</span>
              <span className="text-cyan-300 font-bold font-display">+{scoreData.groundPoints.toLocaleString()}</span>
            </div>

            {/* Objectives Points */}
            <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded flex justify-between items-center">
              <span className="text-zinc-400">OBJECTIVES COMPLETED</span>
              <span className="text-emerald-400 font-bold font-display">+{scoreData.objectivePoints.toLocaleString()}</span>
            </div>

            {/* Precision Bombing Bonus */}
            <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded flex justify-between items-center">
              <span className="text-zinc-400">PRECISION BOMBING</span>
              <span className="text-amber-400 font-bold font-display">+{scoreData.precisionBombingBonus.toLocaleString()}</span>
            </div>

            {/* Flight Style & Terrain Masking */}
            <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded flex justify-between items-center">
              <span className="text-zinc-400">FLIGHT STYLE / LOW PASS</span>
              <span className="text-sky-400 font-bold font-display">+{scoreData.flightStyleBonus.toLocaleString()}</span>
            </div>

            {/* Carrier Landing Grade */}
            <div className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded flex justify-between items-center">
              <span className="text-zinc-400">
                {mission.recoverySite === 'FORWARD_BASE' ? 'FARP RECOVERY' : 'CARRIER LANDING'} [{scoreData.carrierLandingGrade || 'NONE'}]
              </span>
              <span className="text-emerald-300 font-bold font-display">+{scoreData.carrierLandingPoints.toLocaleString()}</span>
            </div>
          </div>

          {/* Collateral ROE Penalty if any */}
          {scoreData.collateralDamageCount > 0 && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-500/50 rounded flex justify-between items-center text-rose-300">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                ROE COLLATERAL PENALTY ({scoreData.collateralDamageCount}x)
              </span>
              <span className="font-bold font-display text-rose-400">
                {scoreData.collateralPenalty.toLocaleString()} PTS
              </span>
            </div>
          )}

          {/* Peak Flow Multiplier */}
          <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded flex justify-between items-center">
            <span className="flex items-center gap-2 text-amber-300 font-bold">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> PEAK COMBAT FLOW
            </span>
            <span className="text-lg font-display font-black text-amber-400">
              x{scoreData.maxCombatFlow.toFixed(1)}
            </span>
          </div>

          {isVictory && consequence && (
            <div className="rounded border border-emerald-400/35 bg-emerald-950/25 p-3 text-emerald-100">
              <div className="mb-1 text-[9px] font-bold tracking-[.18em] text-emerald-400 uppercase">Campaign consequence</div>
              <div className="font-sans text-sm">{consequence}</div>
            </div>
          )}

          {!isVictory && restartGuidance && (
            <div className="rounded border border-amber-400/35 bg-amber-950/20 p-3 text-amber-100">
              <button type="button" onClick={() => setShowRebrief((value) => !value)} className="w-full text-left text-[10px] font-bold tracking-[.16em] text-amber-300">
                {showRebrief ? 'HIDE' : 'SHOW'} PHASE REBRIEF — {restartGuidance.phaseLabel}
              </button>
              {showRebrief && <div className="mt-2 font-sans text-sm"><strong>Reached phase {restartGuidance.phaseNumber} of {restartGuidance.phaseCount}.</strong> {restartGuidance.reminder}<div className="mt-2 text-xs text-amber-300">No checkpoint is created: retrying restarts the complete sortie with its original aircraft snapshot.</div></div>}
            </div>
          )}

          {/* Final Score Banner */}
          <div className="p-4 bg-zinc-950 border-2 border-cyan-500 rounded-lg flex justify-between items-center shadow-lg">
            <div>
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                FINAL TACTICAL SCORE
              </div>
              <div className="text-2xl md:text-3xl font-display font-black text-cyan-400 tracking-wider">
                {scoreData.finalScore.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <Award className="w-5 h-5" />
              <span>RECORD SAVED</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 md:px-6 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onMenu();
            }}
            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition"
          >
            MAIN MENU
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onRetry();
              }}
              className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {isVictory ? 'REPLAY SORTIE' : 'RESTART FULL SORTIE'}
            </button>
            {isVictory && onNextMission && (
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  onNextMission();
                }}
                className="px-6 py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-display font-black text-xs tracking-wider flex items-center gap-2 transition"
              >
                {mission.id === 'm10_hq_assault' || mission.id === 'm16_north_cape_assault' ? 'CAMPAIGN EPILOGUE' : mission.id.startsWith('m11_') || mission.id.startsWith('m12_') ? 'SERVICE & OPERATIONS MAP' : 'NEXT MISSION'} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

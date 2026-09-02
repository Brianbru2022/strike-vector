import { MissionDefinition, MissionDirectorState } from '../types/game';

export interface PhaseRestartGuidance {
  phaseId: string;
  phaseLabel: string;
  phaseNumber: number;
  phaseCount: number;
  reminder: string;
  wholeSortieRestart: true;
}

export function buildPhaseRestartGuidance(
  mission: MissionDefinition,
  state: MissionDirectorState,
): PhaseRestartGuidance | null {
  const phases = mission.phases ?? [];
  if (phases.length < 2) return null;
  const index = Math.max(0, phases.findIndex((phase) => phase.id === state.phaseId));
  const phase = phases[index] ?? phases[0];
  return {
    phaseId: phase.id,
    phaseLabel: phase.label,
    phaseNumber: index + 1,
    phaseCount: phases.length,
    reminder: mission.tacticalNotes[Math.min(index, Math.max(0, mission.tacticalNotes.length - 1))]
      ?? 'Review the phase order and preserve fuel and ordnance for recovery.',
    wholeSortieRestart: true,
  };
}

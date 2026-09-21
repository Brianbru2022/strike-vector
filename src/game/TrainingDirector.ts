import { InputAction, PlayerStats, TrainingRuntimeState, TrainingStep } from '../types/game';
import { DIRECTIONAL_FLIGHT_COPY } from './DirectionalFlightCopy';

export const CARRIER_QUALIFICATION_STEPS: TrainingStep[] = [
  { id: 'LAUNCH', title: 'Ski-jump departure', instruction: 'Leave the deck and hold a safe climb.', successMessage: 'Airborne — climb established.', completion: 'PLAYER_STATE' },
  { id: 'PITCH', action: 'PITCH_UP', title: 'Pitch control', instruction: 'Raise the nose to gain altitude.', successMessage: 'Climb response confirmed.', completion: 'PLAYER_STATE' },
  { id: 'DIRECTION', action: 'THROTTLE_UP', title: DIRECTIONAL_FLIGHT_COPY.lessonTitle, instruction: DIRECTIONAL_FLIGHT_COPY.lessonInstruction, successMessage: DIRECTIONAL_FLIGHT_COPY.lessonSuccess, completion: 'SEMANTIC_ACTION' },
  { id: 'CANNON', action: 'PRIMARY_FIRE', title: 'ADEN cannon', instruction: 'Fire a short burst from the twin 30 mm cannon.', successMessage: 'Cannon response confirmed.', completion: 'SEMANTIC_ACTION' },
  { id: 'TARGET', title: 'Target acquisition', instruction: 'Approach the marked aircraft and hold it in the targeting circle.', successMessage: 'Target locked.', completion: 'PLAYER_STATE' },
  { id: 'SIDEWINDER', action: 'SECONDARY_FIRE', title: 'Sidewinder', instruction: 'With LOCK shown, launch the selected AIM-9L.', successMessage: 'Sidewinder away.', completion: 'SEMANTIC_ACTION' },
  { id: 'COUNTERMEASURE', action: 'COUNTERMEASURE', title: 'Countermeasures', instruction: 'Release a flare now; use the same control when warned of a missile.', successMessage: 'Flare released.', completion: 'SEMANTIC_ACTION' },
  { id: 'VTOL', action: 'VTOL', title: 'Vector nozzles', instruction: 'Select VTOL mode and watch the nozzle indicator move.', successMessage: 'VTOL selected — nozzles rotating.', completion: 'PLAYER_STATE' },
  { id: 'RECOVERY', title: 'Carrier recovery', instruction: 'Finish the interception, return to Invincible and land gently in VTOL mode.', successMessage: 'Carrier qualification complete.', completion: 'MISSION_RESULT' },
];

export const TRAINING_SUCCESS_TICKS = 48;

export class TrainingDirector {
  private state: TrainingRuntimeState;

  constructor(enabled: boolean) {
    this.state = {
      enabled,
      completed: false,
      skipped: false,
      currentIndex: enabled ? 0 : CARRIER_QUALIFICATION_STEPS.length,
      completedSteps: 0,
      currentStep: enabled ? CARRIER_QUALIFICATION_STEPS[0] : null,
      phase: 'INSTRUCTION',
      successMessage: null,
      transitionTicksRemaining: 0,
    };
  }

  public getState(): TrainingRuntimeState {
    return { ...this.state, currentStep: this.state.currentStep ? { ...this.state.currentStep } : null };
  }

  public onAction(action: InputAction, player?: PlayerStats): boolean {
    const step = this.state.currentStep;
    if (!this.state.enabled || this.state.phase !== 'INSTRUCTION' || step?.completion !== 'SEMANTIC_ACTION' || !step.action || step.action !== action) return false;
    if (step.id === 'SIDEWINDER' && (!player || player.targetLockedId === null || player.selectedWeapon !== 'MISSILE')) return false;
    return this.confirmCurrentStep();
  }

  public update(player: PlayerStats, launchX: number): boolean {
    const step = this.state.currentStep;
    if (!this.state.enabled || !step) return false;
    if (this.state.phase === 'SUCCESS') {
      const ticksRemaining = Math.max(0, this.state.transitionTicksRemaining - 1);
      if (ticksRemaining === 0) this.advance();
      else this.state = { ...this.state, transitionTicksRemaining: ticksRemaining };
      return false;
    }
    if (step.id === 'LAUNCH' && player.x > launchX + 260 && player.y < 520) return this.confirmCurrentStep();
    if (step.id === 'PITCH' && player.pitchAngle <= -0.22 && player.vy <= -1.5) return this.confirmCurrentStep();
    if (step.id === 'TARGET' && player.targetLockedId !== null) return this.confirmCurrentStep();
    if (step.id === 'VTOL' && player.vtolMode && player.vtolTransition >= 0.35) return this.confirmCurrentStep();
    if (step.id === 'RECOVERY' && Boolean(player.carrierLandingGrade)) return this.confirmCurrentStep();
    return false;
  }

  public skip(): void {
    if (!this.state.enabled || this.state.completed) return;
    this.state = {
      enabled: false,
      completed: false,
      skipped: true,
      currentIndex: CARRIER_QUALIFICATION_STEPS.length,
      completedSteps: this.state.completedSteps,
      currentStep: null,
      phase: 'INSTRUCTION',
      successMessage: null,
      transitionTicksRemaining: 0,
    };
  }

  private confirmCurrentStep(): boolean {
    const step = this.state.currentStep;
    if (!step) return false;
    const completedSteps = this.state.currentIndex + 1;
    if (step.id === 'RECOVERY') {
      this.state = {
        ...this.state,
        enabled: false,
        completed: true,
        currentIndex: CARRIER_QUALIFICATION_STEPS.length,
        completedSteps: CARRIER_QUALIFICATION_STEPS.length,
        currentStep: null,
        phase: 'SUCCESS',
        successMessage: step.successMessage,
        transitionTicksRemaining: 0,
      };
      return true;
    }
    this.state = {
      ...this.state,
      completedSteps,
      phase: 'SUCCESS',
      successMessage: step.successMessage,
      transitionTicksRemaining: TRAINING_SUCCESS_TICKS,
    };
    return true;
  }

  private advance(): void {
    const nextIndex = this.state.currentIndex + 1;
    this.state = {
      ...this.state,
      currentIndex: nextIndex,
      currentStep: CARRIER_QUALIFICATION_STEPS[nextIndex],
      phase: 'INSTRUCTION',
      successMessage: null,
      transitionTicksRemaining: 0,
    };
  }
}

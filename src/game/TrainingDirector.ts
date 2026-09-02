import { InputAction, PlayerStats, TrainingRuntimeState, TrainingStep } from '../types/game';

export const CARRIER_QUALIFICATION_STEPS: TrainingStep[] = [
  { id: 'LAUNCH', title: 'Ski-jump departure', instruction: 'Launch from HMS Invincible and establish a safe climb.' },
  { id: 'PITCH', action: 'PITCH_UP', title: 'Pitch control', instruction: 'Climb away from the sea using pitch-up.' },
  { id: 'THROTTLE', action: 'THROTTLE_UP', title: 'Throttle control', instruction: 'Increase throttle and accelerate into the patrol area.' },
  { id: 'CANNON', action: 'PRIMARY_FIRE', title: 'ADEN cannon', instruction: 'Test-fire the twin 30 mm ADEN cannon.' },
  { id: 'TARGET', title: 'Target acquisition', instruction: 'Close with the reconnaissance aircraft until the targeting system begins a lock.' },
  { id: 'SIDEWINDER', action: 'SECONDARY_FIRE', title: 'Sidewinder', instruction: 'With a lock established, fire the selected AIM-9L.' },
  { id: 'COUNTERMEASURE', action: 'COUNTERMEASURE', title: 'Countermeasures', instruction: 'Deploy a flare to practise missile defence.' },
  { id: 'VTOL', action: 'VTOL', title: 'Vector nozzles', instruction: 'Engage VTOL mode and observe the nozzle indicator.' },
  { id: 'RECOVERY', title: 'Carrier recovery', instruction: 'Complete the interception, return to the carrier and touch down gently in VTOL mode.' },
];

export class TrainingDirector {
  private state: TrainingRuntimeState;

  constructor(enabled: boolean) {
    this.state = {
      enabled,
      completed: false,
      skipped: false,
      currentIndex: enabled ? 0 : CARRIER_QUALIFICATION_STEPS.length,
      currentStep: enabled ? CARRIER_QUALIFICATION_STEPS[0] : null,
    };
  }

  public getState(): TrainingRuntimeState {
    return { ...this.state, currentStep: this.state.currentStep ? { ...this.state.currentStep } : null };
  }

  public onAction(action: InputAction, player?: PlayerStats): boolean {
    const step = this.state.currentStep;
    if (!this.state.enabled || !step?.action || step.action !== action) return false;
    if (step.id === 'SIDEWINDER' && (!player || player.targetLockedId === null || player.selectedWeapon !== 'MISSILE')) return false;
    return this.advance();
  }

  public update(player: PlayerStats, launchX: number): boolean {
    const step = this.state.currentStep;
    if (!this.state.enabled || !step) return false;
    if (step.id === 'LAUNCH' && player.x > launchX + 260 && player.y < 520) return this.advance();
    if (step.id === 'TARGET' && player.targetLockedId !== null) return this.advance();
    if (step.id === 'RECOVERY' && Boolean(player.carrierLandingGrade)) return this.advance();
    return false;
  }

  public skip(): void {
    if (!this.state.enabled || this.state.completed) return;
    this.state = {
      enabled: false,
      completed: false,
      skipped: true,
      currentIndex: CARRIER_QUALIFICATION_STEPS.length,
      currentStep: null,
    };
  }

  private advance(): boolean {
    const nextIndex = this.state.currentIndex + 1;
    const complete = nextIndex >= CARRIER_QUALIFICATION_STEPS.length;
    this.state = {
      ...this.state,
      completed: complete,
      enabled: !complete,
      currentIndex: nextIndex,
      currentStep: complete ? null : CARRIER_QUALIFICATION_STEPS[nextIndex],
    };
    return true;
  }
}

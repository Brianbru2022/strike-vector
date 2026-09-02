export class FixedStepClock {
  private accumulator = 0;

  constructor(public readonly stepSeconds = 1 / 60, private readonly maxElapsedSeconds = 0.25) {}

  advance(elapsedSeconds: number, tick: (dtSeconds: number) => void): number {
    this.accumulator += Math.min(this.maxElapsedSeconds, Math.max(0, elapsedSeconds));
    let ticks = 0;
    while (this.accumulator + Number.EPSILON >= this.stepSeconds) {
      tick(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      ticks++;
    }
    return ticks;
  }

  reset() {
    this.accumulator = 0;
  }
}

export interface AircraftLossSnapshot {
  frame: number;
  totalFrames: number;
  pilotSurvived: boolean;
  impacted: boolean;
  impactStarted: boolean;
  complete: boolean;
  aircraftX: number;
  aircraftY: number;
  aircraftRotation: number;
  facing: -1 | 1;
  pilotX: number;
  pilotY: number;
  ejectionFrame: number;
}

export class AircraftLossSequence {
  private frame = 0;
  private aircraftX: number;
  private aircraftY: number;
  private aircraftVx: number;
  private aircraftVy: number;
  private aircraftRotation: number;
  private impacted = false;
  private readonly pilotSurvived: boolean;
  private readonly totalFrames: number;

  constructor(x: number, y: number, vx: number, vy: number, rotation: number, private readonly impactY: number, private readonly facing: -1 | 1 = 1) {
    this.aircraftX = x;
    this.aircraftY = y;
    this.aircraftVx = vx;
    this.aircraftVy = vy;
    this.aircraftRotation = rotation;
    this.pilotSurvived = impactY - y >= 80;
    this.totalFrames = this.pilotSurvived ? 144 : 66;
  }

  public update(): AircraftLossSnapshot {
    this.frame++;
    let impactStarted = false;
    if (!this.impacted) {
      this.aircraftX += this.aircraftVx;
      this.aircraftY += this.aircraftVy;
      this.aircraftVy += 0.18;
      this.aircraftVx *= 0.992;
      this.aircraftRotation += 0.025 * this.facing;
      if (this.aircraftY >= this.impactY) {
        this.aircraftY = this.impactY;
        this.impacted = true;
        impactStarted = true;
      }
    }

    const pilotX = this.aircraftX - 18 * this.facing;
    const riseFrames = Math.min(this.frame, 42);
    const fallFrames = Math.max(0, this.frame - 42);
    const pilotY = this.pilotSurvived
      ? Math.min(this.impactY - 18, this.aircraftY - riseFrames * 1.65 + fallFrames * 0.48)
      : this.aircraftY;
    const ejectionFrame = this.frame < 15 ? 0 : this.frame < 30 ? 1 : this.frame < 42 ? 2 : 3;

    return {
      frame: this.frame,
      totalFrames: this.totalFrames,
      pilotSurvived: this.pilotSurvived,
      impacted: this.impacted,
      impactStarted,
      complete: this.frame >= this.totalFrames,
      aircraftX: this.aircraftX,
      aircraftY: this.aircraftY,
      aircraftRotation: this.aircraftRotation,
      facing: this.facing,
      pilotX,
      pilotY,
      ejectionFrame,
    };
  }
}

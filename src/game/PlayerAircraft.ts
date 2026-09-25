import { PlayerStats, AircraftSubsystems, DifficultyPreset } from '../types/game';
import { GAME_CONSTANTS, getAltitudeBand } from './constants';
import { ParticleAndEffects } from './ParticleAndEffects';
import { SpriteAssetManager } from './SpriteAssetManager';
import { soundEngine } from '../audio/SoundEngine';
import { getCombatDifficultyProfile } from './CombatBalance';
import { RandomSource } from './SeededRandom';
import { PLAYER_AIRCRAFT_PRESENTATION_SCALE } from './CombatReadability';
import { calculateTerrainShadow, drawTerrainShadow } from './TerrainShadow';
import { getForegroundTreatment } from './ForegroundPresentation';
import { getRecoveryAssistProfile, PLAYER_FLIGHT_PROFILE } from './PlayabilityProfiles';

export class PlayerAircraft {
  public stats: PlayerStats;
  private difficulty: DifficultyPreset = 'PILOT';
  private cannonCooldownTimer = 0;
  private cannonFireTimer = 0;
  private rocketFireTimer = 0;
  private damageSmokeTimer = 0;
  private gearCompression = 0;
  private touchdownTicks = 0;
  private skiJumpTicks = 0;
  private recoveryToleranceModifier = 1;
  private lowFuelWarningPlayed = false;
  private visualFacing = 1;
  private flightTicks = 0;
  private reversalStartTick: number | null = null;
  private reversalsCompleted = 0;
  private reversalTicksTotal = 0;

  constructor(private random?: RandomSource) {
    this.stats = this.getDefaultStats();
  }

  public setRandomSource(random: RandomSource): void {
    this.random = random;
  }

  public setDifficulty(difficulty: DifficultyPreset) {
    this.difficulty = difficulty;
  }

  public setRecoveryToleranceModifier(modifier: number) {
    this.recoveryToleranceModifier = Math.max(0.75, Math.min(1, modifier));
  }

  public getDefaultStats(): PlayerStats {
    const p = GAME_CONSTANTS.PLAYER;
    return {
      x: GAME_CONSTANTS.CARRIER.CATAPULT_LAUNCH_X + 120,
      y: GAME_CONSTANTS.CARRIER.DECK_Y - 40,
      vx: 8.0,
      vy: -0.5,
      facing: 1,
      rotation: 0,
      pitchAngle: 0,
      thrust: 0.5,
      vtolMode: false,
      vtolTransition: 0,
      health: p.MAX_HEALTH,
      maxHealth: p.MAX_HEALTH,
      fuel: p.MAX_FUEL,
      maxFuel: p.MAX_FUEL,
      cannonHeat: 0,
      cannonOverheated: false,
      missiles: p.MAX_MISSILES,
      maxMissiles: p.MAX_MISSILES,
      bombs: p.MAX_BOMBS,
      maxBombs: p.MAX_BOMBS,
      rockets: p.MAX_ROCKETS,
      maxRockets: p.MAX_ROCKETS,
      flares: p.MAX_FLARES,
      maxFlares: p.MAX_FLARES,
      selectedWeapon: 'MISSILE',
      subsystems: {
        engine: 1.0,
        flightControls: 1.0,
        targeting: 1.0,
        weapons: 1.0,
        hydraulics: 1.0,
        fuelTank: 1.0,
      },
      gearDown: false,
      gearProgress: 0.0,
      isOnCarrier: false,
      isTakingOff: true,
      isLanding: false,
      carrierLandingGrade: null,
      targetLockedId: null,
      lockProgress: 0,
      altitudeBand: 'LOW',
      speedKnots: 384,
    };
  }

  public getHeadingPresentation() {
    const targetFacing = this.stats.facing;
    const blend = Math.max(-1, Math.min(1, this.visualFacing));
    const sideProfile = Math.abs(blend);
    const turnAmount = 1 - sideProfile;
    const sideProfileOpacity = Math.max(0, Math.min(1, (sideProfile - 0.64) / 0.36));
    const turnFramePosition = Math.max(0, Math.min(4, ((2 / 3 - blend) / (4 / 3)) * 4));
    return {
      blend,
      direction: (sideProfile < 0.01 ? targetFacing : blend < 0 ? -1 : 1) as -1 | 1,
      sideProfileOpacity,
      turnOpacity: 1 - sideProfileOpacity,
      turnFramePosition,
      turnAmount,
      turning: Math.abs(blend - targetFacing) > 0.001,
    };
  }

  private updateHeadingPresentation() {
    const target = this.stats.facing;
    const delta = target - this.visualFacing;
    const step = PLAYER_FLIGHT_PROFILE.visualHeadingStep;
    if (Math.abs(delta) <= step) this.visualFacing = target;
    else this.visualFacing += Math.sign(delta) * step;
  }

  /** @internal Development-only visual evidence hook; never used by gameplay. */
  public stageHeadingPresentationForAudit(blend: number) {
    this.visualFacing = Math.max(-2 / 3, Math.min(2 / 3, blend));
  }

  public reset(carrierX = GAME_CONSTANTS.CARRIER.CATAPULT_LAUNCH_X) {
    this.stats = this.getDefaultStats();
    this.stats.x = carrierX + 120;
    this.stats.y = GAME_CONSTANTS.CARRIER.DECK_Y - 40;
    this.stats.vx = 8.0;
    this.stats.vy = -0.5;
    this.stats.facing = 1;
    this.visualFacing = 1;
    this.stats.isOnCarrier = false;
    this.gearCompression = 0;
    this.touchdownTicks = 0;
    this.skiJumpTicks = 0;
    this.lowFuelWarningPlayed = false;
    this.flightTicks = 0;
    this.reversalStartTick = null;
    this.reversalsCompleted = 0;
    this.reversalTicksTotal = 0;
  }

  public getFlightTelemetrySnapshot(): { reversalsCompleted: number; averageReversalTicks: number } {
    return {
      reversalsCompleted: this.reversalsCompleted,
      averageReversalTicks: this.reversalsCompleted ? Math.round(this.reversalTicksTotal / this.reversalsCompleted) : 0,
    };
  }

  public beginLandingPractice(site: 'CARRIER' | 'FORWARD_BASE', technique: 'ROLLING' | 'VERTICAL', landingX: number, deckY: number) {
    const vertical = technique === 'VERTICAL';
    Object.assign(this.stats, {
      x: landingX - (vertical ? 430 : 720),
      y: deckY - (vertical ? 145 : 105),
      vx: vertical ? 2.2 : 5.1,
      vy: vertical ? 0.3 : 0.55,
      facing: 1,
      pitchAngle: vertical ? 0 : 0.04,
      thrust: vertical ? 0.72 : 0.58,
      vtolMode: true,
      vtolTransition: vertical ? 0.88 : 0.36,
      gearDown: true,
      gearProgress: 1,
      isOnCarrier: false,
      isTakingOff: false,
      isLanding: true,
      carrierLandingGrade: null,
    });
    this.visualFacing = 1;
    soundEngine.playRadioCall(site === 'CARRIER'
      ? 'INVINCIBLE APPROACH. DECK IS CLEAR. CALL THE BALL.'
      : 'FORWARD SITE APPROACH. PAD LIGHTS ON. WIND CALM.');
  }

  public launchFromCarrier(siteType: 'CARRIER' | 'FORWARD_BASE' = 'CARRIER') {
    this.stats.isOnCarrier = false;
    this.stats.isTakingOff = true;
    this.stats.facing = 1;
    this.visualFacing = 1;
    if (siteType === 'FORWARD_BASE') {
      this.stats.vx = 2.2;
      this.stats.vy = -1.6;
      this.stats.vtolMode = true;
      this.stats.vtolTransition = 1;
    } else {
      this.stats.vx = Math.max(8.4, this.stats.vx);
      this.stats.vy = -0.45;
      this.stats.pitchAngle = -0.08;
      this.skiJumpTicks = 48;
    }
    this.stats.gearDown = false;
    if (!soundEngine.playMissionRadio('LAUNCH')) {
      soundEngine.playRadioCall(siteType === 'FORWARD_BASE'
        ? 'SKELD FARP. REARM COMPLETE. CLEARED FOR VERTICAL DEPARTURE.'
        : 'KESTREL ONE SCRAMBLE. CLEAR FOR TAKEOFF.');
    }
  }

  public applyDamage(amount: number, hitSubsystem?: keyof AircraftSubsystems) {
    const damageScale = getCombatDifficultyProfile(this.difficulty).incomingDamage;
    const engineWasAboveStallThreshold = this.stats.subsystems.engine >= 0.5;
    this.stats.health = Math.max(0, this.stats.health - amount * damageScale);
    
    // Subsystem damage chance
    if (hitSubsystem) {
      this.stats.subsystems[hitSubsystem] = Math.max(0.1, this.stats.subsystems[hitSubsystem] - 0.4);
    } else {
      const systems: (keyof AircraftSubsystems)[] = ['engine', 'flightControls', 'targeting', 'weapons', 'hydraulics', 'fuelTank'];
      const randomSys = systems[this.random?.nextInt(systems.length) ?? 0];
      this.stats.subsystems[randomSys] = Math.max(0.15, this.stats.subsystems[randomSys] - 0.25);
    }

    if (engineWasAboveStallThreshold && this.stats.subsystems.engine < 0.5) {
      soundEngine.playCompressorStall();
    }

    // Radio warning
    if (this.stats.health < 30) {
      soundEngine.playRadioCall('WARNING: CRITICAL DAMAGE.');
    } else if (this.stats.subsystems.engine < 0.5) {
      soundEngine.playRadioCall('ENGINE COMPRESSOR STALL.');
    }
  }

  public update(
    input: { up: boolean; down: boolean; left: boolean; right: boolean; vtol: boolean; fireCannon: boolean },
    effects: ParticleAndEffects,
    carrierBounds?: { startX: number; endX: number; deckY: number; siteType?: 'CARRIER' | 'FORWARD_BASE' }
  ) {
    const p = GAME_CONSTANTS.PLAYER;
    const s = this.stats;
    const desiredDirection: -1 | 0 | 1 = input.right === input.left ? 0 : input.right ? 1 : -1;
    this.flightTicks++;

    // Fuel depletion
    const fuelRate = s.vtolMode ? p.FUEL_BURN_VTOL : p.FUEL_BURN_NORMAL;
    const fuelMultiplier = s.subsystems.fuelTank < 0.5 ? 3.2 : 1.0;
    s.fuel = Math.max(0, s.fuel - fuelRate * fuelMultiplier);

    if (s.fuel < 10 && !this.lowFuelWarningPlayed) {
      this.lowFuelWarningPlayed = true;
      soundEngine.playRadioCall('BINGO FUEL. RETURN TO CARRIER.');
    }

    // Subsystem performance factors
    const engineFactor = 0.5 + 0.5 * s.subsystems.engine;
    const controlFactor = 0.4 + 0.6 * s.subsystems.flightControls;
    const hydraulicRate = 0.05 * (0.3 + 0.7 * s.subsystems.hydraulics);

    // VTOL Mode Transition
    const wasVtolMode = s.vtolMode;
    s.vtolMode = input.vtol;
    if (s.vtolMode !== wasVtolMode) soundEngine.playNozzleTransition(s.vtolMode);
    if (s.vtolMode) {
      s.vtolTransition = Math.min(1.0, s.vtolTransition + hydraulicRate);
    } else {
      s.vtolTransition = Math.max(0.0, s.vtolTransition - hydraulicRate);
    }

    // Flight Physics
    if (s.isOnCarrier) {
      if (input.right || input.up || input.fireCannon || input.vtol || input.left || input.down) {
        this.launchFromCarrier();
      }
    }

    if (!s.isOnCarrier) {
      if (this.skiJumpTicks > 0) {
        const rampProgress = 1 - this.skiJumpTicks / 48;
        s.vx = Math.min(p.NORMAL_MAX_SPEED, s.vx + 0.07);
        s.vy -= 0.025 + Math.sin(rampProgress * Math.PI) * 0.035;
        s.pitchAngle += (-0.17 - s.pitchAngle) * 0.12;
        this.skiJumpTicks--;
      }
      // Blend wing-borne and vectored-thrust responses across the complete
      // nozzle travel. This removes the old hard switch at 60% vectoring.
      const nozzleBlend = s.vtolTransition * s.vtolTransition * (3 - 2 * s.vtolTransition);
      const maxForwardSpeed = p.NORMAL_MAX_SPEED * engineFactor;
      let forwardSpeed = Math.abs(s.vx);
      if (desiredDirection !== 0 && desiredDirection !== s.facing) {
        // The opposite direction first acts as an air brake. The aircraft only
        // changes heading once it has shed enough speed for a readable turn.
        if (this.reversalStartTick === null) this.reversalStartTick = this.flightTicks;
        const reversalThreshold = nozzleBlend > 0.65 ? PLAYER_FLIGHT_PROFILE.reversalThresholdVtol : PLAYER_FLIGHT_PROFILE.reversalThresholdCtol;
        forwardSpeed = Math.max(0, forwardSpeed - PLAYER_FLIGHT_PROFILE.deceleration * PLAYER_FLIGHT_PROFILE.reversalBrakeMultiplier * controlFactor);
        if (forwardSpeed <= reversalThreshold) {
          s.facing = desiredDirection;
          forwardSpeed = Math.max(0.45, forwardSpeed);
          this.reversalsCompleted++;
          this.reversalTicksTotal += Math.max(1, this.flightTicks - (this.reversalStartTick ?? this.flightTicks) + 1);
          this.reversalStartTick = null;
        }
      } else if (desiredDirection === s.facing) {
        this.reversalStartTick = null;
        forwardSpeed = Math.min(maxForwardSpeed, forwardSpeed + PLAYER_FLIGHT_PROFILE.acceleration * engineFactor);
      } else {
        this.reversalStartTick = null;
        forwardSpeed += (p.CRUISE_SPEED * engineFactor - forwardSpeed) * PLAYER_FLIGHT_PROFILE.cruiseSettlingRate;
      }
      const excessSpeed = Math.max(0, forwardSpeed - p.CRUISE_SPEED);
      forwardSpeed -= excessSpeed * excessSpeed * PLAYER_FLIGHT_PROFILE.excessSpeedDrag;
      const aerodynamicVx = s.facing * forwardSpeed;

      let aerodynamicVy = s.vy;
      if (input.up) aerodynamicVy = Math.max(-p.CLIMB_SPEED * engineFactor, aerodynamicVy - PLAYER_FLIGHT_PROFILE.climbResponse * controlFactor);
      else if (input.down) aerodynamicVy = Math.min(p.DIVE_SPEED, aerodynamicVy + PLAYER_FLIGHT_PROFILE.diveResponse * controlFactor);
      else aerodynamicVy *= PLAYER_FLIGHT_PROFILE.verticalDamping;

      const hoverTargetVx = (desiredDirection !== 0 ? desiredDirection * 4.5 : s.facing * 1.2) * engineFactor;
      const hoverTargetVy = (input.down ? 4.0 : input.up ? -4.5 : 0.4) * engineFactor;
      const hoverVx = s.vx + (hoverTargetVx - s.vx) * PLAYER_FLIGHT_PROFILE.hoverHorizontalResponse * controlFactor;
      const hoverVy = s.vy + (hoverTargetVy - s.vy) * PLAYER_FLIGHT_PROFILE.hoverVerticalResponse * controlFactor;
      s.vx = aerodynamicVx * (1 - nozzleBlend) + hoverVx * nozzleBlend;
      s.vy = aerodynamicVy * (1 - nozzleBlend) + hoverVy * nozzleBlend;

      const flightPitch = input.up ? -0.35 : input.down ? 0.42 : 0;
      const hoverPitch = input.up ? -0.18 : input.down ? 0.15 : 0;
      const pitchTarget = flightPitch * (1 - nozzleBlend) + hoverPitch * nozzleBlend;
      s.pitchAngle += (pitchTarget - s.pitchAngle) * (PLAYER_FLIGHT_PROFILE.pitchResponse + nozzleBlend * 0.035) * controlFactor;
      s.pitchAngle = Math.max(-PLAYER_FLIGHT_PROFILE.maximumPitchRadians, Math.min(PLAYER_FLIGHT_PROFILE.maximumPitchRadians, s.pitchAngle));
      const directionalThrust = desiredDirection === s.facing ? 1 : desiredDirection === 0 ? 0.58 : 0.34;
      s.thrust += ((input.up ? 1 : directionalThrust) - s.thrust) * 0.045;

      // Apply positions
      s.x += s.vx;
      s.y += s.vy;

      // Vertical clamping
      if (s.y < GAME_CONSTANTS.MAX_ALTITUDE_Y) {
        s.y = GAME_CONSTANTS.MAX_ALTITUDE_Y;
        s.vy = Math.max(0, s.vy);
      }

      // Check Carrier Landing Recovery
      const landingGearContactY = s.y + 22;
      const overRecoveryDeck = carrierBounds
        && s.x >= carrierBounds.startX
        && s.x <= carrierBounds.endX;
      s.isLanding = Boolean(carrierBounds && !s.isTakingOff && s.x >= carrierBounds.startX - 1100);
      if (s.isTakingOff && carrierBounds && !overRecoveryDeck) {
        s.isTakingOff = false;
      }
      const touchingRecoveryDeck = carrierBounds
        && landingGearContactY >= carrierBounds.deckY - 10
        && landingGearContactY <= carrierBounds.deckY + 18;
      if (carrierBounds && !s.isTakingOff && overRecoveryDeck && touchingRecoveryDeck) {
        if (s.vy >= -0.6 && s.vtolTransition > 0.22 && Math.abs(s.vx) <= 6.2) {
          // Landing Attempt
          this.evaluateLanding(s.vx, s.vy, s.x, carrierBounds);
        }
      }
    }

    // Landing Gear animation
    const wasGearDown = s.gearDown;
    const nearGround = s.y > GAME_CONSTANTS.SEA_LEVEL_Y - 120 || s.isOnCarrier;
    if (nearGround || s.vtolTransition > 0.7) {
      s.gearProgress = Math.min(1.0, s.gearProgress + 0.05);
      s.gearDown = true;
    } else {
      s.gearProgress = Math.max(0.0, s.gearProgress - 0.05);
      s.gearDown = s.gearProgress > 0.1;
    }
    if (s.gearDown !== wasGearDown) soundEngine.playLandingGearCycle(s.gearDown);
    if (this.touchdownTicks > 0) this.touchdownTicks--;
    this.gearCompression += ((s.isOnCarrier ? 0.42 : 0) - this.gearCompression) * 0.18;

    // Altitude band and knots speed
    s.altitudeBand = getAltitudeBand(s.y);
    s.speedKnots = Math.round(Math.abs(s.vx) * 48);
    this.updateHeadingPresentation();

    // Cannon Overheat & Cool-down
    if (s.cannonOverheated) {
      this.cannonCooldownTimer--;
      s.cannonHeat = Math.max(0, s.cannonHeat - p.CANNON_COOL_RATE * 1.5);
      if (this.cannonCooldownTimer <= 0 && s.cannonHeat <= 20) {
        s.cannonOverheated = false;
      }
    } else {
      s.cannonHeat = Math.max(0, s.cannonHeat - p.CANNON_COOL_RATE * (0.5 + 0.5 * s.subsystems.weapons));
    }

    // Audio Jet Engine sync
    const speedRatio = (Math.abs(s.vx) - p.NORMAL_MIN_SPEED) / (p.NORMAL_MAX_SPEED - p.NORMAL_MIN_SPEED);
    soundEngine.updateJetEngine({
      throttleRatio: Math.max(0, Math.min(1, s.thrust)),
      speedRatio: Math.max(0, Math.min(1, speedRatio)),
      vtolRatio: s.vtolTransition,
      damageRatio: 1 - Math.max(0, Math.min(1, s.subsystems.engine)),
    });

    // Jet Exhaust Particles
    effects.createJetExhaust(
      s.x,
      s.y,
      s.vx,
      s.vy,
      s.vtolTransition > 0.5,
      desiredDirection === s.facing && !s.vtolMode,
      s.facing,
    );

    // Low altitude water / terrain spray
    if (s.y > GAME_CONSTANTS.SEA_LEVEL_Y - 70 && s.vtolTransition > 0.3) {
      effects.createWaterOrDustKickup(s.x, GAME_CONSTANTS.SEA_LEVEL_Y, true);
    }

    // Damage smoke particles
    const damagedSystem = s.subsystems.engine < 0.55
      ? 'ENGINE'
      : s.subsystems.flightControls < 0.55
        ? 'FLIGHT_CONTROLS'
        : s.subsystems.weapons < 0.55
          ? 'WEAPONS'
          : null;
    if (s.health < 60 || damagedSystem) {
      this.damageSmokeTimer++;
      const critical = s.health < 30 || s.subsystems.engine < 0.22;
      if (this.damageSmokeTimer % (critical ? 5 : 10) === 0) {
        const emitterX = (damagedSystem === 'ENGINE' ? -22 : damagedSystem === 'WEAPONS' ? 24 : 2) * s.facing;
        const emitterY = damagedSystem === 'FLIGHT_CONTROLS' ? -8 : 2;
        effects.createDamagePlume(s.x + emitterX, s.y + emitterY, critical ? 2 : 1);
        if (damagedSystem !== 'ENGINE' && this.damageSmokeTimer % 20 === 0) effects.createSparks(s.x + emitterX, s.y + emitterY, 4);
      }
    }

    // Timers
    if (this.cannonFireTimer > 0) this.cannonFireTimer--;
    if (this.rocketFireTimer > 0) this.rocketFireTimer--;
  }

  public canFireCannon(): boolean {
    return !this.stats.cannonOverheated && this.cannonFireTimer <= 0 && this.stats.health > 0;
  }

  public onFiredCannon() {
    const p = GAME_CONSTANTS.PLAYER;
    this.cannonFireTimer = GAME_CONSTANTS.WEAPONS.CANNON.FIRE_RATE;
    const heatCost = p.CANNON_HEAT_PER_SHOT * (this.stats.subsystems.weapons < 0.6 ? 1.5 : 1.0);
    this.stats.cannonHeat = Math.min(100, this.stats.cannonHeat + heatCost);
    if (this.stats.cannonHeat >= p.CANNON_OVERHEAT_THRESHOLD) {
      this.stats.cannonOverheated = true;
      this.cannonCooldownTimer = p.CANNON_COOLDOWN_DELAY;
    }
  }

  private evaluateLanding(vx: number, vy: number, x: number, carrier: { startX: number; endX: number; deckY: number; siteType?: 'CARRIER' | 'FORWARD_BASE' }) {
    this.stats.isOnCarrier = true;
    this.stats.vx = 0;
    this.stats.vy = 0;
    // Sit the rendered landing wheels on the visible deck rather than sinking
    // the larger painted aircraft sprite into it.
    this.stats.y = carrier.deckY - 22;
    this.touchdownTicks = 36;
    this.gearCompression = 1;

    const center = (carrier.startX + carrier.endX) * 0.5;
    const distFromCenter = Math.abs(x - center);

    const recovery = getRecoveryAssistProfile(this.difficulty);
    const tolerance = recovery.toleranceMultiplier * this.recoveryToleranceModifier;
    const forwardSpeed = Math.abs(vx);
    if (vy <= recovery.perfectDescentRate * tolerance && forwardSpeed <= recovery.perfectForwardSpeed * tolerance && distFromCenter < recovery.perfectCentreOffset * tolerance) {
      this.stats.carrierLandingGrade = 'PERFECT';
      soundEngine.playTouchdown('PERFECT');
      if (!soundEngine.playMissionRadio('RECOVERY')) {
        soundEngine.playRadioCall(carrier.siteType === 'FORWARD_BASE'
          ? 'FARP TOUCHDOWN CONFIRMED. FORWARD SITE SECURE.'
          : '3 WIRE! PERFECT TRAP. WELCOME BACK, KESTREL ONE.');
      }
    } else if (vy <= recovery.safeDescentRate * tolerance && forwardSpeed <= recovery.safeForwardSpeed * tolerance) {
      this.stats.carrierLandingGrade = 'SAFE';
      soundEngine.playTouchdown('SAFE');
      if (!soundEngine.playMissionRadio('RECOVERY')) soundEngine.playRadioCall('RECOVERY CONFIRMED. SAFE LANDING.');
    } else {
      this.stats.carrierLandingGrade = 'HARD';
      soundEngine.playTouchdown('HARD');
      soundEngine.playRadioCall('HARD IMPACT! DAMAGE CREWS STAND BY.');
      this.applyDamage(20, 'hydraulics');
    }
  }

  public render(ctx: CanvasRenderingContext2D, cameraX: number, groundYAt?: (worldX: number) => number | null, ambientLight = 0.8, reducedEffects = false) {
    const s = this.stats;
    const heading = this.getHeadingPresentation();
    const screenX = s.x - cameraX;
    const screenY = s.y;
    const seaY = GAME_CONSTANTS.SEA_LEVEL_Y;

    // --- 2.5D DYNAMIC PERSPECTIVE GROUND / OCEAN SHADOW ---
    if (!s.isOnCarrier && screenY < seaY) {
      const shadowSurfaceY = groundYAt?.(s.x) ?? seaY;
      const altitude = Math.max(0, shadowSurfaceY - screenY);
      const shadow = calculateTerrainShadow(
        s.x,
        46 * PLAYER_AIRCRAFT_PRESENTATION_SCALE,
        (worldX) => groundYAt?.(worldX) ?? seaY,
        altitude,
      );
      if (shadow) drawTerrainShadow(ctx, screenX, shadow);
    }

    // --- 2.5D MAIN AIRCRAFT BODY ---
    ctx.save();
    const contactCorrection = s.isOnCarrier ? (PLAYER_AIRCRAFT_PRESENTATION_SCALE - 1) * 22 : 0;
    ctx.translate(screenX, screenY - contactCorrection);
    ctx.rotate(s.pitchAngle * heading.direction * (1 - heading.turnAmount * 0.7));
    ctx.globalAlpha *= heading.sideProfileOpacity;
    ctx.scale(
      PLAYER_AIRCRAFT_PRESENTATION_SCALE * heading.direction,
      PLAYER_AIRCRAFT_PRESENTATION_SCALE,
    );

    // The Pegasus is a dry-thrust engine: high power produces hot distortion
    // and a faint brown-grey exhaust, never an afterburner flame.
    const isHighThrust = (Math.abs(s.vx) > 7.2 || s.thrust > 0.82) && !s.vtolMode && !s.isOnCarrier;
    if (isHighThrust) {
      ctx.save();
      const exhaust = ctx.createLinearGradient(-35, 3, -88, 3);
      exhaust.addColorStop(0, 'rgba(118, 126, 124, 0.22)');
      exhaust.addColorStop(0.48, 'rgba(83, 92, 91, 0.12)');
      exhaust.addColorStop(1, 'rgba(70, 80, 82, 0)');
      ctx.fillStyle = exhaust;
      ctx.beginPath();
      ctx.moveTo(-34, -1);
      ctx.quadraticCurveTo(-64, -6, -90, 1);
      ctx.quadraticCurveTo(-62, 11, -34, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(210, 230, 232, 0.11)';
      ctx.lineWidth = 1;
      [-48, -62, -76].forEach((dx, index) => {
        ctx.beginPath();
        ctx.ellipse(dx, 3 + Math.sin(s.x * 0.04 + index) * 1.2, 7 + index * 2, 3.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    // VTOL Vectoring Exhaust Nozzles (2.5D 3D Rotating Nozzles)
    if (s.vtolTransition > 0.05) {
      ctx.save();
      const nozzleAngle = (s.vtolTransition * Math.PI) * 0.5; // 0 to 90 deg down
      
      // Vector nozzle housings with glowing exhaust
      [-10, 8].forEach(offset => {
        ctx.save();
        ctx.translate(offset, 8);
        ctx.rotate(nozzleAngle);
        
        // Titanium Swivel Nozzle Cylinder
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-4, 0, 8, 6);

        // High temperature nozzle plume
        const vtolGrad = ctx.createLinearGradient(0, 6, 0, 24);
        vtolGrad.addColorStop(0, '#ffffff');
        vtolGrad.addColorStop(0.3, '#38bdf8');
        vtolGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = vtolGrad;
        ctx.fillRect(-3, 6, 6, 14 + Math.sin((s.x + offset) * 0.16) * 3);
        ctx.strokeStyle = 'rgba(220, 242, 246, 0.16)';
        ctx.beginPath();
        ctx.ellipse(0, 22, 8, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }

    // Retractable Landing Gear (Hydraulic Struts + Rubber Tires)
    if (s.gearProgress > 0.05) {
      ctx.fillStyle = '#27272a';
      const gearExt = s.gearProgress * (12 - this.gearCompression * 3);
      // Nose gear
      ctx.fillRect(16, 6, 3, gearExt);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(17.5, 6 + gearExt, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Main gear
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-10, 6, 3.5, gearExt);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(-8, 6 + gearExt, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- PAINTED SEA HARRIER FRS.1 ---
    // Presentation-only rim light: improves recognition against dark sea and
    // cloud layers without changing the aircraft's collision geometry.
    const playerTreatment = getForegroundTreatment({
      spriteKey: 'player_jet',
      ambientLight,
      damageStage: s.health <= 30 ? 2 : s.health <= 65 ? 1 : 0,
      reducedEffects,
      separationFilter: 'drop-shadow(0 0 3px rgba(216, 255, 232, 0.78))',
    });
    ctx.filter = playerTreatment.filter;
    ctx.shadowColor = 'rgba(216, 255, 232, 0.78)';
    ctx.shadowBlur = 3;
    const heroDamageFrame = s.health <= 30 ? 2 : s.health <= 65 ? 1 : 0;
    SpriteAssetManager.drawSpriteFrame(ctx, 'player_jet', heroDamageFrame, 3, 0, 0, 96, 32);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.filter = 'none';
    // Painted flap/elevator cues respond subtly to commanded pitch.
    const surfaceDeflection = Math.max(-4, Math.min(4, s.vy * 0.42 + (s.gearProgress * 1.2)));
    ctx.strokeStyle = 'rgba(202, 215, 220, 0.72)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-24, -6);
    ctx.lineTo(-34, -6 + surfaceDeflection);
    ctx.moveTo(3, 1);
    ctx.lineTo(-12, 4 + surfaceDeflection * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-8, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // Hardpoint Ordnance Mounted
    if (s.missiles > 0) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-12, 12, 14, 2.5); // AIM-9 Missile body
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(2, 12, 2, 2.5); // Infrared Seeker tip
    }

    ctx.restore();

    // Authored three-quarter and head-on frames bridge the two side profiles.
    // Physics, collision and weapon direction remain tied to stats.facing.
    if (heading.turnOpacity > 0.001) {
      ctx.save();
      ctx.translate(screenX, screenY - contactCorrection);
      ctx.rotate(s.pitchAngle * heading.blend * 0.35);
      ctx.filter = getForegroundTreatment({
        spriteKey: 'player_turn', ambientLight, reducedEffects,
        separationFilter: 'drop-shadow(0 0 2px rgba(216, 255, 232, 0.48))',
      }).filter;
      const firstFrame = Math.floor(heading.turnFramePosition);
      const secondFrame = Math.min(4, firstFrame + 1);
      const frameBlend = heading.turnFramePosition - firstFrame;
      const width = 104 * PLAYER_AIRCRAFT_PRESENTATION_SCALE;
      const height = 52 * PLAYER_AIRCRAFT_PRESENTATION_SCALE;
      SpriteAssetManager.drawSpriteFrame(ctx, 'player_turn', firstFrame, 5, 0, 0, width, height, { opacity: heading.turnOpacity * (1 - frameBlend) });
      if (secondFrame !== firstFrame && frameBlend > 0.001) {
        SpriteAssetManager.drawSpriteFrame(ctx, 'player_turn', secondFrame, 5, 0, 0, width, height, { opacity: heading.turnOpacity * frameBlend });
      }
      ctx.filter = 'none';
      ctx.restore();
    }
  }
}

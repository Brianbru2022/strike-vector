import { CombatFlowState, GameScoreBreakdown, EnemyUnit } from '../types/game';
import { GAME_CONSTANTS } from './constants';
import { soundEngine } from '../audio/SoundEngine';
import { getPlatformStorage } from './PlatformRuntime';

export const BEST_SCORE_STORAGE_KEY = 'strike_vector_best_score';

export class CombatFlowManager {
  public flow: CombatFlowState;
  public scoreData: GameScoreBreakdown;
  private consecutiveKills = 0;
  private lowAltitudeTimer = 0;
  private persistenceEnabled = true;

  constructor() {
    this.flow = this.getDefaultFlow();
    this.scoreData = this.getDefaultScoreBreakdown();
  }

  public getDefaultFlow(): CombatFlowState {
    return {
      multiplier: 1.0,
      meter: 0,
      decayTimer: 0,
      streakCount: 0,
      lastActionText: '',
      lastActionTimer: 0,
    };
  }

  public getDefaultScoreBreakdown(): GameScoreBreakdown {
    return {
      aircraftDestroyed: 0,
      aircraftPoints: 0,
      groundUnitsDestroyed: 0,
      groundPoints: 0,
      navalUnitsDestroyed: 0,
      navalPoints: 0,
      objectivesCompleted: 0,
      objectivePoints: 0,
      precisionBombingBonus: 0,
      flightStyleBonus: 0,
      carrierLandingGrade: null,
      carrierLandingPoints: 0,
      collateralDamageCount: 0,
      collateralPenalty: 0,
      maxCombatFlow: 1.0,
      finalScore: 0,
      timeTakenSeconds: 0,
      isVictory: false,
      missilesIntercepted: 0,
      carrierIntegrity: null,
      pilotSurvived: null,
    };
  }

  public startMission() {
    this.flow = this.getDefaultFlow();
    this.scoreData = this.getDefaultScoreBreakdown();
    this.consecutiveKills = 0;
    this.lowAltitudeTimer = 0;
  }

  public setPersistence(enabled: boolean) {
    this.persistenceEnabled = enabled;
  }

  public addAction(text: string, flowBoost: number) {
    this.flow.meter = Math.min(100, this.flow.meter + flowBoost);
    this.flow.decayTimer = 180; // 3 seconds decay delay
    this.flow.lastActionText = text;
    this.flow.lastActionTimer = 60; // 1 second display

    // Multiplier calculation: 1.0 + (meter / 25) => up to 5.0
    this.flow.multiplier = Number((1.0 + (this.flow.meter / 100) * 4.0).toFixed(1));
    this.scoreData.maxCombatFlow = Math.max(this.scoreData.maxCombatFlow, this.flow.multiplier);
    
    // Dynamic music intensity scales with flow
    soundEngine.setCombatIntensity(1.0 + (this.flow.multiplier - 1.0) * 0.5);
  }

  public onEnemyKilled(enemy: EnemyUnit, weaponType: string) {
    this.consecutiveKills++;
    const multiplier = this.flow.multiplier;
    const pts = Math.round(enemy.pointsValue * multiplier);

    if (enemy.isCivilian) {
      this.scoreData.collateralDamageCount++;
      this.scoreData.collateralPenalty += GAME_CONSTANTS.SCORE.CIVILIAN_PENALTY;
      this.addAction('ROE VIOLATION! -1200', -30);
      return;
    }

    if (enemy.type === 'ANTI_SHIP_MISSILE') {
      this.scoreData.missilesIntercepted++;
      this.scoreData.flightStyleBonus += pts;
      this.addAction(`SEA-SKIMMER INTERCEPTED +${pts}`, GAME_CONSTANTS.COMBAT_FLOW.BOOST_DODGE);
    } else if (enemy.category === 'AIR') {
      this.scoreData.aircraftDestroyed++;
      this.scoreData.aircraftPoints += pts;
      this.addAction(`AIR KILL +${pts}`, GAME_CONSTANTS.COMBAT_FLOW.BOOST_KILL);
    } else if (enemy.category === 'GROUND' || enemy.category === 'STRUCTURE') {
      this.scoreData.groundUnitsDestroyed++;
      this.scoreData.groundPoints += pts;
      if (weaponType === 'BOMB') {
        this.scoreData.precisionBombingBonus += Math.round(GAME_CONSTANTS.SCORE.PRECISION_BOMB * multiplier);
        this.addAction(`PRECISION BOMB +${pts}`, GAME_CONSTANTS.COMBAT_FLOW.BOOST_BOMB);
      } else {
        this.addAction(`TARGET NEUTRALIZED +${pts}`, GAME_CONSTANTS.COMBAT_FLOW.BOOST_KILL);
      }
    } else if (enemy.category === 'NAVAL') {
      this.scoreData.navalUnitsDestroyed++;
      this.scoreData.navalPoints += pts;
      this.addAction(`NAVAL STRIKE +${pts}`, GAME_CONSTANTS.COMBAT_FLOW.BOOST_KILL);
    }
  }

  public onMissileDodged() {
    const pts = Math.round(GAME_CONSTANTS.SCORE.MISSILE_DODGE * this.flow.multiplier);
    this.scoreData.flightStyleBonus += pts;
    this.addAction(`MISSILE EVADED +${pts}`, GAME_CONSTANTS.COMBAT_FLOW.BOOST_DODGE);
  }

  public onLowAltitudeTick() {
    this.lowAltitudeTimer++;
    if (this.lowAltitudeTimer % 60 === 0) {
      const pts = Math.round(GAME_CONSTANTS.SCORE.LOW_ALTITUDE_SECS * this.flow.multiplier);
      this.scoreData.flightStyleBonus += pts;
      this.addAction(`TERRAIN MASKING +${pts}`, GAME_CONSTANTS.COMBAT_FLOW.BOOST_LOW_PASS);
    }
  }

  public onLanding(grade: 'PERFECT' | 'SAFE' | 'HARD' | 'FAILED') {
    this.scoreData.carrierLandingGrade = grade;
    let pts = 0;
    if (grade === 'PERFECT') pts = GAME_CONSTANTS.SCORE.PERFECT_LANDING;
    else if (grade === 'SAFE') pts = GAME_CONSTANTS.SCORE.SAFE_LANDING;
    else if (grade === 'HARD') pts = GAME_CONSTANTS.SCORE.HARD_LANDING;
    
    this.scoreData.carrierLandingPoints = pts;
  }

  public update() {
    if (this.flow.lastActionTimer > 0) {
      this.flow.lastActionTimer--;
    }

    if (this.flow.decayTimer > 0) {
      this.flow.decayTimer--;
    } else {
      // Flow decay
      this.flow.meter = Math.max(0, this.flow.meter - GAME_CONSTANTS.COMBAT_FLOW.DECAY_RATE);
      this.flow.multiplier = Number((1.0 + (this.flow.meter / 100) * 4.0).toFixed(1));
    }
  }

  public finalizeScore(isVictory: boolean, simulationTicks: number): GameScoreBreakdown {
    this.scoreData.timeTakenSeconds = Math.round(Math.max(0, simulationTicks) / 60);
    this.scoreData.isVictory = isVictory;

    const subtotal =
      this.scoreData.aircraftPoints +
      this.scoreData.groundPoints +
      this.scoreData.navalPoints +
      this.scoreData.objectivePoints +
      this.scoreData.precisionBombingBonus +
      this.scoreData.flightStyleBonus +
      this.scoreData.carrierLandingPoints +
      this.scoreData.collateralPenalty;

    this.scoreData.finalScore = Math.max(0, subtotal);
    this.saveHighScore(this.scoreData.finalScore);
    return this.scoreData;
  }

  private saveHighScore(score: number) {
    if (!this.persistenceEnabled) return;
    try {
      const storage = getPlatformStorage();
      const currentBest = parseInt(storage.getItem(BEST_SCORE_STORAGE_KEY) || '0', 10);
      if (score > currentBest) {
        storage.setItem(BEST_SCORE_STORAGE_KEY, score.toString());
      }
    } catch {
      // storage fallback
    }
  }

  public getBestScore(): number {
    try {
      return parseInt(getPlatformStorage().getItem(BEST_SCORE_STORAGE_KEY) || '0', 10);
    } catch {
      return 0;
    }
  }
}

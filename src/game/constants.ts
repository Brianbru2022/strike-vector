import { AltitudeBand } from '../types/game';

export const GAME_CONSTANTS = {
  // World bounds & viewport
  VIEWPORT_WIDTH: 1280,
  VIEWPORT_HEIGHT: 720,
  SEA_LEVEL_Y: 620,
  GROUND_SURFACE_Y: 570,
  MAX_ALTITUDE_Y: 60,

  // Altitude bands
  ALTITUDE_LOW_THRESHOLD_Y: 480,   // Below this is LOW altitude (radar masking, AA risk)
  ALTITUDE_HIGH_THRESHOLD_Y: 260,  // Above this is HIGH altitude (fighter patrol, SAM envelope)

  // Player Aircraft (Royal Navy Sea Harrier FRS.1)
  PLAYER: {
    WIDTH: 68,
    HEIGHT: 24,
    NORMAL_MAX_SPEED: 11.5,
    NORMAL_MIN_SPEED: 4.0,
    VTOL_MAX_SPEED: 4.5,
    VTOL_HOVER_DRAG: 0.94,
    CRUISE_SPEED: 7.2,
    ACCEL: 0.18,
    DECEL: 0.12,
    CLIMB_SPEED: 5.2,
    DIVE_SPEED: 6.8,
    MAX_HEALTH: 100,
    MAX_FUEL: 100,
    FUEL_BURN_NORMAL: 0.016, // per frame
    FUEL_BURN_VTOL: 0.038,   // +140% in hover mode
    FUEL_BURN_AFTERBURNER: 0.045,
    CANNON_HEAT_PER_SHOT: 4.2,
    CANNON_COOL_RATE: 0.85,
    CANNON_OVERHEAT_THRESHOLD: 100,
    CANNON_COOLDOWN_DELAY: 60, // frames locked out if overheated
    MAX_MISSILES: 6,
    MAX_BOMBS: 8,
    MAX_ROCKETS: 16,
    MAX_FLARES: 6,
    LOCK_ON_RANGE: 700,
    LOCK_ON_TIME: 45, // frames (0.75s)
  },

  // Carrier Specifications
  CARRIER: {
    WIDTH: 480,
    HEIGHT: 70,
    DECK_Y: 570,
    CATAPULT_LAUNCH_X: 180,
    // Match the usable portion of the painted flight deck.
    LANDING_ZONE_START_X: 35,
    LANDING_ZONE_END_X: 445,
    IDEAL_TOUCHDOWN_SPEED: 3.2,
    MAX_TOUCHDOWN_VY: 2.2,
  },

  // Weapons
  WEAPONS: {
    CANNON: {
      SPEED: 26,
      DAMAGE: 18,
      RADIUS: 4,
      LIFE: 50,
      RECOIL: 0.25,
      FIRE_RATE: 4, // frames between shots
    },
    MISSILE: {
      SPEED: 18,
      DAMAGE: 120,
      RADIUS: 16,
      LIFE: 160,
      HOMING_STRENGTH: 0.09,
    },
    BOMB: {
      INITIAL_VY: 1.5,
      GRAVITY: 0.28,
      DRAG: 0.992,
      DAMAGE: 240,
      RADIUS: 75,
      LIFE: 180,
    },
    ROCKET: {
      SPEED: 21,
      DAMAGE: 65,
      RADIUS: 24,
      LIFE: 75,
      SALVO_DELAY: 5,
    },
    ENEMY_BULLET: {
      SPEED: 9,
      DAMAGE: 8,
      RADIUS: 3,
      LIFE: 110,
    },
    ENEMY_MISSILE: {
      SPEED: 11.5,
      DAMAGE: 35,
      RADIUS: 12,
      LIFE: 220,
      HOMING_STRENGTH: 0.045,
    },
    ENEMY_FLAK: {
      SPEED: 7.5,
      DAMAGE: 20,
      RADIUS: 32,
      LIFE: 65,
    }
  },

  // Scoring
  SCORE: {
    KILL_AIR: 450,
    KILL_RADAR: 600,
    KILL_SAM: 500,
    KILL_FLAK: 350,
    KILL_TANK: 300,
    KILL_APC: 250,
    KILL_FUEL_DEPOT: 750,
    KILL_BRIDGE: 900,
    KILL_COMMAND_VEHICLE: 800,
    KILL_NAVAL: 650,
    CIVILIAN_PENALTY: -1200,
    MISSILE_DODGE: 200,
    LOW_ALTITUDE_SECS: 25,
    PRECISION_BOMB: 300,
    PERFECT_LANDING: 2000,
    SAFE_LANDING: 1000,
    HARD_LANDING: 400,
  },

  // Combat Flow
  COMBAT_FLOW: {
    MAX_MULTIPLIER: 5.0,
    DECAY_RATE: 0.22,
    BOOST_KILL: 18,
    BOOST_DODGE: 22,
    BOOST_BOMB: 20,
    BOOST_LOW_PASS: 6,
  }
};

export function getAltitudeBand(y: number): AltitudeBand {
  if (y >= GAME_CONSTANTS.ALTITUDE_LOW_THRESHOLD_Y) return 'LOW';
  if (y <= GAME_CONSTANTS.ALTITUDE_HIGH_THRESHOLD_Y) return 'HIGH';
  return 'MEDIUM';
}

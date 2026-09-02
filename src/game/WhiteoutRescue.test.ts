import { describe, expect, it } from 'vitest';
import { ARCTIC_WEATHER_PROFILES, getDifficultyAdjustedArcticWeatherState } from './ArcticToolkit';
import { CAMPAIGN_MISSIONS } from './Missions';
import { calculateRescueBeacon } from './RescueBeacon';

describe('Mission 14 — Whiteout Rescue', () => {
  const mission = CAMPAIGN_MISSIONS.find((candidate) => candidate.id === 'm14_whiteout_rescue');

  it('authors the polar rescue route, crew and delayed hostile pressure', () => {
    expect(mission).toBeDefined();
    expect(mission?.terrainProfile).toBe('POLAR_NIGHT_PLATEAU');
    expect(mission?.recoverySite).toBe('FORWARD_BASE');
    expect(mission?.mapLength).toBe(13800);
    expect(mission?.carrierLandingX).toBe(12600);
    expect(mission?.spawnEnemies().filter((enemy) => enemy.type === 'DOWNED_PILOT')).toHaveLength(1);
    const eventEnemies = mission?.events?.flatMap((event) => event.actions.flatMap((action) => action.type === 'SPAWN' ? action.enemies : [])) ?? [];
    expect(eventEnemies.some((enemy) => enemy.aircraftVariant === 'MI_24D')).toBe(true);
    expect(eventEnemies.some((enemy) => enemy.aircraftVariant === 'MIG_23ML')).toBe(true);
    expect(mission?.events?.find((event) => event.id === 'm14_break_contact')?.trigger).toEqual({ type: 'OBJECTIVE_COMPLETE', objectiveId: 'm14_crew' });
    expect(mission?.events?.find((event) => event.id === 'm14_snow_front')?.trigger).toEqual({ type: 'PLAYER_X', worldX: 1500 });
  });

  it('keeps the beacon deterministic, directional and stronger near the crew', () => {
    expect(calculateRescueBeacon(2000, 8000, 0, false)).toMatchObject({ bearing: 'RIGHT', strength: expect.any(Number), crewLocated: false });
    expect(calculateRescueBeacon(8100, 8000, 90, true)).toMatchObject({ bearing: 'LEFT', pickupProgress: 0.5, crewLocated: true });
    expect(calculateRescueBeacon(7960, 8000, 180, true, true)).toMatchObject({ bearing: 'ON_STATION', strength: 1, pickupProgress: 1, crewAboard: true });
    expect(calculateRescueBeacon(7600, 8000, 0, false).strength).toBeGreaterThan(calculateRescueBeacon(2000, 8000, 0, false).strength);
  });

  it('adjusts only whiteout severity by difficulty at the same simulation tick', () => {
    const arcade = getDifficultyAdjustedArcticWeatherState(ARCTIC_WEATHER_PROFILES.WHITEOUT, 420, 'ARCADE');
    const pilot = getDifficultyAdjustedArcticWeatherState(ARCTIC_WEATHER_PROFILES.WHITEOUT, 420, 'PILOT');
    const veteran = getDifficultyAdjustedArcticWeatherState(ARCTIC_WEATHER_PROFILES.WHITEOUT, 420, 'VETERAN');
    expect(arcade.visibility).toBeGreaterThan(pilot.visibility);
    expect(pilot.visibility).toBeGreaterThanOrEqual(veteran.visibility);
    expect(arcade.fog).toBeLessThan(pilot.fog);
    expect(veteran.fog).toBeGreaterThan(pilot.fog);
    expect(getDifficultyAdjustedArcticWeatherState(ARCTIC_WEATHER_PROFILES.WHITEOUT, 420, 'PILOT')).toEqual(pilot);
  });
});

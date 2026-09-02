import { RescueBeaconState } from '../types/game';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function calculateRescueBeacon(
  playerX: number,
  targetX: number,
  pickupTicks: number,
  crewLocated: boolean,
  crewAboard = false,
): RescueBeaconState {
  const signedDistance = targetX - playerX;
  const distance = Math.abs(signedDistance);
  return {
    bearing: distance <= 90 ? 'ON_STATION' : signedDistance < 0 ? 'LEFT' : 'RIGHT',
    strength: crewAboard ? 1 : clamp01(1 - distance / 6200),
    distance: Math.round(distance),
    pickupProgress: crewAboard ? 1 : clamp01(pickupTicks / 180),
    crewLocated: crewLocated || distance <= 850 || crewAboard,
    crewAboard,
  };
}

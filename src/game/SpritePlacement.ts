import { EnemyType } from '../types/game';

export interface EnemySpritePlacement {
  key: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  frameIndex?: number;
  frameCount?: number;
  followsSlope?: boolean;
  fallbackColor: string;
  fallbackLabel: string;
}

/**
 * Contact anchors are measured in normalised sprite coordinates. Ground units
 * use their track/wheel line; naval units use the painted waterline rather
 * than the transparent image edge.
 */
export const ENEMY_SPRITE_PLACEMENTS: Readonly<Partial<Record<EnemyType, Readonly<EnemySpritePlacement>>>> = Object.freeze({
  RADAR_STATION: Object.freeze({ key: 'enemy_radar', width: 104, height: 58, anchorX: 0.5, anchorY: 1, fallbackColor: '#06b6d4', fallbackLabel: 'RADAR [EWR]' }),
  SAM_LAUNCHER: Object.freeze({ key: 'enemy_sam', width: 84, height: 44, anchorX: 0.5, anchorY: 1, followsSlope: true, fallbackColor: '#eab308', fallbackLabel: 'SAM [SA-8]' }),
  AA_FLAK_GUN: Object.freeze({ key: 'enemy_flak', width: 72, height: 41, anchorX: 0.5, anchorY: 1, followsSlope: true, fallbackColor: '#f97316', fallbackLabel: 'FLAK [ZSU-23-4]' }),
  TANK: Object.freeze({ key: 'enemy_tank', width: 82, height: 30, anchorX: 0.5, anchorY: 1, followsSlope: true, fallbackColor: '#84cc16', fallbackLabel: 'TANK [T-72M]' }),
  APC: Object.freeze({ key: 'enemy_tank', width: 82, height: 30, anchorX: 0.5, anchorY: 1, followsSlope: true, fallbackColor: '#84cc16', fallbackLabel: 'APC' }),
  COMMAND_VEHICLE: Object.freeze({ key: 'enemy_sam', width: 76, height: 40, anchorX: 0.5, anchorY: 1, followsSlope: true, fallbackColor: '#38bdf8', fallbackLabel: 'HQ [COMMAND]' }),
  FUEL_DEPOT: Object.freeze({ key: 'enemy_oil', width: 112, height: 38, anchorX: 0.5, anchorY: 1, fallbackColor: '#f59e0b', fallbackLabel: 'DEPOT [FUEL]' }),
  BRIDGE_SEGMENT: Object.freeze({ key: 'act_three_objectives', width: 150, height: 50, anchorX: 0.5, anchorY: 1, frameIndex: 0, frameCount: 5, fallbackColor: '#94a3b8', fallbackLabel: 'BRIDGE SPAN' }),
  COMMAND_BUNKER: Object.freeze({ key: 'act_three_objectives', width: 144, height: 66, anchorX: 0.5, anchorY: 1, frameIndex: 1, frameCount: 5, fallbackColor: '#64748b', fallbackLabel: 'COMMAND BUNKER' }),
  CIVILIAN_HARBOUR_BUILDING: Object.freeze({ key: 'friendly_supplies', width: 112, height: 41, anchorX: 0.5, anchorY: 1, fallbackColor: '#86a36b', fallbackLabel: 'FRIENDLY SUPPLIES' }),
  DOWNED_PILOT: Object.freeze({ key: 'pilot_raft', width: 40, height: 36, anchorX: 0.5, anchorY: 1, fallbackColor: '#eab308', fallbackLabel: 'PILOT [RESCUE]' }),
  CIVILIAN_CARGO_SHIP: Object.freeze({ key: 'enemy_ship', width: 150, height: 42, anchorX: 0.5, anchorY: 0.74, fallbackColor: '#ec4899', fallbackLabel: 'VESSEL [CARGO]' }),
  PATROL_BOAT: Object.freeze({ key: 'enemy_patrol_boat', width: 148, height: 66, anchorX: 0.5, anchorY: 0.92, frameIndex: 0, frameCount: 3, fallbackColor: '#94a3b8', fallbackLabel: 'MISSILE PATROL BOAT' }),
  MISSILE_CORVETTE: Object.freeze({ key: 'enemy_corvette', width: 188, height: 68, anchorX: 0.5, anchorY: 0.92, frameIndex: 0, frameCount: 3, fallbackColor: '#cbd5e1', fallbackLabel: 'MISSILE CORVETTE' }),
  LANDING_CRAFT: Object.freeze({ key: 'arctic_landing_craft', width: 164, height: 62, anchorX: 0.5, anchorY: 0.8, frameIndex: 0, frameCount: 3, fallbackColor: '#94a3b8', fallbackLabel: 'LANDING CRAFT' }),
  COASTAL_ARTILLERY: Object.freeze({ key: 'arctic_coastal_artillery', width: 112, height: 54, anchorX: 0.5, anchorY: 0.92, frameIndex: 0, frameCount: 3, followsSlope: true, fallbackColor: '#64748b', fallbackLabel: 'COASTAL GUN' }),
  SEARCHLIGHT: Object.freeze({ key: 'enemy_searchlight', width: 48, height: 52, anchorX: 0.5, anchorY: 1, followsSlope: true, fallbackColor: '#d8e1c4', fallbackLabel: 'SEARCHLIGHT' }),
  PROTECTED_SETTLEMENT: Object.freeze({ key: 'protected_settlement', width: 176, height: 64, anchorX: 0.5, anchorY: 1, fallbackColor: '#536873', fallbackLabel: 'PROTECTED SETTLEMENT' }),
  SUBMARINE_PEN: Object.freeze({ key: 'arctic_submarine_pen', width: 196, height: 88, anchorX: 0.5, anchorY: 0.94, frameIndex: 0, frameCount: 3, fallbackColor: '#475569', fallbackLabel: 'SUBMARINE PEN' }),
});

export function getEnemySpritePlacement(type: EnemyType): Readonly<EnemySpritePlacement> | null {
  return ENEMY_SPRITE_PLACEMENTS[type] ?? null;
}

export function calculateTerrainPlacement(
  worldX: number,
  footprintHalfWidth: number,
  groundYAt: (worldX: number) => number,
  followsSlope: boolean,
): { contactY: number; rotation: number } {
  const leftY = groundYAt(worldX - footprintHalfWidth * 0.72);
  const centreY = groundYAt(worldX);
  const rightY = groundYAt(worldX + footprintHalfWidth * 0.72);
  if (!followsSlope) return { contactY: Math.max(leftY, centreY, rightY), rotation: 0 };
  const rotation = Math.max(-0.105, Math.min(0.105, Math.atan2(rightY - leftY, footprintHalfWidth * 1.44)));
  return { contactY: centreY, rotation };
}

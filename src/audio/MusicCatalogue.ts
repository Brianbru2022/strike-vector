export type MusicCueId =
  | 'briefing_intelligence'
  | 'carrier_launch'
  | 'north_atlantic_patrol'
  | 'air_combat_intercept'
  | 'ground_strike'
  | 'storm_fleet_defence'
  | 'bastion_assault'
  | 'recovery_approach'
  | 'debrief_victory'
  | 'debrief_loss'
  | 'servicing_turnaround';

export interface MusicCueDefinition {
  readonly id: MusicCueId;
  readonly path: string;
  readonly loop: boolean;
  readonly gain: number;
}

export const MUSIC_CUE_DEFINITIONS: Readonly<Record<MusicCueId, MusicCueDefinition>> = Object.freeze({
  briefing_intelligence: { id: 'briefing_intelligence', path: '/assets/audio/music/briefing-intelligence-v1.ogg', loop: true, gain: 0.72 },
  carrier_launch: { id: 'carrier_launch', path: '/assets/audio/music/carrier-launch-v1.ogg', loop: false, gain: 0.82 },
  north_atlantic_patrol: { id: 'north_atlantic_patrol', path: '/assets/audio/music/north-atlantic-patrol-v1.ogg', loop: true, gain: 0.72 },
  air_combat_intercept: { id: 'air_combat_intercept', path: '/assets/audio/music/air-combat-intercept-v1.ogg', loop: true, gain: 0.78 },
  ground_strike: { id: 'ground_strike', path: '/assets/audio/music/ground-strike-v1.ogg', loop: true, gain: 0.76 },
  storm_fleet_defence: { id: 'storm_fleet_defence', path: '/assets/audio/music/storm-fleet-defence-v1.ogg', loop: true, gain: 0.8 },
  bastion_assault: { id: 'bastion_assault', path: '/assets/audio/music/bastion-assault-v1.ogg', loop: true, gain: 0.8 },
  recovery_approach: { id: 'recovery_approach', path: '/assets/audio/music/recovery-approach-v1.ogg', loop: true, gain: 0.7 },
  debrief_victory: { id: 'debrief_victory', path: '/assets/audio/music/debrief-victory-v1.ogg', loop: false, gain: 0.75 },
  debrief_loss: { id: 'debrief_loss', path: '/assets/audio/music/debrief-loss-v1.ogg', loop: false, gain: 0.7 },
  servicing_turnaround: { id: 'servicing_turnaround', path: '/assets/audio/music/servicing-turnaround-v1.ogg', loop: true, gain: 0.68 },
});

const GROUND_STRIKE_MISSIONS = /m2_|m3_|m4_|m7_|m8_|m12_|m13_|m16_|sead|deep[_-]?strike|interdiction|bridge|airbase|bastion|hq/i;

export function selectGameplayMusic(missionId: string | null, combatIntensity: number, recovering = false): MusicCueId {
  if (recovering) return 'recovery_approach';
  if (missionId === 'm6_fleet_defence') return 'storm_fleet_defence';
  if (missionId === 'm10_hq_assault') return 'bastion_assault';
  if (combatIntensity >= 1.55) return GROUND_STRIKE_MISSIONS.test(missionId ?? '') ? 'ground_strike' : 'air_combat_intercept';
  return 'north_atlantic_patrol';
}

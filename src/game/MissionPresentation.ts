import { MissionDefinition } from '../types/game';

const NORWEGIAN_MISSION_ART: Readonly<Record<string, string>> = Object.freeze({
  m11_cold_passage: '/assets/backgrounds/arctic-open-sea-painted-v1.webp',
  m12_hammerfall_fjord: '/assets/backgrounds/arctic-deep-fjord-painted-v1.webp',
  m13_troms_bridgehead: '/assets/backgrounds/arctic-bridgehead-operational-v1.webp',
  m14_whiteout_rescue: '/assets/backgrounds/arctic-whiteout-rescue-operational-v1.webp',
  m15_red_tide: '/assets/backgrounds/arctic-red-tide-operational-v1.webp',
  m16_north_cape_assault: '/assets/backgrounds/arctic-north-cape-assault-operational-v1.webp',
});

export function isNorwegianMission(mission: Pick<MissionDefinition, 'id'>): boolean {
  return /^m1[1-6]_/.test(mission.id);
}

export function missionPresentationArtwork(mission: Pick<MissionDefinition, 'id' | 'presentation'>): string {
  if (mission.id === 'm1_coastal_strike') return '/assets/ui/briefing-iron-dawn-v2.jpg';
  return NORWEGIAN_MISSION_ART[mission.id]
    ?? mission.presentation?.backdropAsset
    ?? '/assets/ui/campaign-map-northern-lance.jpg';
}

export function norwegianChapterArtwork(completedMissionIds: readonly string[]): string {
  for (const missionId of Object.keys(NORWEGIAN_MISSION_ART).reverse()) {
    if (completedMissionIds.includes(missionId)) return NORWEGIAN_MISSION_ART[missionId];
  }
  return NORWEGIAN_MISSION_ART.m11_cold_passage;
}

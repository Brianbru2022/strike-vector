import { CampaignChapterDefinition, CampaignChapterId, CampaignChapterProgress } from '../types/game';

const NORTHERN_LANCE_MISSIONS = [
  ['m1_coastal_strike', 1, 'Carrier Qualification', 'Operation Deck Test', 'NATO Carrier Group', 'Qualify aboard HMS Invincible and intercept coastal reconnaissance aircraft.'],
  ['m2_valley_run', 2, 'Fjord SAM Suppression', 'Operation Viper Canyon', 'Faroe Approaches', 'Open the fjord route by destroying its early-warning radar and SA-8 batteries.'],
  ['m3_convoy_hunter', 3, 'Forward-Base Capture', 'Operation Foothold', 'Skeld Forward Strip', 'Break the ground defence and capture the forward arming and refuelling point.'],
  ['m4_night_raid', 4, 'Armoured Convoy Interdiction', 'Operation Roadblock', 'Faroe Approaches', 'Destroy the Warsaw Pact command vehicle and halt its T-72 column.'],
  ['m5_pilot_rescue', 5, 'Downed Pilot Rescue', 'Operation Lifeline', 'Skeld Forward Strip', 'Recover Viper One under fire and return to Skeld.'],
  ['m6_fleet_defence', 6, 'Carrier Group Defence', 'Operation Sea Shield', 'Norwegian Sea', 'Defend HMS Invincible from coordinated aircraft, corvette and missile attacks.'],
  ['m7_bridge_strike', 7, 'Bridgehead Interdiction', 'Operation Broken Arrow', 'Janus Island', 'Stop the armoured crossing and demolish the designated bridge spans.'],
  ['m8_airbase_raid', 8, 'Janus Airbase Raid', 'Operation Black Buckler', 'Janus Island', 'Blind the GCI network and strike the runway fuel farm before full alert.'],
  ['m9_forward_defence', 9, 'Forward Base Defence', 'Operation Stand Fast', 'Skeld Forward Strip', 'Protect Skeld FARP against three escalating raid waves.'],
  ['m10_hq_assault', 10, 'Bastion Headquarters Assault', 'Operation Northern Lance', 'Bastion Command Sector', 'Dismantle the fortress defence in sequence and return to the carrier.'],
] as const;

const NORWEGIAN_SEA_MISSIONS = [
  ['m11_cold_passage', 11, 'Cold Passage', 'Operation Ice Gate', 'Vestfjord Approaches', 'Escort the carrier group through a contested coastal passage.'],
  ['m12_hammerfall_fjord', 12, 'Hammerfall Fjord', 'Operation Hammerfall', 'Hammerfall Fjord', 'Suppress cliff-side radar sites and open a low-level strike corridor.'],
  ['m13_troms_bridgehead', 13, 'Troms Bridgehead', 'Operation Winter Bridge', 'Troms Coast', 'Protect the NATO landing, stop the T-72 reserve and open an expeditionary FARP.'],
  ['m14_whiteout_rescue', 14, 'Whiteout Rescue', 'Operation Snow Angel', 'Lyngen Alps', 'Find and recover a downed NATO pilot during a fast-moving snow front.'],
  ['m15_red_tide', 15, 'Red Tide', 'Operation Red Tide', 'North Cape Sea Lane', 'Defend the fleet from a massed naval missile attack.'],
  ['m16_north_cape_assault', 16, 'North Cape Assault', 'Operation Midnight Sun', 'North Cape', 'Lead the final combined-arms strike against the northern command complex.'],
] as const;

const createMissions = (rows: readonly (readonly [string, number, string, string, string, string])[], status: 'PLAYABLE' | 'IN_PRODUCTION') =>
  Object.freeze(rows.map(([missionId, number, title, operationName, sector, summary]) => Object.freeze({ missionId, number, title, operationName, sector, summary, status })));

export const CAMPAIGN_CHAPTERS: Readonly<Record<CampaignChapterId, CampaignChapterDefinition>> = Object.freeze({
  NORTHERN_LANCE: Object.freeze({
    id: 'NORTHERN_LANCE',
    title: 'Operation Northern Lance',
    subtitle: 'The Bastion Campaign',
    year: 1987,
    missionIds: Object.freeze(NORTHERN_LANCE_MISSIONS.map(([id]) => id)),
    missions: createMissions(NORTHERN_LANCE_MISSIONS, 'PLAYABLE'),
    unlockAfterMissionId: null,
  }),
  NORWEGIAN_SEA: Object.freeze({
    id: 'NORWEGIAN_SEA',
    title: 'The Norwegian Sea',
    subtitle: 'Northern Front Expansion',
    year: 1987,
    missionIds: Object.freeze(NORWEGIAN_SEA_MISSIONS.map(([id]) => id)),
    missions: createMissions(NORWEGIAN_SEA_MISSIONS, 'PLAYABLE'),
    unlockAfterMissionId: 'm10_hq_assault',
  }),
});

export const CHAPTER_ORDER: CampaignChapterId[] = ['NORTHERN_LANCE', 'NORWEGIAN_SEA'];

export function createChapterProgress(chapterId: CampaignChapterId, completedMissionIds: string[], bestScores: Record<string, number>): CampaignChapterProgress {
  const chapter = CAMPAIGN_CHAPTERS[chapterId];
  const completed = chapter.missionIds.filter((missionId) => completedMissionIds.includes(missionId));
  return {
    chapterId,
    unlocked: chapter.unlockAfterMissionId === null || completedMissionIds.includes(chapter.unlockAfterMissionId),
    completedMissionIds: completed,
    bestScores: Object.fromEntries(completed.filter((missionId) => Number.isFinite(bestScores[missionId])).map((missionId) => [missionId, bestScores[missionId]])),
    completedAt: null,
  };
}

export function isChapterUnlocked(chapterId: CampaignChapterId, completedMissionIds: string[]): boolean {
  const prerequisite = CAMPAIGN_CHAPTERS[chapterId].unlockAfterMissionId;
  return prerequisite === null || completedMissionIds.includes(prerequisite);
}

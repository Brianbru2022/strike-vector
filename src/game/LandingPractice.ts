import { DifficultyPreset, LandingPracticeType, MissionDefinition } from '../types/game';
import { CAMPAIGN_MISSIONS } from './Missions';

export interface LandingPracticeDefinition {
  id: LandingPracticeType;
  title: string;
  site: 'CARRIER' | 'FORWARD_BASE';
  technique: 'ROLLING' | 'VERTICAL';
  description: string;
}

export interface LandingPracticeConfig {
  type: LandingPracticeType;
  difficulty: DifficultyPreset;
  damaged: boolean;
}

export const LANDING_PRACTICES: readonly LandingPracticeDefinition[] = Object.freeze([
  Object.freeze({ id: 'CARRIER_ROLLING', title: 'Rolling Carrier Recovery', site: 'CARRIER', technique: 'ROLLING', description: 'Join the stern approach with partial nozzle, bleed speed over the deck and touch down on the centreline.' }),
  Object.freeze({ id: 'CARRIER_VERTICAL', title: 'Vertical Carrier Recovery', site: 'CARRIER', technique: 'VERTICAL', description: 'Stabilise alongside Invincible, translate over the deck and descend inside the marked recovery box.' }),
  Object.freeze({ id: 'FARP_VERTICAL', title: 'Forward-Site Recovery', site: 'FORWARD_BASE', technique: 'VERTICAL', description: 'Cross the tundra at low speed, establish the hover and settle onto the expeditionary pad.' }),
]);

export function createLandingPracticeMission(type: LandingPracticeType): MissionDefinition {
  const definition = LANDING_PRACTICES.find((candidate) => candidate.id === type) ?? LANDING_PRACTICES[0];
  const template = definition.site === 'CARRIER'
    ? CAMPAIGN_MISSIONS[0]
    : CAMPAIGN_MISSIONS.find((mission) => mission.recoverySite === 'FORWARD_BASE') ?? CAMPAIGN_MISSIONS[2];
  const landingX = definition.site === 'CARRIER' ? 4200 : template.carrierLandingX;

  return {
    ...template,
    id: `practice_${type.toLowerCase()}`,
    codeName: 'DECK CIRCUIT',
    title: definition.title,
    threatLevel: 'LOW',
    briefingText: definition.description,
    tacticalNotes: [
      'The aircraft begins established on final approach with a fully serviceable airframe.',
      'Use the approach director for forward speed, sink rate, nozzle angle and deck alignment.',
      'Practice results are isolated and never alter campaign, showcase or operation progress.',
    ],
    rulesOfEngagement: 'Training airspace is sterile. Concentrate on a stable approach and controlled touchdown.',
    mapLength: Math.max(template.mapLength, landingX + 1600),
    hasCarrierLaunch: false,
    hasCarrierRecovery: true,
    launchSite: definition.site,
    recoverySite: definition.site,
    carrierX: template.carrierX,
    carrierLandingX: landingX,
    defendedAsset: undefined,
    phases: undefined,
    events: undefined,
    alertProfile: undefined,
    objectives: [{ id: 'practice_recovery', description: `Complete ${definition.title}`, isPrimary: true, completed: false, requiredCount: 1, currentCount: 0, targetType: 'LANDING', points: 0 }],
    spawnEnemies: () => [],
  };
}

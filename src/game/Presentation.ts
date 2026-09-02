import { EnvironmentPresentationProfile, MissionDefinition, TerrainProfile } from '../types/game';
import { ARCTIC_PRESENTATION_PROFILES } from './ArcticToolkit';

const profile = (value: EnvironmentPresentationProfile): EnvironmentPresentationProfile => Object.freeze(value);

export const SIGNATURE_PRESENTATION = Object.freeze({
  MISSION_1: profile({
    id: 'signature_carrier_dawn_v2',
    backdropAsset: '/assets/backgrounds/mission-1-dawn-showcase-v2.webp',
    backdropFilter: 'saturate(0.94) contrast(1.08) brightness(0.88)',
    overlayColour: 'rgba(13, 32, 48, 0.08)',
    vignetteStrength: 0.28,
    parallax: 0.010,
    overscan: 0.055,
    seaState: 'MODERATE',
    hazeDensity: 0.24,
    sprayIntensity: 0.34,
    rainDensity: 0,
    ultrawideFocus: 1.07,
    gameplayCalm: 0.46,
  }),
  MISSION_6: profile({
    id: 'signature_fleet_storm_v2',
    backdropAsset: '/assets/backgrounds/mission-6-storm-showcase-v2.webp',
    backdropFilter: 'saturate(0.82) contrast(1.14) brightness(0.72)',
    overlayColour: 'rgba(4, 15, 30, 0.16)',
    vignetteStrength: 0.38,
    parallax: 0.008,
    overscan: 0.045,
    seaState: 'HEAVY',
    hazeDensity: 0.34,
    sprayIntensity: 0.72,
    rainDensity: 0.86,
    ultrawideFocus: 1.08,
    gameplayCalm: 0.62,
  }),
  MISSION_10: profile({
    id: 'signature_bastion_dawn_v2',
    backdropAsset: '/assets/backgrounds/mission-10-bastion-hero-v3.webp',
    backdropFilter: 'saturate(0.72) contrast(1.16) brightness(0.76)',
    overlayColour: 'rgba(15, 23, 31, 0.12)',
    vignetteStrength: 0.36,
    parallax: 0.007,
    overscan: 0.05,
    seaState: 'MODERATE',
    hazeDensity: 0.42,
    sprayIntensity: 0.28,
    rainDensity: 0.08,
    ultrawideFocus: 1.09,
    gameplayCalm: 0.66,
  }),
});

const FALLBACK_BY_TERRAIN: Record<TerrainProfile, EnvironmentPresentationProfile> = {
  COASTAL_STRIKE: profile({ ...SIGNATURE_PRESENTATION.MISSION_1, id: 'coastal_standard', backdropAsset: '/assets/backgrounds/north-atlantic-dawn-painted.webp' }),
  FJORD_PASS: profile({ ...SIGNATURE_PRESENTATION.MISSION_1, id: 'fjord_standard', backdropAsset: '/assets/backgrounds/fjord-pass-painted-v1.webp', backdropFilter: 'saturate(0.78) contrast(1.12) brightness(0.8)', hazeDensity: 0.38 }),
  COAST_ROAD: profile({ ...SIGNATURE_PRESENTATION.MISSION_1, id: 'road_standard', backdropAsset: '/assets/backgrounds/convoy-valley-painted-v1.webp', backdropFilter: 'saturate(0.86) contrast(1.08) brightness(0.88)' }),
  NIGHT_AIRBASE: profile({ ...SIGNATURE_PRESENTATION.MISSION_10, id: 'airbase_standard', backdropAsset: '/assets/backgrounds/janus-airbase-night-painted-v1.webp', backdropFilter: 'saturate(0.56) contrast(1.2) brightness(0.62)', vignetteStrength: 0.48 }),
  BEACHHEAD: profile({ ...SIGNATURE_PRESENTATION.MISSION_1, id: 'beachhead_standard', backdropAsset: '/assets/backgrounds/rescue-coast-painted-v1.webp', hazeDensity: 0.32 }),
  OPEN_SEA: SIGNATURE_PRESENTATION.MISSION_6,
  ISLAND_CAUSEWAY: profile({ ...SIGNATURE_PRESENTATION.MISSION_1, id: 'causeway_standard', backdropAsset: '/assets/backgrounds/janus-causeway-painted-v1.webp', backdropFilter: 'saturate(0.82) contrast(1.1) brightness(0.82)' }),
  FORWARD_BASE: profile({ ...SIGNATURE_PRESENTATION.MISSION_1, id: 'farp_standard', backdropAsset: '/assets/backgrounds/skeld-defence-dawn-painted-v1.webp', backdropFilter: 'saturate(0.76) contrast(1.12) brightness(0.82)' }),
  FORTRESS: SIGNATURE_PRESENTATION.MISSION_10,
  ARCTIC_OPEN_SEA: ARCTIC_PRESENTATION_PROFILES.ARCTIC_OPEN_SEA,
  ARCTIC_DEEP_FJORD: ARCTIC_PRESENTATION_PROFILES.ARCTIC_DEEP_FJORD,
  ARCTIC_BRIDGEHEAD: ARCTIC_PRESENTATION_PROFILES.ARCTIC_BRIDGEHEAD,
  POLAR_NIGHT_PLATEAU: ARCTIC_PRESENTATION_PROFILES.POLAR_NIGHT_PLATEAU,
  NORTH_CAPE_FORTRESS: ARCTIC_PRESENTATION_PROFILES.NORTH_CAPE_FORTRESS,
};

export function getEnvironmentPresentation(mission: MissionDefinition): EnvironmentPresentationProfile {
  return mission.presentation ?? FALLBACK_BY_TERRAIN[mission.terrainProfile ?? 'COASTAL_STRIKE'];
}

import {
  ArcticWeatherProfile,
  ArcticWeatherState,
  AuthoredTerrainHeightProfile,
  DifficultyPreset,
  EnvironmentPresentationProfile,
  TerrainProfile,
} from '../types/game';

const freezePresentation = (value: EnvironmentPresentationProfile) => Object.freeze(value);
const freezeWeather = (value: ArcticWeatherProfile) => Object.freeze(value);

export const ARCTIC_PRESENTATION_PROFILES = Object.freeze({
  ARCTIC_OPEN_SEA: freezePresentation({ id: 'arctic_open_sea_v1', backdropAsset: '/assets/backgrounds/arctic-open-sea-painted-v1.webp', backdropFilter: 'saturate(0.78) contrast(1.12) brightness(0.82)', overlayColour: 'rgba(18, 34, 48, 0.12)', vignetteStrength: 0.34, parallax: 0.006, overscan: 0.045, seaState: 'HEAVY', hazeDensity: 0.38, sprayIntensity: 0.76, rainDensity: 0.14, ultrawideFocus: 1.08, gameplayCalm: 0.58 }),
  ARCTIC_DEEP_FJORD: freezePresentation({ id: 'arctic_deep_fjord_v1', backdropAsset: '/assets/backgrounds/arctic-deep-fjord-painted-v1.webp', backdropFilter: 'saturate(0.74) contrast(1.14) brightness(0.78)', overlayColour: 'rgba(20, 34, 42, 0.1)', vignetteStrength: 0.38, parallax: 0.008, overscan: 0.05, seaState: 'MODERATE', hazeDensity: 0.46, sprayIntensity: 0.28, rainDensity: 0.08, ultrawideFocus: 1.08, gameplayCalm: 0.64 }),
  ARCTIC_BRIDGEHEAD: freezePresentation({ id: 'arctic_bridgehead_v1', backdropAsset: '/assets/backgrounds/arctic-bridgehead-painted-v1.webp', backdropFilter: 'saturate(0.8) contrast(1.1) brightness(0.84)', overlayColour: 'rgba(24, 34, 40, 0.08)', vignetteStrength: 0.31, parallax: 0.007, overscan: 0.05, seaState: 'MODERATE', hazeDensity: 0.34, sprayIntensity: 0.34, rainDensity: 0.12, ultrawideFocus: 1.07, gameplayCalm: 0.54 }),
  POLAR_NIGHT_PLATEAU: freezePresentation({ id: 'polar_night_plateau_v1', backdropAsset: '/assets/backgrounds/arctic-polar-night-painted-v1.webp', backdropFilter: 'saturate(0.62) contrast(1.18) brightness(0.62)', overlayColour: 'rgba(5, 14, 35, 0.2)', vignetteStrength: 0.48, parallax: 0.006, overscan: 0.045, seaState: 'CALM', hazeDensity: 0.52, sprayIntensity: 0.06, rainDensity: 0, ultrawideFocus: 1.08, gameplayCalm: 0.7 }),
  NORTH_CAPE_FORTRESS: freezePresentation({ id: 'north_cape_fortress_v1', backdropAsset: '/assets/backgrounds/arctic-north-cape-painted-v1.webp', backdropFilter: 'saturate(0.68) contrast(1.18) brightness(0.7)', overlayColour: 'rgba(13, 24, 34, 0.15)', vignetteStrength: 0.42, parallax: 0.006, overscan: 0.05, seaState: 'HEAVY', hazeDensity: 0.44, sprayIntensity: 0.55, rainDensity: 0.08, ultrawideFocus: 1.09, gameplayCalm: 0.66 }),
});

const heightProfile = (samples: Array<number | null>): AuthoredTerrainHeightProfile => ({
  startWorldX: 0,
  endWorldX: 18000,
  samples,
});

export const ARCTIC_TERRAIN_HEIGHT_PROFILES: Readonly<Partial<Record<TerrainProfile, AuthoredTerrainHeightProfile>>> = Object.freeze({
  ARCTIC_OPEN_SEA: heightProfile(Array.from({ length: 33 }, () => null)),
  ARCTIC_DEEP_FJORD: heightProfile([null, null, 588, 574, 566, 558, 552, 548, 545, 542, 539, 536, 534, 532, 530, 528, 526, 525, 526, 528, 531, 535, 539, 544, 549, 553, 556, 560, 564, 570, 578, null, null]),
  ARCTIC_BRIDGEHEAD: heightProfile([null, null, null, 590, 582, 574, 568, 566, 565, 566, 568, 569, 568, 566, 565, 564, 565, 566, 568, 570, 569, 567, 565, 564, 565, 568, 572, 578, 586, null, null, null, null]),
  POLAR_NIGHT_PLATEAU: heightProfile([566, 563, 560, 558, 556, 554, 552, 550, 548, 547, 546, 545, 544, 544, 545, 546, 547, 548, 550, 551, 552, 551, 549, 548, 547, 548, 550, 553, 556, 559, 562, 564, 566]),
  NORTH_CAPE_FORTRESS: heightProfile([null, null, 594, 584, 572, 561, 552, 546, 541, 537, 534, 532, 530, 528, 526, 524, 523, 524, 526, 528, 529, 528, 526, 525, 526, 530, 537, 546, 558, 574, 590, null, null]),
});

export const ARCTIC_WEATHER_PROFILES = Object.freeze({
  SNOW: freezeWeather({ id: 'arctic_snow_v1', kind: 'SNOW', seed: 113, intensity: 0.64, visibilityFloor: 0.58, cycleTicks: 720, windDirection: -1, essentialCueOpacity: 0.9 }),
  FREEZING_RAIN: freezeWeather({ id: 'freezing_rain_v1', kind: 'FREEZING_RAIN', seed: 227, intensity: 0.72, visibilityFloor: 0.54, cycleTicks: 600, windDirection: -1, essentialCueOpacity: 0.92 }),
  WHITEOUT: freezeWeather({ id: 'whiteout_v1', kind: 'WHITEOUT', seed: 349, intensity: 0.9, visibilityFloor: 0.28, cycleTicks: 840, windDirection: 1, essentialCueOpacity: 1 }),
  SEA_FOG: freezeWeather({ id: 'sea_fog_v1', kind: 'SEA_FOG', seed: 461, intensity: 0.78, visibilityFloor: 0.36, cycleTicks: 960, windDirection: 1, essentialCueOpacity: 0.96 }),
  ICE_SPRAY: freezeWeather({ id: 'ice_spray_v1', kind: 'ICE_SPRAY', seed: 593, intensity: 0.76, visibilityFloor: 0.62, cycleTicks: 540, windDirection: -1, essentialCueOpacity: 0.92 }),
  LOW_WINTER_SUN: freezeWeather({ id: 'low_winter_sun_v1', kind: 'LOW_WINTER_SUN', seed: 719, intensity: 0.58, visibilityFloor: 0.7, cycleTicks: 1080, windDirection: 1, essentialCueOpacity: 0.9 }),
});

export function getArcticWeatherState(profile: ArcticWeatherProfile, tick: number): ArcticWeatherState {
  const safeTick = Math.max(0, Math.floor(tick));
  const phase = ((safeTick + profile.seed) % profile.cycleTicks) / profile.cycleTicks;
  const pulse = 0.5 + 0.32 * Math.sin(phase * Math.PI * 2) + 0.18 * Math.sin((phase * 3.7 + profile.seed * 0.001) * Math.PI * 2);
  const strength = Math.max(0, Math.min(1, profile.intensity * Math.max(0.18, pulse)));
  const fogBias = profile.kind === 'WHITEOUT' || profile.kind === 'SEA_FOG' ? 0.22 : 0;
  return {
    tick: safeTick,
    phase,
    visibility: Math.max(profile.visibilityFloor, 1 - strength * 0.68 - fogBias),
    precipitation: ['SNOW', 'FREEZING_RAIN', 'WHITEOUT'].includes(profile.kind) ? strength : 0,
    fog: ['WHITEOUT', 'SEA_FOG'].includes(profile.kind) ? Math.min(1, strength + fogBias) : strength * 0.12,
    iceSpray: profile.kind === 'ICE_SPRAY' ? strength : 0,
  };
}

export function getDifficultyAdjustedArcticWeatherState(
  profile: ArcticWeatherProfile,
  tick: number,
  difficulty: DifficultyPreset,
): ArcticWeatherState {
  const state = getArcticWeatherState(profile, tick);
  if (profile.kind !== 'WHITEOUT') return state;
  const visibilityOffset = difficulty === 'ARCADE' ? 0.12 : difficulty === 'VETERAN' ? -0.08 : 0;
  const fogOffset = difficulty === 'ARCADE' ? -0.12 : difficulty === 'VETERAN' ? 0.08 : 0;
  const precipitationScale = difficulty === 'ARCADE' ? 0.85 : difficulty === 'VETERAN' ? 1.08 : 1;
  return {
    ...state,
    visibility: Math.max(profile.visibilityFloor, Math.min(1, state.visibility + visibilityOffset)),
    precipitation: Math.min(1, state.precipitation * precipitationScale),
    fog: Math.max(0, Math.min(1, state.fog + fogOffset)),
  };
}

export function sampleAuthoredTerrainHeight(profile: AuthoredTerrainHeightProfile, worldX: number): number | null {
  if (profile.samples.length === 0 || worldX < profile.startWorldX || worldX > profile.endWorldX) return null;
  const progress = (worldX - profile.startWorldX) / Math.max(1, profile.endWorldX - profile.startWorldX);
  const scaled = progress * (profile.samples.length - 1);
  const leftIndex = Math.floor(scaled);
  const rightIndex = Math.min(profile.samples.length - 1, leftIndex + 1);
  const left = profile.samples[leftIndex];
  const right = profile.samples[rightIndex];
  if (left === null || right === null) return leftIndex === rightIndex ? left : null;
  return left + (right - left) * (scaled - leftIndex);
}

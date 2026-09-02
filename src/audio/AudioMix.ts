import { EngineAudioState, PegasusLayerMix } from '../types/game';

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Pure mixer authority used by both Web Audio and deterministic tests. */
export const calculatePegasusLayerMix = (input: EngineAudioState): PegasusLayerMix => {
  const throttle = clamp01(input.throttleRatio);
  const speed = clamp01(input.speedRatio);
  const vtol = clamp01(input.vtolRatio);
  const damage = clamp01(input.damageRatio);
  const power = clamp01(throttle * 0.72 + speed * 0.28);

  return Object.freeze({
    coreGain: 0.07 + power * 0.19,
    turbineGain: 0.035 + throttle * 0.13,
    exhaustGain: 0.055 + power * 0.22,
    windGain: speed * speed * 0.15,
    vtolGain: vtol * (0.08 + throttle * 0.28),
    damageGain: damage * (0.025 + power * 0.105),
    coreFrequency: 48 + power * 54,
    turbineFrequency: 270 + throttle * 390 + speed * 70,
    exhaustCutoff: 520 + power * 1740,
    windCutoff: 1050 + speed * 2850,
  });
};

export const MIXER_BASE_GAINS = Object.freeze({
  ENGINE: 0.78,
  WEAPONS: 0.9,
  IMPACTS: 0.88,
  WARNINGS: 1,
  RADIO: 0.98,
  AMBIENCE: 0.45,
  INTERFACE: 0.65,
});

export const PRIORITY_DUCKING = Object.freeze({
  WARNING: Object.freeze({ engine: 0.42, weapons: 0.72, impacts: 0.68, ambience: 0.2, music: 0.32, seconds: 0.5 }),
  RADIO: Object.freeze({ engine: 0.52, weapons: 0.68, impacts: 0.7, ambience: 0.28, music: 0.4, seconds: 1.8 }),
});

import { describe, expect, it } from 'vitest';
import { AUDIO_CUE_DEFINITIONS } from './SoundEngine';
import { calculatePegasusLayerMix, MIXER_BASE_GAINS, PRIORITY_DUCKING } from './AudioMix';
import { MISSION_RADIO_SCRIPTS, formatRadioCaption, getMissionRadioCall } from './RadioProduction';
import { CAMPAIGN_MISSIONS } from '../game/Missions';

describe('showcase audio catalogue', () => {
  it('covers every required mixer category with bounded cue values', () => {
    const categories = new Set(Object.values(AUDIO_CUE_DEFINITIONS).map((cue) => cue.category));
    expect(categories).toEqual(new Set(['ENGINE', 'WEAPONS', 'IMPACTS', 'WARNINGS', 'AMBIENCE', 'RADIO', 'INTERFACE']));
    for (const cue of Object.values(AUDIO_CUE_DEFINITIONS)) {
      expect(cue.gain).toBeGreaterThan(0);
      expect(cue.gain).toBeLessThanOrEqual(1);
      expect(cue.playbackRateMin).toBeLessThanOrEqual(cue.playbackRateMax);
      expect(cue.maximumVoices).toBeGreaterThan(0);
    }
  });

  it('uses distinct checked-in recordings for the production-critical cues', () => {
    const sampled = Object.values(AUDIO_CUE_DEFINITIONS).filter((cue) => cue.samplePath);
    expect(sampled).toHaveLength(13);
    expect(new Set(sampled.map((cue) => cue.samplePath)).size).toBe(sampled.length);
    expect(AUDIO_CUE_DEFINITIONS.missile_launch.samplePath).not.toBe(AUDIO_CUE_DEFINITIONS.rocket_launch.samplePath);
    expect(AUDIO_CUE_DEFINITIONS.bomb_release.samplePath).not.toBe(AUDIO_CUE_DEFINITIONS.combat_impact.samplePath);
    for (const cue of sampled) expect(cue.samplePath).toMatch(/^\/assets\/audio\/.+\.wav$/);
  });

  it('limits continuous beds to a single looping voice', () => {
    for (const id of ['jet_engine', 'vtol_thrust', 'north_atlantic_wind']) {
      expect(AUDIO_CUE_DEFINITIONS[id].loop).toBe(true);
      expect(AUDIO_CUE_DEFINITIONS[id].maximumVoices).toBe(1);
    }
  });

  it('builds independent bounded Pegasus layers from flight state', () => {
    const idle = calculatePegasusLayerMix({ throttleRatio: 0.2, speedRatio: 0, vtolRatio: 0, damageRatio: 0 });
    const fast = calculatePegasusLayerMix({ throttleRatio: 1, speedRatio: 1, vtolRatio: 0, damageRatio: 0 });
    const hover = calculatePegasusLayerMix({ throttleRatio: 0.8, speedRatio: 0.1, vtolRatio: 1, damageRatio: 0.6 });
    expect(fast.coreGain).toBeGreaterThan(idle.coreGain);
    expect(fast.windGain).toBeGreaterThan(idle.windGain);
    expect(hover.vtolGain).toBeGreaterThan(fast.vtolGain);
    expect(hover.damageGain).toBeGreaterThan(0);
    expect(Object.values(fast).every(Number.isFinite)).toBe(true);
  });

  it('keeps critical cues above background buses during priority ducking', () => {
    expect(MIXER_BASE_GAINS.WARNINGS).toBeGreaterThan(MIXER_BASE_GAINS.ENGINE);
    expect(PRIORITY_DUCKING.WARNING.engine).toBeLessThan(MIXER_BASE_GAINS.ENGINE);
    expect(PRIORITY_DUCKING.RADIO.ambience).toBeLessThan(MIXER_BASE_GAINS.AMBIENCE);
    expect(PRIORITY_DUCKING.WARNING.seconds).toBeLessThan(PRIORITY_DUCKING.RADIO.seconds);
    expect(PRIORITY_DUCKING.WARNING.weapons).toBeLessThan(MIXER_BASE_GAINS.WEAPONS);
    expect(PRIORITY_DUCKING.RADIO.impacts).toBeLessThan(MIXER_BASE_GAINS.IMPACTS);
  });

  it('provides captioned launch, contact and recovery dialogue for all sixteen missions', () => {
    expect(CAMPAIGN_MISSIONS).toHaveLength(16);
    expect(Object.keys(MISSION_RADIO_SCRIPTS)).toEqual(CAMPAIGN_MISSIONS.map((mission) => mission.id));
    const ids = new Set<string>();
    for (const mission of CAMPAIGN_MISSIONS) {
      for (const moment of ['LAUNCH', 'CONTACT', 'RECOVERY'] as const) {
        const call = getMissionRadioCall(mission.id, moment);
        expect(call).not.toBeNull();
        expect(call?.caption.length).toBeGreaterThan(20);
        expect(formatRadioCaption(call!)).toContain(': ');
        ids.add(call!.id);
      }
    }
    expect(ids.size).toBe(48);
  });
});

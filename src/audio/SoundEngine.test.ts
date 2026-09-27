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
    expect(sampled).toHaveLength(48);
    expect(new Set(sampled.map((cue) => cue.samplePath)).size).toBe(sampled.length);
    expect(AUDIO_CUE_DEFINITIONS.missile_launch.samplePath).not.toBe(AUDIO_CUE_DEFINITIONS.rocket_launch.samplePath);
    expect(AUDIO_CUE_DEFINITIONS.bomb_release.samplePath).not.toBe(AUDIO_CUE_DEFINITIONS.combat_impact.samplePath);
    for (const cue of sampled) expect(cue.samplePath).toMatch(/^\/assets\/audio\/.+\.wav$/);
    expect(AUDIO_CUE_DEFINITIONS.nozzle_transition.samplePath).toBe('/assets/audio/elevenlabs/nozzle-transition-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.nozzle_transition.loop).not.toBe(true);
    expect(AUDIO_CUE_DEFINITIONS.jet_idle.samplePath).toBe('/assets/audio/elevenlabs/pegasus-idle-loop-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.jet_power.samplePath).toBe('/assets/audio/elevenlabs/pegasus-power-loop-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.airframe_wind.samplePath).toBe('/assets/audio/elevenlabs/airframe-wind-loop-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.vtol_thrust.samplePath).toBe('/assets/audio/elevenlabs/vtol-downwash-loop-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.landing_gear.samplePath).toBe('/assets/audio/elevenlabs/landing-gear-cycle-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.compressor_stall.samplePath).toBe('/assets/audio/elevenlabs/compressor-stall-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.aden_cannon.samplePath).toBe('/assets/audio/elevenlabs/aden-cannon-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.missile_launch.samplePath).toBe('/assets/audio/elevenlabs/sidewinder-launch-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.missile_flyby.samplePath).toBe('/assets/audio/elevenlabs/sidewinder-flyby-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.rocket_launch.samplePath).toBe('/assets/audio/elevenlabs/rocket-pod-salvo-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.bomb_release.samplePath).toBe('/assets/audio/elevenlabs/bomb-release-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.countermeasure.samplePath).toBe('/assets/audio/elevenlabs/flare-eject-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.aircraft_gun_hit.samplePath).toBe('/assets/audio/elevenlabs/aircraft-gun-hit-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.ground_armour_hit.samplePath).toBe('/assets/audio/elevenlabs/ground-armour-hit-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.ground_soft_hit.samplePath).toBe('/assets/audio/elevenlabs/ground-soft-hit-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.water_impact.samplePath).toBe('/assets/audio/elevenlabs/water-impact-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.explosion_small.samplePath).toBe('/assets/audio/elevenlabs/explosion-small-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.explosion_medium.samplePath).toBe('/assets/audio/elevenlabs/explosion-medium-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.explosion_large.samplePath).toBe('/assets/audio/elevenlabs/explosion-large-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.fuel_cookoff.samplePath).toBe('/assets/audio/elevenlabs/fuel-cookoff-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.aircraft_breakup.samplePath).toBe('/assets/audio/elevenlabs/aircraft-breakup-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.aircraft_ground_crash.samplePath).toBe('/assets/audio/elevenlabs/aircraft-ground-crash-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.aircraft_sea_crash.samplePath).toBe('/assets/audio/elevenlabs/aircraft-sea-crash-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.ejection_seat.samplePath).toBe('/assets/audio/elevenlabs/ejection-seat-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.ejection_canopy.samplePath).toBe('/assets/audio/elevenlabs/ejection-canopy-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.parachute_open.samplePath).toBe('/assets/audio/elevenlabs/parachute-open-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.ship_weapon.samplePath).toBe('/assets/audio/elevenlabs/naval-gun-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.ship_missile.samplePath).toBe('/assets/audio/elevenlabs/antiship-missile-launch-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.ship_sinking.samplePath).toBe('/assets/audio/elevenlabs/ship-sinking-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.carrier_touchdown.samplePath).toBe('/assets/audio/elevenlabs/carrier-touchdown-v2.wav');
    expect(AUDIO_CUE_DEFINITIONS.carrier_deck_ambience.samplePath).toBe('/assets/audio/elevenlabs/carrier-deck-ambience-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.farp_ambience.samplePath).toBe('/assets/audio/elevenlabs/farp-ambience-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.storm_rain.samplePath).toBe('/assets/audio/elevenlabs/storm-rain-loop-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.thunder_distant.samplePath).toBe('/assets/audio/elevenlabs/thunder-distant-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.radar_search.samplePath).toBe('/assets/audio/elevenlabs/radar-search-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.coastal_surf.samplePath).toBe('/assets/audio/elevenlabs/coastal-surf-loop-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.radar_track.samplePath).toBe('/assets/audio/elevenlabs/radar-track-loop-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.missile_warning.samplePath).toBe('/assets/audio/elevenlabs/missile-warning-loop-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.target_lock.samplePath).toBe('/assets/audio/elevenlabs/target-lock-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.low_fuel.samplePath).toBe('/assets/audio/elevenlabs/low-fuel-warning-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.master_damage.samplePath).toBe('/assets/audio/elevenlabs/master-damage-warning-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.radio_squelch_in.samplePath).toBe('/assets/audio/elevenlabs/radio-squelch-in-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.radio_squelch_out.samplePath).toBe('/assets/audio/elevenlabs/radio-squelch-out-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.ui_confirm.samplePath).toBe('/assets/audio/elevenlabs/ui-confirm-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.ui_cancel.samplePath).toBe('/assets/audio/elevenlabs/ui-cancel-v1.wav');
    expect(AUDIO_CUE_DEFINITIONS.objective_complete.samplePath).toBe('/assets/audio/elevenlabs/objective-complete-v1.wav');
    for (const id of ['jet_idle', 'jet_power', 'airframe_wind', 'vtol_thrust', 'engine_damaged']) {
      expect(AUDIO_CUE_DEFINITIONS[id].loop).toBe(true);
    }
  });

  it('limits continuous beds to a single looping voice', () => {
    for (const id of ['jet_idle', 'jet_power', 'airframe_wind', 'vtol_thrust', 'engine_damaged', 'north_atlantic_wind', 'carrier_deck_ambience', 'farp_ambience', 'storm_rain', 'coastal_surf', 'radar_track', 'missile_warning']) {
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

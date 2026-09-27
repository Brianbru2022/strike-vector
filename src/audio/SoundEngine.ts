import { AudioCueDefinition, AudioMixerCategory, EngineAudioState, MissionRadioMoment, WeatherEffect } from '../types/game';
import { calculatePegasusLayerMix, MIXER_BASE_GAINS, PRIORITY_DUCKING } from './AudioMix';
import { formatRadioCaption, getMissionRadioCall } from './RadioProduction';
import { MUSIC_CUE_DEFINITIONS, MusicCueId, selectGameplayMusic } from './MusicCatalogue';

const COASTAL_SURF_MISSIONS = new Set(['m1_coastal_strike', 'm7_bridge_strike', 'm8_airbase_raid', 'm10_hq_assault', 'm11_cold_passage', 'm13_troms_bridgehead', 'm16_north_cape_assault']);

/**
 * IRON KESTREL '87 - Layered Offline Audio Engine
 * Authored bundled recordings reinforce procedural flight-state layers,
 * tactical radio, priority warnings and adaptive combat music.
 */

export const AUDIO_CUE_DEFINITIONS: Readonly<Record<string, AudioCueDefinition>> = Object.freeze({
  jet_idle: { id: 'jet_idle', category: 'ENGINE', gain: 0.72, playbackRateMin: 0.92, playbackRateMax: 1.06, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/pegasus-idle-loop-v1.wav', loop: true },
  jet_power: { id: 'jet_power', category: 'ENGINE', gain: 0.82, playbackRateMin: 0.88, playbackRateMax: 1.16, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/pegasus-power-loop-v1.wav', loop: true },
  airframe_wind: { id: 'airframe_wind', category: 'ENGINE', gain: 0.58, playbackRateMin: 0.9, playbackRateMax: 1.12, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/airframe-wind-loop-v1.wav', loop: true },
  vtol_thrust: { id: 'vtol_thrust', category: 'ENGINE', gain: 0.7, playbackRateMin: 0.9, playbackRateMax: 1.12, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/vtol-downwash-loop-v2.wav', loop: true },
  nozzle_transition: { id: 'nozzle_transition', category: 'ENGINE', gain: 0.62, playbackRateMin: 0.96, playbackRateMax: 1.04, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/nozzle-transition-v1.wav' },
  landing_gear: { id: 'landing_gear', category: 'ENGINE', gain: 0.58, playbackRateMin: 0.96, playbackRateMax: 1.05, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/landing-gear-cycle-v1.wav' },
  compressor_stall: { id: 'compressor_stall', category: 'ENGINE', gain: 0.76, playbackRateMin: 0.96, playbackRateMax: 1.03, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/compressor-stall-v1.wav' },
  engine_damaged: { id: 'engine_damaged', category: 'ENGINE', gain: 0.5, playbackRateMin: 0.94, playbackRateMax: 1.06, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/engine-damaged-loop-v1.wav', loop: true },
  aden_cannon: { id: 'aden_cannon', category: 'WEAPONS', gain: 0.86, playbackRateMin: 0.96, playbackRateMax: 1.04, maximumVoices: 4, samplePath: '/assets/audio/elevenlabs/aden-cannon-v2.wav' },
  missile_launch: { id: 'missile_launch', category: 'WEAPONS', gain: 0.9, playbackRateMin: 0.94, playbackRateMax: 1.06, maximumVoices: 3, samplePath: '/assets/audio/elevenlabs/sidewinder-launch-v2.wav' },
  missile_flyby: { id: 'missile_flyby', category: 'WEAPONS', gain: 0.58, playbackRateMin: 0.96, playbackRateMax: 1.05, maximumVoices: 3, samplePath: '/assets/audio/elevenlabs/sidewinder-flyby-v1.wav' },
  rocket_launch: { id: 'rocket_launch', category: 'WEAPONS', gain: 0.82, playbackRateMin: 0.95, playbackRateMax: 1.06, maximumVoices: 3, samplePath: '/assets/audio/elevenlabs/rocket-pod-salvo-v1.wav' },
  bomb_release: { id: 'bomb_release', category: 'WEAPONS', gain: 0.72, playbackRateMin: 0.97, playbackRateMax: 1.03, maximumVoices: 2, samplePath: '/assets/audio/elevenlabs/bomb-release-v2.wav' },
  countermeasure: { id: 'countermeasure', category: 'WEAPONS', gain: 0.7, playbackRateMin: 0.96, playbackRateMax: 1.04, maximumVoices: 2, samplePath: '/assets/audio/elevenlabs/flare-eject-v2.wav' },
  aircraft_gun_hit: { id: 'aircraft_gun_hit', category: 'IMPACTS', gain: 0.78, playbackRateMin: 0.95, playbackRateMax: 1.05, maximumVoices: 3, samplePath: '/assets/audio/elevenlabs/aircraft-gun-hit-v1.wav' },
  ground_armour_hit: { id: 'ground_armour_hit', category: 'IMPACTS', gain: 0.76, playbackRateMin: 0.95, playbackRateMax: 1.05, maximumVoices: 4, samplePath: '/assets/audio/elevenlabs/ground-armour-hit-v1.wav' },
  ground_soft_hit: { id: 'ground_soft_hit', category: 'IMPACTS', gain: 0.7, playbackRateMin: 0.94, playbackRateMax: 1.06, maximumVoices: 4, samplePath: '/assets/audio/elevenlabs/ground-soft-hit-v1.wav' },
  water_impact: { id: 'water_impact', category: 'IMPACTS', gain: 0.72, playbackRateMin: 0.95, playbackRateMax: 1.05, maximumVoices: 4, samplePath: '/assets/audio/elevenlabs/water-impact-v1.wav' },
  explosion_small: { id: 'explosion_small', category: 'IMPACTS', gain: 0.82, playbackRateMin: 0.94, playbackRateMax: 1.06, maximumVoices: 5, samplePath: '/assets/audio/elevenlabs/explosion-small-v1.wav' },
  explosion_medium: { id: 'explosion_medium', category: 'IMPACTS', gain: 0.9, playbackRateMin: 0.94, playbackRateMax: 1.04, maximumVoices: 5, samplePath: '/assets/audio/elevenlabs/explosion-medium-v1.wav' },
  explosion_large: { id: 'explosion_large', category: 'IMPACTS', gain: 0.94, playbackRateMin: 0.92, playbackRateMax: 1.03, maximumVoices: 3, samplePath: '/assets/audio/elevenlabs/explosion-large-v1.wav' },
  fuel_cookoff: { id: 'fuel_cookoff', category: 'IMPACTS', gain: 0.92, playbackRateMin: 0.97, playbackRateMax: 1.02, maximumVoices: 2, samplePath: '/assets/audio/elevenlabs/fuel-cookoff-v1.wav' },
  aircraft_breakup: { id: 'aircraft_breakup', category: 'IMPACTS', gain: 0.88, playbackRateMin: 0.96, playbackRateMax: 1.04, maximumVoices: 3, samplePath: '/assets/audio/elevenlabs/aircraft-breakup-v1.wav' },
  aircraft_ground_crash: { id: 'aircraft_ground_crash', category: 'IMPACTS', gain: 0.96, playbackRateMin: 0.96, playbackRateMax: 1.02, maximumVoices: 2, samplePath: '/assets/audio/elevenlabs/aircraft-ground-crash-v1.wav' },
  aircraft_sea_crash: { id: 'aircraft_sea_crash', category: 'IMPACTS', gain: 0.94, playbackRateMin: 0.96, playbackRateMax: 1.02, maximumVoices: 2, samplePath: '/assets/audio/elevenlabs/aircraft-sea-crash-v1.wav' },
  ejection_canopy: { id: 'ejection_canopy', category: 'IMPACTS', gain: 0.82, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'CRITICAL', samplePath: '/assets/audio/elevenlabs/ejection-canopy-v2.wav' },
  ejection_seat: { id: 'ejection_seat', category: 'IMPACTS', gain: 0.9, playbackRateMin: 0.98, playbackRateMax: 1.02, maximumVoices: 1, priority: 'CRITICAL', samplePath: '/assets/audio/elevenlabs/ejection-seat-v1.wav' },
  parachute_open: { id: 'parachute_open', category: 'IMPACTS', gain: 0.72, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/parachute-open-v2.wav' },
  combat_impact: { id: 'combat_impact', category: 'IMPACTS', gain: 0.88, playbackRateMin: 0.9, playbackRateMax: 1.08, maximumVoices: 6 },
  ship_weapon: { id: 'ship_weapon', category: 'WEAPONS', gain: 0.88, playbackRateMin: 0.94, playbackRateMax: 1.04, maximumVoices: 4, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/naval-gun-v2.wav' },
  ship_missile: { id: 'ship_missile', category: 'WEAPONS', gain: 0.92, playbackRateMin: 0.97, playbackRateMax: 1.03, maximumVoices: 3, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/antiship-missile-launch-v1.wav' },
  ship_sinking: { id: 'ship_sinking', category: 'IMPACTS', gain: 0.76, playbackRateMin: 0.98, playbackRateMax: 1.02, maximumVoices: 2, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/ship-sinking-v1.wav' },
  carrier_touchdown: { id: 'carrier_touchdown', category: 'IMPACTS', gain: 0.78, playbackRateMin: 0.96, playbackRateMax: 1.04, maximumVoices: 2, samplePath: '/assets/audio/elevenlabs/carrier-touchdown-v2.wav' },
  missile_warning: { id: 'missile_warning', category: 'WARNINGS', gain: 1, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'CRITICAL', duckingSeconds: 0.5, samplePath: '/assets/audio/elevenlabs/missile-warning-loop-v1.wav', loop: true },
  north_atlantic_wind: { id: 'north_atlantic_wind', category: 'AMBIENCE', gain: 0.44, playbackRateMin: 0.82, playbackRateMax: 1.18, maximumVoices: 1, loop: true },
  carrier_deck_ambience: { id: 'carrier_deck_ambience', category: 'AMBIENCE', gain: 0.42, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/carrier-deck-ambience-v1.wav', loop: true },
  farp_ambience: { id: 'farp_ambience', category: 'AMBIENCE', gain: 0.4, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/farp-ambience-v1.wav', loop: true },
  storm_rain: { id: 'storm_rain', category: 'AMBIENCE', gain: 0.48, playbackRateMin: 0.98, playbackRateMax: 1.02, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/storm-rain-loop-v1.wav', loop: true },
  thunder_distant: { id: 'thunder_distant', category: 'AMBIENCE', gain: 0.68, playbackRateMin: 0.96, playbackRateMax: 1.03, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/thunder-distant-v1.wav' },
  radar_search: { id: 'radar_search', category: 'WARNINGS', gain: 0.68, playbackRateMin: 0.98, playbackRateMax: 1.02, maximumVoices: 2, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/radar-search-v1.wav' },
  coastal_surf: { id: 'coastal_surf', category: 'AMBIENCE', gain: 0.38, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/elevenlabs/coastal-surf-loop-v1.wav', loop: true },
  radar_track: { id: 'radar_track', category: 'WARNINGS', gain: 0.76, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'CRITICAL', samplePath: '/assets/audio/elevenlabs/radar-track-loop-v1.wav', loop: true },
  target_lock: { id: 'target_lock', category: 'WARNINGS', gain: 0.72, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 2, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/target-lock-v1.wav' },
  low_fuel: { id: 'low_fuel', category: 'WARNINGS', gain: 0.7, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/low-fuel-warning-v1.wav' },
  master_damage: { id: 'master_damage', category: 'WARNINGS', gain: 0.82, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'CRITICAL', duckingSeconds: 0.5, samplePath: '/assets/audio/elevenlabs/master-damage-warning-v1.wav' },
  radio_squelch_in: { id: 'radio_squelch_in', category: 'RADIO', gain: 0.72, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/radio-squelch-in-v1.wav' },
  radio_squelch_out: { id: 'radio_squelch_out', category: 'RADIO', gain: 0.68, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/radio-squelch-out-v1.wav' },
  radio_call: { id: 'radio_call', category: 'RADIO', gain: 0.98, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'CRITICAL', duckingSeconds: 1.8 },
  ui_confirm: { id: 'ui_confirm', category: 'INTERFACE', gain: 0.64, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 2, samplePath: '/assets/audio/elevenlabs/ui-confirm-v1.wav' },
  ui_cancel: { id: 'ui_cancel', category: 'INTERFACE', gain: 0.62, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 2, samplePath: '/assets/audio/elevenlabs/ui-cancel-v1.wav' },
  objective_complete: { id: 'objective_complete', category: 'INTERFACE', gain: 0.74, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 2, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/objective-complete-v1.wav' },
});

class SoundEngine {
  public onRadioCall?: (phrase: string) => void;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private radioGain: GainNode | null = null;
  private categoryGains = new Map<AudioMixerCategory, GainNode>();
  private ambienceNode: AudioBufferSourceNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceUsesBundledSample = false;
  private weatherNode: AudioBufferSourceNode | null = null;
  private weatherFilter: BiquadFilterNode | null = null;
  private weatherGain: GainNode | null = null;
  private serviceAmbienceNode: AudioBufferSourceNode | null = null;
  private serviceAmbienceGain: GainNode | null = null;
  private coastalSurfNode: AudioBufferSourceNode | null = null;
  private coastalSurfGain: GainNode | null = null;
  private atmosphereRequest: { condition: WeatherEffect['condition']; windSpeed: number } = { condition: 'CLEAR', windSpeed: 0 };
  private sampleBuffers = new Map<string, AudioBuffer>();
  private activeSampleVoices = new Map<string, number>();
  private sampleLoadingStarted = false;

  // Engine loop nodes
  private jetOsc1: OscillatorNode | null = null;
  private jetOsc2: OscillatorNode | null = null;
  private jetNoiseNode: AudioBufferSourceNode | null = null;
  private jetFilter: BiquadFilterNode | null = null;
  private jetGain: GainNode | null = null;
  private jetCoreGain: GainNode | null = null;
  private jetTurbineGain: GainNode | null = null;
  private jetExhaustGain: GainNode | null = null;
  private jetWindGain: GainNode | null = null;
  private jetDamageGain: GainNode | null = null;
  private jetWindFilter: BiquadFilterNode | null = null;
  private vtolGain: GainNode | null = null;
  private vtolFilter: BiquadFilterNode | null = null;
  private jetIdleSampleNode: AudioBufferSourceNode | null = null;
  private jetIdleSampleGain: GainNode | null = null;
  private jetPowerSampleNode: AudioBufferSourceNode | null = null;
  private jetPowerSampleGain: GainNode | null = null;
  private airframeWindSampleNode: AudioBufferSourceNode | null = null;
  private airframeWindSampleGain: GainNode | null = null;
  private engineDamageSampleNode: AudioBufferSourceNode | null = null;
  private engineDamageSampleGain: GainNode | null = null;
  private vtolSampleNode: AudioBufferSourceNode | null = null;
  private vtolSampleGain: GainNode | null = null;
  private isEngineRunning = false;

  // Music sequencer
  private isMusicPlaying = false;
  private musicStep = 0;
  private musicIntervalId: number | null = null;
  private musicSampleNode: AudioBufferSourceNode | null = null;
  private musicSampleGain: GainNode | null = null;
  private musicBuffers = new Map<MusicCueId, AudioBuffer>();
  private desiredMusicCue: MusicCueId | null = null;
  private currentMusicCue: MusicCueId | null = null;
  private musicRequestToken = 0;
  private gameplayMusicActive = false;
  private recoveryMusicActive = false;
  private combatIntensity = 1.0;

  // Volume settings
  private masterVol = 0.8;
  private sfxVol = 0.85;
  private musicVol = 0.6;
  private voiceEnabled = true;
  private missionId: string | null = null;

  // Noise buffers cache
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazy initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    
    // Master chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-4, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(2, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(8, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.18, this.ctx.currentTime);
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.ctx.destination);

    // SFX Bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Music Bus
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    // Radio Bus
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.radioGain.connect(this.masterGain);

    for (const category of ['ENGINE', 'WEAPONS', 'IMPACTS', 'WARNINGS', 'AMBIENCE', 'INTERFACE'] as AudioMixerCategory[]) {
      const bus = this.ctx.createGain();
      const gain = MIXER_BASE_GAINS[category];
      bus.gain.setValueAtTime(gain, this.ctx.currentTime);
      bus.connect(this.sfxGain);
      this.categoryGains.set(category, bus);
    }
    this.categoryGains.set('RADIO', this.radioGain);

    this.generateNoiseBuffers();
    void this.preloadBundledSamples();
    if (this.desiredMusicCue) void this.playAuthoredMusic(this.desiredMusicCue);
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public pause() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  public getMasterVolume(): number {
    return this.masterVol;
  }

  public getSfxVolume(): number {
    return this.sfxVol;
  }

  public getMusicVolume(): number {
    return this.musicVol;
  }

  public isRadioEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setMasterVolume(vol: number) {
    this.masterVol = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVol = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVol = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
    }
  }

  public setRadioEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  private generateNoiseBuffers() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds looping noise
    
    // White noise
    const whiteBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const whiteData = whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = whiteBuffer;

    // Pink noise
    const pinkBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const pinkData = pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.pinkNoiseBuffer = pinkBuffer;
  }

  private getCategoryBus(category: AudioMixerCategory): GainNode | null {
    return this.categoryGains.get(category) ?? this.sfxGain;
  }

  private async preloadBundledSamples() {
    if (!this.ctx || this.sampleLoadingStarted) return;
    this.sampleLoadingStarted = true;
    const samples = Object.fromEntries(Object.values(AUDIO_CUE_DEFINITIONS)
      .filter((cue) => Boolean(cue.samplePath))
      .map((cue) => [cue.id, cue.samplePath!])) as Record<string, string>;
    await Promise.all(Object.entries(samples).map(async ([id, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok || !this.ctx) return;
        this.sampleBuffers.set(id, await this.ctx.decodeAudioData(await response.arrayBuffer()));
      } catch {
        // Procedural layers remain a complete offline fallback.
      }
    }));
    if (this.sampleBuffers.has('north_atlantic_wind') && !this.ambienceUsesBundledSample) {
      this.stopAmbience();
      this.setAtmosphere(this.atmosphereRequest.condition, this.atmosphereRequest.windSpeed);
    }
    this.startBundledEngineLoops();
    this.syncCoastalSurf();
  }

  private playBundledSample(id: string, category: AudioMixerCategory, gainValue: number, playbackRate = 1, delaySeconds = 0): boolean {
    if (!this.ctx) return false;
    const buffer = this.sampleBuffers.get(id);
    const output = this.getCategoryBus(category);
    if (!buffer || !output) return false;
    const maximumVoices = AUDIO_CUE_DEFINITIONS[id]?.maximumVoices ?? 1;
    const voices = this.activeSampleVoices.get(id) ?? 0;
    if (voices >= maximumVoices) return false;
    this.activeSampleVoices.set(id, voices + 1);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
    source.connect(gain);
    gain.connect(output);
    source.onended = () => this.activeSampleVoices.set(id, Math.max(0, (this.activeSampleVoices.get(id) ?? 1) - 1));
    source.start(this.ctx.currentTime + Math.max(0, delaySeconds));
    return true;
  }

  private startBundledEngineLoops() {
    if (!this.ctx || !this.isEngineRunning) return;
    const output = this.getCategoryBus('ENGINE');
    if (!output) return;
    if (!this.jetIdleSampleNode) {
      const buffer = this.sampleBuffers.get('jet_idle');
      if (buffer) {
        this.jetIdleSampleNode = this.ctx.createBufferSource();
        this.jetIdleSampleNode.buffer = buffer;
        this.jetIdleSampleNode.loop = true;
        this.jetIdleSampleGain = this.ctx.createGain();
        this.jetIdleSampleGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.jetIdleSampleNode.connect(this.jetIdleSampleGain);
        this.jetIdleSampleGain.connect(output);
        this.jetIdleSampleNode.start();
      }
    }
    if (!this.jetPowerSampleNode) {
      const buffer = this.sampleBuffers.get('jet_power');
      if (buffer) {
        this.jetPowerSampleNode = this.ctx.createBufferSource();
        this.jetPowerSampleNode.buffer = buffer;
        this.jetPowerSampleNode.loop = true;
        this.jetPowerSampleGain = this.ctx.createGain();
        this.jetPowerSampleGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.jetPowerSampleNode.connect(this.jetPowerSampleGain);
        this.jetPowerSampleGain.connect(output);
        this.jetPowerSampleNode.start();
      }
    }
    if (!this.airframeWindSampleNode) {
      const buffer = this.sampleBuffers.get('airframe_wind');
      if (buffer) {
        this.airframeWindSampleNode = this.ctx.createBufferSource();
        this.airframeWindSampleNode.buffer = buffer;
        this.airframeWindSampleNode.loop = true;
        this.airframeWindSampleGain = this.ctx.createGain();
        this.airframeWindSampleGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.airframeWindSampleNode.connect(this.airframeWindSampleGain);
        this.airframeWindSampleGain.connect(output);
        this.airframeWindSampleNode.start();
      }
    }
    if (!this.engineDamageSampleNode) {
      const buffer = this.sampleBuffers.get('engine_damaged');
      if (buffer) {
        this.engineDamageSampleNode = this.ctx.createBufferSource();
        this.engineDamageSampleNode.buffer = buffer;
        this.engineDamageSampleNode.loop = true;
        this.engineDamageSampleGain = this.ctx.createGain();
        this.engineDamageSampleGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.engineDamageSampleNode.connect(this.engineDamageSampleGain);
        this.engineDamageSampleGain.connect(output);
        this.engineDamageSampleNode.start();
      }
    }
    if (!this.vtolSampleNode) {
      const buffer = this.sampleBuffers.get('vtol_thrust');
      if (buffer) {
        this.vtolSampleNode = this.ctx.createBufferSource();
        this.vtolSampleNode.buffer = buffer;
        this.vtolSampleNode.loop = true;
        this.vtolSampleGain = this.ctx.createGain();
        this.vtolSampleGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.vtolSampleNode.connect(this.vtolSampleGain);
        this.vtolSampleGain.connect(output);
        this.vtolSampleNode.start();
      }
    }
  }

  private stopAmbience() {
    try {
      this.ambienceNode?.stop();
      this.ambienceNode?.disconnect();
      this.weatherNode?.stop();
      this.weatherNode?.disconnect();
      this.coastalSurfNode?.stop();
      this.coastalSurfNode?.disconnect();
      this.coastalSurfGain?.disconnect();
    } catch {
      // Already stopped.
    }
    this.ambienceNode = null;
    this.ambienceFilter = null;
    this.ambienceGain = null;
    this.ambienceUsesBundledSample = false;
    this.weatherNode = null;
    this.weatherFilter = null;
    this.weatherGain = null;
    this.coastalSurfNode = null;
    this.coastalSurfGain = null;
  }

  private syncCoastalSurf() {
    const shouldPlay = Boolean(this.missionId && (COASTAL_SURF_MISSIONS.has(this.missionId) || /coast|bridge|airbase|bastion|cape/i.test(this.missionId)));
    if (!shouldPlay || !this.ctx) {
      try { this.coastalSurfNode?.stop(); } catch { /* Already stopped. */ }
      this.coastalSurfNode?.disconnect();
      this.coastalSurfGain?.disconnect();
      this.coastalSurfNode = null;
      this.coastalSurfGain = null;
      return;
    }
    if (this.coastalSurfNode) return;
    const buffer = this.sampleBuffers.get('coastal_surf');
    const output = this.getCategoryBus('AMBIENCE');
    if (!buffer || !output) return;
    this.coastalSurfNode = this.ctx.createBufferSource();
    this.coastalSurfNode.buffer = buffer;
    this.coastalSurfNode.loop = true;
    this.coastalSurfGain = this.ctx.createGain();
    this.coastalSurfGain.gain.setValueAtTime(0.11, this.ctx.currentTime);
    this.coastalSurfNode.connect(this.coastalSurfGain);
    this.coastalSurfGain.connect(output);
    this.coastalSurfNode.start();
  }

  public setAtmosphere(condition: WeatherEffect['condition'], windSpeed: number) {
    if (!this.ctx || !this.whiteNoiseBuffer) return;
    this.atmosphereRequest = { condition, windSpeed };
    const now = this.ctx.currentTime;
    if (!this.ambienceNode) {
      this.ambienceNode = this.ctx.createBufferSource();
      const bundledWind = this.sampleBuffers.get('north_atlantic_wind');
      this.ambienceNode.buffer = bundledWind ?? this.whiteNoiseBuffer;
      this.ambienceUsesBundledSample = Boolean(bundledWind);
      this.ambienceNode.loop = true;
      this.ambienceFilter = this.ctx.createBiquadFilter();
      this.ambienceFilter.type = 'bandpass';
      this.ambienceFilter.Q.setValueAtTime(0.48, now);
      this.ambienceGain = this.ctx.createGain();
      this.ambienceNode.connect(this.ambienceFilter);
      this.ambienceFilter.connect(this.ambienceGain);
      const output = this.getCategoryBus('AMBIENCE');
      if (output) this.ambienceGain.connect(output);
      this.ambienceNode.start();

      // A separate high-frequency layer gives rain, spray and deck wind their
      // own presence without baking weather into the engine or music buses.
      this.weatherNode = this.ctx.createBufferSource();
      const bundledStorm = condition === 'RAIN' || condition === 'THUNDERSTORM' ? this.sampleBuffers.get('storm_rain') : null;
      this.weatherNode.buffer = bundledStorm ?? this.whiteNoiseBuffer;
      this.weatherNode.loop = true;
      this.weatherFilter = this.ctx.createBiquadFilter();
      this.weatherFilter.type = 'highpass';
      this.weatherGain = this.ctx.createGain();
      this.weatherGain.gain.setValueAtTime(0, now);
      this.weatherNode.connect(this.weatherFilter);
      this.weatherFilter.connect(this.weatherGain);
      if (output) this.weatherGain.connect(output);
      this.weatherNode.start();
    }
    const weatherStrength = condition === 'THUNDERSTORM' ? 1 : condition === 'RAIN' ? 0.72 : condition === 'MIST' ? 0.34 : 0.2;
    this.ambienceFilter?.frequency.setTargetAtTime(320 + windSpeed * 34, now, 0.35);
    this.ambienceGain?.gain.setTargetAtTime((0.035 + weatherStrength * 0.15) * Math.min(1.25, 0.7 + windSpeed / 18), now, 0.45);
    const precipitation = condition === 'THUNDERSTORM' ? 0.19 : condition === 'RAIN' ? 0.13 : condition === 'MIST' ? 0.035 : 0.012;
    this.weatherFilter?.frequency.setTargetAtTime(condition === 'THUNDERSTORM' ? 1250 : 1850, now, 0.35);
    this.weatherGain?.gain.setTargetAtTime(precipitation * Math.min(1.2, 0.75 + windSpeed / 24), now, 0.45);
  }

  public setVolumes(master: number, sfx: number, music: number, voice: boolean) {
    this.masterVol = master;
    this.sfxVol = sfx;
    this.musicVol = music;
    this.voiceEnabled = voice;

    if (this.ctx && this.masterGain && this.sfxGain && this.musicGain) {
      this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(music, this.ctx.currentTime);
    }
  }

  // --- JET ENGINE AUDIO SYSTEM ---
  public startJetEngine() {
    if (!this.ctx || this.isEngineRunning || !this.pinkNoiseBuffer) return;
    try {
      this.isEngineRunning = true;

      // Low rumble osc
      this.jetOsc1 = this.ctx.createOscillator();
      this.jetOsc1.type = 'sawtooth';
      this.jetOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

      // High turbine whine osc
      this.jetOsc2 = this.ctx.createOscillator();
      this.jetOsc2.type = 'triangle';
      this.jetOsc2.frequency.setValueAtTime(320, this.ctx.currentTime);

      // Jet exhaust noise
      this.jetNoiseNode = this.ctx.createBufferSource();
      this.jetNoiseNode.buffer = this.pinkNoiseBuffer;
      this.jetNoiseNode.loop = true;

      this.jetFilter = this.ctx.createBiquadFilter();
      this.jetFilter.type = 'lowpass';
      this.jetFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.jetFilter.Q.setValueAtTime(1.25, this.ctx.currentTime);

      this.jetGain = this.ctx.createGain();
      this.jetGain.gain.setValueAtTime(1, this.ctx.currentTime);
      this.jetCoreGain = this.ctx.createGain();
      this.jetTurbineGain = this.ctx.createGain();
      this.jetExhaustGain = this.ctx.createGain();
      this.jetWindGain = this.ctx.createGain();
      this.jetDamageGain = this.ctx.createGain();
      const idleMix = calculatePegasusLayerMix({ throttleRatio: 0.25, speedRatio: 0, vtolRatio: 0, damageRatio: 0 });
      this.jetCoreGain.gain.setValueAtTime(idleMix.coreGain, this.ctx.currentTime);
      this.jetTurbineGain.gain.setValueAtTime(idleMix.turbineGain, this.ctx.currentTime);
      this.jetExhaustGain.gain.setValueAtTime(idleMix.exhaustGain, this.ctx.currentTime);
      this.jetWindGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.jetDamageGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.jetWindFilter = this.ctx.createBiquadFilter();
      this.jetWindFilter.type = 'bandpass';
      this.jetWindFilter.Q.setValueAtTime(0.65, this.ctx.currentTime);

      // VTOL Thruster hiss filter
      this.vtolFilter = this.ctx.createBiquadFilter();
      this.vtolFilter.type = 'bandpass';
      this.vtolFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      this.vtolFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.vtolGain = this.ctx.createGain();
      this.vtolGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // Independent Pegasus layers: low core, compressor whine, exhaust roar,
      // airframe wind, vectored-thrust downwash and damaged compressor flutter.
      this.jetOsc1.connect(this.jetCoreGain);
      this.jetOsc2.connect(this.jetTurbineGain);
      this.jetNoiseNode.connect(this.jetFilter);
      this.jetFilter.connect(this.jetExhaustGain);
      this.jetNoiseNode.connect(this.jetWindFilter);
      this.jetWindFilter.connect(this.jetWindGain);
      this.jetOsc2.connect(this.jetDamageGain);
      this.jetNoiseNode.connect(this.vtolFilter);

      this.jetCoreGain.connect(this.jetGain);
      this.jetTurbineGain.connect(this.jetGain);
      this.jetExhaustGain.connect(this.jetGain);
      this.jetWindGain.connect(this.jetGain);
      this.jetDamageGain.connect(this.jetGain);
      this.vtolFilter.connect(this.vtolGain);

      const engineBus = this.getCategoryBus('ENGINE');
      if (engineBus) {
        this.jetGain.connect(engineBus);
        this.vtolGain.connect(engineBus);
      }

      this.jetOsc1.start();
      this.jetOsc2.start();
      this.jetNoiseNode.start();
      this.startBundledEngineLoops();
    } catch {
      // Audio autoplay safeguards
    }
  }

  public updateJetEngine(stateOrSpeed: EngineAudioState | number, vtolRatio = 0, isDamaged = false) {
    if (!this.ctx || !this.isEngineRunning || !this.jetOsc1 || !this.jetOsc2 || !this.jetFilter || !this.vtolGain) return;
    const now = this.ctx.currentTime;
    const state: EngineAudioState = typeof stateOrSpeed === 'number'
      ? { throttleRatio: stateOrSpeed, speedRatio: stateOrSpeed, vtolRatio, damageRatio: isDamaged ? 0.75 : 0 }
      : stateOrSpeed;
    const mix = calculatePegasusLayerMix(state);
    const flutter = mix.damageGain > 0 ? Math.sin(now * 23) * mix.damageGain * 42 : 0;

    this.jetOsc1.frequency.setTargetAtTime(mix.coreFrequency + flutter * 0.3, now, 0.08);
    this.jetOsc2.frequency.setTargetAtTime(mix.turbineFrequency + flutter, now, 0.08);
    this.jetFilter.frequency.setTargetAtTime(mix.exhaustCutoff, now, 0.08);
    this.jetWindFilter?.frequency.setTargetAtTime(mix.windCutoff, now, 0.1);
    this.jetCoreGain?.gain.setTargetAtTime(mix.coreGain, now, 0.08);
    this.jetTurbineGain?.gain.setTargetAtTime(mix.turbineGain, now, 0.08);
    this.jetExhaustGain?.gain.setTargetAtTime(mix.exhaustGain, now, 0.08);
    this.jetWindGain?.gain.setTargetAtTime(mix.windGain, now, 0.1);
    this.jetDamageGain?.gain.setTargetAtTime(mix.damageGain, now, 0.05);
    this.vtolGain.gain.setTargetAtTime(mix.vtolGain, now, 0.06);
    const throttle = Math.max(0, Math.min(1, state.throttleRatio));
    const speed = Math.max(0, Math.min(1, state.speedRatio));
    const vtol = Math.max(0, Math.min(1, state.vtolRatio));
    this.jetIdleSampleGain?.gain.setTargetAtTime((0.13 - throttle * 0.085) * (1 - vtol * 0.2), now, 0.14);
    this.jetPowerSampleGain?.gain.setTargetAtTime(0.025 + mix.exhaustGain * 0.52, now, 0.12);
    this.airframeWindSampleGain?.gain.setTargetAtTime(speed * speed * 0.13, now, 0.14);
    this.engineDamageSampleGain?.gain.setTargetAtTime(mix.damageGain * 0.86, now, 0.08);
    this.vtolSampleGain?.gain.setTargetAtTime(mix.vtolGain * 0.58, now, 0.08);
    this.jetIdleSampleNode?.playbackRate.setTargetAtTime(0.95 + throttle * 0.05, now, 0.14);
    this.jetPowerSampleNode?.playbackRate.setTargetAtTime(0.9 + throttle * 0.2, now, 0.12);
    this.airframeWindSampleNode?.playbackRate.setTargetAtTime(0.9 + speed * 0.18, now, 0.14);
    this.engineDamageSampleNode?.playbackRate.setTargetAtTime(0.96 + throttle * 0.08, now, 0.1);
    this.vtolSampleNode?.playbackRate.setTargetAtTime(0.92 + throttle * 0.12, now, 0.08);
  }

  public stopJetEngine() {
    if (!this.isEngineRunning) return;
    this.isEngineRunning = false;
    try {
      this.jetOsc1?.stop();
      this.jetOsc2?.stop();
      this.jetNoiseNode?.stop();
      this.jetIdleSampleNode?.stop();
      this.jetPowerSampleNode?.stop();
      this.airframeWindSampleNode?.stop();
      this.engineDamageSampleNode?.stop();
      this.vtolSampleNode?.stop();
      this.jetOsc1?.disconnect();
      this.jetOsc2?.disconnect();
      this.jetNoiseNode?.disconnect();
      this.jetIdleSampleNode?.disconnect();
      this.jetPowerSampleNode?.disconnect();
      this.airframeWindSampleNode?.disconnect();
      this.engineDamageSampleNode?.disconnect();
      this.vtolSampleNode?.disconnect();
    } catch {
      // ignore
    }
    this.jetOsc1 = null;
    this.jetOsc2 = null;
    this.jetNoiseNode = null;
    this.jetFilter = null;
    this.jetGain = null;
    this.jetCoreGain = null;
    this.jetTurbineGain = null;
    this.jetExhaustGain = null;
    this.jetWindGain = null;
    this.jetDamageGain = null;
    this.jetWindFilter = null;
    this.vtolGain = null;
    this.vtolFilter = null;
    this.jetIdleSampleNode = null;
    this.jetIdleSampleGain = null;
    this.jetPowerSampleNode = null;
    this.jetPowerSampleGain = null;
    this.airframeWindSampleNode = null;
    this.airframeWindSampleGain = null;
    this.engineDamageSampleNode = null;
    this.engineDamageSampleGain = null;
    this.vtolSampleNode = null;
    this.vtolSampleGain = null;
  }

  // --- WEAPON & COMBAT SFX ---

  public playLandingGearCycle(extending: boolean) {
    if (!this.ctx) return;
    if (this.playBundledSample('landing_gear', 'ENGINE', 0.42, extending ? 0.98 : 1.04)) return;
    const now = this.ctx.currentTime;
    const output = this.getCategoryBus('ENGINE');
    if (!output) return;
    const actuator = this.ctx.createOscillator();
    actuator.type = 'triangle';
    actuator.frequency.setValueAtTime(extending ? 230 : 165, now);
    actuator.frequency.exponentialRampToValueAtTime(extending ? 105 : 285, now + 0.38);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
    actuator.connect(gain);
    gain.connect(output);
    actuator.start(now);
    actuator.stop(now + 0.44);
  }

  public playCompressorStall() {
    if (!this.ctx) return;
    if (this.playBundledSample('compressor_stall', 'ENGINE', 0.58, 1)) return;
    const now = this.ctx.currentTime;
    const output = this.getCategoryBus('ENGINE');
    if (!output) return;
    const cough = this.ctx.createOscillator();
    cough.type = 'sawtooth';
    cough.frequency.setValueAtTime(118, now);
    cough.frequency.exponentialRampToValueAtTime(34, now + 0.26);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.48);
    cough.connect(gain);
    gain.connect(output);
    cough.start(now);
    cough.stop(now + 0.5);
  }

  public playNozzleTransition(vectoring: boolean) {
    if (!this.ctx) return;
    const playbackRate = vectoring ? 0.98 : 1.03;
    if (this.playBundledSample('nozzle_transition', 'ENGINE', 0.46, playbackRate)) return;

    // Short mechanical fallback keeps the transition readable if a sample
    // cannot be decoded or is deliberately omitted from a constrained build.
    const now = this.ctx.currentTime;
    const output = this.getCategoryBus('ENGINE');
    if (!output) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(vectoring ? 150 : 118, now);
    osc.frequency.exponentialRampToValueAtTime(vectoring ? 88 : 164, now + 0.34);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playCannon() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const layeredSample = this.playBundledSample('aden_cannon', 'WEAPONS', 0.56, 0.98 + Math.random() * 0.04);

    // Heavy punch oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(layeredSample ? 0.18 : 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    // High crack
    const noise = this.ctx.createBufferSource();
    if (this.whiteNoiseBuffer) {
      noise.buffer = this.whiteNoiseBuffer;
    }
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(layeredSample ? 0.12 : 0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.getCategoryBus('WEAPONS')!);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.getCategoryBus('WEAPONS')!);

    osc.start(now);
    osc.stop(now + 0.09);
    noise.start(now);
    noise.stop(now + 0.07);
  }

  public playMissileLaunch() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const layeredSample = this.playBundledSample('missile_launch', 'WEAPONS', 0.62, 0.97 + Math.random() * 0.05);
    this.playBundledSample('missile_flyby', 'WEAPONS', 0.32, 0.98 + Math.random() * 0.04, 0.12);

    // Rocket ignition whoosh
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(layeredSample ? 0.2 : 0.45, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    if (this.pinkNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.pinkNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + 0.35);
      
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(layeredSample ? 0.16 : 0.4, now);
      nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.getCategoryBus('WEAPONS')!);
      noise.start(now);
      noise.stop(now + 0.4);
    }

    osc.connect(gain);
    gain.connect(this.getCategoryBus('WEAPONS')!);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playRocketLaunch() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const layeredSample = this.playBundledSample('rocket_launch', 'WEAPONS', 0.58, 0.98 + Math.random() * 0.04);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.22);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(layeredSample ? 0.1 : 0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc.connect(gain);
    gain.connect(this.getCategoryBus('WEAPONS')!);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  public playAircraftGunHit() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const layeredSample = this.playBundledSample('aircraft_gun_hit', 'IMPACTS', 0.54, 0.97 + Math.random() * 0.05);
    if (layeredSample || !this.whiteNoiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getCategoryBus('IMPACTS')!);
    noise.start(now);
    noise.stop(now + 0.1);
  }

  public playArmourHit() {
    this.playBundledSample('ground_armour_hit', 'IMPACTS', 0.48, 0.97 + Math.random() * 0.05);
  }

  public playSurfaceImpact(surface: 'GROUND' | 'WATER') {
    const id = surface === 'WATER' ? 'water_impact' : 'ground_soft_hit';
    this.playBundledSample(id, 'IMPACTS', surface === 'WATER' ? 0.46 : 0.42, 0.97 + Math.random() * 0.05);
  }

  public playAircraftBreakup() {
    if (!this.playBundledSample('aircraft_breakup', 'IMPACTS', 0.58, 0.98 + Math.random() * 0.04)) {
      this.playExplosion('MEDIUM');
    }
  }

  public playAircraftCrash(surface: 'GROUND' | 'WATER') {
    const id = surface === 'WATER' ? 'aircraft_sea_crash' : 'aircraft_ground_crash';
    if (!this.playBundledSample(id, 'IMPACTS', surface === 'WATER' ? 0.64 : 0.68, 0.98 + Math.random() * 0.03)) {
      this.playSurfaceImpact(surface);
      this.playExplosion('LARGE');
    }
  }

  public playFuelCookoff() {
    if (!this.playBundledSample('fuel_cookoff', 'IMPACTS', 0.66, 0.99 + Math.random() * 0.02)) {
      this.playExplosion('COLOSSAL');
    }
  }

  public playCountermeasure() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const layeredSample = this.playBundledSample('countermeasure', 'WEAPONS', 0.46, 0.98 + Math.random() * 0.04);
    if (!this.whiteNoiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1900, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(layeredSample ? 0.08 : 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getCategoryBus('WEAPONS')!);
    noise.start(now);
    noise.stop(now + 0.17);
  }

  public playBombRelease() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const layeredSample = this.playBundledSample('bomb_release', 'WEAPONS', 0.52, 1);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(layeredSample ? 0.1 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.getCategoryBus('WEAPONS')!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playExplosion(intensity: 'SMALL' | 'MEDIUM' | 'LARGE' | 'COLOSSAL') {
    if (!this.ctx || !this.sfxGain || !this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const sampleId = intensity === 'SMALL' ? 'explosion_small' : intensity === 'MEDIUM' ? 'explosion_medium' : 'explosion_large';
    const sampleGain = intensity === 'COLOSSAL' ? 0.72 : intensity === 'LARGE' ? 0.56 : intensity === 'MEDIUM' ? 0.54 : 0.46;
    const layeredSample = this.playBundledSample(sampleId, 'IMPACTS', sampleGain, intensity === 'MEDIUM' ? 1.02 : intensity === 'SMALL' ? 1.04 : 0.94);
    const duration = intensity === 'COLOSSAL' ? 1.4 : intensity === 'LARGE' ? 0.9 : intensity === 'MEDIUM' ? 0.6 : 0.35;
    const volume = intensity === 'COLOSSAL' ? 0.8 : intensity === 'LARGE' ? 0.6 : intensity === 'MEDIUM' ? 0.45 : 0.3;

    // Sub-bass thud
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + duration * 0.7);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(volume * (layeredSample ? 0.42 : 0.8), now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.8);

    osc.connect(oscGain);
    oscGain.connect(this.getCategoryBus('IMPACTS')!);
    osc.start(now);
    osc.stop(now + duration * 0.8);

    // Billowing noise explosion
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.pinkNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(intensity === 'COLOSSAL' ? 600 : 1200, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * (layeredSample ? 0.48 : 1), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.getCategoryBus('IMPACTS')!);

    noise.start(now);
    noise.stop(now + duration);
  }

  public playLockOnBeep(locked: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    if (locked && this.playBundledSample('target_lock', 'WARNINGS', 0.68, 1)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(locked ? 1500 : 950, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (locked ? 0.15 : 0.06));

    osc.connect(gain);
    gain.connect(this.getCategoryBus('WARNINGS')!);
    osc.start(now);
    osc.stop(now + (locked ? 0.16 : 0.07));
  }

  public playMissileWarning() {
    this.playThreatWarning('MISSILE');
  }

  public playLowFuelWarning() {
    if (!this.ctx) return;
    this.playBundledSample('low_fuel', 'WARNINGS', 0.64, 1);
  }

  public playThreatWarning(kind: 'RADAR' | 'FIGHTER' | 'MISSILE') {
    if (!this.ctx || !this.sfxGain) return;
    this.applyPriorityDucking('WARNING');
    const now = this.ctx.currentTime;
    const sampleId = kind === 'RADAR' ? 'radar_search' : kind === 'FIGHTER' ? 'radar_track' : 'missile_warning';
    const layeredSample = this.playBundledSample(sampleId, 'WARNINGS', kind === 'MISSILE' ? 0.48 : kind === 'RADAR' ? 0.42 : 0.4, 1);
    const osc = this.ctx.createOscillator();
    osc.type = kind === 'RADAR' ? 'square' : 'sawtooth';
    const low = kind === 'MISSILE' ? 650 : kind === 'FIGHTER' ? 520 : 760;
    const high = kind === 'MISSILE' ? 920 : kind === 'FIGHTER' ? 680 : 1120;
    osc.frequency.setValueAtTime(low, now);
    osc.frequency.setValueAtTime(high, now + 0.07);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime((kind === 'MISSILE' ? 0.3 : 0.2) * (layeredSample ? 0.42 : 1), now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    osc.connect(gain);
    gain.connect(this.getCategoryBus('WARNINGS')!);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playShipWeapon(kind: 'NAVAL_GUN' | 'MISSILE' = 'NAVAL_GUN') {
    if (!this.ctx || !this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const output = this.getCategoryBus('WEAPONS');
    if (!output) return;
    const layeredSample = this.playBundledSample(kind === 'NAVAL_GUN' ? 'ship_weapon' : 'ship_missile', 'WEAPONS', kind === 'NAVAL_GUN' ? 0.62 : 0.72, kind === 'NAVAL_GUN' ? 0.96 + Math.random() * 0.05 : 1);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(kind === 'MISSILE' ? 150 : 92, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'MISSILE' ? 520 : 28, now + (kind === 'MISSILE' ? 0.34 : 0.22));
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(kind === 'MISSILE' ? (layeredSample ? 0.1 : 0.28) : layeredSample ? 0.14 : 0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (kind === 'MISSILE' ? 0.38 : 0.24));
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.pinkNoiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = kind === 'MISSILE' ? 'bandpass' : 'lowpass';
    noiseFilter.frequency.setValueAtTime(kind === 'MISSILE' ? 1300 : 580, now);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(kind === 'MISSILE' ? (layeredSample ? 0.08 : 0.24) : layeredSample ? 0.1 : 0.34, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.36);
    osc.connect(gain);
    gain.connect(output);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(output);
    osc.start(now);
    osc.stop(now + 0.4);
    noise.start(now);
    noise.stop(now + 0.4);
  }

  public playFlakBurst() {
    if (!this.ctx || !this.sfxGain || !this.whiteNoiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getCategoryBus('IMPACTS')!);
    noise.start(now);
    noise.stop(now + 0.2);
  }

  public playTouchdown(grade: 'PERFECT' | 'SAFE' | 'HARD' | 'FAILED') {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const layeredSample = this.playBundledSample('carrier_touchdown', 'IMPACTS', grade === 'HARD' || grade === 'FAILED' ? 0.7 : 0.5, grade === 'PERFECT' ? 1.04 : grade === 'SAFE' ? 1 : 0.92);

    // Tire squeal
    if (this.whiteNoiseBuffer && grade !== 'FAILED') {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.whiteNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.Q.setValueAtTime(6.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(layeredSample ? 0.08 : 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getCategoryBus('IMPACTS')!);
      noise.start(now);
      noise.stop(now + 0.35);
    }

    // Arresting wire snap / jolt
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(layeredSample ? 0.16 : 0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(oscGain);
    oscGain.connect(this.getCategoryBus('IMPACTS')!);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playEjectionSeat() {
    if (!this.ctx) return;
    this.applyPriorityDucking('WARNING');
    if (!this.playBundledSample('ejection_seat', 'IMPACTS', 0.82, 1)) this.playExplosion('SMALL');
  }

  public playEjectionCanopy() {
    if (!this.ctx) return;
    this.applyPriorityDucking('WARNING');
    this.playBundledSample('ejection_canopy', 'IMPACTS', 0.8, 1);
  }

  public playParachuteOpen() {
    if (!this.ctx) return;
    this.playBundledSample('parachute_open', 'IMPACTS', 0.68, 1);
  }

  public playShipSinking() {
    if (!this.ctx) return;
    this.playBundledSample('ship_sinking', 'IMPACTS', 0.7, 1);
  }

  public playMasterDamageWarning() {
    if (!this.ctx) return;
    this.applyPriorityDucking('WARNING');
    this.playBundledSample('master_damage', 'WARNINGS', 0.82, 1);
  }

  public playObjectiveComplete() {
    if (!this.ctx) return;
    this.playBundledSample('objective_complete', 'INTERFACE', 0.72, 1);
  }

  public playThunder() {
    if (!this.ctx) return;
    this.playBundledSample('thunder_distant', 'AMBIENCE', 0.58, 0.98 + Math.random() * 0.04);
  }

  public startServiceAmbience(siteType: 'CARRIER' | 'FORWARD_BASE') {
    if (!this.ctx || this.serviceAmbienceNode) return;
    const buffer = this.sampleBuffers.get(siteType === 'CARRIER' ? 'carrier_deck_ambience' : 'farp_ambience');
    const output = this.getCategoryBus('AMBIENCE');
    if (!buffer || !output) return;
    this.serviceAmbienceNode = this.ctx.createBufferSource();
    this.serviceAmbienceNode.buffer = buffer;
    this.serviceAmbienceNode.loop = true;
    this.serviceAmbienceGain = this.ctx.createGain();
    this.serviceAmbienceGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
    this.serviceAmbienceNode.connect(this.serviceAmbienceGain);
    this.serviceAmbienceGain.connect(output);
    this.serviceAmbienceNode.start();
  }

  public stopServiceAmbience() {
    try {
      this.serviceAmbienceNode?.stop();
      this.serviceAmbienceNode?.disconnect();
      this.serviceAmbienceGain?.disconnect();
    } catch {
      // The source may already have been stopped during a state transition.
    }
    this.serviceAmbienceNode = null;
    this.serviceAmbienceGain = null;
  }

  public playUIClick() {
    if (!this.ctx) this.init();
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    if (this.desiredMusicCue && !this.musicSampleNode) void this.playAuthoredMusic(this.desiredMusicCue);
    if (this.playBundledSample('ui_confirm', 'INTERFACE', 0.62, 1)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    osc.connect(gain);
    gain.connect(this.getCategoryBus('INTERFACE')!);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playUICancel() {
    if (!this.ctx || !this.sfxGain) return;
    if (this.playBundledSample('ui_cancel', 'INTERFACE', 0.6, 1)) return;
    this.playUIClick();
  }

  // --- RADIO COMMS CHATTER ---
  private applyPriorityDucking(kind: 'WARNING' | 'RADIO') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const profile = PRIORITY_DUCKING[kind];
    const engine = this.getCategoryBus('ENGINE');
    const weapons = this.getCategoryBus('WEAPONS');
    const impacts = this.getCategoryBus('IMPACTS');
    const ambience = this.getCategoryBus('AMBIENCE');
    engine?.gain.cancelScheduledValues(now);
    weapons?.gain.cancelScheduledValues(now);
    impacts?.gain.cancelScheduledValues(now);
    ambience?.gain.cancelScheduledValues(now);
    this.musicGain?.gain.cancelScheduledValues(now);
    engine?.gain.setTargetAtTime(profile.engine, now, 0.025);
    weapons?.gain.setTargetAtTime(profile.weapons, now, 0.025);
    impacts?.gain.setTargetAtTime(profile.impacts, now, 0.025);
    ambience?.gain.setTargetAtTime(profile.ambience, now, 0.025);
    this.musicGain?.gain.setTargetAtTime(this.musicVol * profile.music, now, 0.025);
    engine?.gain.setTargetAtTime(MIXER_BASE_GAINS.ENGINE, now + profile.seconds, 0.18);
    weapons?.gain.setTargetAtTime(MIXER_BASE_GAINS.WEAPONS, now + profile.seconds, 0.18);
    impacts?.gain.setTargetAtTime(MIXER_BASE_GAINS.IMPACTS, now + profile.seconds, 0.18);
    ambience?.gain.setTargetAtTime(MIXER_BASE_GAINS.AMBIENCE, now + profile.seconds, 0.18);
    this.musicGain?.gain.setTargetAtTime(this.musicVol, now + profile.seconds, 0.18);
  }

  private playRadioChirp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const output = this.getCategoryBus('RADIO');
    if (!output) return;
    const layeredSample = this.playBundledSample('radio_squelch_in', 'RADIO', 0.62, 1)
      || this.playBundledSample('radio_call', 'RADIO', 0.38, 1);
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1080, now);
    osc.frequency.setValueAtTime(760, now + 0.045);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(layeredSample ? 0.025 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.085);
    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public setMissionContext(missionId: string | null) {
    this.missionId = missionId;
    this.syncCoastalSurf();
  }

  public playMissionRadio(moment: MissionRadioMoment): boolean {
    if (!this.missionId) return false;
    const call = getMissionRadioCall(this.missionId, moment);
    if (!call) return false;
    this.playRadioCall(formatRadioCaption(call));
    return true;
  }

  public playRadioCall(phrase: string) {
    // Captions are emitted even when sound or browser speech is disabled.
    this.onRadioCall?.(phrase);
    if (!this.voiceEnabled) return;
    this.applyPriorityDucking('RADIO');
    this.playRadioChirp();
    if (typeof window === 'undefined') return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 1.25;
        utterance.pitch = 0.9;
        utterance.volume = this.masterVol * 0.9;
        utterance.onend = () => this.playBundledSample('radio_squelch_out', 'RADIO', 0.6, 1);
        utterance.onerror = () => this.playBundledSample('radio_squelch_out', 'RADIO', 0.6, 1);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // voice fallback
    }
  }

  // --- AUTHORED MUSIC WITH PROCEDURAL OFFLINE FALLBACK ---
  public setMusicScene(scene: 'MENU' | 'BRIEFING' | 'GAMEPLAY' | 'VICTORY' | 'LOSS' | 'SERVICING') {
    this.gameplayMusicActive = scene === 'GAMEPLAY';
    const cue: MusicCueId | null = scene === 'BRIEFING'
      ? 'briefing_intelligence'
      : scene === 'GAMEPLAY'
        ? selectGameplayMusic(this.missionId, this.combatIntensity, this.recoveryMusicActive)
        : scene === 'VICTORY'
          ? 'debrief_victory'
          : scene === 'LOSS'
            ? 'debrief_loss'
            : scene === 'SERVICING'
              ? 'servicing_turnaround'
              : null;
    this.desiredMusicCue = cue;
    if (cue) void this.playAuthoredMusic(cue);
    else this.stopMusic();
  }

  public startMusic(carrierLaunch = false) {
    this.gameplayMusicActive = true;
    this.recoveryMusicActive = false;
    const cue: MusicCueId = carrierLaunch
      ? 'carrier_launch'
      : selectGameplayMusic(this.missionId, this.combatIntensity, false);
    this.desiredMusicCue = cue;
    if (this.ctx) void this.playAuthoredMusic(cue);
  }

  private async loadMusicBuffer(cue: MusicCueId): Promise<AudioBuffer | null> {
    const cached = this.musicBuffers.get(cue);
    if (cached) return cached;
    if (!this.ctx) return null;
    const definition = MUSIC_CUE_DEFINITIONS[cue];
    try {
      const response = await fetch(definition.path);
      if (!response.ok || !this.ctx) return null;
      const decoded = await this.ctx.decodeAudioData(await response.arrayBuffer());
      this.musicBuffers.set(cue, decoded);
      return decoded;
    } catch {
      return null;
    }
  }

  private async playAuthoredMusic(cue: MusicCueId) {
    this.desiredMusicCue = cue;
    if (!this.ctx || !this.musicGain) return;
    if (this.currentMusicCue === cue && this.musicSampleNode) return;
    const token = ++this.musicRequestToken;
    const buffer = await this.loadMusicBuffer(cue);
    if (token !== this.musicRequestToken || this.desiredMusicCue !== cue || !this.ctx || !this.musicGain) return;
    if (!buffer) {
      this.startProceduralMusic();
      return;
    }

    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    const now = this.ctx.currentTime;
    const previousNode = this.musicSampleNode;
    const previousGain = this.musicSampleGain;
    if (previousNode && previousGain) {
      previousNode.onended = null;
      previousGain.gain.cancelScheduledValues(now);
      previousGain.gain.setValueAtTime(previousGain.gain.value, now);
      previousGain.gain.linearRampToValueAtTime(0.0001, now + 0.45);
      try { previousNode.stop(now + 0.46); } catch { /* Already stopped. */ }
    }

    const definition = MUSIC_CUE_DEFINITIONS[cue];
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = definition.loop;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(definition.gain, now + 0.7);
    source.connect(gain);
    gain.connect(this.musicGain);
    source.onended = () => {
      if (this.musicSampleNode !== source) return;
      source.disconnect();
      gain.disconnect();
      this.musicSampleNode = null;
      this.musicSampleGain = null;
      this.currentMusicCue = null;
      this.isMusicPlaying = false;
      if (cue === 'carrier_launch' && this.gameplayMusicActive) {
        const next = selectGameplayMusic(this.missionId, this.combatIntensity, this.recoveryMusicActive);
        this.desiredMusicCue = next;
        void this.playAuthoredMusic(next);
      }
    };
    this.musicSampleNode = source;
    this.musicSampleGain = gain;
    this.currentMusicCue = cue;
    this.isMusicPlaying = true;
    source.start(now);
  }

  private startProceduralMusic() {
    if (this.isMusicPlaying || !this.ctx) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    // 130 BPM = 16th note step every 115ms
    const stepTimeMs = 115;
    this.musicIntervalId = window.setInterval(() => {
      this.tickMusicSequencer();
    }, stepTimeMs);
  }

  public setCombatIntensity(intensity: number) {
    this.combatIntensity = Math.max(1.0, Math.min(3.0, intensity));
    if (!this.gameplayMusicActive || this.currentMusicCue === 'carrier_launch' || this.recoveryMusicActive) return;
    const next = selectGameplayMusic(this.missionId, this.combatIntensity, false);
    if (next !== this.desiredMusicCue) void this.playAuthoredMusic(next);
  }

  public setRecoveryMusic(active: boolean) {
    if (this.recoveryMusicActive === active) return;
    this.recoveryMusicActive = active;
    if (!this.gameplayMusicActive || this.currentMusicCue === 'carrier_launch') return;
    const next = selectGameplayMusic(this.missionId, this.combatIntensity, active);
    if (next !== this.desiredMusicCue) void this.playAuthoredMusic(next);
  }

  private tickMusicSequencer() {
    if (!this.ctx || !this.musicGain || !this.isMusicPlaying) return;
    const now = this.ctx.currentTime;
    const step = this.musicStep % 16;
    this.musicStep++;

    // Bassline notes (F minor / Eb / Db progression)
    // F1 = 43.65, Ab1 = 51.91, Bb1 = 58.27, C2 = 65.41
    const chordPattern = Math.floor((this.musicStep / 32) % 4);
    const roots = [43.65, 38.89, 34.65, 43.65]; // F, Eb, Db, F
    const root = roots[chordPattern];

    // Driving 16th bass arpeggio
    if (step % 2 === 0 || this.combatIntensity > 1.8) {
      const bassOsc = this.ctx.createOscillator();
      bassOsc.type = 'sawtooth';
      
      const octave = (step % 4 === 2) ? 2 : 1;
      const noteFreq = root * octave;
      bassOsc.frequency.setValueAtTime(noteFreq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350 + this.combatIntensity * 280, now);
      filter.Q.setValueAtTime(2.5, now);

      const bassGain = this.ctx.createGain();
      bassGain.gain.setValueAtTime(0.22, now);
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      bassOsc.connect(filter);
      filter.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(now);
      bassOsc.stop(now + 0.11);
    }

    // Drum beat: Kick on 0, 4, 8, 12; Snare on 4, 12
    if (step === 0 || step === 8 || (this.combatIntensity > 2.0 && (step === 4 || step === 12))) {
      // Electronic Kick
      const kickOsc = this.ctx.createOscillator();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(130, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.09);

      const kickGain = this.ctx.createGain();
      kickGain.gain.setValueAtTime(0.4, now);
      kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.1);
    }

    if (step === 4 || step === 12) {
      // Snare / Flak rimshot
      if (this.whiteNoiseBuffer) {
        const snareNoise = this.ctx.createBufferSource();
        snareNoise.buffer = this.whiteNoiseBuffer;
        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.setValueAtTime(1400, now);

        const snareGain = this.ctx.createGain();
        snareGain.gain.setValueAtTime(0.22, now);
        snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        snareNoise.connect(snareFilter);
        snareFilter.connect(snareGain);
        snareGain.connect(this.musicGain);
        snareNoise.start(now);
        snareNoise.stop(now + 0.13);
      }
    }

    // High Hat on 8th notes
    if (step % 2 === 1 && this.whiteNoiseBuffer) {
      const hat = this.ctx.createBufferSource();
      hat.buffer = this.whiteNoiseBuffer;
      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.setValueAtTime(6000, now);

      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.08, now);
      hatGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

      hat.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(this.musicGain);
      hat.start(now);
      hat.stop(now + 0.05);
    }

    // Arp synth lead on high combat intensity
    if (this.combatIntensity > 1.5 && (step % 4 === 0 || step % 4 === 3)) {
      const leadOsc = this.ctx.createOscillator();
      leadOsc.type = 'triangle';
      const arpNotes = [ root * 4, root * 4.76, root * 5.96, root * 7.13 ];
      const note = arpNotes[(step + chordPattern) % arpNotes.length];
      leadOsc.frequency.setValueAtTime(note, now);

      const leadGain = this.ctx.createGain();
      leadGain.gain.setValueAtTime(0.12, now);
      leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      leadOsc.connect(leadGain);
      leadGain.connect(this.musicGain);
      leadOsc.start(now);
      leadOsc.stop(now + 0.15);
    }
  }

  public stopMusic() {
    this.musicRequestToken++;
    this.desiredMusicCue = null;
    this.gameplayMusicActive = false;
    this.recoveryMusicActive = false;
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    const source = this.musicSampleNode;
    const gain = this.musicSampleGain;
    this.musicSampleNode = null;
    this.musicSampleGain = null;
    this.currentMusicCue = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* Already stopped. */ }
      source.disconnect();
    }
    gain?.disconnect();
  }

  public stopAll() {
    this.stopJetEngine();
    this.stopMusic();
    this.stopAmbience();
    this.stopServiceAmbience();
  }
}

export const soundEngine = new SoundEngine();

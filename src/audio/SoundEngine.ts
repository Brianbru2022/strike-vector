import { AudioCueDefinition, AudioMixerCategory, EngineAudioState, MissionRadioMoment, WeatherEffect } from '../types/game';
import { calculatePegasusLayerMix, MIXER_BASE_GAINS, PRIORITY_DUCKING } from './AudioMix';
import { formatRadioCaption, getMissionRadioCall } from './RadioProduction';

/**
 * IRON KESTREL '87 - Layered Offline Audio Engine
 * Authored bundled recordings reinforce procedural flight-state layers,
 * tactical radio, priority warnings and adaptive combat music.
 */

export const AUDIO_CUE_DEFINITIONS: Readonly<Record<string, AudioCueDefinition>> = Object.freeze({
  jet_engine: { id: 'jet_engine', category: 'ENGINE', gain: 0.78, playbackRateMin: 0.78, playbackRateMax: 1.28, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/pegasus-engine-loop-v2.wav', loop: true },
  vtol_thrust: { id: 'vtol_thrust', category: 'ENGINE', gain: 0.7, playbackRateMin: 0.9, playbackRateMax: 1.12, maximumVoices: 1, priority: 'BACKGROUND', samplePath: '/assets/audio/vtol-downwash-loop-v1.wav', loop: true },
  nozzle_transition: { id: 'nozzle_transition', category: 'ENGINE', gain: 0.62, playbackRateMin: 0.96, playbackRateMax: 1.04, maximumVoices: 1, priority: 'STANDARD', samplePath: '/assets/audio/elevenlabs/nozzle-transition-v1.wav' },
  aden_cannon: { id: 'aden_cannon', category: 'WEAPONS', gain: 0.86, playbackRateMin: 0.96, playbackRateMax: 1.04, maximumVoices: 4, samplePath: '/assets/audio/aden-cannon-v1.wav' },
  missile_launch: { id: 'missile_launch', category: 'WEAPONS', gain: 0.9, playbackRateMin: 0.94, playbackRateMax: 1.06, maximumVoices: 3, samplePath: '/assets/audio/sidewinder-motor-v1.wav' },
  rocket_launch: { id: 'rocket_launch', category: 'WEAPONS', gain: 0.82, playbackRateMin: 0.95, playbackRateMax: 1.06, maximumVoices: 3, samplePath: '/assets/audio/rocket-motor-v1.wav' },
  bomb_release: { id: 'bomb_release', category: 'WEAPONS', gain: 0.72, playbackRateMin: 0.97, playbackRateMax: 1.03, maximumVoices: 2, samplePath: '/assets/audio/bomb-release-v1.wav' },
  countermeasure: { id: 'countermeasure', category: 'WEAPONS', gain: 0.7, playbackRateMin: 0.96, playbackRateMax: 1.04, maximumVoices: 2, samplePath: '/assets/audio/flare-eject-v1.wav' },
  combat_impact: { id: 'combat_impact', category: 'IMPACTS', gain: 0.88, playbackRateMin: 0.9, playbackRateMax: 1.08, maximumVoices: 6, samplePath: '/assets/audio/heavy-impact-v1.wav' },
  ship_weapon: { id: 'ship_weapon', category: 'WEAPONS', gain: 0.88, playbackRateMin: 0.88, playbackRateMax: 1.05, maximumVoices: 4, priority: 'STANDARD', samplePath: '/assets/audio/naval-gun-v1.wav' },
  carrier_touchdown: { id: 'carrier_touchdown', category: 'IMPACTS', gain: 0.78, playbackRateMin: 0.9, playbackRateMax: 1.05, maximumVoices: 2, samplePath: '/assets/audio/carrier-touchdown-v1.wav' },
  missile_warning: { id: 'missile_warning', category: 'WARNINGS', gain: 1, playbackRateMin: 0.9, playbackRateMax: 1.3, maximumVoices: 2, priority: 'CRITICAL', duckingSeconds: 0.5, samplePath: '/assets/audio/threat-warning-v1.wav' },
  north_atlantic_wind: { id: 'north_atlantic_wind', category: 'AMBIENCE', gain: 0.44, playbackRateMin: 0.82, playbackRateMax: 1.18, maximumVoices: 1, samplePath: '/assets/audio/north-atlantic-wind-v1.wav', loop: true },
  radio_call: { id: 'radio_call', category: 'RADIO', gain: 0.98, playbackRateMin: 1, playbackRateMax: 1, maximumVoices: 1, priority: 'CRITICAL', duckingSeconds: 1.8, samplePath: '/assets/audio/radio-chirp-v1.wav' },
  ui_confirm: { id: 'ui_confirm', category: 'INTERFACE', gain: 0.64, playbackRateMin: 0.98, playbackRateMax: 1.02, maximumVoices: 2 },
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
  private jetSampleNode: AudioBufferSourceNode | null = null;
  private jetSampleGain: GainNode | null = null;
  private vtolSampleNode: AudioBufferSourceNode | null = null;
  private vtolSampleGain: GainNode | null = null;
  private isEngineRunning = false;

  // Music sequencer
  private isMusicPlaying = false;
  private musicStep = 0;
  private musicIntervalId: number | null = null;
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
  }

  private playBundledSample(id: string, category: AudioMixerCategory, gainValue: number, playbackRate = 1): boolean {
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
    source.start();
    return true;
  }

  private startBundledEngineLoops() {
    if (!this.ctx || !this.isEngineRunning) return;
    const output = this.getCategoryBus('ENGINE');
    if (!output) return;
    if (!this.jetSampleNode) {
      const buffer = this.sampleBuffers.get('jet_engine');
      if (buffer) {
        this.jetSampleNode = this.ctx.createBufferSource();
        this.jetSampleNode.buffer = buffer;
        this.jetSampleNode.loop = true;
        this.jetSampleGain = this.ctx.createGain();
        this.jetSampleGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.jetSampleNode.connect(this.jetSampleGain);
        this.jetSampleGain.connect(output);
        this.jetSampleNode.start();
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
      this.weatherNode.buffer = this.whiteNoiseBuffer;
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
    this.jetSampleGain?.gain.setTargetAtTime(0.045 + mix.exhaustGain * 0.42, now, 0.12);
    this.vtolSampleGain?.gain.setTargetAtTime(mix.vtolGain * 0.58, now, 0.08);
  }

  public stopJetEngine() {
    if (!this.isEngineRunning) return;
    this.isEngineRunning = false;
    try {
      this.jetOsc1?.stop();
      this.jetOsc2?.stop();
      this.jetNoiseNode?.stop();
      this.jetSampleNode?.stop();
      this.vtolSampleNode?.stop();
      this.jetOsc1?.disconnect();
      this.jetOsc2?.disconnect();
      this.jetNoiseNode?.disconnect();
      this.jetSampleNode?.disconnect();
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
    this.jetSampleNode = null;
    this.jetSampleGain = null;
    this.vtolSampleNode = null;
    this.vtolSampleGain = null;
  }

  // --- WEAPON & COMBAT SFX ---

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
    const layeredSample = intensity === 'SMALL' ? false : this.playBundledSample('combat_impact', 'IMPACTS', intensity === 'COLOSSAL' ? 0.72 : 0.5, intensity === 'MEDIUM' ? 1.08 : 0.94);
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

  public playThreatWarning(kind: 'RADAR' | 'FIGHTER' | 'MISSILE') {
    if (!this.ctx || !this.sfxGain) return;
    this.applyPriorityDucking('WARNING');
    const now = this.ctx.currentTime;
    const layeredSample = this.playBundledSample('missile_warning', 'WARNINGS', kind === 'MISSILE' ? 0.48 : 0.34, kind === 'MISSILE' ? 1.12 : kind === 'FIGHTER' ? 0.92 : 1.28);
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
    const layeredSample = kind === 'NAVAL_GUN' && this.playBundledSample('ship_weapon', 'WEAPONS', 0.62, 0.96 + Math.random() * 0.05);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(kind === 'MISSILE' ? 150 : 92, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'MISSILE' ? 520 : 28, now + (kind === 'MISSILE' ? 0.34 : 0.22));
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(kind === 'MISSILE' ? 0.28 : layeredSample ? 0.14 : 0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (kind === 'MISSILE' ? 0.38 : 0.24));
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.pinkNoiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = kind === 'MISSILE' ? 'bandpass' : 'lowpass';
    noiseFilter.frequency.setValueAtTime(kind === 'MISSILE' ? 1300 : 580, now);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(kind === 'MISSILE' ? 0.24 : layeredSample ? 0.1 : 0.34, now);
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

  public playUIClick() {
    if (!this.ctx || !this.sfxGain) return;
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
    const layeredSample = this.playBundledSample('radio_call', 'RADIO', 0.38, 1);
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
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // voice fallback
    }
  }

  // --- DYNAMIC ADAPTIVE RETRO-SYNTH MUSIC GENERATOR ---
  public startMusic() {
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
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  public stopAll() {
    this.stopJetEngine();
    this.stopMusic();
    this.stopAmbience();
  }
}

export const soundEngine = new SoundEngine();

import React, { useState } from 'react';
import { X, Volume2, Monitor } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { CampaignSave, CombatZoomPreset, DifficultyPreset, HudScalePreset, InputDevice, PerformanceSnapshot, RenderQualityPreference } from '../types/game';
import { ControlBindingsPanel } from './ControlBindingsPanel';
import { OfflineStatusPanel } from './OfflineStatusPanel';
import { SupportPanel } from './SupportPanel';
import { DEMO_BUILD, INTERNAL_TOOLS_COMPILED, ITCH_BUILD, RELEASE_FEATURES } from '../game/ReleaseFeatures';
import { SaveManagementPanel } from './SaveManagementPanel';
import { getPlatformKind, isPlatformFullscreen, setPlatformFullscreen } from '../game/PlatformRuntime';
import { DemoTransferImportPanel } from './DemoTransferImportPanel';

const DiagnosticsPanel = INTERNAL_TOOLS_COMPILED
  ? React.lazy(() => import('./DiagnosticsPanel').then((module) => ({ default: module.DiagnosticsPanel })))
  : null;

interface OptionsMenuProps {
  crtEnabled: boolean;
  onToggleCrt: (enabled: boolean) => void;
  onClose: () => void;
  campaign: CampaignSave;
  onCampaignChange: (save: CampaignSave) => void;
  performance: PerformanceSnapshot | null;
  onPreserveLocalState: () => void;
  inputDevice: InputDevice;
  onSaveImported: () => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  crtEnabled,
  onToggleCrt,
  onClose,
  campaign,
  onCampaignChange,
  performance,
  onPreserveLocalState,
  inputDevice,
  onSaveImported,
}) => {
  const [masterVol, setMasterVol] = useState(soundEngine.getMasterVolume());
  const [sfxVol, setSfxVol] = useState(soundEngine.getSfxVolume());
  const [musicVol, setMusicVol] = useState(soundEngine.getMusicVolume());
  const [radioEnabled, setRadioEnabled] = useState(soundEngine.isRadioEnabled());
  const [fullscreen, setFullscreen] = useState(false);

  React.useEffect(() => { void isPlatformFullscreen().then(setFullscreen); }, []);

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVol(val);
    soundEngine.setMasterVolume(val);
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVol(val);
    soundEngine.setSfxVolume(val);
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMusicVol(val);
    soundEngine.setMusicVolume(val);
  };

  const handleRadioToggle = () => {
    const next = !radioEnabled;
    setRadioEnabled(next);
    soundEngine.setRadioEnabled(next);
    soundEngine.playUIClick();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md font-mono-tech select-none">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-cyan-500/50 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="bg-zinc-950 border-b border-cyan-500/30 p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-display font-black text-lg tracking-wider">
            <Monitor className="w-5 h-5 text-cyan-400" />
            <span>SYSTEM & AUDIO CONFIGURATION</span>
          </div>
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliders & Toggles */}
        <div className="flex flex-col gap-5 overflow-y-auto p-6 text-xs">
          {/* Master Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-zinc-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" /> MASTER VOLUME
              </span>
              <span className="text-cyan-400">{Math.round(masterVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVol}
              onChange={handleMasterChange}
              className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
          </div>

          {/* SFX Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-zinc-300 font-bold">
              <span>SFX VOLUME (ENGINES / EXPLOSIONS)</span>
              <span className="text-cyan-400">{Math.round(sfxVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVol}
              onChange={handleSfxChange}
              className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
          </div>

          {/* Music Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-zinc-300 font-bold">
              <span>MUSIC VOLUME (ADAPTIVE RETRO SYNTH)</span>
              <span className="text-cyan-400">{Math.round(musicVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVol}
              onChange={handleMusicChange}
              className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
          </div>

          {/* Radio Comms Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="text-zinc-300 font-bold">TACTICAL RADIO CALLS</span>
            <button
              onClick={handleRadioToggle}
              className={`px-3 py-1 rounded text-xs font-bold transition border ${
                radioEnabled
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {radioEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          {/* CRT Arcade Scanline Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-zinc-300 font-bold">
              FLIGHT MODEL
              <select
                value={campaign.difficulty}
                onChange={(event) => onCampaignChange({ ...campaign, difficulty: event.target.value as DifficultyPreset })}
                className="rounded border border-emerald-500/40 bg-zinc-950 px-2 py-2 text-emerald-300"
              >
                <option value="ARCADE">ARCADE</option>
                <option value="PILOT">PILOT</option>
                <option value="VETERAN">VETERAN</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-zinc-300 font-bold">
              RENDER QUALITY
              <select
                value={campaign.renderQuality}
                onChange={(event) => onCampaignChange({ ...campaign, renderQuality: event.target.value as RenderQualityPreference })}
                className="rounded border border-emerald-500/40 bg-zinc-950 px-2 py-2 text-emerald-300"
              >
                <option value="AUTO">AUTO / ADAPTIVE</option>
                <option value="LOW">LOW / 30 FPS</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH / 60 FPS</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-zinc-300 font-bold">
            TOUCH CONTROL SIZE: {Math.round(campaign.controlScale * 100)}%
            <input type="range" min="0.8" max="1.3" step="0.1" value={campaign.controlScale} onChange={(event) => onCampaignChange({ ...campaign, controlScale: Number(event.target.value) })} className="accent-emerald-500" />
          </label>

          <label className="flex flex-col gap-1.5 text-zinc-300 font-bold">
            TOUCH CONTROL OPACITY: {Math.round(campaign.controlOpacity * 100)}%
            <input type="range" min="0.45" max="1" step="0.05" value={campaign.controlOpacity} onChange={(event) => onCampaignChange({ ...campaign, controlOpacity: Number(event.target.value) })} className="accent-emerald-500" />
          </label>

          <label className="flex flex-col gap-1.5 text-zinc-300 font-bold">
            TOUCH SAFE AREA: {campaign.touchSafeInset}px
            <input aria-label="Touch safe area" type="range" min="8" max="40" step="4" value={campaign.touchSafeInset} onChange={(event) => onCampaignChange({ ...campaign, touchSafeInset: Number(event.target.value) })} className="accent-emerald-500" />
          </label>

          <label className="flex flex-col gap-1.5 text-zinc-300 font-bold">
            TOUCH VERTICAL LIFT: {campaign.touchLift}px
            <input aria-label="Touch vertical lift" type="range" min="0" max="72" step="8" value={campaign.touchLift} onChange={(event) => onCampaignChange({ ...campaign, touchLift: Number(event.target.value) })} className="accent-emerald-500" />
          </label>

          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <span className="text-zinc-300 font-bold">LEFT-HANDED TOUCH LAYOUT</span>
            <button type="button" onClick={() => onCampaignChange({ ...campaign, leftHanded: !campaign.leftHanded })} className="rounded border border-emerald-500/50 px-3 py-1 text-emerald-300">
              {campaign.leftHanded ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div><span className="text-zinc-300 font-bold">TERRAIN-CLEAR TOUCH PANELS</span><div className="text-[9px] text-zinc-500">Removes the large panel fill while retaining button outlines.</div></div>
            <button type="button" onClick={() => onCampaignChange({ ...campaign, touchClearView: !campaign.touchClearView })} className="rounded border border-emerald-500/50 px-3 py-1 text-emerald-300">
              {campaign.touchClearView ? 'ON' : 'OFF'}
            </button>
          </div>

          <ControlBindingsPanel bindings={campaign.inputBindings} onChange={(inputBindings) => onCampaignChange({ ...campaign, inputBindings })} />

          <section className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="mb-3 font-bold text-cyan-300">ACCESSIBILITY & EFFECTS</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['radioCaptions', 'RADIO CAPTIONS'],
                ['reducedEffects', 'REDUCED MOTION / EFFECTS'],
              ] as const).map(([key, label]) => <button key={key} type="button" onClick={() => onCampaignChange({ ...campaign, accessibility: { ...campaign.accessibility, [key]: !campaign.accessibility[key] } })} className="flex items-center justify-between rounded border border-zinc-800 bg-black/35 p-2 text-[10px] text-zinc-300"><span>{label}</span><strong className={campaign.accessibility[key] ? 'text-emerald-300' : 'text-zinc-600'}>{campaign.accessibility[key] ? 'ON' : 'OFF'}</strong></button>)}
              <button type="button" onClick={() => {
                const high = campaign.accessibility.hudContrast !== 'HIGH';
                onCampaignChange({ ...campaign, accessibility: { ...campaign.accessibility, hudContrast: high ? 'HIGH' : 'STANDARD', highContrastHud: high } });
              }} className="flex items-center justify-between rounded border border-zinc-800 bg-black/35 p-2 text-[10px] text-zinc-300"><span>HUD CONTRAST</span><strong className={campaign.accessibility.hudContrast === 'HIGH' ? 'text-emerald-300' : 'text-zinc-500'}>{campaign.accessibility.hudContrast}</strong></button>
              <button type="button" onClick={() => onCampaignChange({ ...campaign, accessibility: { ...campaign.accessibility, textContrast: campaign.accessibility.textContrast === 'HIGH' ? 'STANDARD' : 'HIGH' } })} className="flex items-center justify-between rounded border border-zinc-800 bg-black/35 p-2 text-[10px] text-zinc-300"><span>TEXT CONTRAST</span><strong className={campaign.accessibility.textContrast === 'HIGH' ? 'text-emerald-300' : 'text-zinc-500'}>{campaign.accessibility.textContrast}</strong></button>
            </div>
            <label className="mt-3 flex flex-col gap-1 text-[10px] font-bold text-zinc-300">SCREEN SHAKE: {Math.round(campaign.accessibility.screenShake * 100)}%<input type="range" min="0" max="1" step="0.1" value={campaign.accessibility.screenShake} disabled={campaign.accessibility.reducedEffects} onChange={(event) => onCampaignChange({ ...campaign, accessibility: { ...campaign.accessibility, screenShake: Number(event.target.value) } })} className="accent-cyan-500 disabled:opacity-30" /></label>
            <label className="mt-3 flex flex-col gap-1 text-[10px] font-bold text-zinc-300">HUD SCALE
              <select aria-label="HUD scale" value={campaign.accessibility.hudScale} onChange={(event) => onCampaignChange({ ...campaign, accessibility: { ...campaign.accessibility, hudScale: event.target.value as HudScalePreset } })} className="rounded border border-cyan-700/50 bg-zinc-950 px-2 py-2 text-cyan-200">
                <option value="AUTO">AUTO — VIEWPORT OPTIMISED</option><option value="COMPACT">COMPACT</option><option value="STANDARD">STANDARD</option><option value="LARGE">LARGE TEXT</option>
              </select>
            </label>
            <label className="mt-3 flex flex-col gap-1 text-[10px] font-bold text-zinc-300">COMBAT CAMERA
              <select aria-label="Combat camera" value={campaign.accessibility.combatZoom ?? 'OFF'} onChange={(event) => onCampaignChange({ ...campaign, accessibility: { ...campaign.accessibility, combatZoom: event.target.value as CombatZoomPreset } })} className="rounded border border-cyan-700/50 bg-zinc-950 px-2 py-2 text-cyan-200">
                <option value="OFF">STANDARD — FIXED VIEW</option><option value="SMART">SMART ZOOM — PRESENTATION ONLY</option>
              </select>
              <span className="font-normal text-zinc-500">Gently frames nearby fighters and missiles. Collision, ranges and flight physics are unchanged; reduced effects disables camera motion.</span>
            </label>
          </section>

          {RELEASE_FEATURES.diagnostics ? <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center justify-between"><div><div className="font-bold text-zinc-300">LOCAL DIAGNOSTICS</div><div className="text-[9px] text-zinc-500">Anonymous, on-device playtest evidence; never uploaded automatically</div></div><button type="button" onClick={() => onCampaignChange({ ...campaign, diagnosticsEnabled: !campaign.diagnosticsEnabled })} className="rounded border border-emerald-500/50 px-3 py-1 text-emerald-300">{campaign.diagnosticsEnabled ? 'ENABLED' : 'OFF'}</button></div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-zinc-800 pt-2 text-[9px] font-bold">
              <a href="/legal/PRIVACY.txt" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-white">PRIVACY NOTICE</a>
              <a href="/legal/SUPPORT.txt" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-white">SUPPORT</a>
              <a href="/legal/EULA.txt" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-white">EULA</a>
              <a href="/legal/AI_CONTENT_DISCLOSURE.txt" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-white">AI DISCLOSURE</a>
              <a href="/legal/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-white">SOFTWARE NOTICES</a>
            </div>
          </div> : null}
          {RELEASE_FEATURES.diagnostics && DiagnosticsPanel ? <React.Suspense fallback={null}><DiagnosticsPanel campaign={campaign} performance={performance} inputDevice={inputDevice} /></React.Suspense> : null}
          <SupportPanel />
          {!DEMO_BUILD && <DemoTransferImportPanel campaign={campaign} onImport={onCampaignChange} />}
          {!DEMO_BUILD && <SaveManagementPanel onImported={onSaveImported} />}
          {getPlatformKind() === 'WINDOWS_DESKTOP' ? <section className="rounded-lg border border-cyan-800/50 bg-cyan-950/10 p-3">
            <div className="flex items-center justify-between gap-3"><div><div className="font-bold text-cyan-300">WINDOWS DISPLAY</div><div className="text-[9px] text-zinc-500">Uses the native application window; progress is mirrored to a backed-up desktop save.</div></div><button type="button" onClick={() => { const next = !fullscreen; void setPlatformFullscreen(next).then(() => setFullscreen(next)); }} className="rounded border border-cyan-500/50 px-3 py-1 text-cyan-300">{fullscreen ? 'WINDOWED' : 'FULL SCREEN'}</button></div>
          </section> : null}
          {!ITCH_BUILD ? <OfflineStatusPanel performance={performance} onPreserveLocalState={onPreserveLocalState} /> : null}

          {/* CRT Arcade Scanline Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <div>
              <div className="text-zinc-300 font-bold">1984 CRT SCANLINE FILTER</div>
              <div className="text-[10px] text-zinc-500">Arcade monitor curvature & phosphors</div>
            </div>
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onToggleCrt(!crtEnabled);
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition border ${
                crtEnabled
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {crtEnabled ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-zinc-950 border-t border-zinc-800 p-4 px-6 flex justify-end">
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs"
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

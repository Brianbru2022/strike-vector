import React from 'react';
import { Play, Sparkles, BookOpen, Settings, ShieldCheck, Zap, Film, ClipboardCheck, PlaneLanding, MapPinned } from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';
import { RELEASE_INFO } from '../game/Release';
import { BRAND } from '../game/Brand';
import { INTERNAL_TOOLS_COMPILED } from '../game/ReleaseFeatures';

interface MainMenuProps {
  onStartCampaign: () => void;
  onStartSortie: () => void;
  onStartShowcase: () => void;
  onStartLandingPractice: () => void;
  onOpenHowToPlay: () => void;
  onOpenOptions: () => void;
  onOpenValidation?: () => void;
  onOpenControlConceptTest?: () => void;
  onOpenAuthoring?: () => void;
  highScore: number;
  sortieUnlocked: boolean;
  firstRun: boolean;
  demoMode?: boolean;
  onExportDemo?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartCampaign,
  onStartSortie,
  onStartShowcase,
  onStartLandingPractice,
  onOpenHowToPlay,
  onOpenOptions,
  onOpenValidation,
  onOpenControlConceptTest,
  onOpenAuthoring,
  highScore,
  sortieUnlocked,
  firstRun,
  demoMode = false,
  onExportDemo,
}) => {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, a, input, select, textarea')) return;
        soundEngine.playUIClick();
        onStartCampaign();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartCampaign]);

  return (
    <div
      id="main-menu"
      role="navigation"
      aria-label="Main menu"
      className="absolute inset-0 z-20 w-full h-full flex flex-col items-center justify-between p-4 sm:p-8 md:p-12 font-mono-tech select-none overflow-y-auto bg-cover bg-center bg-no-repeat bg-zinc-950/80 bg-blend-multiply backdrop-blur-sm"
      style={{ backgroundImage: "linear-gradient(90deg, rgba(3,7,11,.9), rgba(3,7,11,.52) 48%, rgba(3,7,11,.8)), url('/assets/ui/title-composition-hero-v1.webp')" }}
    >
      {/* Top Banner: High Score & Version */}
      <div className="w-full max-w-4xl flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-cyan-400 font-bold">SYSTEM OPERATIONAL // FLEET READY</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-950/80 border border-amber-500/40 px-3 py-1.5 rounded-lg text-amber-300">
          <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>TOP COMBAT SCORE:</span>
          <span className="font-display font-black text-sm text-zinc-100">{highScore.toLocaleString()}</span>
        </div>
      </div>

      {/* Center Title & Game Logo */}
      <div className="flex flex-col items-center text-center my-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-bold tracking-widest uppercase mb-3 shadow-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-[#8ef0ae]" /> NORTH ATLANTIC // 1987
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-cyan-200 to-cyan-500 drop-shadow-[0_4px_16px_rgba(6,182,212,0.4)]">
          IRON KESTREL
        </h1>
        <p className="font-display text-lg md:text-2xl text-[#9cf2b5] mt-1 tracking-[.35em] max-w-md">
          1987
        </p>
        <p className="text-xs md:text-sm text-zinc-400 mt-3 tracking-wider max-w-md">
          {BRAND.subtitle.toUpperCase()} // SEA HARRIER OPERATIONS
        </p>

        {/* Menu Buttons Grid */}
        <div className="flex flex-col gap-2.5 w-72 md:w-80 mt-8">
          {/* Campaign is the primary route, especially for a new pilot. */}
          <button
            autoFocus
            aria-label={firstRun ? undefined : 'CAMPAIGN'}
            aria-describedby={firstRun ? 'first-run-campaign-help' : undefined}
            onClick={() => {
              soundEngine.playUIClick();
              onStartCampaign();
            }}
            className="w-full py-3.5 px-6 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-zinc-950 font-display font-black tracking-wider text-base shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 transition transform hover:scale-105 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-zinc-950" /> {demoMode ? 'PLAY GUIDED MISSION 1' : firstRun ? 'START GUIDED CAMPAIGN' : 'CONTINUE CAMPAIGN'}
          </button>
          {firstRun ? <p id="first-run-campaign-help" className="-mt-1 text-center text-[10px] leading-relaxed text-emerald-200">{demoMode ? 'Carrier qualification and coastal interception. Every training prompt can be skipped.' : 'Begins with guided carrier qualification. Every prompt can be skipped.'}</p> : null}

          <div className="mt-1 border-t border-zinc-700/70 pt-2 text-center text-[9px] font-bold tracking-[.18em] text-zinc-500">{demoMode ? 'DEMO CHALLENGE' : 'TRAINING & EXTRA MODES'}</div>
          {!demoMode && <button
            onClick={() => {
              soundEngine.playUIClick();
              onStartLandingPractice();
            }}
            className="w-full rounded-lg border border-sky-500/50 bg-sky-950/50 px-6 py-2.5 font-display text-sm font-bold tracking-wider text-sky-200 transition hover:bg-sky-900/60"
          >
            <PlaneLanding className="mr-2 inline h-4 w-4" /> LANDING PRACTICE
          </button>}

          <button
            onClick={() => {
              soundEngine.playUIClick();
              onStartShowcase();
            }}
            className="w-full py-2.5 px-6 rounded-lg bg-gradient-to-r from-emerald-950 to-cyan-950 hover:from-emerald-900 hover:to-cyan-900 border border-emerald-400/60 text-emerald-200 font-display font-bold tracking-wider text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950/30"
          >
            <Film className="w-4 h-4 text-emerald-300" /> {demoMode ? 'FLEET DEFENCE CHALLENGE' : 'NORTH ATLANTIC SHOWCASE'}
          </button>

          {/* Procedural Sortie Mode Button */}
          {!demoMode && <button
            disabled={!sortieUnlocked}
            onClick={() => {
              if (!sortieUnlocked) return;
              soundEngine.playUIClick();
              onStartSortie();
            }}
            aria-label={sortieUnlocked ? 'DYNAMIC OPERATIONS' : 'Dynamic Operations locked; complete Mission 10 to unlock'}
            className="w-full py-2.5 px-6 rounded-lg bg-zinc-900/90 enabled:hover:bg-zinc-800 border border-amber-500/50 text-amber-300 font-display font-bold tracking-wider text-sm flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:border-zinc-500/60 disabled:bg-zinc-800/95 disabled:text-zinc-300"
          >
            <Sparkles className="w-4 h-4 text-amber-400" /> {sortieUnlocked ? 'DYNAMIC OPERATIONS' : 'DYNAMIC OPERATIONS — COMPLETE CAMPAIGN'}
          </button>}

          {/* How to Play / Flight Manual */}
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onOpenHowToPlay();
            }}
            className="w-full py-2.5 px-6 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" /> FLIGHT MANUAL / INTEL
          </button>

          {demoMode && <a href="/commercial-edition.html" className="mt-1 text-center text-[10px] font-bold tracking-wider text-amber-300 underline decoration-amber-500/50 underline-offset-4 hover:text-amber-200">WINDOWS EDITION DETAILS</a>}
          {demoMode && onExportDemo && <button type="button" onClick={onExportDemo} className="text-center text-[9px] font-bold tracking-wider text-zinc-400 hover:text-zinc-200">EXPORT DEMO RECORD</button>}

          {/* Options */}
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onOpenOptions();
            }}
            className="w-full py-2.5 px-6 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" /> SYSTEM SETTINGS
          </button>

          {INTERNAL_TOOLS_COMPILED && onOpenValidation ? (
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onOpenValidation();
              }}
              className="w-full py-2.5 px-6 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-700/60 text-cyan-300 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ClipboardCheck className="w-3.5 h-3.5" /> VALIDATION RUNS
            </button>
          ) : null}
          {INTERNAL_TOOLS_COMPILED && onOpenControlConceptTest ? (
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onOpenControlConceptTest();
              }}
              className="w-full py-2.5 px-6 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/60 text-amber-300 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ClipboardCheck className="w-3.5 h-3.5" /> EARLY CONTROL TEST
            </button>
          ) : null}
          {INTERNAL_TOOLS_COMPILED && onOpenAuthoring ? (
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onOpenAuthoring();
              }}
              className="w-full py-2.5 px-6 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/60 text-emerald-300 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MapPinned className="h-3.5 w-3.5" /> MISSION AUTHORING
            </button>
          ) : null}
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-4xl flex items-center justify-between text-[11px] text-zinc-500 pt-4 border-t border-zinc-900">
        <div>800 NAS // NORTH ATLANTIC COMMAND // {RELEASE_INFO.displayVersion}</div>
        <div className="flex items-center gap-4">
          <span className="text-amber-300">{demoMode ? 'FOCUSED BROWSER DEMO' : RELEASE_INFO.channel === 'DEVELOPMENT' ? 'DEVELOPMENT BUILD' : 'RELEASE CANDIDATE'}</span>
          <span>DESKTOP / MOBILE / GAMEPAD</span>
          <span>60 FPS</span>
        </div>
      </div>
    </div>
  );
};

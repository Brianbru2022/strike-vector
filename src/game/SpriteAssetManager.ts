// ============================================================================
import { DEMO_BUILD } from './ReleaseFeatures';
// IRON KESTREL '87 - DETERMINISTIC BUNDLED SPRITE & PROCEDURAL FALLBACK ENGINE
// ============================================================================

export interface AssetItem {
  key: string;
  name: string;
  subject: string;
  prompt: string;
  defaultWidth: number;
  defaultHeight: number;
  fallbackColor: string;
  fallbackLabel: string;
}

export interface PreloadProgress {
  loaded: number;
  total: number;
  currentAssetName: string;
  percent: number;
  isComplete: boolean;
  statusText: string;
  failedCount: number;
}

export const GAME_ASSET_MANIFEST: AssetItem[] = [
  {
    key: 'player_jet',
    name: 'Sea Harrier FRS.1',
    subject: '1987 Royal Navy Sea Harrier FRS.1 side profile with low-visibility grey coating',
    prompt:
      'Painted 2D Sea Harrier FRS.1 game sprite, strict side profile, 1987 Royal Navy low-visibility grey, crisp silhouette and transparent background',
    defaultWidth: 90,
    defaultHeight: 40,
    fallbackColor: '#38bdf8',
    fallbackLabel: 'KESTREL ONE',
  },
  {
    key: 'enemy_jet',
    name: 'MiG-23ML Flogger Interceptor',
    subject: '1987 Soviet MiG-23ML Flogger interceptor in strict side profile',
    prompt:
      'Realistic painted 2D game sprite of a Soviet MiG-23ML Flogger interceptor in strict side profile, transparent background',
    defaultWidth: 82,
    defaultHeight: 24,
    fallbackColor: '#ef4444',
    fallbackLabel: 'ENEMY [MIG-23ML]',
  },
  {
    key: 'enemy_mig21',
    name: 'MiG-21bis Interceptor',
    subject: '1987 Soviet MiG-21bis interceptor in strict side profile',
    prompt:
      'Realistic painted 2D game sprite of a Soviet MiG-21bis interceptor in strict side profile, transparent background',
    defaultWidth: 78,
    defaultHeight: 22,
    fallbackColor: '#94a3b8',
    fallbackLabel: 'ENEMY [MIG-21BIS]',
  },
  {
    key: 'enemy_mig29',
    name: 'MiG-29A Fulcrum Interceptor',
    subject: 'early-production 1987 Soviet MiG-29A Fulcrum in strict side profile',
    prompt:
      'Realistic painted 2D game sprite of an early Soviet MiG-29A Fulcrum in strict side profile, transparent background',
    defaultWidth: 86,
    defaultHeight: 24,
    fallbackColor: '#64748b',
    fallbackLabel: 'ENEMY [MIG-29A]',
  },
  {
    key: 'enemy_heli',
    name: 'Mi-24 Attack Gunship',
    subject: 'military attack gunship helicopter with tandem armored cockpits stub wings and rotor side profile',
    prompt:
      '2D game sprite of military attack gunship helicopter with tandem armored cockpits stub wings and rotor side profile, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 84,
    defaultHeight: 42,
    fallbackColor: '#22c55e',
    fallbackLabel: 'GUNSHIP [MI-24]',
  },
  {
    key: 'enemy_sam',
    name: 'SA-8 Gecko SAM Launcher',
    subject: 'armored tracked military surface-to-air missile SAM launcher vehicle with elevated dual missiles side view',
    prompt:
      '2D game sprite of armored tracked military surface-to-air missile SAM launcher vehicle with elevated dual missiles side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 64,
    defaultHeight: 38,
    fallbackColor: '#eab308',
    fallbackLabel: 'SAM [SA-15]',
  },
  {
    key: 'enemy_flak',
    name: 'ZSU-23-4 Shilka',
    subject: 'military twin 35mm anti-aircraft flak autocannon bunker turret with sandbags side view',
    prompt:
      '2D game sprite of military twin 35mm anti-aircraft flak autocannon bunker turret with sandbags side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 56,
    defaultHeight: 38,
    fallbackColor: '#f97316',
    fallbackLabel: 'FLAK [35MM]',
  },
  {
    key: 'enemy_tank',
    name: 'T-72M Main Battle Tank',
    subject: '1980s T-72M battle tank with 125mm cannon turret and caterpillar tracks side view',
    prompt:
      '2D game sprite of modern heavy armored battle tank with 125mm cannon turret and caterpillar tracks side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 60,
    defaultHeight: 28,
    fallbackColor: '#84cc16',
    fallbackLabel: 'TANK [T-90]',
  },
  {
    key: 'enemy_radar',
    name: 'Phased Array Radar Station',
    subject: 'military concrete radar bunker with rotating parabolic lattice dish dish and antenna side view',
    prompt:
      '2D game sprite of military concrete radar bunker with rotating parabolic lattice dish dish and antenna side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 60,
    defaultHeight: 48,
    fallbackColor: '#06b6d4',
    fallbackLabel: 'RADAR [EWR]',
  },
  {
    key: 'enemy_oil',
    name: 'Refinery Fuel Silo',
    subject: 'industrial oil refinery fuel storage silo cylindrical tank with yellow hazard stripes and catwalk side view',
    prompt:
      '2D game sprite of industrial oil refinery fuel storage silo cylindrical tank with yellow hazard stripes and catwalk side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 72,
    defaultHeight: 64,
    fallbackColor: '#f59e0b',
    fallbackLabel: 'DEPOT [FUEL]',
  },
  {
    key: 'enemy_ship',
    name: 'Cargo Container Vessel',
    subject: 'military cargo container freighter ship vessel with bridge superstructure side view',
    prompt:
      '2D game sprite of military cargo container freighter ship vessel with bridge superstructure side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 110,
    defaultHeight: 38,
    fallbackColor: '#ec4899',
    fallbackLabel: 'VESSEL [CARGO]',
  },
  {
    key: 'pilot_raft',
    name: 'Downed Pilot Life Raft',
    subject: 'downed naval pilot in yellow survival inflatable raft with orange smoke flare',
    prompt:
      '2D game sprite of downed naval pilot in yellow survival inflatable raft with orange smoke flare, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 40,
    defaultHeight: 36,
    fallbackColor: '#eab308',
    fallbackLabel: 'PILOT [RESCUE]',
  },
  {
    key: 'tree_pine',
    name: 'Evergreen Pine Forest Tree',
    subject: 'lush green evergreen pine tree foliage side view',
    prompt:
      '2D game sprite of lush green evergreen pine tree foliage side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 24,
    defaultHeight: 36,
    fallbackColor: '#15803d',
    fallbackLabel: 'TREE',
  },
  {
    key: 'airbase_hangar',
    name: 'Hardened Aircraft Hangar',
    subject: 'hardened military airbase arch aircraft shelter hangar side view',
    prompt:
      '2D game sprite of hardened military airbase arch aircraft shelter hangar side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 100,
    defaultHeight: 50,
    fallbackColor: '#64748b',
    fallbackLabel: 'HANGAR',
  },
  {
    key: 'carrier_ship',
    name: 'Invincible-class Aircraft Carrier',
    subject: 'naval aircraft carrier flight deck warship superstructure side view',
    prompt:
      '2D game sprite of naval aircraft carrier flight deck warship superstructure side view, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 180,
    defaultHeight: 60,
    fallbackColor: '#3b82f6',
    fallbackLabel: 'CARRIER [CVN]',
  },
  {
    key: 'fx_explosion',
    name: 'Combat Blast Fireball',
    subject: 'fiery combat fireball explosion blast with orange shockwave flare and smoke sparks',
    prompt:
      '2D game sprite of fiery combat fireball explosion blast with orange shockwave flare and smoke sparks, clean isolated object on pure transparent/solid white background, crisp digital game asset style, no shadows or clutter',
    defaultWidth: 80,
    defaultHeight: 80,
    fallbackColor: '#f97316',
    fallbackLabel: 'EXPLOSION',
  },
  {
    key: 'terrain_coastal',
    name: 'Coastal Terrain Tile',
    subject: '2.5D top-down military model kit diorama terrain tile of coastal terrain shoreline with miniature scale model grass turf, sandy beach berm, concrete military revetments, and fine dirt paths',
    prompt:
      'Seamless 2.5D top-down perspective military model-kit diorama terrain tile of coastal terrain shoreline with miniature scale model green grass turf, sandy beach berms, concrete bunker revetments, painted military diorama aesthetic, highly detailed miniature scale terrain texture, clean isolated tile pattern',
    defaultWidth: 512,
    defaultHeight: 256,
    fallbackColor: '#22c55e',
    fallbackLabel: 'TILES [COASTAL TERRAIN]',
  },
  {
    key: 'terrain_mountain_range',
    name: 'Mountain Range Terrain Tile',
    subject: '2.5D top-down miniature scale model kit alpine mountain ridge range with dry-brushed granite peaks, rocky crag slopes, subtle snow gullies, and military diorama contour shading',
    prompt:
      'Seamless 2.5D top-down perspective military model-kit diorama terrain tile of mountain range alpine ridges with dry-brushed grey granite peaks, rocky crags, subtle couloir snowfields, painted military diorama model kit aesthetic, highly detailed scale miniature mountain texture, clean isolated tile pattern',
    defaultWidth: 512,
    defaultHeight: 256,
    fallbackColor: '#475569',
    fallbackLabel: 'TILES [MOUNTAINS]',
  },
  {
    key: 'terrain_ocean_surface',
    name: 'Ocean Surface Water Tile',
    subject: '2.5D top-down military model kit diorama ocean surface water tile with realistic translucent epoxy resin blue sea, gentle caustic reflections, wave ripple crests, and subtle coastal shallows',
    prompt:
      'Seamless 2.5D top-down perspective military model-kit diorama ocean water surface tile with realistic deep navy and cyan epoxy resin sea, fine white wave foam crest ripples, caustic light refraction, painted scale model diorama water aesthetic, clean isolated tile texture',
    defaultWidth: 512,
    defaultHeight: 256,
    fallbackColor: '#0284c7',
    fallbackLabel: 'TILES [OCEAN]',
  },
];

export class SpriteAssetManager {
  private static isInitialized = false;
  private static isPreloading = false;
  private static spriteImages: Map<string, HTMLImageElement> = new Map();
  private static spriteStatus: Map<string, 'loading' | 'loaded' | 'failed' | 'cached' | 'procedural'> = new Map();
  private static progressListeners: Array<(p: PreloadProgress) => void> = [];

  public static init() {
    if (this.isInitialized || typeof document === 'undefined') return;
    this.isInitialized = true;

    const bundledSprites: Record<string, string> = {
      player_jet: '/assets/sprites/sea-harrier-frs1-hero-v3.png',
      player_turn: '/assets/sprites/sea-harrier-turn-v1.png',
      carrier_ship: '/assets/sprites/invincible-carrier-hero-v3.png',
      enemy_jet: '/assets/sprites/mig23ml-hero-v3.png',
      enemy_mig21: '/assets/sprites/mig21bis-hero-v3.png',
      enemy_mig29: '/assets/sprites/mig29a-hero-v3.png',
      enemy_heli: '/assets/sprites/mi24d-painted-v2.png',
      enemy_sam: '/assets/sprites/sa8-gecko-v2.png',
      enemy_flak: '/assets/sprites/zsu23-4-v2.png',
      enemy_tank: '/assets/sprites/t72m-v2.png',
      enemy_radar: '/assets/sprites/p19-radar-v2.png',
      enemy_oil: '/assets/sprites/fuel-depot-v2.png',
      enemy_ship: '/assets/sprites/cargo-supply-freighter-v2.png',
      friendly_supplies: '/assets/sprites/friendly-supply-cache-v2.png',
      forward_base: '/assets/sprites/forward-base-farp-v1.png',
      fx_explosion: '/assets/sprites/explosion-fireball-v2.png',
      fx_explosion_smoke: '/assets/sprites/explosion-smoke-v2.png',
      fx_explosion_stages: '/assets/sprites/explosion-stages-stage6-v1.png',
      enemy_patrol_boat: '/assets/sprites/missile-patrol-boat-hero-v3.png',
      enemy_corvette: '/assets/sprites/missile-corvette-hero-v3.png',
      combat_wrecks: '/assets/sprites/combat-wrecks-v1.png',
      harrier_ejection: '/assets/sprites/harrier-ejection-v1.png',
      act_three_objectives: '/assets/sprites/act-three-objectives-v1.png',
      enemy_tu16k: '/assets/sprites/tu16k-damage-v1.png',
      enemy_su24m: '/assets/sprites/su24m-damage-v1.png',
      arctic_landing_craft: '/assets/sprites/landing-craft-damage-v1.png',
      arctic_coastal_artillery: '/assets/sprites/coastal-artillery-damage-v1.png',
      arctic_submarine_pen: '/assets/sprites/submarine-pen-damage-v1.png',
    };
    const demoSpriteKeys = new Set(['player_jet', 'player_turn', 'carrier_ship', 'enemy_jet', 'enemy_mig21', 'enemy_mig29', 'fx_explosion', 'fx_explosion_smoke', 'fx_explosion_stages', 'enemy_patrol_boat', 'enemy_corvette', 'combat_wrecks', 'harrier_ejection']);
    for (const [key, url] of Object.entries(bundledSprites).filter(([key]) => !DEMO_BUILD || demoSpriteKeys.has(key))) {
      this.loadBundledSprite(key, url);
    }
    for (const asset of GAME_ASSET_MANIFEST) {
      if (bundledSprites[asset.key]) continue;
      void this.registerDataUrl(asset.key, this.generateProceduralBitmapDataUrl(asset.key));
      this.spriteStatus.set(asset.key, 'procedural');
    }
  }

  private static loadBundledSprite(key: string, url: string) {
    this.spriteStatus.set(key, 'loading');
    const image = new Image();
    image.onload = () => {
      this.spriteImages.set(key, image);
      this.spriteStatus.set(key, 'loaded');
    };
    image.onerror = () => this.spriteStatus.set(key, 'failed');
    image.src = url;
  }

  public static getSprite(key: string): HTMLImageElement | null {
    let img = this.spriteImages.get(key);
    if (!img) {
      if (key === 'terrain_flat_coast' || key === 'terrain_coastal_terrain') {
        img = this.spriteImages.get('terrain_coastal');
      } else if (key === 'terrain_coastal') {
        img = this.spriteImages.get('terrain_flat_coast');
      } else if (key === 'terrain_mountains') {
        img = this.spriteImages.get('terrain_mountain_range');
      } else if (key === 'terrain_ocean') {
        img = this.spriteImages.get('terrain_ocean_surface');
      }
    }
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return null;
  }

  public static isAssetLoaded(key: string): boolean {
    const img = this.spriteImages.get(key);
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  public static getAssetStatus(key: string): 'loading' | 'loaded' | 'failed' | 'cached' | 'procedural' {
    return this.spriteStatus.get(key) || 'loading';
  }

  public static subscribeProgress(listener: (p: PreloadProgress) => void) {
    this.progressListeners.push(listener);
    return () => {
      this.progressListeners = this.progressListeners.filter((l) => l !== listener);
    };
  }

  private static notifyProgress(
    loaded: number,
    total: number,
    currentAssetName: string,
    statusText: string,
    isComplete: boolean,
    failedCount: number
  ) {
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 100;
    const data: PreloadProgress = {
      loaded,
      total,
      currentAssetName,
      percent,
      isComplete,
      statusText,
      failedCount,
    };
    this.progressListeners.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error('Progress listener error:', err);
      }
    });
  }

  /** Prepares deterministic bundled/procedural assets without network access. */
  public static async preloadAllAssets(forceRegenerate = false): Promise<void> {
    if (this.isPreloading) return;
    this.isPreloading = true;
    this.init();
    const total = GAME_ASSET_MANIFEST.length;
    if (forceRegenerate) {
      for (const asset of GAME_ASSET_MANIFEST) {
        if (asset.key === 'player_jet') continue;
        await this.registerDataUrl(asset.key, this.generateProceduralBitmapDataUrl(asset.key));
        this.spriteStatus.set(asset.key, 'procedural');
      }
    }
    this.isPreloading = false;
    this.notifyProgress(total, total, 'COMPLETE', `All ${total} bundled assets loaded.`, true, 0);
  }

  /**
   * Generates high-definition, crisp 2D bitmap sprites directly onto an offscreen canvas
   * and exports as standard PNG data URLs.
   */
  public static generateProceduralBitmapDataUrl(key: string): string {
    const canvas = document.createElement('canvas');
    const scale = 2; // 2x high DPI rendering

    if (key === 'player_jet') {
      canvas.width = 180 * scale;
      canvas.height = 80 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(90, 40);

        // Exhaust heat glow
        const glow = ctx.createRadialGradient(-36, 3, 2, -36, 3, 16);
        glow.addColorStop(0, '#38bdf8');
        glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
        glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(-36, 3, 16, 0, Math.PI * 2);
        ctx.fill();

        // Fuselage Main Body Gradient
        const bodyGrad = ctx.createLinearGradient(0, -20, 0, 15);
        bodyGrad.addColorStop(0, '#cbd5e1');
        bodyGrad.addColorStop(0.3, '#94a3b8');
        bodyGrad.addColorStop(0.7, '#475569');
        bodyGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(42, 2);
        ctx.quadraticCurveTo(18, -12, -10, -9);
        ctx.lineTo(-26, -22);
        ctx.lineTo(-34, -20);
        ctx.lineTo(-28, -2);
        ctx.lineTo(-38, 1);
        ctx.lineTo(-38, 7);
        ctx.lineTo(-16, 10);
        ctx.lineTo(8, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Swept Diamond Delta Wings
        const wingGrad = ctx.createLinearGradient(0, 0, 0, 18);
        wingGrad.addColorStop(0, '#64748b');
        wingGrad.addColorStop(1, '#334155');
        ctx.fillStyle = wingGrad;
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(-20, 18);
        ctx.lineTo(-30, 16);
        ctx.lineTo(-16, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Panel Seams
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(14, 2); ctx.lineTo(4, 7);
        ctx.moveTo(-4, -6); ctx.lineTo(-14, 2);
        ctx.stroke();

        // Cyan HUD Glass Canopy
        const canopyGrad = ctx.createLinearGradient(0, -12, 0, 2);
        canopyGrad.addColorStop(0, '#7dd3fc');
        canopyGrad.addColorStop(0.4, '#0284c7');
        canopyGrad.addColorStop(1, '#075985');
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.quadraticCurveTo(12, -12, -4, -8);
        ctx.lineTo(2, 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Canopy Glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(18, -4); ctx.lineTo(10, -9); ctx.lineTo(14, -8);
        ctx.fill();
      }
    } else if (key === 'enemy_jet') {
      canvas.width = 152 * scale;
      canvas.height = 72 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(76, 36);

        const jetGrad = ctx.createLinearGradient(0, -16, 0, 16);
        jetGrad.addColorStop(0, '#ef4444');
        jetGrad.addColorStop(0.5, '#dc2626');
        jetGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = jetGrad;
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(34, 0);
        ctx.lineTo(12, -8);
        ctx.lineTo(-24, -18);
        ctx.lineTo(-32, -14);
        ctx.lineTo(-24, -3);
        ctx.lineTo(-34, -2);
        ctx.lineTo(-34, 4);
        ctx.lineTo(-24, 5);
        ctx.lineTo(-32, 16);
        ctx.lineTo(-24, 20);
        ctx.lineTo(12, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Amber Cockpit
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(18, -1);
        ctx.lineTo(8, -6);
        ctx.lineTo(4, 0);
        ctx.closePath();
        ctx.fill();

        // Red Star Insignia
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-8, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (key === 'enemy_heli') {
      canvas.width = 168 * scale;
      canvas.height = 84 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(84, 42);

        // Body
        const heliGrad = ctx.createLinearGradient(0, -12, 0, 12);
        heliGrad.addColorStop(0, '#22c55e');
        heliGrad.addColorStop(0.7, '#15803d');
        heliGrad.addColorStop(1, '#052e16');
        ctx.fillStyle = heliGrad;
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.ellipse(4, 0, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tail Boom & Rotor
        ctx.fillRect(-34, -4, 30, 8);
        ctx.fillRect(-36, -14, 6, 20);

        // Cockpit glass
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(20, -2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Spinning Rotor Blade
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-42, -15);
        ctx.lineTo(46, -15);
        ctx.stroke();
      }
    } else if (key === 'enemy_sam') {
      canvas.width = 128 * scale;
      canvas.height = 76 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(64, 38);

        // Tracks
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-26, 8, 52, 10);
        ctx.fillStyle = '#64748b';
        for (let x = -20; x <= 20; x += 10) {
          ctx.beginPath();
          ctx.arc(x, 13, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Armored Hull
        const hullGrad = ctx.createLinearGradient(0, -4, 0, 8);
        hullGrad.addColorStop(0, '#65a30d');
        hullGrad.addColorStop(1, '#365314');
        ctx.fillStyle = hullGrad;
        ctx.fillRect(-24, -2, 48, 11);

        // Elevated Missiles
        ctx.fillStyle = '#f8fafc';
        ctx.save();
        ctx.rotate(-0.35);
        ctx.fillRect(-10, -12, 32, 5);
        ctx.fillRect(-10, -6, 32, 5);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(20, -12, 4, 5);
        ctx.fillRect(20, -6, 4, 5);
        ctx.restore();
      }
    } else if (key === 'enemy_flak') {
      canvas.width = 112 * scale;
      canvas.height = 76 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(56, 38);

        // Sandbag bunker base
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.arc(0, 12, 22, Math.PI, 0);
        ctx.fill();

        // Armored Mantlet
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.arc(0, 2, 12, 0, Math.PI * 2);
        ctx.fill();

        // Twin Rifled Barrels
        ctx.fillStyle = '#18181b';
        ctx.save();
        ctx.rotate(-0.4);
        ctx.fillRect(0, -6, 30, 4);
        ctx.fillRect(0, 2, 30, 4);
        ctx.restore();
      }
    } else if (key === 'enemy_tank') {
      canvas.width = 120 * scale;
      canvas.height = 56 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(60, 28);

        // Tracks
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-26, 4, 52, 9);

        // Hull
        const tankGrad = ctx.createLinearGradient(0, -6, 0, 6);
        tankGrad.addColorStop(0, '#4d7c0f');
        tankGrad.addColorStop(1, '#1a2e05');
        ctx.fillStyle = tankGrad;
        ctx.fillRect(-24, -4, 48, 10);

        // Turret & 125mm Cannon
        ctx.beginPath();
        ctx.arc(-2, -6, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#18181b';
        ctx.fillRect(4, -9, 26, 4);
      }
    } else if (key === 'enemy_radar') {
      canvas.width = 120 * scale;
      canvas.height = 96 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(60, 48);

        // Bunker
        const bunkerGrad = ctx.createLinearGradient(-22, 0, 22, 0);
        bunkerGrad.addColorStop(0, '#475569');
        bunkerGrad.addColorStop(0.5, '#64748b');
        bunkerGrad.addColorStop(1, '#334155');
        ctx.fillStyle = bunkerGrad;
        ctx.beginPath();
        ctx.arc(0, 16, 24, Math.PI, 0);
        ctx.fill();

        // Parabolic Dish
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(0, -8, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mast
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-2, -6, 4, 18);
      }
    } else if (key === 'enemy_oil') {
      canvas.width = 144 * scale;
      canvas.height = 128 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(72, 64);

        // Cylindrical Silo Body
        const siloGrad = ctx.createLinearGradient(-32, 0, 32, 0);
        siloGrad.addColorStop(0, '#475569');
        siloGrad.addColorStop(0.3, '#f1f5f9');
        siloGrad.addColorStop(0.7, '#cbd5e1');
        siloGrad.addColorStop(1, '#334155');
        ctx.fillStyle = siloGrad;
        ctx.fillRect(-32, -26, 64, 52);

        // Dome Roof
        ctx.beginPath();
        ctx.arc(0, -26, 32, Math.PI, 0);
        ctx.fill();

        // Hazard Stripes
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-32, 10, 64, 8);
        ctx.fillStyle = '#0f172a';
        for (let x = -30; x < 30; x += 12) {
          ctx.beginPath();
          ctx.moveTo(x, 18); ctx.lineTo(x + 6, 10); ctx.lineTo(x + 10, 10); ctx.lineTo(x + 4, 18);
          ctx.fill();
        }
      }
    } else if (key === 'enemy_ship') {
      canvas.width = 220 * scale;
      canvas.height = 76 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(110, 38);

        // Red/Navy Hull
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(-50, 4);
        ctx.lineTo(50, 4);
        ctx.lineTo(44, 14);
        ctx.lineTo(-46, 14);
        ctx.closePath();
        ctx.fill();

        // Superstructure
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-20, -14, 34, 18);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-16, -10, 26, 4);

        // Containers
        ctx.fillStyle = '#0284c7'; ctx.fillRect(-45, -6, 20, 10);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(18, -6, 24, 10);
      }
    } else if (key === 'pilot_raft') {
      canvas.width = 80 * scale;
      canvas.height = 72 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(40, 36);

        // Yellow Life Raft
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 2, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pilot in Orange Flight Suit
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, -4, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Flare smoke puff
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(8, -12, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (key === 'tree_pine') {
      canvas.width = 48 * scale;
      canvas.height = 72 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(24, 36);

        // Trunk
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-2, 6, 4, 14);

        // Needle Tiers
        const tiers = [
          { dy: 6, w: 20, h: 10 },
          { dy: -2, w: 16, h: 9 },
          { dy: -9, w: 11, h: 8 },
        ];
        for (const t of tiers) {
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.moveTo(0, t.dy - t.h);
          ctx.lineTo(t.w * 0.5, t.dy);
          ctx.lineTo(-t.w * 0.5, t.dy);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (key === 'airbase_hangar') {
      canvas.width = 200 * scale;
      canvas.height = 100 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(100, 50);

        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 24, 46, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 24, 36, Math.PI, 0);
        ctx.fill();
      }
    } else if (key === 'carrier_ship') {
      canvas.width = 360 * scale;
      canvas.height = 120 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(180, 60);

        ctx.fillStyle = '#334155';
        ctx.fillRect(-80, -6, 160, 24);
        ctx.fillStyle = '#475569';
        ctx.fillRect(-85, -12, 170, 6);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(20, -32, 24, 20);
      }
    } else if (key === 'fx_explosion') {
      canvas.width = 160 * scale;
      canvas.height = 160 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.translate(80, 80);

        const expGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 36);
        expGrad.addColorStop(0, '#ffffff');
        expGrad.addColorStop(0.3, '#fde047');
        expGrad.addColorStop(0.6, '#f97316');
        expGrad.addColorStop(0.85, '#dc2626');
        expGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');
        ctx.fillStyle = expGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (key === 'terrain_coastal' || key === 'terrain_flat_coast') {
      // 2.5D Military Model-Kit Coastal Terrain Diorama Tile (512x256)
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Deep earth/rock base
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 512, 256);

        // Weathered Basalt & Sedimentary Rock Strata (Lower half)
        const rockGrad = ctx.createLinearGradient(0, 120, 0, 256);
        rockGrad.addColorStop(0, '#334155');
        rockGrad.addColorStop(0.5, '#1e293b');
        rockGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = rockGrad;
        ctx.fillRect(0, 120, 512, 136);

        // Sedimentary rock fissure lines & drybrush highlights
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        for (let y = 130; y < 250; y += 14) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x <= 512; x += 32) {
            ctx.lineTo(x, y + Math.sin(x * 0.04 + y) * 3);
          }
          ctx.stroke();
        }

        // Sandy Beach Berm & Tidal Wash (Center-left to Center-right)
        const sandGrad = ctx.createLinearGradient(0, 70, 0, 130);
        sandGrad.addColorStop(0, '#ca8a04');
        sandGrad.addColorStop(0.5, '#eab308');
        sandGrad.addColorStop(1, '#a16207');
        ctx.fillStyle = sandGrad;
        ctx.fillRect(0, 70, 512, 60);

        // Miniature Scale Model Static Grass Flocking (Top layer)
        const turfGrad = ctx.createLinearGradient(0, 0, 0, 80);
        turfGrad.addColorStop(0, '#22c55e');
        turfGrad.addColorStop(0.35, '#16a34a');
        turfGrad.addColorStop(0.7, '#15803d');
        turfGrad.addColorStop(1, '#166534');
        ctx.fillStyle = turfGrad;
        ctx.fillRect(0, 0, 512, 75);

        // Fine grass flocking stippling & dry grass bristles
        for (let i = 0; i < 900; i++) {
          const gx = (i * 37) % 512;
          const gy = (i * 19) % 72;
          ctx.fillStyle = i % 4 === 0 ? '#4ade80' : i % 4 === 1 ? '#86efac' : i % 4 === 2 ? '#15803d' : '#ca8a04';
          ctx.fillRect(gx, gy, 1.5, 2.5);
        }

        // Miniature Military Concrete Trench & Revetment Earthworks
        ctx.fillStyle = '#475569';
        ctx.fillRect(80, 24, 140, 12);
        ctx.fillRect(320, 36, 120, 10);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(80, 24, 140, 3);
        ctx.fillRect(320, 36, 120, 2.5);

        // Camouflage Sandbag Embankments
        for (let sb = 0; sb < 8; sb++) {
          ctx.fillStyle = sb % 2 === 0 ? '#d97706' : '#b45309';
          ctx.fillRect(84 + sb * 16, 32, 14, 4);
          ctx.fillRect(324 + sb * 14, 42, 12, 3.5);
        }

        // Miniature Vehicle Tread Tracks / Dirt Trail
        ctx.strokeStyle = 'rgba(67, 56, 202, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 54);
        ctx.bezierCurveTo(160, 48, 300, 62, 512, 52);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 58);
        ctx.bezierCurveTo(160, 52, 300, 66, 512, 56);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (key === 'terrain_mountain_range') {
      // 2.5D Military Model-Kit Alpine Mountain Range Diorama Tile (512x256)
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Deep mountain mass gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 256);
        bgGrad.addColorStop(0, '#1e293b');
        bgGrad.addColorStop(0.5, '#334155');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 512, 256);

        // Jagged Granite Ridges & Dry-Brushed Diorama Peaks
        const peaks = [
          { x: 40, y: 30, w: 120, h: 180 },
          { x: 180, y: 15, w: 150, h: 210 },
          { x: 340, y: 40, w: 140, h: 170 },
          { x: 480, y: 25, w: 120, h: 190 },
        ];

        for (const p of peaks) {
          // Lit side of rock facet (Left face)
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.w * 0.5, p.y + p.h);
          ctx.lineTo(p.x, p.y + p.h);
          ctx.closePath();
          ctx.fill();

          // Shadowed side of rock facet (Right face)
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.w * 0.5, p.y + p.h);
          ctx.lineTo(p.x, p.y + p.h);
          ctx.closePath();
          ctx.fill();

          // Dry-brushed summit snow cap
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.w * 0.18, p.y + 35);
          ctx.lineTo(p.x + p.w * 0.12, p.y + 32);
          ctx.closePath();
          ctx.fill();

          // Soft ice-blue shadow on snow
          ctx.fillStyle = '#93c5fd';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.w * 0.12, p.y + 32);
          ctx.lineTo(p.x, p.y + 28);
          ctx.closePath();
          ctx.fill();

          // Ridge knife-edge highlight
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.h);
          ctx.stroke();
        }

        // Scree slope striations & fine texture
        for (let i = 0; i < 600; i++) {
          const rx = (i * 43) % 512;
          const ry = 80 + ((i * 17) % 170);
          ctx.fillStyle = i % 3 === 0 ? '#94a3b8' : i % 3 === 1 ? '#475569' : '#0f172a';
          ctx.fillRect(rx, ry, 2, 1.2);
        }
      }
    } else if (key === 'terrain_ocean_surface') {
      // 2.5D Military Model-Kit Ocean Epoxy Resin Water Surface Tile (512x256)
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Deep maritime epoxy resin gradient
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, 256);
        oceanGrad.addColorStop(0, '#0284c7');
        oceanGrad.addColorStop(0.3, '#0369a1');
        oceanGrad.addColorStop(0.7, '#075985');
        oceanGrad.addColorStop(1, '#082f49');
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, 0, 512, 256);

        // Translucent turquoise shallows & caustic light netting
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        for (let y = 10; y < 250; y += 22) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x <= 512; x += 28) {
            ctx.lineTo(x, y + Math.sin(x * 0.05 + y * 0.1) * 6);
          }
          ctx.lineTo(512, y + 14);
          ctx.lineTo(0, y + 14);
          ctx.closePath();
          ctx.fill();
        }

        // Fine White Wave Crest Ripples & Specular Model-Kit Airbrush Lines
        for (let y = 15; y < 250; y += 24) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let x = 0; x <= 512; x += 20) {
            const wy = y + Math.sin(x * 0.06 + y * 0.08) * 3;
            if (x === 0) ctx.moveTo(x, wy);
            else ctx.lineTo(x, wy);
          }
          ctx.stroke();

          // Glinting foam dots
          for (let gx = (y * 11) % 40; gx < 512; gx += 50) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(gx, y + Math.sin(gx * 0.06 + y * 0.08) * 3 - 0.5, 3, 1.2);
          }
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  public static registerDataUrl(key: string, dataUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.spriteImages.set(key, img);
        resolve(true);
      };
      img.onerror = () => {
        resolve(false);
      };
      img.src = dataUrl;
    });
  }

  /**
   * Unified Canvas Sprite & Bounding Box Fallback Renderer
   */
  public static drawSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    options?: {
      rotation?: number;
      flipX?: boolean;
      opacity?: number;
      fallbackLabel?: string;
      fallbackColor?: string;
    }
  ) {
    const sprite = this.getSprite(key);
    const rotation = options?.rotation || 0;
    const flipX = options?.flipX || false;
    const opacity = options?.opacity !== undefined ? options.opacity : 1;

    ctx.save();
    ctx.translate(centerX, centerY);

    if (rotation !== 0) {
      ctx.rotate(rotation);
    }
    if (flipX) {
      ctx.scale(-1, 1);
    }
    if (opacity < 1) {
      ctx.globalAlpha *= opacity;
    }

    if (sprite) {
      // Draw Bitmap Texture
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
    } else {
      // Draw Lightweight Colored Placeholder Bounding Box Fallback
      const color = options?.fallbackColor || '#38bdf8';
      const label = options?.fallbackLabel || key.toUpperCase();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(-width / 2, -height / 2, width, height);
      ctx.setLineDash([]);

      // Corner Tactical Brackets
      const bLen = Math.min(8, width / 4);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(-width / 2 + bLen, -height / 2);
      ctx.lineTo(-width / 2, -height / 2);
      ctx.lineTo(-width / 2, -height / 2 + bLen);
      // Top-right
      ctx.moveTo(width / 2 - bLen, -height / 2);
      ctx.lineTo(width / 2, -height / 2);
      ctx.lineTo(width / 2, -height / 2 + bLen);
      // Bottom-left
      ctx.moveTo(-width / 2, height / 2 - bLen);
      ctx.lineTo(-width / 2, height / 2);
      ctx.lineTo(-width / 2 + bLen, height / 2);
      // Bottom-right
      ctx.moveTo(width / 2 - bLen, height / 2);
      ctx.lineTo(width / 2, height / 2);
      ctx.lineTo(width / 2, height / 2 - bLen);
      ctx.stroke();

      // Semi-transparent center fill
      ctx.fillStyle = `${color}22`;
      ctx.fillRect(-width / 2, -height / 2, width, height);

      // Center crosshair
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();

      // Fallback Label Text
      ctx.fillStyle = color;
      ctx.font = '700 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, 0, -height / 2 - 2);
    }

    ctx.restore();
  }

  public static drawSpriteAnchored(
    ctx: CanvasRenderingContext2D,
    key: string,
    anchorWorldX: number,
    anchorWorldY: number,
    width: number,
    height: number,
    anchorX: number,
    anchorY: number,
    options?: { rotation?: number; flipX?: boolean; opacity?: number; fallbackLabel?: string; fallbackColor?: string }
  ) {
    const centerX = anchorWorldX + width * (0.5 - anchorX);
    const centerY = anchorWorldY + height * (0.5 - anchorY);
    this.drawSprite(ctx, key, centerX, centerY, width, height, options);
  }

  public static drawSpriteFrame(
    ctx: CanvasRenderingContext2D,
    key: string,
    frameIndex: number,
    frameCount: number,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    options?: { rotation?: number; flipX?: boolean; opacity?: number }
  ) {
    const sprite = this.getSprite(key);
    if (!sprite) {
      this.drawSprite(ctx, key, centerX, centerY, width, height, options);
      return;
    }

    const sourceWidth = sprite.naturalWidth / frameCount;
    const clampedFrame = Math.max(0, Math.min(frameCount - 1, frameIndex));
    ctx.save();
    ctx.translate(centerX, centerY);
    if (options?.rotation) ctx.rotate(options.rotation);
    if (options?.flipX) ctx.scale(-1, 1);
    if (options?.opacity !== undefined) ctx.globalAlpha *= options.opacity;
    ctx.drawImage(
      sprite,
      sourceWidth * clampedFrame,
      0,
      sourceWidth,
      sprite.naturalHeight,
      -width / 2,
      -height / 2,
      width,
      height
    );
    ctx.restore();
  }

  public static drawSpriteFrameAnchored(
    ctx: CanvasRenderingContext2D,
    key: string,
    frameIndex: number,
    frameCount: number,
    anchorWorldX: number,
    anchorWorldY: number,
    width: number,
    height: number,
    anchorX: number,
    anchorY: number,
    options?: { rotation?: number; flipX?: boolean; opacity?: number }
  ) {
    const centerX = anchorWorldX + width * (0.5 - anchorX);
    const centerY = anchorWorldY + height * (0.5 - anchorY);
    this.drawSpriteFrame(ctx, key, frameIndex, frameCount, centerX, centerY, width, height, options);
  }
}

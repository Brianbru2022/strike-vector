import { ArcticWeatherState, DifficultyPreset, MissionDefinition, RenderQuality, SeaState, TimeOfDay, WeatherEffect } from '../types/game';
import { GAME_CONSTANTS } from './constants';
import { TextureGenerator } from './TextureGenerator';
import { SpriteAssetManager } from './SpriteAssetManager';
import { assetManager } from './AssetManager';
import { getEnvironmentPresentation, SIGNATURE_PRESENTATION } from './Presentation';
import { ARCTIC_TERRAIN_HEIGHT_PROFILES, getDifficultyAdjustedArcticWeatherState, sampleAuthoredTerrainHeight } from './ArcticToolkit';
import { DEMO_BUILD } from './ReleaseFeatures';
import { calculateTerrainShadow, drawTerrainShadow } from './TerrainShadow';
import { getForegroundTreatment } from './ForegroundPresentation';

type ActThreeBackdropKey = 'JANUS_CAUSEWAY' | 'JANUS_AIRBASE' | 'SKELD_DEFENCE' | 'BASTION_FORTRESS';

export interface BackdropCrop {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
}

/**
 * Calculates a source rectangle that always remains inside the painting while
 * covering the destination canvas. Some panorama plates are slightly narrower
 * than 16:9 once their lower terrain strip is excluded, so requesting a fixed
 * 16:9 slice can otherwise make Canvas clip the right edge of the draw.
 */
export function calculateBackdropCrop(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  cameraX: number,
  usableHeightRatio = 0.86,
  parallax = 0.012,
  focusScale = 1,
): BackdropCrop {
  const safeImageWidth = Math.max(1, imageWidth);
  const safeImageHeight = Math.max(1, imageHeight);
  const safeCanvasWidth = Math.max(1, canvasWidth);
  const safeCanvasHeight = Math.max(1, canvasHeight);
  const availableHeight = Math.min(safeImageHeight, safeImageHeight * usableHeightRatio);
  const destinationAspect = safeCanvasWidth / safeCanvasHeight;
  const safeFocusScale = Math.max(1, Math.min(1.18, focusScale));
  const focusedHeight = availableHeight / safeFocusScale;

  const sourceWidth = Math.min(safeImageWidth, focusedHeight * destinationAspect);
  const sourceHeight = Math.min(focusedHeight, sourceWidth / destinationAspect);
  const horizontalTravel = Math.max(0, safeImageWidth - sourceWidth);
  const cycle = Math.max(1, horizontalTravel * 2);
  const phase = ((cameraX * parallax) % cycle + cycle) % cycle;
  const sourceX = horizontalTravel === 0
    ? 0
    : Math.min(horizontalTravel, phase <= horizontalTravel ? phase : cycle - phase);

  const sourceY = Math.max(0, Math.min(safeImageHeight - sourceHeight, (availableHeight - sourceHeight) * 0.34));
  return { sourceX, sourceY, sourceWidth, sourceHeight };
}

export class TerrainSystem {
  private reducedEffects = false;
  private wavePhase = 0;
  private lightningTimer = 0;
  private paintedBackdrop: HTMLImageElement | null = null;
  private paintedBackdropReady = false;
  private fjordBackdrop: HTMLImageElement | null = null;
  private forwardBaseBackdrop: HTMLImageElement | null = null;
  private convoyBackdrop: HTMLImageElement | null = null;
  private rescueBackdrop: HTMLImageElement | null = null;
  private fleetBackdrop: HTMLImageElement | null = null;
  private arcticDeepFjordTexture: HTMLImageElement | null = null;
  private arcticBridgeheadTexture: HTMLImageElement | null = null;
  private actThreeBackdrops: Partial<Record<ActThreeBackdropKey, HTMLImageElement>> = {};
  private actThreeSurfaces: Partial<Record<ActThreeBackdropKey, HTMLCanvasElement>> = {};
  private actThreeGroundProfiles: Partial<Record<ActThreeBackdropKey, Uint16Array>> = {};
  private presentationBackdrops = new Map<string, HTMLImageElement>();
  private coastalPanoramas: HTMLCanvasElement[] = [];
  private coastalGroundProfiles: Uint16Array[] = [];
  private oceanForeground: HTMLImageElement | null = null;
  private rainDrops: { x: number; y: number; speed: number; len: number }[] = [];
  private cloudClusters: { x: number; y: number; scale: number; speed: number }[] = [];
  private foamParticles: { x: number; y: number; alpha: number; size: number }[] = [];
  private weatherTick = 0;
  private difficulty: DifficultyPreset = 'PILOT';
  private renderQuality: RenderQuality = 'HIGH';

  constructor() {
    TextureGenerator.init();

    if (typeof Image !== 'undefined') {
      this.paintedBackdrop = new Image();
      this.paintedBackdrop.decoding = 'async';
      this.paintedBackdrop.onload = () => {
        this.paintedBackdropReady = true;
      };
      this.paintedBackdrop.src = '/assets/backgrounds/north-atlantic-dawn-painted.webp';
      this.fleetBackdrop = this.loadLayer('/assets/backgrounds/storm-fleet-painted-v1.webp');
      if (!DEMO_BUILD) {
        this.fjordBackdrop = this.loadLayer('/assets/backgrounds/fjord-pass-painted-v1.webp');
        this.forwardBaseBackdrop = this.loadLayer('/assets/backgrounds/forward-base-painted-v1.webp');
        this.convoyBackdrop = this.loadLayer('/assets/backgrounds/convoy-valley-painted-v1.webp');
        this.rescueBackdrop = this.loadLayer('/assets/backgrounds/rescue-coast-painted-v1.webp');
        this.arcticDeepFjordTexture = this.loadLayer('/assets/terrain/arctic-deep-fjord-contact-v1.png');
        this.arcticBridgeheadTexture = this.loadLayer('/assets/backgrounds/arctic-bridgehead-operational-v1.webp');
        this.actThreeBackdrops = {
          JANUS_CAUSEWAY: this.loadLayer('/assets/backgrounds/janus-causeway-painted-v1.webp'),
          JANUS_AIRBASE: this.loadLayer('/assets/backgrounds/janus-airbase-night-painted-v1.webp'),
          SKELD_DEFENCE: this.loadLayer('/assets/backgrounds/skeld-defence-dawn-painted-v1.webp'),
          BASTION_FORTRESS: this.loadLayer('/assets/backgrounds/mission-10-bastion-hero-v3.webp'),
        };
        this.actThreeSurfaces = {
          JANUS_CAUSEWAY: this.loadAuthoredSurface('/assets/layers/janus-causeway-surface-v2.webp', 'JANUS_CAUSEWAY'),
          JANUS_AIRBASE: this.loadAuthoredSurface('/assets/layers/janus-airbase-surface-v2.webp', 'JANUS_AIRBASE'),
          SKELD_DEFENCE: this.loadAuthoredSurface('/assets/layers/skeld-defence-surface-v2.webp', 'SKELD_DEFENCE'),
          BASTION_FORTRESS: this.loadAuthoredSurface('/assets/layers/bastion-fortress-surface-v3.webp', 'BASTION_FORTRESS'),
        };
      }

      this.coastalPanoramas = [
        '/assets/layers/coast-approach-panorama.webp',
        '/assets/layers/coast-basalt-panorama.webp',
        '/assets/layers/coast-tundra-panorama.webp',
        '/assets/layers/coast-beach-panorama.webp',
      ].map((url, index, layers) => this.loadCoastalLayer(
        url,
        index,
        index === 0 ? 0.24 : 0.12,
        index === layers.length - 1 ? 0.18 : 0
      ));
      this.oceanForeground = this.loadLayer('/assets/layers/ocean-foreground-panorama.webp');
      for (const presentation of Object.values(SIGNATURE_PRESENTATION).filter((_, index) => !DEMO_BUILD || index < 2)) {
        this.presentationBackdrops.set(presentation.backdropAsset, this.loadLayer(presentation.backdropAsset));
      }
    }

    // Rain particles
    for (let i = 0; i < 140; i++) {
      this.rainDrops.push({
        x: Math.random() * GAME_CONSTANTS.VIEWPORT_WIDTH,
        y: Math.random() * GAME_CONSTANTS.VIEWPORT_HEIGHT,
        speed: 15 + Math.random() * 12,
        len: 14 + Math.random() * 12,
      });
    }

    // 2.5D Volumetric Sky Clouds
    for (let i = 0; i < 8; i++) {
      this.cloudClusters.push({
        x: i * 280 + Math.random() * 80,
        y: 35 + Math.random() * 120,
        scale: 0.7 + Math.random() * 0.6,
        speed: 0.08 + Math.random() * 0.12,
      });
    }

    // Coastal surf foam
    for (let i = 0; i < 40; i++) {
      this.foamParticles.push({
        x: Math.random() * GAME_CONSTANTS.VIEWPORT_WIDTH,
        y: GAME_CONSTANTS.SEA_LEVEL_Y + Math.random() * 6,
        alpha: Math.random(),
        size: 2 + Math.random() * 4,
      });
    }
  }

  public setReducedEffects(reduced: boolean) {
    this.reducedEffects = reduced;
    if (reduced) this.lightningTimer = 0;
  }

  public setRenderQuality(quality: RenderQuality) {
    this.renderQuality = quality;
    if (quality === 'LOW') this.lightningTimer = 0;
  }

  public beginMission(): void {
    this.weatherTick = 0;
    this.wavePhase = 0;
    this.lightningTimer = 0;
  }

  public setDifficulty(difficulty: DifficultyPreset): void {
    this.difficulty = difficulty;
  }

  public getArcticWeatherState(mission: MissionDefinition): ArcticWeatherState | null {
    return mission.arcticWeather
      ? getDifficultyAdjustedArcticWeatherState(mission.arcticWeather, this.weatherTick, this.difficulty)
      : null;
  }

  public update(weather: WeatherEffect) {
    this.weatherTick++;
    this.wavePhase += 0.035;

    // Cloud drift
    for (const c of this.cloudClusters) {
      c.x += c.speed;
      if (c.x > GAME_CONSTANTS.VIEWPORT_WIDTH + 300) {
        c.x = -300;
        c.y = 35 + Math.random() * 120;
      }
    }

    // Thunderstorm lightning
    if (weather.condition === 'THUNDERSTORM' && !this.reducedEffects) {
      this.lightningTimer--;
      if (this.lightningTimer <= 0 && Math.random() < 0.012) {
        this.lightningTimer = 8;
      }
    }

    // Rain simulation
    if (weather.condition === 'RAIN' || weather.condition === 'THUNDERSTORM') {
      for (const drop of this.rainDrops) {
        drop.y += drop.speed;
        drop.x -= 4;
        if (drop.y > GAME_CONSTANTS.VIEWPORT_HEIGHT) {
          drop.y = -20;
          drop.x = Math.random() * (GAME_CONSTANTS.VIEWPORT_WIDTH + 200);
        }
      }
    }

    // Surf foam animation
    for (const f of this.foamParticles) {
      f.alpha += 0.02;
      if (f.alpha > 1) f.alpha = 0;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    mission: MissionDefinition
  ) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const tod = mission.timeOfDay;
    const seaY = GAME_CONSTANTS.SEA_LEVEL_Y;

    const activeBackdrop = this.getActiveBackdrop(mission);
    if (activeBackdrop?.complete && activeBackdrop.naturalWidth > 0) {
      this.renderPaintedBackdrop(ctx, cameraX, mission, activeBackdrop);
      // The near-water plane persists for the entire sortie. Land is then
      // composited above it, preventing carrier visibility from changing the sea.
      if (mission.terrainProfile !== 'POLAR_NIGHT_PLATEAU') {
        this.drawOceanForeground(ctx, seaY - 24, getEnvironmentPresentation(mission).seaState);
      }
      this.renderOperationalSurface(ctx, cameraX, mission);
    } else {
      // Keep the procedural renderer as a loading and old-browser fallback only.
      const skyGrad = ctx.createLinearGradient(0, 0, 0, seaY);
      skyGrad.addColorStop(0, tod.skyTopColor);
      skyGrad.addColorStop(0.65, tod.skyBottomColor);
      skyGrad.addColorStop(1, tod.fogColor);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);
      this.renderCelestialBody(ctx, cameraX, tod, seaY);
      this.renderVolumetricClouds(ctx, cameraX, tod);
      this.renderDistantMountains(ctx, cameraX, tod, seaY);
      this.renderMidgroundRidges(ctx, cameraX, tod, seaY);
      this.renderNearHeadlands(ctx, cameraX, tod, seaY);
      this.renderPrimaryTerrain(ctx, cameraX, mission);
      this.renderPerspectiveOcean(ctx, cameraX, tod);
    }

    this.renderPresentationAtmosphere(ctx, mission);

    // Lightning must sit above either background pipeline.
    if (this.lightningTimer > 0) {
      // Illuminate the storm without bleaching targets, waterlines or HUD
      // context from the frame. Reduced effects suppresses the event entirely.
      ctx.fillStyle = `rgba(228, 238, 248, ${Math.min(0.22, this.lightningTimer * 0.0275)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Aircraft Carriers (Launch and Recovery)
    if (mission.hasCarrierLaunch) {
      if (mission.launchSite === 'FORWARD_BASE') {
        this.renderForwardBase(ctx, cameraX, mission, mission.carrierX);
      } else {
        this.renderCarrier25D(ctx, cameraX, mission.carrierX, 'LAUNCH', tod);
      }
    }
    if (mission.hasCarrierRecovery && mission.recoverySite !== 'FORWARD_BASE' && mission.carrierLandingX !== mission.carrierX) {
      this.renderCarrier25D(ctx, cameraX, mission.carrierLandingX, 'RECOVERY', tod);
    }
    if (mission.hasCarrierRecovery && mission.recoverySite === 'FORWARD_BASE' && mission.carrierLandingX !== mission.carrierX) {
      this.renderForwardBase(ctx, cameraX, mission, mission.carrierLandingX);
    }

    // --- LAYER 7: FOREGROUND WEATHER & ATMOSPHERE ---
    this.renderWeatherAndAtmosphere(ctx, mission, width, height);
  }

  private loadLayer(url: string): HTMLImageElement {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    return image;
  }

  private getActiveBackdrop(mission: MissionDefinition): HTMLImageElement | null {
    const presentation = getEnvironmentPresentation(mission);
    const presentationBackdrop = this.presentationBackdrops.get(presentation.backdropAsset);
    if (presentationBackdrop) return presentationBackdrop;
    if (typeof Image !== 'undefined') {
      const backdrop = this.loadLayer(presentation.backdropAsset);
      this.presentationBackdrops.set(presentation.backdropAsset, backdrop);
      return backdrop;
    }
    const authoredBackdrop = mission.terrainContact?.backdropKey
      ? this.actThreeBackdrops[mission.terrainContact.backdropKey]
      : null;
    if (authoredBackdrop) return authoredBackdrop;
    if (mission.terrainProfile === 'FJORD_PASS') return this.fjordBackdrop;
    if (mission.terrainProfile === 'FORWARD_BASE') return this.forwardBaseBackdrop;
    if (mission.terrainProfile === 'COAST_ROAD') return this.convoyBackdrop;
    if (mission.terrainProfile === 'BEACHHEAD') return this.rescueBackdrop;
    if (mission.terrainProfile === 'OPEN_SEA') return this.fleetBackdrop;
    return this.paintedBackdropReady ? this.paintedBackdrop : null;
  }

  private loadCoastalLayer(
    url: string,
    index: number,
    featherLeft: number,
    featherRight: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const layerContext = canvas.getContext('2d');
      if (!layerContext) return;
      layerContext.drawImage(image, 0, 0);
      if (featherLeft > 0) {
        layerContext.globalCompositeOperation = 'destination-in';
        const mask = layerContext.createLinearGradient(0, 0, canvas.width * featherLeft, 0);
        mask.addColorStop(0, 'rgba(0, 0, 0, 0)');
        mask.addColorStop(1, 'rgba(0, 0, 0, 1)');
        layerContext.fillStyle = mask;
        layerContext.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (featherRight > 0) {
        layerContext.globalCompositeOperation = 'destination-in';
        const mask = layerContext.createLinearGradient(
          canvas.width * (1 - featherRight),
          0,
          canvas.width,
          0
        );
        mask.addColorStop(0, 'rgba(0, 0, 0, 1)');
        mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
        layerContext.fillStyle = mask;
        layerContext.fillRect(0, 0, canvas.width, canvas.height);
      }
      layerContext.globalCompositeOperation = 'source-over';
      this.coastalGroundProfiles[index] = this.buildGroundProfile(layerContext, canvas.width, canvas.height);
    };
    image.src = url;
    return canvas;
  }

  private loadAuthoredSurface(url: string, key: ActThreeBackdropKey): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const layerContext = canvas.getContext('2d');
      if (!layerContext) return;
      layerContext.drawImage(image, 0, 0);
      // Capture contact before visual feathering so landing/collision geometry
      // stays authoritative while the painted plate blends into adjoining sea
      // and terrain instead of ending as a rectangular cliff.
      this.actThreeGroundProfiles[key] = this.buildGroundProfile(layerContext, canvas.width, canvas.height);
      layerContext.globalCompositeOperation = 'destination-in';
      const edgeMask = layerContext.createLinearGradient(0, 0, canvas.width, 0);
      edgeMask.addColorStop(0, 'rgba(0, 0, 0, 0)');
      edgeMask.addColorStop(0.055, 'rgba(0, 0, 0, 1)');
      edgeMask.addColorStop(0.945, 'rgba(0, 0, 0, 1)');
      edgeMask.addColorStop(1, 'rgba(0, 0, 0, 0)');
      layerContext.fillStyle = edgeMask;
      layerContext.fillRect(0, 0, canvas.width, canvas.height);
      layerContext.globalCompositeOperation = 'source-over';
    };
    image.src = url;
    return canvas;
  }

  private buildGroundProfile(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): Uint16Array {
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const profile = new Uint16Array(width);
    profile.fill(0xffff);

    // Ignore isolated grass, spray and antialiasing above the solid terrain mass.
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height - 11; y++) {
        let solidPixels = 0;
        for (let sampleY = y; sampleY < y + 12; sampleY++) {
          if (pixels[(sampleY * width + x) * 4 + 3] >= 64) solidPixels++;
        }
        if (solidPixels >= 8) {
          profile[x] = y;
          break;
        }
      }
    }

    return profile;
  }

  private getOperationalSurfaceLayout(mission: MissionDefinition) {
    const startWorldX = mission.launchSite === 'FORWARD_BASE' ? 80 : 1200;
    // The defended FARP and its ridge battery occupy the eastern end of the
    // route. Keep their authored surface beneath them; other coastal missions
    // retain a long open-water recovery approach.
    const endWorldX = mission.terrainProfile === 'FORWARD_BASE'
      ? mission.mapLength - 180
      : mission.mapLength - 1400;
    const landWidth = endWorldX - startWorldX;
    const overlap = 280;
    const treatment = this.getTerrainTreatment(mission);
    const authoredKey = mission.terrainContact?.backdropKey;
    const hasAuthoredSurface = Boolean(authoredKey && this.actThreeSurfaces[authoredKey]);
    const panoramaIndices = hasAuthoredSurface ? [0] : treatment.panoramaIndices;
    const panelCount = panoramaIndices.length;
    const panelWidth = panelCount > 0
      ? (landWidth + overlap * (panelCount - 1)) / panelCount
      : 0;
    return {
      startWorldX,
      landWidth,
      overlap,
      panelWidth,
      panelHeight: treatment.panelHeight,
      surfaceY: hasAuthoredSurface
        ? GAME_CONSTANTS.GROUND_SURFACE_Y - treatment.panelHeight + (mission.terrainContact?.surfaceOffset || 0)
        : GAME_CONSTANTS.GROUND_SURFACE_Y + treatment.surfaceOffset + (mission.terrainContact?.surfaceOffset || 0),
      panoramaIndices,
      filter: treatment.filter,
    };
  }

  private getTerrainTreatment(mission: MissionDefinition) {
    switch (mission.terrainProfile) {
      case 'FJORD_PASS':
        return { panoramaIndices: [0, 1, 1, 3], panelHeight: 390, surfaceOffset: -45, filter: 'saturate(0.72) contrast(1.16) brightness(0.82)' };
      case 'COAST_ROAD':
        return { panoramaIndices: [0, 2, 2, 3], panelHeight: 300, surfaceOffset: 10, filter: 'saturate(0.82) contrast(1.08) brightness(0.92)' };
      case 'NIGHT_AIRBASE':
        return { panoramaIndices: [0, 2, 1, 3], panelHeight: 240, surfaceOffset: 22, filter: 'saturate(0.45) contrast(1.25) brightness(0.58)' };
      case 'BEACHHEAD':
        return { panoramaIndices: [0, 0, 2, 3], panelHeight: 250, surfaceOffset: 24, filter: 'saturate(1.08) contrast(1.04) brightness(1.03)' };
      case 'OPEN_SEA':
        return { panoramaIndices: [] as number[], panelHeight: 0, surfaceOffset: 0, filter: 'none' };
      case 'ARCTIC_OPEN_SEA':
      case 'ARCTIC_DEEP_FJORD':
      case 'ARCTIC_BRIDGEHEAD':
      case 'POLAR_NIGHT_PLATEAU':
      case 'NORTH_CAPE_FORTRESS':
        return { panoramaIndices: [] as number[], panelHeight: 0, surfaceOffset: 0, filter: 'none' };
      case 'ISLAND_CAUSEWAY':
        return { panoramaIndices: [0, 2, 0, 3], panelHeight: 260, surfaceOffset: 18, filter: 'saturate(0.9) contrast(1.12) brightness(0.88)' };
      case 'FORWARD_BASE':
        return { panoramaIndices: [0, 1, 2, 3], panelHeight: 200, surfaceOffset: 14, filter: 'saturate(0.62) contrast(1.16) brightness(0.8)' };
      case 'FORTRESS':
        return { panoramaIndices: [0, 1, 1, 3], panelHeight: 360, surfaceOffset: -20, filter: 'saturate(0.58) contrast(1.24) brightness(0.7)' };
      case 'COASTAL_STRIKE':
      default:
        return { panoramaIndices: [0, 1, 2, 3], panelHeight: 330, surfaceOffset: 0, filter: 'none' };
    }
  }

  /** Returns the visible painted terrain edge at a world position. */
  public getGroundY(worldX: number, mission: MissionDefinition): number {
    return this.getGroundContactY(worldX, mission) ?? this.getOperationalSurfaceLayout(mission).surfaceY;
  }

  /** Returns the exact authored contact edge, or null where the route is open water. */
  public getGroundContactY(worldX: number, mission: MissionDefinition): number | null {
    const authoredHeight = mission.terrainContact?.heightProfile
      ?? (mission.terrainProfile ? ARCTIC_TERRAIN_HEIGHT_PROFILES[mission.terrainProfile] : undefined);
    if (authoredHeight) return sampleAuthoredTerrainHeight(authoredHeight, worldX);
    const { startWorldX, overlap, panelWidth, panelHeight, surfaceY, panoramaIndices } = this.getOperationalSurfaceLayout(mission);
    if (panelWidth <= 0) return null;

    // Later panels are painted above earlier panels within the blended overlaps.
    for (let index = panoramaIndices.length - 1; index >= 0; index--) {
      const sourceIndex = panoramaIndices[index];
      const authoredKey = mission.terrainContact?.backdropKey;
      const canvas = authoredKey ? this.actThreeSurfaces[authoredKey] : this.coastalPanoramas[sourceIndex];
      const profile = authoredKey ? this.actThreeGroundProfiles[authoredKey] : this.coastalGroundProfiles[sourceIndex];
      if (!canvas) continue;
      const panelWorldX = startWorldX + index * (panelWidth - overlap);
      if (!profile || canvas.width === 0 || worldX < panelWorldX || worldX > panelWorldX + panelWidth) continue;

      const progress = (worldX - panelWorldX) / panelWidth;
      const sourceX = Math.max(0, Math.min(canvas.width - 1, Math.round(progress * (canvas.width - 1))));
      const sourceY = profile[sourceX];
      if (sourceY !== 0xffff) return surfaceY + (sourceY / canvas.height) * panelHeight;
    }

    return null;
  }

  private renderPaintedBackdrop(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    mission: MissionDefinition,
    backdrop: HTMLImageElement
  ) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const tod = mission.timeOfDay;
    const presentation = getEnvironmentPresentation(mission);
    const crop = calculateBackdropCrop(
      backdrop.naturalWidth,
      backdrop.naturalHeight,
      width,
      height,
      cameraX,
      Math.max(0.82, 1 - presentation.overscan),
      presentation.parallax,
      width / Math.max(1, height) >= 2 ? presentation.ultrawideFocus ?? 1.07 : 1,
    );

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = presentation.backdropFilter;
    ctx.drawImage(
      backdrop,
      crop.sourceX,
      crop.sourceY,
      crop.sourceWidth,
      crop.sourceHeight,
      0,
      0,
      width,
      height
    );
    ctx.filter = 'none';

    if (presentation.overlayColour !== 'transparent') {
      ctx.fillStyle = presentation.overlayColour;
      ctx.fillRect(0, 0, width, height);
    }

    // Re-grade the shared dawn painting for the authored mission time.
    if (tod.time === 'NIGHT') {
      ctx.fillStyle = 'rgba(2, 8, 23, 0.62)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(19, 42, 73, 0.28)';
      ctx.fillRect(0, 0, width, height);
    } else if (tod.time === 'SUNSET') {
      ctx.fillStyle = 'rgba(91, 33, 8, 0.16)';
      ctx.fillRect(0, 0, width, height);
    } else if (tod.time === 'DAY') {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.07)';
      ctx.fillRect(0, 0, width, height);
    }

    // Flatten only the busy middle-distance corridor. Targets retain their own
    // colour and contrast because this grade is applied before gameplay units.
    const calm = Math.max(0, Math.min(1, presentation.gameplayCalm ?? 0.48));
    if (calm > 0) {
      const corridor = ctx.createLinearGradient(0, height * 0.16, 0, height * 0.78);
      corridor.addColorStop(0, 'rgba(15, 29, 40, 0)');
      corridor.addColorStop(0.28, `rgba(15, 29, 40, ${calm * 0.055})`);
      corridor.addColorStop(0.72, `rgba(15, 29, 40, ${calm * 0.075})`);
      corridor.addColorStop(1, 'rgba(15, 29, 40, 0)');
      ctx.fillStyle = corridor;
      ctx.fillRect(0, 0, width, height);
    }

    if (width / Math.max(1, height) >= 2) {
      const sideFocus = ctx.createLinearGradient(0, 0, width, 0);
      const alpha = 0.05 + presentation.vignetteStrength * 0.12;
      sideFocus.addColorStop(0, `rgba(2, 7, 14, ${alpha})`);
      sideFocus.addColorStop(0.18, 'rgba(2, 7, 14, 0)');
      sideFocus.addColorStop(0.82, 'rgba(2, 7, 14, 0)');
      sideFocus.addColorStop(1, `rgba(2, 7, 14, ${alpha})`);
      ctx.fillStyle = sideFocus;
      ctx.fillRect(0, 0, width, height);
    }

    // Keep instruments and silhouettes legible without flattening the painting.
    const edgeShade = ctx.createLinearGradient(0, 0, 0, height);
    edgeShade.addColorStop(0, `rgba(2, 6, 23, ${0.08 + presentation.vignetteStrength * 0.18})`);
    edgeShade.addColorStop(0.48, 'rgba(2, 6, 23, 0)');
    edgeShade.addColorStop(1, `rgba(2, 6, 23, ${0.18 + presentation.vignetteStrength * 0.4})`);
    ctx.fillStyle = edgeShade;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  private renderOperationalSurface(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    mission: MissionDefinition
  ) {
    const width = ctx.canvas.width;
    if (mission.terrainProfile === 'ARCTIC_DEEP_FJORD') {
      this.renderArcticDeepFjordSurface(ctx, cameraX, mission);
      return;
    }
    if (mission.terrainProfile === 'ARCTIC_BRIDGEHEAD') {
      this.renderArcticBridgeheadSurface(ctx, cameraX, mission);
      return;
    }
    if (mission.terrainProfile === 'POLAR_NIGHT_PLATEAU') {
      return;
    }
    const { startWorldX, landWidth, overlap, panelWidth, panelHeight, surfaceY, panoramaIndices, filter } = this.getOperationalSurfaceLayout(mission);
    if (landWidth <= 0 || this.coastalPanoramas.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.filter = filter;
    panoramaIndices.forEach((sourceIndex, index) => {
      const authoredKey = mission.terrainContact?.backdropKey;
      const image = authoredKey ? this.actThreeSurfaces[authoredKey] : this.coastalPanoramas[sourceIndex];
      if (!image) return;
      if (image.width === 0) return;
      const worldX = startWorldX + index * (panelWidth - overlap);
      const screenX = worldX - cameraX;
      if (screenX > width || screenX + panelWidth < 0) return;
      ctx.drawImage(image, screenX, surfaceY, panelWidth, panelHeight);
    });

    ctx.restore();
  }

  private renderArcticDeepFjordSurface(ctx: CanvasRenderingContext2D, cameraX: number, mission: MissionDefinition): void {
    const texture = this.arcticDeepFjordTexture;
    if (!texture?.complete || texture.naturalWidth <= 0) return;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const sourceWidth = texture.naturalWidth * 0.42;
    const routeProgress = cameraX / Math.max(1, mission.mapLength - width);
    const sourceX = Math.max(0, Math.min(texture.naturalWidth - sourceWidth, routeProgress * (texture.naturalWidth - sourceWidth)));
    const sourceY = texture.naturalHeight * 0.84;
    const sourceHeight = texture.naturalHeight - sourceY;
    const points: Array<{ x: number; y: number } | null> = [];
    for (let screenX = -24; screenX <= width + 24; screenX += 24) {
      const contactY = this.getGroundContactY(cameraX + screenX, mission);
      points.push(contactY === null ? null : { x: screenX, y: contactY });
    }

    const drawSegment = (segment: Array<{ x: number; y: number }>) => {
      if (segment.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(segment[0].x, segment[0].y);
      for (let index = 1; index < segment.length; index++) ctx.lineTo(segment[index].x, segment[index].y);
      ctx.lineTo(segment[segment.length - 1].x, height + 8);
      ctx.lineTo(segment[0].x, height + 8);
      ctx.closePath();
      ctx.clip();
      const base = ctx.createLinearGradient(0, 470, 0, height);
      base.addColorStop(0, '#52606a');
      base.addColorStop(0.35, '#293943');
      base.addColorStop(1, '#101d25');
      ctx.fillStyle = base;
      ctx.fillRect(segment[0].x, 430, segment[segment.length - 1].x - segment[0].x, height - 430);
      ctx.globalAlpha = 0.92;
      ctx.filter = 'saturate(0.72) contrast(1.16) brightness(0.76)';
      ctx.drawImage(texture, sourceX, sourceY, sourceWidth, sourceHeight, 0, 430, width, height - 430);
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(4, 14, 21, 0.58)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(segment[0].x, segment[0].y);
      for (let index = 1; index < segment.length; index++) ctx.lineTo(segment[index].x, segment[index].y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(164, 181, 188, 0.38)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Broken snow shelves retain a readable contact edge without creating a
      // continuous platform line across the fjord.
      ctx.strokeStyle = 'rgba(219, 229, 231, 0.68)';
      ctx.lineWidth = 2.2;
      for (let index = 0; index < segment.length - 1; index += 2) {
        const point = segment[index];
        const worldBand = Math.floor((cameraX + point.x) / 48);
        if (Math.abs((worldBand * 17 + 11) % 7) > 2) continue;
        const next = segment[Math.min(segment.length - 1, index + 1)];
        ctx.beginPath();
        ctx.moveTo(point.x + 3, point.y - 0.8);
        ctx.lineTo(Math.min(next.x - 2, point.x + 16 + Math.abs(worldBand % 11)), next.y - 0.8);
        ctx.stroke();
      }
      ctx.restore();
    };

    let segment: Array<{ x: number; y: number }> = [];
    for (const point of points) {
      if (point) segment.push(point);
      else {
        drawSegment(segment);
        segment = [];
      }
    }
    drawSegment(segment);
  }

  private renderArcticBridgeheadSurface(ctx: CanvasRenderingContext2D, cameraX: number, mission: MissionDefinition): void {
    const texture = this.arcticBridgeheadTexture;
    if (!texture?.complete || texture.naturalWidth <= 0) return;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const sourceWidth = texture.naturalWidth * 0.36;
    const routeProgress = Math.max(0, Math.min(1, cameraX / Math.max(1, mission.mapLength - width)));
    const sourceX = routeProgress * (texture.naturalWidth - sourceWidth);
    const sourceY = texture.naturalHeight * 0.5;
    const sourceHeight = texture.naturalHeight - sourceY;
    const points: Array<{ x: number; y: number } | null> = [];
    for (let screenX = -24; screenX <= width + 24; screenX += 24) {
      const contactY = this.getGroundContactY(cameraX + screenX, mission);
      points.push(contactY === null ? null : { x: screenX, y: contactY });
    }

    const drawSegment = (segment: Array<{ x: number; y: number }>) => {
      if (segment.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(segment[0].x, segment[0].y);
      for (let index = 1; index < segment.length; index++) ctx.lineTo(segment[index].x, segment[index].y);
      ctx.lineTo(segment[segment.length - 1].x, height + 8);
      ctx.lineTo(segment[0].x, height + 8);
      ctx.closePath();
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'saturate(0.82) contrast(1.12) brightness(0.82)';
      ctx.drawImage(texture, sourceX, sourceY, sourceWidth, sourceHeight, 0, 330, width, height - 330);
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(9, 21, 26, 0.6)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(segment[0].x, segment[0].y);
      for (let index = 1; index < segment.length; index++) ctx.lineTo(segment[index].x, segment[index].y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(205, 220, 222, 0.42)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    };

    let segment: Array<{ x: number; y: number }> = [];
    for (const point of points) {
      if (point) segment.push(point);
      else {
        drawSegment(segment);
        segment = [];
      }
    }
    drawSegment(segment);
  }

  private drawOceanForeground(ctx: CanvasRenderingContext2D, topY: number, seaState: SeaState = 'MODERATE') {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    if (this.oceanForeground?.complete && this.oceanForeground.naturalWidth > 0) {
      const drawHeight = Math.max(height - topY, width * (this.oceanForeground.naturalHeight / this.oceanForeground.naturalWidth));
      const waveAmount = seaState === 'HEAVY' ? 4.5 : seaState === 'MODERATE' ? 2.2 : 0.8;
      const visualOffset = Math.sin(this.wavePhase * (seaState === 'HEAVY' ? 0.9 : 0.55)) * waveAmount;
      ctx.drawImage(this.oceanForeground, -3, topY + visualOffset, width + 6, drawHeight + 6);
      return;
    }

    const fallback = ctx.createLinearGradient(0, topY, 0, height);
    fallback.addColorStop(0, '#16435a');
    fallback.addColorStop(1, '#061923');
    ctx.fillStyle = fallback;
    ctx.fillRect(0, topY, width, height - topY);
  }

  public renderForegroundWater(ctx: CanvasRenderingContext2D, mission: MissionDefinition): void {
    if (!['OPEN_SEA', 'ARCTIC_OPEN_SEA', 'ARCTIC_DEEP_FJORD', 'ARCTIC_BRIDGEHEAD'].includes(mission.terrainProfile || '')) return;
    ctx.save();
    ctx.globalAlpha = 0.9;
    this.drawOceanForeground(ctx, GAME_CONSTANTS.SEA_LEVEL_Y + 9, getEnvironmentPresentation(mission).seaState);
    ctx.restore();
  }

  private renderPresentationAtmosphere(ctx: CanvasRenderingContext2D, mission: MissionDefinition): void {
    const presentation = getEnvironmentPresentation(mission);
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.save();
    const haze = ctx.createLinearGradient(0, height * 0.34, 0, height);
    haze.addColorStop(0, 'rgba(210, 225, 232, 0)');
    haze.addColorStop(0.62, `rgba(177, 201, 211, ${presentation.hazeDensity * 0.12})`);
    haze.addColorStop(1, `rgba(7, 18, 27, ${presentation.hazeDensity * 0.22})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    if (!this.reducedEffects && presentation.sprayIntensity > 0.05) {
      ctx.fillStyle = `rgba(225, 238, 241, ${0.05 + presentation.sprayIntensity * 0.1})`;
      const count = Math.round(5 + presentation.sprayIntensity * 12);
      for (let index = 0; index < count; index++) {
        const x = ((index * 173 + this.wavePhase * 18) % (width + 140)) - 70;
        const y = GAME_CONSTANTS.SEA_LEVEL_Y + 5 + Math.sin(index * 1.7 + this.wavePhase) * 8;
        ctx.beginPath();
        ctx.ellipse(x, y, 14 + (index % 4) * 7, 1.5 + (index % 3), -0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderCelestialBody(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    tod: TimeOfDay,
    seaY: number
  ) {
    const width = ctx.canvas.width;
    const sunX = ((width * 0.72 - cameraX * 0.02) % (width + 300) + width + 300) % (width + 300) - 100;
    const sunY = tod.time === 'SUNSET' ? seaY - 130 : tod.time === 'NIGHT' ? 100 : 110;

    ctx.save();

    // Crepuscular God Rays (Sunset, Day & Dawn)
    if (tod.time === 'SUNSET' || tod.time === 'DAY' || tod.time === 'DAWN') {
      ctx.save();
      ctx.globalAlpha = tod.time === 'SUNSET' ? 0.16 : 0.07;
      const rayGrad = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, 450);
      rayGrad.addColorStop(0, tod.sunColor);
      rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = rayGrad;

      for (let angle = -0.8; angle <= 0.8; angle += 0.28) {
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.sin(angle) * 600 - 80, seaY);
        ctx.lineTo(sunX + Math.sin(angle + 0.14) * 600 + 80, seaY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Atmospheric Halo
    const haloGrad = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
    haloGrad.addColorStop(0, tod.sunColor);
    haloGrad.addColorStop(0.35, tod.sunColor.replace(/[\d.]+\)$/, '0.35)'));
    haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
    ctx.fill();

    // Celestial Disc
    ctx.fillStyle = tod.time === 'NIGHT' ? '#f1f5f9' : '#ffffff';
    ctx.beginPath();
    ctx.arc(sunX, sunY, tod.time === 'NIGHT' ? 16 : 22, 0, Math.PI * 2);
    ctx.fill();

    // Moon details
    if (tod.time === 'NIGHT') {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.beginPath();
      ctx.arc(sunX - 4, sunY - 3, 4, 0, Math.PI * 2);
      ctx.arc(sunX + 5, sunY + 4, 3, 0, Math.PI * 2);
      ctx.arc(sunX - 2, sunY + 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderVolumetricClouds(ctx: CanvasRenderingContext2D, cameraX: number, tod: TimeOfDay) {
    const width = ctx.canvas.width;
    ctx.save();

    const cloudStride = Math.max(this.reducedEffects ? 2 : 1, this.renderQuality === 'LOW' ? 2 : 1);
    for (let i = 0; i < this.cloudClusters.length; i++) {
      if (i % cloudStride !== 0) continue;
      const c = this.cloudClusters[i];
      const cx = ((c.x - cameraX * 0.05) % (width + 400) + width + 400) % (width + 400) - 200;
      const cy = c.y;

      const baseColor = tod.time === 'NIGHT' ? 'rgba(30, 41, 59, 0.45)' : tod.time === 'SUNSET' ? 'rgba(251, 146, 60, 0.35)' : 'rgba(255, 255, 255, 0.38)';
      const shadowColor = tod.time === 'NIGHT' ? 'rgba(15, 23, 42, 0.5)' : tod.time === 'SUNSET' ? 'rgba(154, 52, 18, 0.4)' : 'rgba(148, 163, 184, 0.3)';

      const puffs = [
        { ox: 0, oy: 0, r: 42 * c.scale },
        { ox: -32 * c.scale, oy: 8 * c.scale, r: 34 * c.scale },
        { ox: 36 * c.scale, oy: 6 * c.scale, r: 36 * c.scale },
        { ox: 70 * c.scale, oy: 12 * c.scale, r: 28 * c.scale },
        { ox: -62 * c.scale, oy: 14 * c.scale, r: 26 * c.scale },
      ];

      // Shadow base
      ctx.fillStyle = shadowColor;
      for (const p of puffs) {
        ctx.beginPath();
        ctx.arc(cx + p.ox, cy + p.oy + 8, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lit top
      ctx.fillStyle = baseColor;
      for (const p of puffs) {
        ctx.beginPath();
        ctx.arc(cx + p.ox, cy + p.oy, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // LAYER 2: 2.5D Distant Alpine Mountain Range rendered via ctx.drawImage()
  private renderDistantMountains(ctx: CanvasRenderingContext2D, cameraX: number, tod: TimeOfDay, seaY: number) {
    const width = ctx.canvas.width;
    const mountainTexture = assetManager.getTexture('terrain_mountain_range');
    ctx.save();

    // Far Parallax Layer (0.04x speed)
    const farParallax = cameraX * 0.04;
    const tileW = 512;
    const tileH = 256;
    const farDrawY = seaY - 240;

    if (mountainTexture) {
      ctx.globalAlpha = 0.55;
      const startTileX = -((farParallax) % tileW);
      for (let tx = startTileX - tileW; tx < width + tileW; tx += tileW) {
        ctx.drawImage(mountainTexture, tx, farDrawY, tileW, tileH);
      }
    }

    // Atmospheric Depth Tint for Distant Layer
    const farTint = ctx.createLinearGradient(0, seaY - 260, 0, seaY);
    if (tod.time === 'NIGHT') {
      farTint.addColorStop(0, 'rgba(15, 23, 42, 0.7)');
      farTint.addColorStop(1, 'rgba(2, 6, 23, 0.85)');
    } else if (tod.time === 'SUNSET') {
      farTint.addColorStop(0, 'rgba(88, 28, 135, 0.45)');
      farTint.addColorStop(1, 'rgba(69, 26, 3, 0.6)');
    } else {
      farTint.addColorStop(0, 'rgba(51, 65, 85, 0.4)');
      farTint.addColorStop(1, 'rgba(100, 116, 139, 0.5)');
    }
    ctx.fillStyle = farTint;
    ctx.fillRect(0, seaY - 260, width, 260);

    // Main Alpine Range Layer (0.08x parallax speed via ctx.drawImage)
    const midParallax = cameraX * 0.08;
    const midDrawY = seaY - 200;

    if (mountainTexture) {
      ctx.globalAlpha = 0.85;
      const midStartTileX = -((midParallax) % tileW);
      for (let tx = midStartTileX - tileW; tx < width + tileW; tx += tileW) {
        ctx.drawImage(mountainTexture, tx, midDrawY, tileW, tileH);
      }
    }

    // Atmospheric Horizon Haze
    const hazeGrad = ctx.createLinearGradient(0, seaY - 100, 0, seaY);
    hazeGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    hazeGrad.addColorStop(1, tod.time === 'NIGHT' ? 'rgba(15, 23, 42, 0.75)' : tod.fogColor);
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, seaY - 100, width, 100);

    ctx.restore();
  }

  // LAYER 3: Midground Rocky Crags & Ridges (0.22x Parallax via ctx.drawImage)
  private renderMidgroundRidges(ctx: CanvasRenderingContext2D, cameraX: number, tod: TimeOfDay, seaY: number) {
    const width = ctx.canvas.width;
    const mountainTexture = assetManager.getTexture('terrain_mountain_range');
    if (!mountainTexture) return;

    ctx.save();
    const parallax = cameraX * 0.22;
    const tileW = 384;
    const tileH = 192;
    const drawY = seaY - 150;

    ctx.globalAlpha = 0.92;
    const startTileX = -((parallax) % tileW);
    for (let tx = startTileX - tileW; tx < width + tileW; tx += tileW) {
      ctx.drawImage(mountainTexture, tx, drawY, tileW, tileH);
    }

    // Midground atmospheric shade
    ctx.fillStyle = tod.time === 'NIGHT' 
      ? 'rgba(15, 23, 42, 0.45)' 
      : tod.time === 'SUNSET' 
      ? 'rgba(76, 29, 149, 0.3)' 
      : 'rgba(20, 83, 45, 0.2)';
    ctx.fillRect(0, drawY + 20, width, seaY - drawY);

    ctx.restore();
  }

  // LAYER 4: Near Coastal Bluffs & Headlands (0.45x Parallax via ctx.drawImage)
  private renderNearHeadlands(ctx: CanvasRenderingContext2D, cameraX: number, tod: TimeOfDay, seaY: number) {
    const width = ctx.canvas.width;
    const coastTexture = assetManager.getTexture('terrain_coastal') || assetManager.getTexture('terrain_flat_coast');
    if (!coastTexture) return;

    ctx.save();
    const parallax = cameraX * 0.45;
    const tileW = 440;
    const tileH = 220;
    const drawY = seaY - 95;

    ctx.globalAlpha = 0.88;
    const startTileX = -((parallax) % tileW);
    for (let tx = startTileX - tileW; tx < width + tileW; tx += tileW) {
      ctx.drawImage(coastTexture, tx, drawY, tileW, tileH);
    }

    // Aviation radio towers with beacon lights
    const towerWorldPositions = [2200, 4800, 7500];
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    for (const tw of towerWorldPositions) {
      const sx = tw - cameraX * 0.45;
      if (sx > -50 && sx < width + 50) {
        const hillY = seaY - 80;
        // Mast
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, hillY);
        ctx.lineTo(sx, hillY - 44);
        ctx.stroke();
        // Crossbars
        ctx.beginPath();
        ctx.moveTo(sx - 6, hillY - 20);
        ctx.lineTo(sx + 6, hillY - 20);
        ctx.moveTo(sx - 4, hillY - 34);
        ctx.lineTo(sx + 4, hillY - 34);
        ctx.stroke();
        // Beacon
        if (blink) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(sx, hillY - 45, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // LAYER 5: Primary Battlefield Coastal Landmass (1.0x Parallax via ctx.drawImage)
  private renderPrimaryTerrain(ctx: CanvasRenderingContext2D, cameraX: number, mission: MissionDefinition) {
    const width = ctx.canvas.width;
    const seaY = GAME_CONSTANTS.SEA_LEVEL_Y;

    const startCoastX = 1200;
    const endCoastX = mission.mapLength - 1400;

    const screenStart = startCoastX - cameraX;
    const screenEnd = endCoastX - cameraX;

    if (screenEnd > -400 && screenStart < width + 400) {
      ctx.save();
      const coastTexture = assetManager.getTexture('terrain_coastal') || assetManager.getTexture('terrain_flat_coast');
      const tileW = 512;
      const tileH = 256;
      const drawY = seaY - 60;

      // Draw tiled coastal terrain bitmap tiles using ctx.drawImage()
      if (coastTexture) {
        ctx.globalAlpha = 1.0;
        const totalIslandW = endCoastX - startCoastX;
        const startTileIndex = Math.floor((Math.max(startCoastX, cameraX - 200) - startCoastX) / tileW);
        const endTileIndex = Math.ceil((Math.min(endCoastX, cameraX + width + 200) - startCoastX) / tileW);

        for (let i = startTileIndex; i <= endTileIndex; i++) {
          const worldX = startCoastX + i * tileW;
          if (worldX > endCoastX) break;
          const drawScreenX = worldX - cameraX;
          ctx.drawImage(coastTexture, drawScreenX, drawY, tileW, tileH);
        }
      }

      // Natural Pine & Fir Trees along battlefield terrain
      const step = 90;
      for (let wx = startCoastX + 160; wx <= endCoastX - 160; wx += step) {
        const sx = wx - cameraX;
        const isRunway = Math.abs(wx - 3200) < 320 || Math.abs(wx - 6400) < 320;
        if (!isRunway && (wx % 75 < 45) && sx > -50 && sx < width + 50) {
          this.renderPineTree(ctx, sx, seaY - 58);
        }
      }

      // Military Concrete Runway & Tarmac Touchdown Markings (at x = 2950)
      const runwaySx = 2950 - cameraX;
      if (runwaySx > -600 && runwaySx < width + 600) {
        // Foundation
        ctx.fillStyle = '#334155';
        ctx.fillRect(runwaySx, seaY - 48, 550, 12);

        // Yellow runway boundary lines
        ctx.fillStyle = '#eab308';
        ctx.fillRect(runwaySx, seaY - 48, 550, 2);
        ctx.fillRect(runwaySx, seaY - 38, 550, 2);

        // Centerline dashed white stripes
        ctx.fillStyle = '#ffffff';
        for (let r = 0; r < 7; r++) {
          ctx.fillRect(runwaySx + r * 80 + 20, seaY - 44, 45, 2.5);
        }

        // Touchdown skid marks
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(runwaySx + 60, seaY - 46, 120, 2.5);
        ctx.fillRect(runwaySx + 80, seaY - 41, 100, 2.5);
      }

      // Shoreline gentle surf foam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(screenStart + 10, seaY - 3, 35, 3);
      ctx.fillRect(screenEnd - 45, seaY - 3, 35, 3);

      ctx.restore();
    }
  }

  private renderPineTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
    SpriteAssetManager.drawSprite(ctx, 'tree_pine', x, y - 18, 24, 36, {
      fallbackColor: '#15803d',
      fallbackLabel: 'TREE',
    });
  }

  // LAYER 6: Perspective Ocean Surface with Bitmap Tileset via ctx.drawImage() & Wave Swells
  private renderPerspectiveOcean(ctx: CanvasRenderingContext2D, cameraX: number, tod: TimeOfDay) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const seaY = GAME_CONSTANTS.SEA_LEVEL_Y;
    const oceanTexture = assetManager.getTexture('terrain_ocean_surface');

    ctx.save();

    // Ocean Base Gradient
    const oceanGrad = ctx.createLinearGradient(0, seaY, 0, height);
    if (tod.time === 'NIGHT') {
      oceanGrad.addColorStop(0, '#0f172a');
      oceanGrad.addColorStop(0.4, '#090d16');
      oceanGrad.addColorStop(1, '#020617');
    } else if (tod.time === 'SUNSET') {
      oceanGrad.addColorStop(0, '#451a03');
      oceanGrad.addColorStop(0.3, '#1e1b4b');
      oceanGrad.addColorStop(1, '#0f172a');
    } else {
      oceanGrad.addColorStop(0, '#0284c7');
      oceanGrad.addColorStop(0.3, '#0369a1');
      oceanGrad.addColorStop(0.7, '#075985');
      oceanGrad.addColorStop(1, '#082f49');
    }
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, seaY, width, height - seaY);

    // Render perspective depth slices using ctx.drawImage()
    if (oceanTexture) {
      const slices = 3;
      const tileW = 512;
      const sliceHeight = (height - seaY) / slices;

      for (let s = 0; s < slices; s++) {
        const sliceY = seaY + s * sliceHeight;
        const progress = s / slices;
        const parallaxFactor = 0.6 + progress * 0.4;
        const scrollX = (cameraX * parallaxFactor + this.wavePhase * 15) % tileW;
        const startX = -scrollX;

        ctx.globalAlpha = 0.5 + progress * 0.3;
        for (let tx = startX - tileW; tx < width + tileW; tx += tileW) {
          ctx.drawImage(
            oceanTexture,
            0,
            s * (oceanTexture.naturalHeight / slices),
            oceanTexture.naturalWidth,
            oceanTexture.naturalHeight / slices,
            tx,
            sliceY,
            tileW,
            sliceHeight + 2
          );
        }
      }
    }

    // Natural undulating wave swell lines with depth compression
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const progress = r / rows;
      const y = seaY + progress * (height - seaY);
      const parallaxSpeed = 0.5 + progress * 0.7;
      const waveAmplitude = 1.2 + progress * 2.8;
      const waveFreq = 0.02 - progress * 0.008;

      const alpha = 0.12 + progress * 0.28;
      ctx.strokeStyle = tod.time === 'SUNSET' 
        ? `rgba(251, 146, 60, ${alpha})`
        : `rgba(224, 242, 254, ${alpha})`;
      ctx.lineWidth = 1.0 + progress * 1.2;

      ctx.beginPath();
      for (let x = 0; x <= width + 30; x += 30) {
        const waveOffset = Math.sin((x + cameraX * parallaxSpeed) * waveFreq + this.wavePhase * (1 + progress * 0.4)) * waveAmplitude;
        if (x === 0) ctx.moveTo(x, y + waveOffset);
        else ctx.lineTo(x, y + waveOffset);
      }
      ctx.stroke();

      // Specular glints on wave crests
      if ((tod.time === 'DAY' || tod.time === 'SUNSET') && this.renderQuality !== 'LOW') {
        ctx.fillStyle = tod.time === 'SUNSET' ? 'rgba(254, 215, 170, 0.4)' : 'rgba(255, 255, 255, 0.45)';
        for (let x = 40; x <= width; x += 140 - Math.floor(progress * 40)) {
          const glintX = (x + (cameraX * parallaxSpeed * 0.5)) % (width + 100);
          const glintY = y + Math.sin((glintX + cameraX * parallaxSpeed) * waveFreq + this.wavePhase) * waveAmplitude;
          ctx.fillRect(glintX, glintY - 0.5, 3 + progress * 4, 1.2);
        }
      }
    }

    // Coastal surf foam line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const foamStride = this.renderQuality === 'LOW' ? 3 : this.renderQuality === 'MEDIUM' ? 2 : 1;
    for (let index = 0; index < this.foamParticles.length; index += foamStride) {
      const f = this.foamParticles[index];
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * (1 - f.alpha), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderForwardBase(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    mission: MissionDefinition,
    siteWorldX: number
  ) {
    const screenX = siteWorldX - cameraX;
    const width = 520;
    const height = 140;
    if (screenX < -width - 80 || screenX > ctx.canvas.width + 80) return;

    const groundY = this.getGroundY(siteWorldX + 245, mission);
    const sprite = SpriteAssetManager.getSprite('forward_base');
    if (sprite) {
      ctx.save();
      const shadow = calculateTerrainShadow(
        siteWorldX + width * 0.5,
        width * 0.45,
        (worldX) => this.getGroundContactY(worldX, mission),
      );
      if (shadow) drawTerrainShadow(ctx, screenX + width * 0.5, shadow);
      // The sprite's plank surface sits 127 px into its 140 px display height.
      // Align that painted surface exactly with the recovery physics ground.
      ctx.filter = getForegroundTreatment({ spriteKey: 'forward_base', ambientLight: mission.timeOfDay.ambientLight }).filter;
      ctx.drawImage(sprite, screenX, groundY + 13 - height, width, height);
      ctx.filter = 'none';
      ctx.restore();
    }

    // The generated pad contains amber lamps; these subtle pulses make the
    // actual touchdown strip legible without drawing a modern HUD rectangle.
    ctx.save();
    for (let x = 130; x <= 335; x += 42) {
      const glow = 0.55 + Math.sin(this.wavePhase * 1.8 + x) * 0.18;
      ctx.fillStyle = `rgba(251, 191, 36, ${glow})`;
      ctx.beginPath();
      ctx.arc(screenX + x, groundY - 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderCarrier25D(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    carrierX: number,
    type: 'LAUNCH' | 'RECOVERY',
    tod: TimeOfDay
  ) {
    const screenX = carrierX - cameraX;
    const c = GAME_CONSTANTS.CARRIER;
    if (screenX < -c.WIDTH - 150 || screenX > ctx.canvas.width + 150) return;

    const paintedCarrier = SpriteAssetManager.getSprite('carrier_ship');
    if (paintedCarrier) {
      const spriteHeight = 128;
      const spriteTop = c.DECK_Y - 72;
      const waterlineY = c.DECK_Y + 43;

      ctx.save();
      ctx.filter = getForegroundTreatment({ spriteKey: 'carrier_ship', ambientLight: tod.ambientLight }).filter;

      // Broad wake behind the hull establishes motion and surface contact.
      const wake = ctx.createLinearGradient(screenX - 150, 0, screenX + 70, 0);
      wake.addColorStop(0, 'rgba(224, 242, 254, 0)');
      wake.addColorStop(0.45, 'rgba(224, 242, 254, 0.30)');
      wake.addColorStop(1, 'rgba(255, 255, 255, 0.10)');
      ctx.fillStyle = wake;
      ctx.beginPath();
      ctx.ellipse(screenX - 35, waterlineY + 3, 150, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clip the hull to an irregular wave edge so the already-rendered sea
      // remains visible beneath it without a rectangular texture repaint.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(screenX - 2, spriteTop - 4);
      ctx.lineTo(screenX + c.WIDTH + 2, spriteTop - 4);
      ctx.lineTo(screenX + c.WIDTH + 2, waterlineY);
      for (let x = screenX + c.WIDTH + 2; x >= screenX - 2; x -= 12) {
        ctx.lineTo(x, waterlineY + Math.sin(x * 0.045 + this.wavePhase) * 2);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(paintedCarrier, 0, 0, paintedCarrier.naturalWidth / 3, paintedCarrier.naturalHeight, screenX, spriteTop, c.WIDTH, spriteHeight);
      ctx.restore();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = screenX - 36; x <= screenX + c.WIDTH + 24; x += 18) {
        const y = waterlineY + Math.sin(x * 0.045 + this.wavePhase) * 2;
        if (x === screenX - 36) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (type === 'RECOVERY') {
        // Period deck-edge and optical-landing lights. Their sequence follows
        // the simulation-owned wave phase rather than wall-clock time.
        for (let index = 0; index < 7; index++) {
          const pulse = 0.48 + Math.sin(this.wavePhase * 2.4 + index * 0.9) * 0.22;
          ctx.fillStyle = `rgba(74, 222, 128, ${pulse})`;
          ctx.beginPath();
          ctx.arc(screenX + 58 + index * 38, c.DECK_Y - 8, index === 1 ? 3.8 : 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Animated deck crew, landing officer and servicing trolley give the
      // otherwise static painted carrier a working-deck silhouette.
      const crewWalk = Math.sin(this.wavePhase * 0.7) * 5;
      const drawCrew = (x: number, colour: string, signalling = false) => {
        ctx.fillStyle = colour;
        ctx.beginPath(); ctx.arc(screenX + x, c.DECK_Y - 17, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(screenX + x - 1.6, c.DECK_Y - 15, 3.2, 7);
        ctx.strokeStyle = colour; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(screenX + x, c.DECK_Y - 12);
        ctx.lineTo(screenX + x + (signalling ? 7 : 3), c.DECK_Y - (signalling ? 20 : 8));
        ctx.moveTo(screenX + x, c.DECK_Y - 9); ctx.lineTo(screenX + x - 3, c.DECK_Y - 5); ctx.stroke();
      };
      drawCrew(116 + crewWalk, '#facc15', type === 'LAUNCH');
      drawCrew(148 - crewWalk * 0.5, '#38bdf8');
      if (type === 'RECOVERY') drawCrew(82, '#f8fafc', true);
      ctx.fillStyle = '#475569';
      ctx.fillRect(screenX + 184 + crewWalk * 0.3, c.DECK_Y - 13, 26, 7);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(screenX + 190 + crewWalk * 0.3, c.DECK_Y - 5, 3, 0, Math.PI * 2); ctx.arc(screenX + 205 + crewWalk * 0.3, c.DECK_Y - 5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(screenX, c.DECK_Y);

    // Water Wake Behind Carrier
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, c.HEIGHT * 0.7);
    ctx.lineTo(-90, c.HEIGHT * 0.9);
    ctx.lineTo(-40, c.HEIGHT * 0.5);
    ctx.closePath();
    ctx.fill();

    // Armored Steel Hull with Waterline Weathering
    const hullGrad = ctx.createLinearGradient(0, 0, 0, c.HEIGHT);
    hullGrad.addColorStop(0, '#334155');
    hullGrad.addColorStop(0.7, '#1e293b');
    hullGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = hullGrad;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(c.WIDTH, 0);
    ctx.lineTo(c.WIDTH - 45, c.HEIGHT);
    ctx.lineTo(45, c.HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Catwalks
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 4, c.WIDTH - 60, 6);

    // Non-Skid Flight Deck Surface
    if (TextureGenerator.carrierDeckTexture) {
      const deckPat = ctx.createPattern(TextureGenerator.carrierDeckTexture, 'repeat');
      if (deckPat) {
        ctx.fillStyle = deckPat;
        ctx.fillRect(0, 0, c.WIDTH, 14);
      }
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, c.WIDTH, 14);
    }

    // Invincible-class ski-jump centreline and deck markings
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(40, 6, c.WIDTH - 82, 2);
    for (let i = 60; i < c.WIDTH - 80; i += 50) {
      ctx.fillRect(i, 3, 22, 2);
    }

    // Raised ski-jump at the bow
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(c.WIDTH - 72, 0);
    ctx.lineTo(c.WIDTH, -17);
    ctx.lineTo(c.WIDTH, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.WIDTH - 72, 0);
    ctx.lineTo(c.WIDTH, -17);
    ctx.stroke();

    // Flight deck pennant number
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px "Chakra Petch", sans-serif';
    ctx.fillText('R05', 62, 11);

    // Superstructure Island with 3D Bevel & Bridge Windows
    const islandX = c.WIDTH - 120;
    const islandW = 75;
    const islandH = 42;

    const islandGrad = ctx.createLinearGradient(islandX, -islandH, islandX, 0);
    islandGrad.addColorStop(0, '#64748b');
    islandGrad.addColorStop(1, '#334155');
    ctx.fillStyle = islandGrad;
    ctx.fillRect(islandX, -islandH, islandW, islandH);

    // Island Bridge Windows
    ctx.fillStyle = tod.time === 'NIGHT' ? '#38bdf8' : '#0284c7';
    ctx.fillRect(islandX + 8, -islandH + 8, 40, 7);

    // Rotating period search radar
    const radarAngle = (Date.now() * 0.004) % (Math.PI * 2);
    ctx.save();
    ctx.translate(islandX + 38, -islandH - 8);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.abs(Math.cos(radarAngle)) * 14 + 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, 0, 4, 8);
    ctx.restore();

    // Optical Landing System (Fresnel Lens "Meatball" Glide Slope Lights)
    if (type === 'RECOVERY') {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(95, -10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.fillRect(82, -12, 8, 3);
      ctx.fillRect(100, -12, 8, 3);
    }

    // Arresting Gear Cables
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.8;
    [150, 195, 240, 285].forEach(cx => {
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, 14);
      ctx.stroke();
    });

    ctx.restore();
  }

  private renderWeatherAndAtmosphere(
    ctx: CanvasRenderingContext2D,
    mission: MissionDefinition,
    width: number,
    height: number
  ) {
    if (mission.arcticWeather) this.renderArcticWeather(ctx, mission, width, height);
    if (mission.weather.condition === 'RAIN' || mission.weather.condition === 'THUNDERSTORM') {
      ctx.strokeStyle = 'rgba(210, 230, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const qualityStride = this.renderQuality === 'LOW' ? 4 : this.renderQuality === 'MEDIUM' ? 2 : 1;
      const rainStride = Math.max(qualityStride, this.reducedEffects ? 3 : 1);
      for (let index = 0; index < this.rainDrops.length; index++) {
        if (index % rainStride !== 0) continue;
        const drop = this.rainDrops[index];
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 4, drop.y + drop.len);
      }
      ctx.stroke();
    }
  }

  private renderArcticWeather(ctx: CanvasRenderingContext2D, mission: MissionDefinition, width: number, height: number): void {
    const profile = mission.arcticWeather;
    if (!profile) return;
    const state = getDifficultyAdjustedArcticWeatherState(profile, this.weatherTick, this.difficulty);
    const qualityScale = this.renderQuality === 'LOW' ? 0.38 : this.renderQuality === 'MEDIUM' ? 0.68 : 1;
    const count = Math.round((this.reducedEffects ? 34 : 92) * qualityScale * Math.max(0.15, state.precipitation + state.iceSpray));
    ctx.save();
    if (profile.kind === 'LOW_WINTER_SUN') {
      const glow = ctx.createRadialGradient(width * 0.78, height * 0.24, 8, width * 0.78, height * 0.24, width * 0.38);
      glow.addColorStop(0, 'rgba(255, 221, 160, 0.25)');
      glow.addColorStop(1, 'rgba(255, 214, 148, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }
    if (state.fog > 0.02) {
      const fog = ctx.createLinearGradient(0, height * 0.24, 0, height);
      fog.addColorStop(0, `rgba(220, 232, 236, ${state.fog * 0.04})`);
      fog.addColorStop(0.68, `rgba(210, 225, 230, ${state.fog * 0.28})`);
      fog.addColorStop(1, `rgba(196, 213, 221, ${state.fog * 0.16})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, width, height);
    }
    if (profile.kind === 'FREEZING_RAIN') {
      ctx.strokeStyle = `rgba(220, 239, 247, ${0.3 + state.precipitation * 0.35})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let index = 0; index < count; index++) {
        const x = ((index * 137 + profile.seed * 17 - this.weatherTick * 6) % (width + 100) + width + 100) % (width + 100) - 50;
        const y = ((index * 79 + profile.seed * 11 + this.weatherTick * 15) % (height + 80)) - 40;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 8 * profile.windDirection, y + 24);
      }
      ctx.stroke();
    } else if (profile.kind === 'SNOW' || profile.kind === 'WHITEOUT') {
      ctx.fillStyle = `rgba(241, 247, 248, ${0.42 + state.precipitation * 0.38})`;
      for (let index = 0; index < count; index++) {
        const x = ((index * 173 + profile.seed * 23 + this.weatherTick * profile.windDirection * 2.4) % (width + 80) + width + 80) % (width + 80) - 40;
        const y = ((index * 101 + profile.seed * 7 + this.weatherTick * (1.5 + index % 3)) % (height + 50)) - 25;
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + (index % 4) * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (state.iceSpray > 0.02) {
      ctx.fillStyle = `rgba(226, 240, 244, ${0.12 + state.iceSpray * 0.18})`;
      for (let index = 0; index < count; index++) {
        const x = ((index * 211 + this.weatherTick * 8) % (width + 140)) - 70;
        const y = GAME_CONSTANTS.SEA_LEVEL_Y - (index % 7) * 4 + Math.sin(index * 1.8 + state.phase * Math.PI * 2) * 9;
        ctx.beginPath();
        ctx.ellipse(x, y, 10 + (index % 5) * 5, 2 + (index % 3), -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

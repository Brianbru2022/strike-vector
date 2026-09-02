import { SpriteAssetManager, GAME_ASSET_MANIFEST } from './SpriteAssetManager';

export interface TerrainTextureInfo {
  key: string;
  name: string;
  url?: string;
  image: HTMLImageElement | null;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  width: number;
  height: number;
}

export class AssetManager {
  private static instance: AssetManager;
  private textures: Map<string, HTMLImageElement> = new Map();
  private textureInfos: Map<string, TerrainTextureInfo> = new Map();
  private loadPromises: Map<string, Promise<HTMLImageElement | null>> = new Map();
  private listeners: Set<(key: string, img: HTMLImageElement) => void> = new Set();
  private isInitialized = false;

  private constructor() {
    this.registerDefaultTerrainEntries();
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  private registerDefaultTerrainEntries() {
    const defaultTerrains = [
      {
        key: 'terrain_coastal',
        name: 'Coastal Terrain Tile',
        width: 512,
        height: 256,
      },
      {
        key: 'terrain_flat_coast',
        name: 'Coastal Flat Shoreline Tile',
        width: 512,
        height: 256,
      },
      {
        key: 'terrain_mountain_range',
        name: 'Mountain Range Terrain Tile',
        width: 512,
        height: 256,
      },
      {
        key: 'terrain_ocean_surface',
        name: 'Ocean Surface Water Tile',
        width: 512,
        height: 256,
      },
    ];

    for (const t of defaultTerrains) {
      this.textureInfos.set(t.key, {
        key: t.key,
        name: t.name,
        image: null,
        status: 'idle',
        width: t.width,
        height: t.height,
      });
    }
  }

  /**
   * Initializes and asynchronously loads all terrain textures
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.loadAllTerrainTextures();
  }

  /**
   * Asynchronously loads all terrain bitmap textures from cache, AI service, or generated assets
   */
  public async loadAllTerrainTextures(force = false): Promise<Map<string, HTMLImageElement>> {
    const terrainKeys = ['terrain_coastal', 'terrain_mountain_range', 'terrain_ocean_surface', 'terrain_flat_coast'];
    const promises: Promise<HTMLImageElement | null>[] = [];

    for (const key of terrainKeys) {
      promises.push(this.loadTexture(key, undefined, force));
    }

    await Promise.all(promises);
    return this.textures;
  }

  /**
   * Loads or retrieves a specific texture asynchronously with caching
   */
  public async loadTexture(key: string, customUrl?: string, force = false): Promise<HTMLImageElement | null> {
    if (!force && this.textures.has(key)) {
      const cached = this.textures.get(key)!;
      if (cached.complete && cached.naturalWidth > 0) {
        return cached;
      }
    }

    if (this.loadPromises.has(key) && !force) {
      return this.loadPromises.get(key)!;
    }

    const promise = (async () => {
      const info = this.textureInfos.get(key) || {
        key,
        name: key,
        image: null,
        status: 'loading',
        width: 512,
        height: 256,
      };
      info.status = 'loading';
      this.textureInfos.set(key, info);

      try {
        // 1. Check if customUrl is provided
        if (customUrl) {
          const img = await this.createImageFromUrl(customUrl);
          if (img) {
            this.cacheTexture(key, img);
            return img;
          }
        }

        // 2. Check SpriteAssetManager cache or generate via SpriteAssetManager
        const existingSprite = SpriteAssetManager.getSprite(key);
        if (existingSprite && existingSprite.complete && existingSprite.naturalWidth > 0) {
          this.cacheTexture(key, existingSprite);
          return existingSprite;
        }

        // 3. Fallback: generate and register high-resolution bitmap raster
        const rasterDataUrl = SpriteAssetManager.generateProceduralBitmapDataUrl(key);
        if (rasterDataUrl) {
          const img = await this.createImageFromUrl(rasterDataUrl);
          if (img) {
            this.cacheTexture(key, img);
            await SpriteAssetManager.registerDataUrl(key, rasterDataUrl);
            return img;
          }
        }

        info.status = 'error';
        return null;
      } catch (err) {
        console.error(`[AssetManager] Failed to load texture '${key}':`, err);
        info.status = 'error';
        return null;
      } finally {
        this.loadPromises.delete(key);
      }
    })();

    this.loadPromises.set(key, promise);
    return promise;
  }

  private createImageFromUrl(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`[AssetManager] Image failed to load from URL`);
        resolve(null);
      };
      img.src = url;
    });
  }

  private cacheTexture(key: string, img: HTMLImageElement) {
    this.textures.set(key, img);
    const info = this.textureInfos.get(key);
    if (info) {
      info.image = img;
      info.status = 'loaded';
      info.width = img.naturalWidth || 512;
      info.height = img.naturalHeight || 256;
    }
    this.notifyListeners(key, img);
  }

  public getTexture(key: string): HTMLImageElement | null {
    // 1. Direct memory cache
    const cached = this.textures.get(key);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return cached;
    }

    // 2. Key aliases
    if (key === 'terrain_coastal' || key === 'terrain_flat_coast') {
      const alt = this.textures.get('terrain_coastal') || this.textures.get('terrain_flat_coast');
      if (alt && alt.complete && alt.naturalWidth > 0) return alt;
    }

    // 3. Check SpriteAssetManager
    const sprite = SpriteAssetManager.getSprite(key);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      this.textures.set(key, sprite);
      return sprite;
    }

    return null;
  }

  public hasTexture(key: string): boolean {
    const img = this.getTexture(key);
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  public subscribe(callback: (key: string, img: HTMLImageElement) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(key: string, img: HTMLImageElement) {
    for (const listener of this.listeners) {
      try {
        listener(key, img);
      } catch (err) {
        console.error('[AssetManager] Listener error:', err);
      }
    }
  }

  public getAllTextures(): Map<string, HTMLImageElement> {
    return this.textures;
  }
}

// Global convenient export
export const assetManager = AssetManager.getInstance();

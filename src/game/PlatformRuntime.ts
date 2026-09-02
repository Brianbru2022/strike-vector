export type PlatformKind = 'WEB' | 'WINDOWS_DESKTOP';
import { DEMO_BUILD } from './ReleaseFeatures';
export const DEMO_STORAGE_NAMESPACE = 'IRON_KESTREL_DEMO_';
export type PlatformLifecycleEvent = 'FOCUS_LOST' | 'CLOSE_REQUESTED';

export interface DesktopSaveLoadResult {
  json: string | null;
  path: string;
  recoveredFrom: string | null;
}

interface DesktopSaveCandidate { json: string; source: string }
interface NativeDesktopSaveLoadResult { archives: DesktopSaveCandidate[]; path: string }

export function rankDesktopSaveCandidates(candidates: DesktopSaveCandidate[]): DesktopSaveCandidate[] {
  return candidates.map((candidate, index) => {
    try {
      const exportedAt = JSON.parse(candidate.json)?.exportedAt;
      const timestamp = typeof exportedAt === 'string' ? Date.parse(exportedAt) : Number.NaN;
      return { candidate, index, timestamp: Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY };
    } catch {
      return { candidate, index, timestamp: Number.NEGATIVE_INFINITY };
    }
  }).sort((left, right) => right.timestamp - left.timestamp || left.index - right.index).map(({ candidate }) => candidate);
}

type SnapshotProvider = () => string;

const MIRRORED_KEYS = new Set([
  'STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4',
  'STRIKE_VECTOR_ACTIVE_OPERATION_V2',
  'STRIKE_VECTOR_OPERATIONS_PROFILE_V2',
  'STRIKE_VECTOR_HARRIER_87_SHOWCASE_V1',
  'strike_vector_best_score',
]);

let snapshotProvider: SnapshotProvider | null = null;
let desktopReady = false;
let suppressNativeWrite = false;
let writeTimer: number | null = null;
let pendingWrite: Promise<void> = Promise.resolve();

const browserStorage = (): Storage => globalThis.localStorage;

const demoStorage: Storage = {
  get length() { return Array.from({ length: browserStorage().length }, (_, index) => browserStorage().key(index)).filter((key) => key?.startsWith(DEMO_STORAGE_NAMESPACE)).length; },
  clear() {
    const keys = Array.from({ length: browserStorage().length }, (_, index) => browserStorage().key(index)).filter((key): key is string => Boolean(key?.startsWith(DEMO_STORAGE_NAMESPACE)));
    for (const key of keys) browserStorage().removeItem(key);
  },
  getItem(key: string) { return browserStorage().getItem(`${DEMO_STORAGE_NAMESPACE}${key}`); },
  key(index: number) {
    return Array.from({ length: browserStorage().length }, (_, itemIndex) => browserStorage().key(itemIndex)).filter((key): key is string => Boolean(key?.startsWith(DEMO_STORAGE_NAMESPACE)))[index]?.slice(DEMO_STORAGE_NAMESPACE.length) ?? null;
  },
  removeItem(key: string) { browserStorage().removeItem(`${DEMO_STORAGE_NAMESPACE}${key}`); },
  setItem(key: string, value: string) { browserStorage().setItem(`${DEMO_STORAGE_NAMESPACE}${key}`, value); },
};

const mirroredStorage: Storage = {
  get length() { return browserStorage().length; },
  clear() {
    browserStorage().clear();
    queueDesktopSnapshot();
  },
  getItem(key: string) { return browserStorage().getItem(key); },
  key(index: number) { return browserStorage().key(index); },
  removeItem(key: string) {
    browserStorage().removeItem(key);
    if (MIRRORED_KEYS.has(key)) queueDesktopSnapshot();
  },
  setItem(key: string, value: string) {
    browserStorage().setItem(key, value);
    if (MIRRORED_KEYS.has(key)) queueDesktopSnapshot();
  },
};

export const isDesktopRuntime = (): boolean =>
  typeof window !== 'undefined' && Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

export const getPlatformKind = (): PlatformKind => isDesktopRuntime() ? 'WINDOWS_DESKTOP' : 'WEB';

export const getPlatformStorage = (): Storage => DEMO_BUILD ? demoStorage : isDesktopRuntime() ? mirroredStorage : browserStorage();

export const registerDesktopSnapshotProvider = (provider: SnapshotProvider): void => {
  snapshotProvider = provider;
};

export async function initialisePlatformStorage(applyNativeArchive: (json: string, storage: Storage) => boolean): Promise<DesktopSaveLoadResult | null> {
  if (!isDesktopRuntime()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  const nativeResult = await invoke<NativeDesktopSaveLoadResult>('load_desktop_save');
  let selected: DesktopSaveCandidate | null = null;
  suppressNativeWrite = true;
  try {
    // Steam Auto-Cloud can restore an older primary while a newer rotating backup
    // remains local. Prefer the newest checksum-valid archive, not its filename.
    for (const candidate of rankDesktopSaveCandidates(nativeResult.archives)) {
      if (applyNativeArchive(candidate.json, browserStorage())) {
        selected = candidate;
        break;
      }
    }
  } finally {
    suppressNativeWrite = false;
    desktopReady = true;
  }
  if (selected && selected.source !== 'save-v1.json') await invoke('write_desktop_save', { json: selected.json });
  if (!selected && browserStorage().getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4')) queueDesktopSnapshot(0);
  return { json: selected?.json ?? null, path: nativeResult.path, recoveredFrom: selected && selected.source !== 'save-v1.json' ? selected.source : null };
}

export function queueDesktopSnapshot(delayMs = 200): void {
  if (!desktopReady || suppressNativeWrite || !snapshotProvider || !isDesktopRuntime()) return;
  if (writeTimer !== null) window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    const json = snapshotProvider?.();
    if (!json) return;
    pendingWrite = pendingWrite.then(async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('write_desktop_save', { json });
    }).catch((error) => console.error('Native save write failed', error));
  }, delayMs);
}

export async function flushPlatformStorage(): Promise<void> {
  if (!isDesktopRuntime() || !desktopReady || !snapshotProvider) return;
  if (writeTimer !== null) {
    window.clearTimeout(writeTimer);
    writeTimer = null;
    const json = snapshotProvider();
    pendingWrite = pendingWrite.then(async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('write_desktop_save', { json });
    });
  }
  await pendingWrite;
}

export async function setPlatformFullscreen(fullscreen: boolean): Promise<void> {
  if (isDesktopRuntime()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setFullscreen(fullscreen);
    return;
  }
  if (fullscreen) await document.documentElement.requestFullscreen?.();
  else if (document.fullscreenElement) await document.exitFullscreen?.();
}

export async function isPlatformFullscreen(): Promise<boolean> {
  if (isDesktopRuntime()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    return getCurrentWindow().isFullscreen();
  }
  return Boolean(document.fullscreenElement);
}

export async function onPlatformLifecycleEvent(handler: (event: PlatformLifecycleEvent) => void): Promise<() => void> {
  if (!isDesktopRuntime()) return () => undefined;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const appWindow = getCurrentWindow();
  const unlistenFocus = await appWindow.onFocusChanged(({ payload }) => { if (!payload) handler('FOCUS_LOST'); });
  const unlistenClose = await appWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    handler('CLOSE_REQUESTED');
    await flushPlatformStorage();
    await appWindow.destroy();
  });
  return () => { unlistenFocus(); unlistenClose(); };
}

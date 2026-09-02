export interface OfflineInstallationStatus {
  supported: boolean;
  online: boolean;
  installed: boolean;
  controlled: boolean;
  updateReady: boolean;
  cacheCount: number;
  storageUsageBytes: number | null;
  storageQuotaBytes: number | null;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let capturedInstallPrompt: InstallPromptEvent | null = null;

if (typeof window !== 'undefined' && !isDesktopRuntime()) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    capturedInstallPrompt = event as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => { capturedInstallPrompt = null; });
}

export const canPromptInstall = () => capturedInstallPrompt !== null;

export const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
  const prompt = capturedInstallPrompt;
  if (!prompt) return 'unavailable';
  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === 'accepted') capturedInstallPrompt = null;
  return choice.outcome;
};

export const getOfflineInstallationStatus = async (): Promise<OfflineInstallationStatus> => {
  if (isDesktopRuntime()) return { supported: false, online: true, installed: true, controlled: false, updateReady: false, cacheCount: 0, storageUsageBytes: null, storageQuotaBytes: null };
  const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof caches !== 'undefined';
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  if (!supported) return { supported: false, online: typeof navigator === 'undefined' || navigator.onLine, installed: standalone, controlled: false, updateReady: false, cacheCount: 0, storageUsageBytes: null, storageQuotaBytes: null };
  const registration = await navigator.serviceWorker.getRegistration();
  const cacheNames = await caches.keys();
  const estimate = await navigator.storage?.estimate?.();
  return {
    supported: true,
    online: navigator.onLine,
    installed: standalone,
    controlled: Boolean(navigator.serviceWorker.controller),
    updateReady: Boolean(registration?.waiting),
    cacheCount: cacheNames.filter(isIronKestrelCache).length,
    storageUsageBytes: Number.isFinite(estimate?.usage) ? Number(estimate?.usage) : null,
    storageQuotaBytes: Number.isFinite(estimate?.quota) ? Number(estimate?.quota) : null,
  };
};

export const applyWaitingUpdate = async (): Promise<boolean> => {
  if (isDesktopRuntime()) return false;
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  await registration?.update();
  if (!registration?.waiting) return false;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
};

export const repairOfflineInstallation = async (): Promise<number> => {
  if (isDesktopRuntime()) throw new Error('The Windows edition is updated through its desktop installer.');
  if (typeof navigator === 'undefined' || !navigator.onLine) throw new Error('An internet connection is required to repair the offline installation.');
  if (!('serviceWorker' in navigator) || typeof caches === 'undefined') throw new Error('Offline installation is not supported by this browser.');
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (registration) await registration.unregister();
  const cacheNames = await caches.keys();
  const gameCaches = cacheNames.filter(isIronKestrelCache);
  await Promise.all(gameCaches.map((name) => caches.delete(name)));
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return gameCaches.length;
};

// Old Strike Vector cache names remain recognised so renamed installations can
// repair or replace their existing offline data without leaving orphaned caches.
export const isIronKestrelCache = (name: string): boolean => /workbox|precache|iron[-_ ]?kestrel|strike[-_ ]?vector/i.test(name);

export const formatStorageSize = (bytes: number | null): string => {
  if (bytes === null || !Number.isFinite(bytes)) return 'UNAVAILABLE';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
};
import { isDesktopRuntime } from './PlatformRuntime';

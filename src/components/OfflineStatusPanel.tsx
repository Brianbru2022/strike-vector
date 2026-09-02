import React, { useCallback, useEffect, useState } from 'react';
import { Download, HardDriveDownload, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { applyWaitingUpdate, canPromptInstall, formatStorageSize, getOfflineInstallationStatus, OfflineInstallationStatus, promptInstall, repairOfflineInstallation } from '../game/PwaManager';
import { PerformanceSnapshot } from '../types/game';

interface OfflineStatusPanelProps {
  performance: PerformanceSnapshot | null;
  onPreserveLocalState: () => void;
}

const emptyStatus: OfflineInstallationStatus = { supported: false, online: true, installed: false, controlled: false, updateReady: false, cacheCount: 0, storageUsageBytes: null, storageQuotaBytes: null };

export const OfflineStatusPanel: React.FC<OfflineStatusPanelProps> = ({ performance, onPreserveLocalState }) => {
  const [status, setStatus] = useState(emptyStatus);
  const [message, setMessage] = useState('');
  const [repairArmed, setRepairArmed] = useState(false);
  const refresh = useCallback(async () => setStatus(await getOfflineInstallationStatus()), []);

  useEffect(() => {
    void refresh();
    const handleNetwork = () => void refresh();
    const handleController = () => { setMessage('OFFLINE RUNTIME UPDATED. RELOAD WHEN READY.'); void refresh(); };
    window.addEventListener('online', handleNetwork);
    window.addEventListener('offline', handleNetwork);
    navigator.serviceWorker?.addEventListener('controllerchange', handleController);
    return () => {
      window.removeEventListener('online', handleNetwork);
      window.removeEventListener('offline', handleNetwork);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleController);
    };
  }, [refresh]);

  const repair = async () => {
    if (!repairArmed) { setRepairArmed(true); setMessage('PRESS REPAIR AGAIN TO REBUILD OFFLINE FILES. SAVES WILL BE PRESERVED.'); return; }
    setRepairArmed(false);
    onPreserveLocalState();
    try {
      const removed = await repairOfflineInstallation();
      setMessage(`OFFLINE FILES REBUILT (${removed} OLD CACHES REMOVED). RELOAD WHEN CONVENIENT.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message.toUpperCase() : 'OFFLINE REPAIR FAILED.');
    }
  };

  return (
    <section className="rounded-lg border border-cyan-900/70 bg-zinc-950/80 p-3" aria-label="Offline installation and performance status">
      <div className="mb-3 flex items-center justify-between gap-3"><div><div className="font-bold text-cyan-300">PERFORMANCE & OFFLINE INSTALLATION</div><div className="text-[9px] text-zinc-500">Local status only; campaign and operation saves are stored separately</div></div>{status.online ? <Wifi className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-amber-300" />}</div>
      <div className="grid grid-cols-2 gap-2 text-[9px] sm:grid-cols-4">
        <Status label="NETWORK" value={status.online ? 'ONLINE' : 'OFFLINE'} good={status.online} />
        <Status label="OFFLINE READY" value={status.controlled && status.cacheCount > 0 ? 'READY' : 'NOT READY'} good={status.controlled && status.cacheCount > 0} />
        <Status label="INSTALL MODE" value={status.installed ? 'INSTALLED' : 'BROWSER'} good={status.installed} />
        <Status label="CACHE STORAGE" value={formatStorageSize(status.storageUsageBytes)} good={status.cacheCount > 0} />
      </div>
      {performance ? <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] sm:grid-cols-4"><Status label="ACTIVE QUALITY" value={`${performance.activeQuality}${performance.preference === 'AUTO' ? ' / AUTO' : ''}`} good /><Status label="MEASURED FPS" value={performance.effectiveFps ? `${performance.effectiveFps} FPS` : 'SAMPLING'} good={performance.effectiveFps >= 30 || performance.effectiveFps === 0} /><Status label="P95 FRAME" value={performance.sampleCount ? `${performance.p95FrameMs} MS` : 'SAMPLING'} good={performance.p95FrameMs <= 33.4} /><Status label="DEVICE" value={performance.deviceClass} good /></div> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {canPromptInstall() ? <button type="button" onClick={async () => { const outcome = await promptInstall(); setMessage(`INSTALL ${outcome.toUpperCase()}.`); await refresh(); }} className="flex items-center gap-1 rounded border border-emerald-500/50 px-3 py-1.5 text-[9px] font-bold text-emerald-300"><Download className="h-3 w-3" /> INSTALL APP</button> : null}
        <button type="button" disabled={!status.updateReady} onClick={async () => { onPreserveLocalState(); const applied = await applyWaitingUpdate(); setMessage(applied ? 'UPDATE READY. RELOAD WHEN CONVENIENT.' : 'NO WAITING UPDATE FOUND.'); await refresh(); }} className="flex items-center gap-1 rounded border border-cyan-500/50 px-3 py-1.5 text-[9px] font-bold text-cyan-300 disabled:opacity-30"><RefreshCw className="h-3 w-3" /> APPLY UPDATE</button>
        <button type="button" disabled={!status.online || !status.supported} onClick={repair} className={`flex items-center gap-1 rounded border px-3 py-1.5 text-[9px] font-bold disabled:opacity-30 ${repairArmed ? 'border-amber-400 text-amber-200' : 'border-zinc-600 text-zinc-300'}`}><HardDriveDownload className="h-3 w-3" /> {repairArmed ? 'CONFIRM REPAIR' : 'REPAIR OFFLINE FILES'}</button>
        <button type="button" onClick={() => void refresh()} className="rounded border border-zinc-700 px-3 py-1.5 text-[9px] text-zinc-400">REFRESH STATUS</button>
      </div>
      {message ? <div className="mt-2 rounded bg-black/50 px-2 py-1.5 text-[9px] text-amber-200" role="status">{message}</div> : null}
    </section>
  );
};

const Status: React.FC<{ label: string; value: string; good: boolean }> = ({ label, value, good }) => <div className="rounded border border-white/10 bg-black/40 p-2"><div className="text-zinc-500">{label}</div><div className={good ? 'mt-0.5 font-bold text-emerald-300' : 'mt-0.5 font-bold text-amber-300'}>{value}</div></div>;

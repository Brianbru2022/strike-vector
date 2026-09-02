import React from 'react';
import { Download, FileUp, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { applySaveArchive, createSaveArchive, exportSaveArchiveJson, loadImportBackup, MAX_SAVE_ARCHIVE_BYTES, parseSaveArchiveJson, SaveArchivePreview, SaveArchiveV1 } from '../game/SaveArchive';

interface SaveManagementPanelProps {
  onImported: () => void;
}

interface PendingImport {
  archive: SaveArchiveV1;
  preview: SaveArchivePreview;
  source: 'FILE' | 'BACKUP';
}

const downloadJson = (json: string, filename: string) => {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const SaveManagementPanel: React.FC<SaveManagementPanelProps> = ({ onImported }) => {
  const [pending, setPending] = React.useState<PendingImport | null>(null);
  const [message, setMessage] = React.useState<{ tone: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const [hasBackup, setHasBackup] = React.useState(() => loadImportBackup()?.ok === true);

  const exportProgress = () => {
    const archive = createSaveArchive();
    downloadJson(exportSaveArchiveJson(archive), `iron-kestrel-save-${archive.exportedAt.slice(0, 10)}.json`);
    setMessage({ tone: 'SUCCESS', text: 'Progress archive downloaded to this device.' });
  };

  const stageJson = (json: string, source: PendingImport['source']) => {
    const result = parseSaveArchiveJson(json);
    if ('error' in result) {
      setPending(null);
      setMessage({ tone: 'ERROR', text: result.error });
      return;
    }
    setPending({ archive: result.archive, preview: result.preview, source });
    setMessage(null);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_SAVE_ARCHIVE_BYTES) {
      setPending(null);
      setMessage({ tone: 'ERROR', text: 'The selected save is larger than the supported 1 MB limit.' });
      return;
    }
    try { stageJson(await file.text(), 'FILE'); }
    catch { setMessage({ tone: 'ERROR', text: 'The selected save could not be read.' }); }
  };

  const stageBackup = () => {
    const backup = loadImportBackup();
    if (!backup || 'error' in backup) {
      setMessage({ tone: 'ERROR', text: backup && 'error' in backup ? backup.error : 'No valid pre-import backup is available.' });
      return;
    }
    setPending({ archive: backup.archive, preview: backup.preview, source: 'BACKUP' });
    setMessage(null);
  };

  const applyPending = () => {
    if (!pending) return;
    const result = applySaveArchive(pending.archive);
    if ('error' in result) {
      setMessage({ tone: 'ERROR', text: result.error });
      return;
    }
    setPending(null);
    setHasBackup(true);
    setMessage({ tone: 'SUCCESS', text: pending.source === 'BACKUP' ? 'Backup restored.' : 'Imported progress applied.' });
    onImported();
  };

  return (
    <section className="rounded-lg border border-emerald-800/50 bg-emerald-950/10 p-3">
      <div className="flex items-center gap-1.5 font-bold text-emerald-300"><Save className="h-4 w-4" /> SAVE MANAGEMENT</div>
      <p className="mt-1 text-[9px] leading-relaxed text-zinc-500">Transfers campaign, operation, showcase and score progress. Internal diagnostics and validation evidence are never included.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={exportProgress} className="flex items-center gap-1 rounded border border-emerald-600/50 px-2 py-1 text-[9px] text-emerald-300"><Download className="h-3 w-3" /> EXPORT PROGRESS</button>
        <label className="flex cursor-pointer items-center gap-1 rounded border border-cyan-600/50 px-2 py-1 text-[9px] font-bold text-cyan-300 hover:text-white"><FileUp className="h-3 w-3" /> IMPORT SAVE<input aria-label="Import save archive" type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void importFile(file); }} /></label>
        <button type="button" disabled={!hasBackup} onClick={stageBackup} className="flex items-center gap-1 rounded border border-amber-700/50 px-2 py-1 text-[9px] text-amber-300 disabled:cursor-not-allowed disabled:opacity-30"><RotateCcw className="h-3 w-3" /> RESTORE PRE-IMPORT BACKUP</button>
      </div>

      {pending ? (
        <div className="mt-3 rounded border border-amber-600/50 bg-black/45 p-3">
          <div className="flex items-center gap-1 text-[9px] font-bold text-amber-300"><ShieldCheck className="h-3 w-3" /> {pending.source === 'BACKUP' ? 'BACKUP PREVIEW' : 'IMPORT PREVIEW'}</div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[8px] text-zinc-400 sm:grid-cols-3">
            <span>Build <strong className="text-zinc-200">{pending.preview.buildVersion}</strong></span>
            <span>Missions <strong className="text-zinc-200">{pending.preview.completedMissions}</strong></span>
            <span>Operations <strong className="text-zinc-200">{pending.preview.operationRecords}</strong></span>
            <span>Active deployment <strong className="text-zinc-200">{pending.preview.activeDeployment ? 'YES' : 'NO'}</strong></span>
            <span>Showcase <strong className="text-zinc-200">{pending.preview.showcaseMissions}/3</strong></span>
            <span>Top score <strong className="text-zinc-200">{pending.preview.bestScore.toLocaleString()}</strong></span>
          </div>
          <p className="mt-2 text-[8px] text-zinc-500">Exported {new Date(pending.preview.exportedAt).toLocaleString()}. Applying replaces current progression after first creating a local rollback backup.</p>
          <div className="mt-2 flex gap-2"><button type="button" onClick={applyPending} className="rounded bg-amber-400 px-3 py-1.5 text-[9px] font-black text-zinc-950">APPLY IMPORT</button><button type="button" onClick={() => setPending(null)} className="rounded border border-zinc-700 px-3 py-1.5 text-[9px] text-zinc-300">CANCEL</button></div>
        </div>
      ) : null}
      {message ? <p role="status" className={`mt-2 text-[9px] ${message.tone === 'ERROR' ? 'text-rose-300' : 'text-emerald-300'}`}>{message.text}</p> : null}
    </section>
  );
};

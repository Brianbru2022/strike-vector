import React, { useRef, useState } from 'react';
import { CampaignSave } from '../types/game';
import { importCompatibleDemoProgress, parseDemoTransfer } from '../game/Demo';

export const DemoTransferImportPanel: React.FC<{ campaign: CampaignSave; onImport: (save: CampaignSave) => void }> = ({ campaign, onImport }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  return <section className="rounded-lg border border-amber-700/40 bg-amber-950/10 p-3">
    <div className="font-bold text-amber-300">BROWSER DEMO RECORD</div>
    <p className="mt-1 text-[9px] leading-relaxed text-zinc-500">Imports only compatible demo scores and guided-training completion. Campaign unlocks, aircraft condition, settings and operation records are never replaced.</p>
    <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const transfer = parseDemoTransfer(await file.text());
      if (!transfer) { setStatus('NOT A VALID IRON KESTREL DEMO RECORD'); event.target.value = ''; return; }
      onImport(importCompatibleDemoProgress(campaign, transfer));
      setStatus('COMPATIBLE DEMO RECORD MERGED');
      event.target.value = '';
    }} />
    <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 rounded border border-amber-500/50 px-3 py-1 text-[10px] font-bold text-amber-200">IMPORT DEMO RECORD</button>
    {status && <div role="status" className="mt-2 text-[9px] text-amber-200">{status}</div>}
  </section>;
};

import React from 'react';
import { Download, ExternalLink, LifeBuoy } from 'lucide-react';
import { exportBetaEvidenceJson } from '../game/BetaEvidence';
import { BETA_FEEDBACK_URL, ITCH_BUILD } from '../game/ReleaseFeatures';

const downloadBetaEvidence = () => {
  const blob = new Blob([exportBetaEvidenceJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'iron-kestrel-87-beta-evidence-v1.json';
  link.click();
  URL.revokeObjectURL(url);
};

export const SupportPanel: React.FC = () => {
  return (
    <section className="rounded-lg border border-cyan-800/50 bg-cyan-950/10 p-3">
      <div className="flex items-center gap-1.5 font-bold text-cyan-300"><LifeBuoy className="h-4 w-4" /> SUPPORT & ISSUE REPORT</div>
      <p className="mt-1 text-[9px] leading-relaxed text-zinc-500">Use the diagnostics panel above to create a local issue report. Review exported files before sharing; nothing is uploaded automatically.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ITCH_BUILD ? <button type="button" onClick={downloadBetaEvidence} className="flex items-center gap-1 rounded border border-emerald-600/60 px-2 py-1 text-[9px] font-bold text-emerald-200"><Download className="h-3 w-3" /> EXPORT BETA PLAY RECORD</button> : null}
        {ITCH_BUILD && BETA_FEEDBACK_URL ? <a href={BETA_FEEDBACK_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded border border-amber-500/60 px-2 py-1 text-[9px] font-bold text-amber-200"><ExternalLink className="h-3 w-3" /> SEND BETA FEEDBACK</a> : null}
        <a href="/legal/SUPPORT.txt" target="_blank" rel="noreferrer" className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold text-zinc-300 hover:text-white">SUPPORT GUIDE</a>
        <a href="/legal/PRIVACY.txt" target="_blank" rel="noreferrer" className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold text-zinc-300 hover:text-white">PRIVACY</a>
      </div>
      {ITCH_BUILD ? <p className="mt-2 text-[8px] leading-relaxed text-zinc-600">The beta play record stays on this device until you export it. It contains coarse mission events, not raw controls or identity.</p> : null}
    </section>
  );
};

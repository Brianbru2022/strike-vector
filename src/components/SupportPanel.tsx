import React from 'react';
import { LifeBuoy } from 'lucide-react';

export const SupportPanel: React.FC = () => {
  return (
    <section className="rounded-lg border border-cyan-800/50 bg-cyan-950/10 p-3">
      <div className="flex items-center gap-1.5 font-bold text-cyan-300"><LifeBuoy className="h-4 w-4" /> SUPPORT & ISSUE REPORT</div>
      <p className="mt-1 text-[9px] leading-relaxed text-zinc-500">Use the diagnostics panel above to create a local issue report. Review exported files before sharing; nothing is uploaded automatically.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href="/legal/SUPPORT.txt" target="_blank" rel="noreferrer" className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold text-zinc-300 hover:text-white">SUPPORT GUIDE</a>
        <a href="/legal/PRIVACY.txt" target="_blank" rel="noreferrer" className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold text-zinc-300 hover:text-white">PRIVACY</a>
      </div>
    </section>
  );
};

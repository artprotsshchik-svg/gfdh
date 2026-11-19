import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Info } from 'lucide-react';
import type { AssemblyImpactSummary, AssemblyPreferences } from '../utils/modTypes.ts';
import type { HonestFpsEstimate } from '../utils/fpsEstimator.ts';
import {
  MRPACK_UNAVAILABLE_REASON,
  exportAssemblyAsCsv,
  exportAssemblyAsJson,
  exportAssemblyAsTxt,
  triggerFileDownload,
} from '../utils/exportFormats.ts';

interface ExportMenuProps {
  modIds: string[];
  summary: AssemblyImpactSummary;
  fpsEstimate: HonestFpsEstimate;
  prefs?: AssemblyPreferences;
  filenamePrefix?: string;
}

export function ExportMenu({
  modIds,
  summary,
  fpsEstimate,
  prefs,
  filenamePrefix = 'forge-1.20.1-mods',
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleExport = (fmt: 'txt' | 'csv' | 'json') => {
    if (modIds.length === 0) return;
    if (fmt === 'txt') {
      triggerFileDownload(`${filenamePrefix}.txt`, exportAssemblyAsTxt(modIds, summary, fpsEstimate), 'text/plain;charset=utf-8');
    } else if (fmt === 'csv') {
      triggerFileDownload(`${filenamePrefix}.csv`, exportAssemblyAsCsv(modIds, prefs), 'text/csv;charset=utf-8');
    } else {
      triggerFileDownload(`${filenamePrefix}.json`, exportAssemblyAsJson(modIds, summary, fpsEstimate, prefs), 'application/json;charset=utf-8');
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        disabled={modIds.length === 0}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#e6e8ea] text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5 text-[#3ddc84]" aria-hidden="true" />
        <span>Экспорт</span>
        <ChevronDown className="w-3 h-3 text-[#8b9199]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-64 z-40 bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-1.5 space-y-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('txt')}
            className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[#e6e8ea] hover:bg-[#22262b] flex items-center justify-between transition-colors duration-150"
          >
            <span>Список (.txt)</span>
            <span className="font-mono text-[10px] text-[#8b9199]">UTF-8</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('csv')}
            className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[#e6e8ea] hover:bg-[#22262b] flex items-center justify-between transition-colors duration-150"
          >
            <span>Таблица (.csv)</span>
            <span className="font-mono text-[10px] text-[#8b9199]">Excel</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('json')}
            className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[#e6e8ea] hover:bg-[#22262b] flex items-center justify-between transition-colors duration-150"
          >
            <span>Манифест (.json)</span>
            <span className="font-mono text-[10px] text-[#8b9199]">JSON</span>
          </button>

          <div className="mt-1 pt-1.5 border-t border-[#2a2e33] px-2 py-1 text-[10px] text-[#8b9199] flex items-start gap-1.5 leading-snug">
            <Info className="w-3 h-3 text-[#e5a93c] shrink-0 mt-0.5" aria-hidden="true" />
            <span>{MRPACK_UNAVAILABLE_REASON}</span>
          </div>
        </div>
      )}
    </div>
  );
}

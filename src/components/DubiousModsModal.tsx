import { useEffect, useMemo, useState } from 'react';
import type { ModItem } from '../data/modsData.ts';
import type { ArtifactRiskProfile, DubiousModEntry } from '../utils/modTypes.ts';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Trash2,
  X,
} from 'lucide-react';

interface DubiousModsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dubiousMods: DubiousModEntry[];
  artifactRisk: ArtifactRiskProfile;
  totalModsCount: number;
  onRemoveMod: (modId: string) => void;
  onReplaceMod: (oldModId: string, newModId: string) => void;
  onRemoveAllRisky: (modIds: string[]) => void;
  onAutoFix?: () => void;
  onInspectMod: (mod: ModItem) => void;
}

type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

export function DubiousModsModal({
  isOpen,
  onClose,
  dubiousMods,
  artifactRisk,
  totalModsCount,
  onRemoveMod,
  onReplaceMod,
  onRemoveAllRisky,
  onAutoFix,
  onInspectMod,
}: DubiousModsModalProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const counts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const d of dubiousMods) {
      if (d.severity === 'high') high++;
      else if (d.severity === 'medium') medium++;
      else low++;
    }
    return { high, medium, low, total: dubiousMods.length };
  }, [dubiousMods]);

  const visibleEntries = useMemo(() => {
    if (filter === 'all') return dubiousMods;
    return dubiousMods.filter(d => d.severity === filter);
  }, [dubiousMods, filter]);

  const removableRiskyIds = useMemo(
    () =>
      dubiousMods
        .filter(d => d.canRemoveSafely && (d.severity === 'high' || d.severity === 'medium'))
        .map(d => d.modId),
    [dubiousMods]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const riskToneCls =
    artifactRisk.level === 'critical'
      ? 'text-[#cf6d6d]'
      : artifactRisk.level === 'high' || artifactRisk.level === 'moderate'
        ? 'text-[#c99b52]'
        : 'text-[#6abf7b]';

  const severityMeta = (sev: DubiousModEntry['severity']) => {
    if (sev === 'high') {
      return {
        label: 'Критический',
        textCls: 'text-[#cf6d6d]',
        rowCls: 'bg-[#cf6d6d]/[0.05] border-[#cf6d6d]/35',
      };
    }
    if (sev === 'medium') {
      return {
        label: 'Сомнительный',
        textCls: 'text-[#c99b52]',
        rowCls: 'bg-[#c99b52]/[0.04] border-[#c99b52]/35',
      };
    }
    return {
      label: 'Нюанс',
      textCls: 'text-[#8f8f8f]',
      rowCls: 'bg-[#141414] border-[#2a2a2a]',
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Сомнительные моды в сборке"
    >
      <div
        className="w-full max-w-2xl bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-start justify-between gap-4 bg-[#141414]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold text-[#e6e6e6] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#c99b52] shrink-0" />
                Сомнительные моды ({counts.total})
              </h2>
              <span className="text-xs font-mono tabular-nums text-[#8f8f8f]">
                из {totalModsCount} в сборке
              </span>
            </div>
            <p className="text-xs text-[#8f8f8f] mt-1 tabular-nums">
              Шанс артефактов:{' '}
              <strong className={`font-mono ${riskToneCls}`}>
                {artifactRisk.chancePct}% · {artifactRisk.label}
              </strong>
              {counts.total > 0 && ' — удаление или замена позиций ниже снижает риск глитчей.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222] transition-colors shrink-0"
            aria-label="Закрыть окно сомнительных модов"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Bulk Actions Bar */}
        {counts.total > 0 && (
          <div className="px-5 py-2.5 border-b border-[#2a2a2a] flex flex-wrap items-center justify-between gap-2 bg-[#141414]">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {[
                { k: 'all' as const, label: `Все (${counts.total})` },
                { k: 'high' as const, label: `Критические (${counts.high})` },
                { k: 'medium' as const, label: `Сомнительные (${counts.medium})` },
                { k: 'low' as const, label: `Нюансы (${counts.low})` },
              ]
                .filter(tab => tab.k === 'all' || counts[tab.k] > 0)
                .map(tab => (
                  <button
                    key={tab.k}
                    type="button"
                    onClick={() => setFilter(tab.k)}
                    className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors whitespace-nowrap tabular-nums ${
                      filter === tab.k
                        ? 'bg-[#242424] text-[#4caf6a] font-semibold'
                        : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {removableRiskyIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRemoveAllRisky(removableRiskyIds)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#1a1a1a] hover:bg-[#222222] border border-[#cf6d6d]/40 text-[#cf6d6d] text-xs font-medium transition-colors whitespace-nowrap tabular-nums"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Убрать рискованные ({removableRiskyIds.length})
                </button>
              )}
              {onAutoFix && (counts.high > 0 || counts.medium > 0) && (
                <button
                  type="button"
                  onClick={onAutoFix}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Исправить сборку
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {counts.total === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-[#6abf7b] mx-auto" />
              <div className="text-sm font-semibold text-[#e6e6e6]">Сомнительных модов нет</div>
              <p className="text-xs text-[#8f8f8f] max-w-md mx-auto">
                Выбранные моды совместимы и не содержат лишних дублей, конфликтов или устаревших портов.
              </p>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8f8f8f]">
              В выбранном фильтре модов нет.
            </div>
          ) : (
            visibleEntries.map(entry => {
              const meta = severityMeta(entry.severity);
              return (
                <div
                  key={entry.modId}
                  className={`border rounded-[6px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${meta.rowCls}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                      <span className={`font-semibold ${meta.textCls}`}>{meta.label}</span>
                      <span className="text-[#8f8f8f]" aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => onInspectMod(entry.mod)}
                        className="text-sm font-semibold text-[#e6e6e6] hover:text-[#4caf6a] text-left transition-colors"
                      >
                        {entry.mod.name}
                      </button>
                      {entry.artifactContributionPct > 0 && (
                        <span className="text-[11px] font-mono text-[#c99b52] tabular-nums">
                          +{entry.artifactContributionPct}% к артефактам
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8f8f8f] leading-relaxed">{entry.reason}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {entry.replacementId && entry.replacementName && (
                      <button
                        type="button"
                        onClick={() => onReplaceMod(entry.modId, entry.replacementId!)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-[11px] font-semibold transition-colors whitespace-nowrap"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        Заменить на {entry.replacementName}
                      </button>
                    )}
                    {entry.canRemoveSafely && (
                      <button
                        type="button"
                        onClick={() => onRemoveMod(entry.modId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] bg-[#1a1a1a] hover:bg-[#222222] border border-[#2a2a2a] hover:border-[#cf6d6d]/50 text-[#e6e6e6] hover:text-[#cf6d6d] text-[11px] font-medium transition-colors whitespace-nowrap"
                      >
                        <Trash2 className="w-3 h-3" />
                        Убрать
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

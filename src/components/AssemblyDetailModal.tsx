import { useEffect, useMemo, useState } from 'react';
import type { ModItem } from '../data/modsData.ts';
import { MOD_GROUPS } from '../data/modsData.ts';
import type {
  AssemblyImpactSummary,
  AssemblyPreferences,
  ContextualModImpact,
} from '../utils/modTypes.ts';
import { estimateFpsRange } from '../utils/fpsEstimator.ts';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react';

export interface AnalyzedAssemblyModRow {
  mod: ModItem;
  impact: ContextualModImpact;
  artifactDeltaPct: number;
  groupTitle: string;
}

interface AssemblyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: AssemblyImpactSummary;
  prefs: AssemblyPreferences;
  analyzedMods: AnalyzedAssemblyModRow[];
  onInspectMod: (mod: ModItem) => void;
  onRemoveMod: (modId: string) => void;
  onReplaceMod: (oldId: string, newId: string) => void;
  onAutoFix?: () => void;
  onOpenDubiousModal: () => void;
}

type ModalFilter = 'all' | 'core' | 'conditional' | 'issues';

export function AssemblyDetailModal({
  isOpen,
  onClose,
  summary,
  prefs,
  analyzedMods,
  onInspectMod,
  onRemoveMod,
  onReplaceMod,
  onAutoFix,
  onOpenDubiousModal,
}: AssemblyDetailModalProps) {
  const [modFilter, setModFilter] = useState<ModalFilter>('all');
  const fpsEstimate = useMemo(
    () =>
      estimateFpsRange(
        analyzedMods.map(r => r.mod.id),
        summary,
        prefs
      ),
    [analyzedMods, summary, prefs]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filteredMods = useMemo(() => {
    const list = analyzedMods.filter(row => {
      if (modFilter === 'core') {
        return row.impact.level === 'core' || row.impact.level === 'high';
      }
      if (modFilter === 'conditional') {
        return row.impact.level === 'conditional' || row.impact.level === 'support' || row.impact.level === 'diagnostic';
      }
      if (modFilter === 'issues') {
        return row.impact.level === 'negative' || row.impact.level === 'zero' || row.artifactDeltaPct >= 4;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (modFilter === 'issues') {
        return b.artifactDeltaPct - a.artifactDeltaPct || a.impact.impactPoints - b.impact.impactPoints;
      }
      return (
        b.impact.relativeImpactPct - a.impact.relativeImpactPct ||
        b.impact.impactPoints - a.impact.impactPoints ||
        a.mod.name.localeCompare(b.mod.name, 'ru')
      );
    });
  }, [analyzedMods, modFilter]);

  if (!isOpen) return null;

  const { scoreBreakdown, artifactRisk, resourceBalance, subsystemScores, synergies, overlaps } = summary;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Детальный разбор сборки"
    >
      <div
        className="w-full max-w-6xl max-h-[90vh] bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2a2e33] bg-[#121417] flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[#e6e8ea] tracking-tight">
              Детальный разбор сборки ({analyzedMods.length} модов)
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {summary.dubiousMods.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDubiousModal();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#1a1d21] hover:bg-[#22262b] border border-[#e5a93c]/40 text-[#e5a93c] text-xs font-semibold transition-colors duration-150 whitespace-nowrap"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Сомнительные ({summary.dubiousMods.length})
              </button>
            )}
            {onAutoFix && (resourceBalance.conflictCount > 0 || resourceBalance.redundantCount > 0) && (
              <button
                type="button"
                onClick={onAutoFix}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#3ddc84] hover:bg-[#34c776] text-[#121417] text-xs font-semibold transition-colors duration-150 whitespace-nowrap"
              >
                Оптимизировать
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[4px] text-[#8b9199] hover:text-[#e6e8ea] hover:bg-[#22262b] transition-colors duration-150"
              aria-label="Закрыть детальный разбор"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Calibrated Score Equation */}
            <div className="rounded-[6px] bg-[#121417] border border-[#2a2e33] p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-[#8b9199]">Итоговая оценка</span>
                <span className="text-2xl font-semibold font-mono tabular-nums text-[#3ddc84]">
                  {summary.assemblyScore}
                  <span className="text-xs text-[#8b9199] font-normal"> / 100</span>
                </span>
              </div>
              <div className="space-y-1.5 text-xs pt-2 border-t border-[#2a2e33] tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[#8b9199]">Покрытие 7 подсистем</span>
                  <span className="font-mono text-[#3ddc84]">+{scoreBreakdown.coverageScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b9199]">Бонус за синергии</span>
                  <span className="font-mono text-[#3ddc84]">+{scoreBreakdown.synergyBonus}</span>
                </div>
                {scoreBreakdown.penaltyPoints > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#8b9199]">Штраф за конфликты / ошибки</span>
                    <span className="font-mono text-[#e55353]">−{scoreBreakdown.penaltyPoints}</span>
                  </div>
                )}
                {scoreBreakdown.bloatPenalty > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#8b9199]">Лишние / дублирующие моды</span>
                    <span className="font-mono text-[#e5a93c]">−{scoreBreakdown.bloatPenalty}</span>
                  </div>
                )}
                {scoreBreakdown.artifactPenalty > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#8b9199]">Штраф за риск артефактов</span>
                    <span className="font-mono text-[#e5a93c]">−{scoreBreakdown.artifactPenalty}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Resource & FPS/TPS/RAM Impact */}
            <div className="rounded-[6px] bg-[#121417] border border-[#2a2e33] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#e6e8ea]">
                  Баланс импакта
                </span>
                <span className="text-[11px] font-mono text-[#8b9199] tabular-nums">
                  {resourceBalance.effectiveCount} актив. · {resourceBalance.redundantCount} балласт
                </span>
              </div>
              <div className="space-y-2.5 text-xs tabular-nums">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#8b9199]">Рендер / FPS</span>
                    <span className="font-mono text-[#3ddc84]">{fpsEstimate.label}</span>
                  </div>
                  <div className="h-1 rounded-[2px] bg-[#2a2e33] overflow-hidden">
                    <div className="h-full bg-[#3ddc84]" style={{ width: `${resourceBalance.fpsScore}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#8b9199]">Тики и мир / TPS</span>
                    <span className="font-mono text-[#e6e8ea]">{resourceBalance.tpsScore}/100</span>
                  </div>
                  <div className="h-1 rounded-[2px] bg-[#2a2e33] overflow-hidden">
                    <div className="h-full bg-[#3ddc84]" style={{ width: `${resourceBalance.tpsScore}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#8b9199]">Память / ОЗУ</span>
                    <span className="font-mono text-[#3ddc84]">{resourceBalance.ramDeltaLabel}</span>
                  </div>
                  <div className="h-1 rounded-[2px] bg-[#2a2e33] overflow-hidden">
                    <div className="h-full bg-[#3ddc84]" style={{ width: `${resourceBalance.memoryScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Artifact Risk Factors */}
            <div className="rounded-[6px] bg-[#121417] border border-[#2a2e33] p-4 space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-[#8b9199]">Шанс артефактов</span>
                <span
                  className={`text-xl font-semibold font-mono tabular-nums ${
                    artifactRisk.level === 'critical'
                      ? 'text-[#e55353]'
                      : artifactRisk.level === 'high' || artifactRisk.level === 'moderate'
                        ? 'text-[#e5a93c]'
                        : 'text-[#3ddc84]'
                  }`}
                >
                  {artifactRisk.chancePct}% · {artifactRisk.label}
                </span>
              </div>
              <p className="text-[11px] text-[#8b9199] leading-relaxed">{artifactRisk.summary}</p>
              <div className="space-y-1 pt-2 border-t border-[#2a2e33] max-h-32 overflow-y-auto text-[11px] tabular-nums">
                {artifactRisk.factors.map((f, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="text-[#e6e8ea] truncate">{f.label}</span>
                    <span className={`font-mono font-semibold shrink-0 ${f.tone === 'mitigation' ? 'text-[#3ddc84]' : 'text-[#e5a93c]'}`}>
                      {f.deltaPct > 0 ? `+${f.deltaPct}%` : `${f.deltaPct}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: 7 Subsystems + Active Synergies & Overlaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-[6px] bg-[#121417] border border-[#2a2e33] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#e6e8ea]">
                  Покрытие подсистем ({summary.coveredSubsystems.length}/7)
                </span>
                <span className="font-mono text-[#8b9199] tabular-nums">{summary.coveragePct}%</span>
              </div>
              <div className="space-y-2">
                {subsystemScores.map(sub => {
                  const subMods = analyzedMods.filter(row => {
                    const grp = MOD_GROUPS.find(g => g.id === row.mod.groupId);
                    if (!grp) return false;
                    if (sub.id === 'render') return grp.id === 'core-renderer' || grp.id === 'shaders-pipeline';
                    if (sub.id === 'memory') return grp.id === 'memory-core';
                    if (sub.id === 'tps') return grp.id === 'tick-physics-engine';
                    if (sub.id === 'culling') return ['block-culling', 'leaves-culling', 'block-entities'].includes(grp.id);
                    if (sub.id === 'worldgen') return grp.id === 'worldgen-chunks' || grp.id === 'lighting-engine';
                    if (sub.id === 'cpu-audio') return ['upscaling-bg', 'cpu-threads', 'particles-audio', 'boot-loading'].includes(grp.id);
                    return ['networking', 'items-clearlag', 'recipes-jei'].includes(grp.id);
                  });

                  return (
                    <div key={sub.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className={sub.covered ? 'text-[#e6e8ea] font-medium' : 'text-[#8b9199]'}>
                          {sub.title}
                        </span>
                        <span className="text-[11px] text-[#8b9199] truncate flex-1 text-right">
                          {subMods.slice(0, 3).map(x => x.mod.name).join(', ')}
                          {subMods.length > 3 ? ` +${subMods.length - 3}` : ''}
                        </span>
                        <span
                          className={`font-mono tabular-nums font-semibold shrink-0 ${
                            sub.scorePct >= 75 ? 'text-[#3ddc84]' : sub.scorePct >= 40 ? 'text-[#e6e8ea]' : 'text-[#e5a93c]'
                          }`}
                        >
                          {sub.scorePct}%
                        </span>
                      </div>
                      <div className="h-1 rounded-[2px] bg-[#2a2e33] overflow-hidden">
                        <div
                          className="h-full bg-[#3ddc84]"
                          style={{ width: `${Math.max(sub.scorePct, sub.covered ? 6 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[6px] bg-[#121417] border border-[#2a2e33] p-4 space-y-3">
              <div className="text-xs font-semibold text-[#e6e8ea]">
                Синергии ({synergies.length}) и пересечения ({overlaps.length})
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                {synergies.map((syn, idx) => (
                  <div key={`syn-${idx}`} className="p-2.5 rounded-[4px] bg-[#3ddc84]/[0.06] border border-[#3ddc84]/25 space-y-0.5">
                    <div className="font-semibold text-[#3ddc84]">
                      {syn.targetNames.join(' + ')}
                    </div>
                    <div className="text-[11px] text-[#8b9199]">{syn.summary}</div>
                  </div>
                ))}
                {overlaps.map((ov, idx) => (
                  <div key={`ov-${idx}`} className="p-2.5 rounded-[4px] bg-[#e5a93c]/[0.06] border border-[#e5a93c]/30 space-y-0.5">
                    <div className="font-semibold text-[#e5a93c]">
                      Пересечение: {ov.targetNames.join(' + ')}
                    </div>
                    <div className="text-[11px] text-[#8b9199]">{ov.summary}</div>
                  </div>
                ))}
                {synergies.length === 0 && overlaps.length === 0 && (
                  <div className="py-6 text-center text-[#8b9199] text-xs">
                    Нет выраженных связок или дублей в текущей подборке.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Full Per-Mod Impact Breakdown */}
          <div className="rounded-[6px] bg-[#121417] border border-[#2a2e33] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2e33] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#e6e8ea]">
                Помодовый разбор импакта ({filteredMods.length})
              </span>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {[
                  { k: 'all' as const, label: `Все (${analyzedMods.length})` },
                  { k: 'core' as const, label: 'Ядро / сильные' },
                  { k: 'conditional' as const, label: 'Условные / опора' },
                  { k: 'issues' as const, label: `Балласт / риск (${resourceBalance.redundantCount + resourceBalance.conflictCount})` },
                ].map(f => (
                  <button
                    key={f.k}
                    type="button"
                    onClick={() => setModFilter(f.k)}
                    className={`px-2.5 py-1 rounded-[4px] transition-colors duration-150 whitespace-nowrap tabular-nums ${
                      modFilter === f.k ? 'bg-[#22262b] text-[#3ddc84] font-semibold' : 'text-[#8b9199] hover:text-[#e6e8ea]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[#2a2e33] max-h-80 overflow-y-auto">
              {filteredMods.map(({ mod, impact, artifactDeltaPct, groupTitle }) => {
                const relStr =
                  impact.relativeImpactPct > 0 ? `+${impact.relativeImpactPct}%` : `${impact.relativeImpactPct}%`;
                const levelCls =
                  impact.level === 'negative'
                    ? 'text-[#e55353]'
                    : impact.level === 'zero' || impact.level === 'conditional'
                      ? 'text-[#e5a93c]'
                      : impact.level === 'core' || impact.level === 'high'
                        ? 'text-[#3ddc84]'
                        : 'text-[#8b9199]';

                return (
                  <div key={mod.id} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#22262b]">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onInspectMod(mod);
                          }}
                          className="font-semibold text-[#e6e8ea] hover:text-[#3ddc84] text-left"
                        >
                          {mod.name}
                        </button>
                        <span className={`font-mono font-semibold tabular-nums ${levelCls}`}>
                          {relStr} · {impact.impactPoints} б.
                        </span>
                        <span className="text-[11px] text-[#8b9199]">· {impact.label}</span>
                        {artifactDeltaPct > 0 && (
                          <span className="text-[11px] font-mono text-[#e5a93c] tabular-nums">
                            · +{artifactDeltaPct}% арт.
                          </span>
                        )}
                        <span className="text-[11px] text-[#8b9199]">· {groupTitle}</span>
                      </div>
                      <p className="text-[11px] text-[#8b9199] truncate mt-0.5">{impact.summary}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {impact.betterAnalogId && impact.betterAnalogName && (
                        <button
                          type="button"
                          onClick={() => onReplaceMod(mod.id, impact.betterAnalogId!)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#121417] text-[11px] font-semibold whitespace-nowrap"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          {impact.betterAnalogName}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveMod(mod.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#1a1d21] hover:bg-[#22262b] border border-[#2a2e33] hover:border-[#e55353]/50 text-[#8b9199] hover:text-[#e55353] text-[11px] whitespace-nowrap"
                        title="Убрать из сборки"
                      >
                        <Trash2 className="w-3 h-3" />
                        Убрать
                      </button>
                      <a
                        href={mod.curseforgeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-[4px] text-[#8b9199] hover:text-[#e6e8ea]"
                        aria-label={`${mod.name} на CurseForge`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
              {filteredMods.length === 0 && (
                <div className="py-8 text-center text-xs text-[#8b9199] flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3ddc84]" />
                  В этом фильтре модов нет.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

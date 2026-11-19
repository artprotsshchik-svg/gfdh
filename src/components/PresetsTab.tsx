import { useState } from 'react';
import {
  MODS_DATABASE,
  MOD_PRESETS,
  type ModItem,
  type ModPreset,
} from '../data/modsData.ts';
import {
  evaluateAssemblyHealth,
  organizeAssemblyTree,
  summarizeAssemblyImpact,
} from '../utils/modLogic.ts';
import { estimateFpsRange } from '../utils/fpsEstimator.ts';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface PresetsTabProps {
  onLoadToChecker: (preset: ModPreset) => void;
  onLoadToBuilder: (preset: ModPreset) => void;
  onOpenDetail: (mod: ModItem) => void;
}

const MOD_BY_ID = new Map(MODS_DATABASE.map(m => [m.id, m]));

export function PresetsTab({
  onLoadToChecker,
  onLoadToBuilder,
  onOpenDetail,
}: PresetsTabProps) {
  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);

  const handleCopyNamesList = (preset: ModPreset) => {
    const treeNodes = organizeAssemblyTree(preset.modIds);
    const orderedNames: string[] = [];
    const seen = new Set<string>();
    for (const node of treeNodes) {
      if (!seen.has(node.parent.id)) {
        seen.add(node.parent.id);
        orderedNames.push(node.parent.name);
      }
      for (const ch of node.children) {
        if (!seen.has(ch.mod.id)) {
          seen.add(ch.mod.id);
          orderedNames.push(ch.mod.name);
        }
      }
    }
    for (const id of preset.modIds) {
      if (!seen.has(id)) {
        const m = MOD_BY_ID.get(id);
        if (m) {
          seen.add(id);
          orderedNames.push(m.name);
        }
      }
    }
    navigator.clipboard.writeText(orderedNames.join('\n'));
    setCopiedPresetId(preset.id);
    setTimeout(() => setCopiedPresetId(prev => (prev === preset.id ? null : prev)), 1800);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#e6e6e6] tracking-tight">
            Основные сборки ({MOD_PRESETS.length})
          </h2>
          <p className="text-xs text-[#8f8f8f] mt-0.5">
            Две проверенные конфигурации для Forge 1.20.1: Nvidium + Emberbium и Alloyium + Embeddium.
          </p>
        </div>
      </div>

      {/* Side-by-side comparison matrix */}
      {MOD_PRESETS.length === 2 && (() => {
        const [p1, p2] = MOD_PRESETS;
        const s1 = summarizeAssemblyImpact(p1.modIds);
        const s2 = summarizeAssemblyImpact(p2.modIds);
        const f1 = estimateFpsRange(p1.modIds, s1);
        const f2 = estimateFpsRange(p2.modIds, s2);
        const rows = [
          {
            label: 'Рендер-связка',
            v1: 'Emberbium + Nvidium',
            v2: 'Embeddium + Alloyium',
          },
          {
            label: 'Sinytra Connector',
            v1: 'Да (FFAPI + Connector Extras)',
            v2: 'Не обязательна (нативный Forge приоритет)',
          },
          {
            label: 'Прогноз FPS / ОЗУ',
            v1: `${f1.label} · ${s1.resourceBalance.ramDeltaLabel}`,
            v2: `${f2.label} · ${s2.resourceBalance.ramDeltaLabel}`,
          },
          {
            label: 'Шанс артефактов',
            v1: `${s1.artifactRisk.chancePct}% · ${s1.artifactRisk.label}`,
            v2: `${s2.artifactRisk.chancePct}% · ${s2.artifactRisk.label}`,
          },
          {
            label: 'Итог (Оценка · Моды)',
            v1: `${s1.assemblyScore}/100 б. · ${p1.modIds.length} модов · ${s1.coveredSubsystems.length}/7 подсистем`,
            v2: `${s2.assemblyScore}/100 б. · ${p2.modIds.length} модов · ${s2.coveredSubsystems.length}/7 подсистем`,
          },
        ];
        return (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2a] bg-[#141414] text-[#8f8f8f]">
                  <th className="py-2 px-4 font-semibold">Критерий</th>
                  <th className="py-2 px-4 font-semibold text-[#6abf7b]">{p1.name.split('(')[0].trim()}</th>
                  <th className="py-2 px-4 font-semibold text-[#e6e6e6]">{p2.name.split('(')[0].trim()}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {rows.map(r => (
                  <tr key={r.label} className="hover:bg-[#222222]">
                    <td className="py-2 px-4 text-[#8f8f8f] font-medium whitespace-nowrap">{r.label}</td>
                    <td className="py-2 px-4 text-[#e6e6e6] font-mono tabular-nums">{r.v1}</td>
                    <td className="py-2 px-4 text-[#e6e6e6] font-mono tabular-nums">{r.v2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MOD_PRESETS.map(preset => {
          const treeNodes = organizeAssemblyTree(preset.modIds);
          const parentWithAddons = treeNodes.filter(n => n.children.length > 0);
          const standaloneRoots = treeNodes.filter(n => n.children.length === 0);
          const badgeTone =
            preset.badgeColor === 'emerald' ? 'text-[#6abf7b]' : 'text-[#8f8f8f]';

          const presetHealth = evaluateAssemblyHealth(preset.modIds);
          const presetSummary = summarizeAssemblyImpact(preset.modIds, presetHealth);
          const presetFps = estimateFpsRange(preset.modIds, presetSummary);
          const presetRedCount =
            presetHealth.conflicts.length +
            presetHealth.warnings.filter(w => w.severity === 'red').length;
          const presetYellowCount = presetHealth.warnings.filter(w => w.severity === 'yellow').length;

          return (
            <div
              key={preset.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-[#e6e6e6]">{preset.name}</h3>
                  <span className={`text-xs font-medium ${badgeTone}`}>{preset.badge}</span>
                </div>
                <p className="text-xs text-[#8f8f8f] leading-relaxed">{preset.description}</p>

                {/* Stats & Resource Balance */}
                <div className="rounded-[6px] bg-[#141414] border border-[#2a2a2a] px-3.5 py-2.5 space-y-1.5 text-[11px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#8f8f8f] tabular-nums">
                    <span>
                      Оценка: <strong className="text-[#4caf6a] font-mono">{presetSummary.assemblyScore}/100</strong>
                    </span>
                    <span className="text-[#2a2a2a]">·</span>
                    <span>
                      Артефакты:{' '}
                      <strong
                        className={`font-mono ${
                          presetSummary.artifactRisk.level === 'critical'
                            ? 'text-[#cf6d6d]'
                            : presetSummary.artifactRisk.level === 'high' || presetSummary.artifactRisk.level === 'moderate'
                              ? 'text-[#c99b52]'
                              : 'text-[#6abf7b]'
                        }`}
                      >
                        {presetSummary.artifactRisk.chancePct}% · {presetSummary.artifactRisk.label}
                      </strong>
                    </span>
                    <span className="text-[#2a2a2a]">·</span>
                    <span>
                      Прогноз:{' '}
                      <strong className="text-[#6abf7b] font-mono">
                        {presetFps.label}
                      </strong>{' '}
                      <span className="text-[#8f8f8f]">/</span>{' '}
                      <strong className="text-[#e6e6e6] font-mono">
                        {presetSummary.resourceBalance.ramDeltaLabel}
                      </strong>
                    </span>
                    <span className="text-[#2a2a2a]">·</span>
                    <span>
                      Подсистемы: <strong className="text-[#e6e6e6] font-mono">{presetSummary.coveredSubsystems.length}/7</strong>
                    </span>
                    <span className="text-[#2a2a2a]">·</span>
                    <span
                      className={`font-mono font-medium ${
                        presetRedCount > 0
                          ? 'text-[#cf6d6d]'
                          : presetYellowCount > 0
                            ? 'text-[#c99b52]'
                            : 'text-[#6abf7b]'
                      }`}
                    >
                      {presetRedCount} конфл. / {presetYellowCount} замеч. ({preset.modIds.length} модов)
                    </span>
                  </div>
                  <div className="text-[#8f8f8f]">
                    <strong className="text-[#e6e6e6]">Риск:</strong> {preset.crashRisk}
                  </div>
                </div>

                {/* Hierarchical List */}
                <div className="divide-y divide-[#2a2a2a] border border-[#2a2a2a] rounded-[6px] bg-[#141414] max-h-[380px] overflow-y-auto">
                  {parentWithAddons.map((node, idx) => (
                    <div key={node.parent.id} className="px-3.5 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                          <span className="text-[11px] font-mono text-[#8f8f8f] tabular-nums">
                            {idx + 1}.
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenDetail(node.parent)}
                            className="text-xs font-semibold text-[#e6e6e6] hover:text-[#4caf6a] text-left transition-colors"
                          >
                            {node.parent.name}
                          </button>
                        </div>
                        <a
                          href={node.parent.curseforgeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 text-[#8f8f8f] hover:text-[#e6e6e6] text-[10px] font-mono transition-colors"
                          title="CurseForge"
                        >
                          CF
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-4 text-[11px]">
                        {node.children.map(({ mod: ch, relationLabel }) => (
                          <span key={ch.id} className="inline-flex items-center gap-1">
                            <span className="text-[#8f8f8f]">↳</span>
                            <button
                              type="button"
                              onClick={() => onOpenDetail(ch)}
                              className="text-[#e6e6e6] hover:text-[#4caf6a] transition-colors"
                            >
                              {ch.name}
                            </button>
                            <span className="text-[10px] text-[#8f8f8f]">({relationLabel})</span>
                            <a
                              href={ch.curseforgeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#8f8f8f] hover:text-[#e6e6e6] transition-colors"
                              title="CurseForge"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {standaloneRoots.length > 0 && (
                    <div className="px-3.5 py-2.5 space-y-1.5">
                      <div className="text-[11px] font-medium text-[#8f8f8f]">
                        Остальные моды сборки ({standaloneRoots.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {standaloneRoots.map(({ parent: m }, sIdx) => {
                          const num = parentWithAddons.length + sIdx + 1;
                          return (
                            <div
                              key={m.id}
                              className="flex items-center justify-between gap-2 text-[11px]"
                            >
                              <button
                                type="button"
                                onClick={() => onOpenDetail(m)}
                                className="text-[#e6e6e6] hover:text-[#4caf6a] transition-colors truncate flex items-center gap-1.5 text-left"
                              >
                                <span className="text-[10px] font-mono text-[#8f8f8f] tabular-nums">
                                  {num}.
                                </span>
                                <span className="truncate">{m.name}</span>
                              </button>
                              <a
                                href={m.curseforgeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#8f8f8f] hover:text-[#e6e6e6] transition-colors shrink-0"
                                title="CurseForge"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#2a2a2a] flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyNamesList(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  {copiedPresetId === preset.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Список скопирован
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Копировать списком
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onLoadToBuilder(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] text-xs font-medium transition-colors whitespace-nowrap"
                >
                  В Клипание
                </button>
                <button
                  type="button"
                  onClick={() => onLoadToChecker(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] text-xs font-medium transition-colors whitespace-nowrap ml-auto"
                >
                  В Чекер
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

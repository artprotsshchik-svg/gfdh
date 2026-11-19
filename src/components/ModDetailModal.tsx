import { useEffect, useMemo, useState } from 'react';
import {
  MODS_DATABASE,
  type ModItem,
} from '../data/modsData.ts';
import { NVIDIUM_CONFIG_CONTENT } from '../data/modConfigs.ts';
import { cleanModDescription, cleanStatusLabel, formatShortOneLineDescription } from '../utils/displayFormatters.ts';
import {
  evaluateModImpactInPack,
  getBaseHealthTier,
  getDualPortPairForMod,
  getGroupMembersByRole,
  getModAnalogsComparison,
  getModResourceProfile,
  getModSuperseder,
  getRecipeBridgeStatus,
  isUnsupportedOnForge,
  matchesCoveredByName,
  type AssemblyPreferences,
  type CoUsageVerdict,
} from '../utils/modLogic.ts';
import {
  ExternalLink,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Plus,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  PackageCheck,
  ArrowLeftRight,
} from 'lucide-react';

interface ModDetailModalProps {
  mod: ModItem | null;
  onClose: () => void;
  onSelectMod: (mod: ModItem) => void;
  checkedModIds: string[];
  onToggleCheckMod: (id: string) => void;
  builderModIds?: string[];
  onToggleBuilderMod?: (id: string) => void;
  activeModIds?: string[];
  contextSourceLabel?: string;
  builderPrefs?: AssemblyPreferences;
  onChooseVariantInBuilder?: (mod: ModItem) => void;
  onFocusModInBuilder?: (mod: ModItem) => void;
}

export function ModDetailModal({
  mod,
  onClose,
  onSelectMod,
  checkedModIds,
  onToggleCheckMod,
  builderModIds = [],
  onToggleBuilderMod,
  activeModIds,
  contextSourceLabel = 'Текущая сборка',
  builderPrefs,
  onChooseVariantInBuilder,
  onFocusModInBuilder,
}: ModDetailModalProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);
  const groupInfo = useMemo(() => {
    if (!mod?.groupId) return null;
    return getGroupMembersByRole(mod.groupId);
  }, [mod]);

  const dualPair = useMemo(() => {
    if (!mod) return null;
    return getDualPortPairForMod(mod.id);
  }, [mod]);

  const dualPairMods = useMemo(() => {
    if (!dualPair) return null;
    const forgeMod = MODS_DATABASE.find(m => m.id === dualPair.forgeModId) || null;
    const fabricMod = MODS_DATABASE.find(m => m.id === dualPair.fabricModId) || null;
    return { pair: dualPair, forgeMod, fabricMod };
  }, [dualPair]);

  const builtInCoveredMods = useMemo(() => {
    if (!mod) return [];
    return MODS_DATABASE.filter(
      item => item.id !== mod.id && matchesCoveredByName(item.coveredBy, mod.name)
    );
  }, [mod]);

  const contextSet = useMemo(
    () => new Set(activeModIds ?? checkedModIds),
    [activeModIds, checkedModIds]
  );

  const supersederInfo = useMemo(() => {
    if (!mod) return null;
    return getModSuperseder(mod, contextSet, builderPrefs, true);
  }, [mod, contextSet, builderPrefs]);

  const bridgeInfo = useMemo(() => {
    if (!mod) return null;
    return getRecipeBridgeStatus(mod, contextSet, builderPrefs);
  }, [mod, contextSet, builderPrefs]);

  const contextImpact = useMemo(() => {
    if (!mod) return null;
    return evaluateModImpactInPack(mod, contextSet, undefined, builderPrefs);
  }, [mod, contextSet, builderPrefs]);

  const resourceProfile = useMemo(() => {
    if (!mod) return null;
    return contextImpact?.resourceProfile ?? getModResourceProfile(mod);
  }, [mod, contextImpact]);

  const analogsComparison = useMemo(() => {
    if (!mod) return [];
    return getModAnalogsComparison(mod, contextSet, builderPrefs);
  }, [mod, contextSet, builderPrefs]);

  useEffect(() => {
    if (!mod) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mod, onClose]);

  if (!mod) return null;

  const baseTier = getBaseHealthTier(mod);
  const tierColor =
    baseTier === 'red'
      ? 'text-[#cf6d6d]'
      : baseTier === 'green'
        ? 'text-[#6abf7b]'
        : baseTier === 'lime'
          ? 'text-[#9ab86a]'
          : 'text-[#c99b52]';

  const isSelectedInChecker = checkedModIds.includes(mod.id);
  const isSelectedInBuilder = builderModIds.includes(mod.id);
  const canFocusInBuilder = mod.status !== 'danger' && !mod.coveredBy && !isUnsupportedOnForge(mod);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mod.name}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#1a1a1a] px-6 py-4 border-b border-[#2a2a2a] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs mb-1">
              <span className={`font-semibold ${tierColor}`}>
                {cleanStatusLabel(mod.statusLabel)}
              </span>
              <span className="text-[#8f8f8f]">
                <span className="text-[#2a2a2a] mr-2" aria-hidden="true">·</span>
                {mod.platform}
              </span>
              {(mod.isGroupLeader || mod.isGroupAddon) && (
                <span className="text-[#6abf7b] font-medium">
                  <span className="text-[#2a2a2a] mr-2" aria-hidden="true">·</span>
                  {mod.isGroupLeader ? 'Лидер группы' : 'Аддон'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-[#e6e6e6] leading-tight break-words tracking-tight">
              {mod.name}
            </h2>
            <p className="text-xs text-[#8f8f8f] mt-0.5">
              {mod.category}
              {mod.groupTitle ? ` · ${mod.groupTitle}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222] transition-colors shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mod.curseforgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[6px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              CurseForge
            </a>

            {onToggleBuilderMod && (
              <button
                type="button"
                onClick={() => onToggleBuilderMod(mod.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-xs font-semibold border transition-colors whitespace-nowrap ${
                  isSelectedInBuilder
                    ? 'bg-[#4caf6a]/15 border-[#4caf6a] text-[#e6e6e6]'
                    : 'bg-[#141414] border-[#2a2a2a] text-[#e6e6e6] hover:bg-[#222222]'
                }`}
              >
                {isSelectedInBuilder ? <Check className="w-3.5 h-3.5 text-[#4caf6a]" /> : <Plus className="w-3.5 h-3.5" />}
                {isSelectedInBuilder ? 'В Клипании' : 'В сборку'}
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleCheckMod(mod.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-xs font-semibold border transition-colors whitespace-nowrap ${
                isSelectedInChecker
                  ? 'bg-[#4caf6a]/15 border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#e6e6e6] hover:bg-[#222222]'
              }`}
            >
              {isSelectedInChecker ? <Check className="w-3.5 h-3.5 text-[#4caf6a]" /> : <Plus className="w-3.5 h-3.5" />}
              {isSelectedInChecker ? 'В Чекере' : 'В Чекер'}
            </button>

            {onFocusModInBuilder && canFocusInBuilder && (
              <button
                type="button"
                onClick={() => onFocusModInBuilder(mod)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-xs font-semibold bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] transition-colors whitespace-nowrap"
              >
                Собрать под этот мод
              </button>
            )}

            {groupInfo?.leader && groupInfo.leader.id !== mod.id && (
              <button
                type="button"
                onClick={() => onSelectMod(groupInfo.leader!)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-xs font-semibold bg-[#141414] border border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222] transition-colors whitespace-nowrap"
              >
                Лидер: {groupInfo.leader.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Description & Key Verdicts */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-4 space-y-3">
            <p className="text-sm text-[#e6e6e6] leading-relaxed">{cleanModDescription(mod.description)}</p>

            {mod.coveredBy && (
              <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-[#c99b52]/[0.06] border border-[#c99b52]/30 text-xs text-[#c99b52]">
                <PackageCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Бесполезен как отдельный мод:</span> функционал уже встроен в{' '}
                  <span className="font-semibold text-[#e6e6e6]">{mod.coveredBy}</span>.
                </div>
              </div>
            )}

            {!mod.coveredBy && supersederInfo && (
              <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-[#c99b52]/[0.06] border border-[#c99b52]/30 text-xs text-[#c99b52]">
                <PackageCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    {supersederInfo.isActiveInSelection ? 'Полностью перекрыт активной связкой:' : 'Перекрывается более лучшим модом:'}
                  </span>{' '}
                  {supersederInfo.reason}.
                </div>
              </div>
            )}

            {(mod.recipeEcosystem || bridgeInfo?.viaBridge || (bridgeInfo && !bridgeInfo.compatible)) && (
              <div
                className={`flex items-start gap-2.5 p-3 rounded-[4px] border text-xs ${
                  bridgeInfo && !bridgeInfo.compatible
                    ? 'bg-[#cf6d6d]/[0.06] border-[#cf6d6d]/30 text-[#cf6d6d]'
                    : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#e6e6e6]'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Совместимость / прослойка:</span>{' '}
                  {bridgeInfo && !bridgeInfo.compatible
                    ? bridgeInfo.reason
                    : bridgeInfo?.viaBridge
                      ? `${bridgeInfo.viaBridge} — работает в текущей конфигурации.`
                      : mod.recipeEcosystem === 'emi-only'
                        ? 'Требует EMI (нативный аддон EMI).'
                        : mod.recipeEcosystem === 'tmrv-bridge'
                          ? 'Мост JEI-плагинов для чистого EMI (конфликтует с самим JEI).'
                          : mod.recipeEcosystem === 'jei-engine'
                            ? 'Работает только с установленным JEI (не работает через TMRV в чистом EMI).'
                            : mod.recipeEcosystem === 'jei-plugin'
                              ? 'JEI-плагин: работает с JEI напрямую либо в чистом EMI через прослойку TMRV Updated.'
                              : 'Универсально работает с EMI и JEI.'}
                </div>
              </div>
            )}

            {mod.bestAlternative && (
              <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-[#4caf6a]/[0.06] border border-[#4caf6a]/30 text-xs text-[#6abf7b]">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Вердикт / Рекомендация:</span> {mod.bestAlternative}
                </div>
              </div>
            )}

            {mod.warning && (
              <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-[#cf6d6d]/[0.06] border border-[#cf6d6d]/30 text-xs text-[#cf6d6d]">
                {mod.status === 'danger' ? (
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#c99b52] shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold">Важно:</span> {mod.warning}
                </div>
              </div>
            )}
          </div>

          {/* A4: Collapsible Config Block in Nvidium Mod Card */}
          {mod.id === 'nvidium' && (
            <section
              aria-label="Конфиг Nvidium"
              className="bg-[#141414] border border-[#2a2a2a] rounded-[6px] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setConfigOpen(v => !v)}
                aria-expanded={configOpen}
                className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-[#222222] transition-colors"
              >
                <span className="text-sm font-semibold text-[#e6e6e6]">Конфиг</span>
                <span className="text-xs text-[#8f8f8f] inline-flex items-center gap-1">
                  {configOpen ? 'Свернуть' : 'Развернуть'}
                  {configOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              {configOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-[#2a2a2a] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#8f8f8f] font-mono">config/nvidium.json</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(NVIDIUM_CONFIG_CONTENT);
                        setConfigCopied(true);
                        setTimeout(() => setConfigCopied(false), 1800);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#1a1a1a] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-medium text-[#e6e6e6] transition-colors"
                    >
                      {configCopied ? <Check className="w-3.5 h-3.5 text-[#4caf6a]" /> : <Copy className="w-3.5 h-3.5" />}
                      {configCopied ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                  <pre className="p-3 rounded-[4px] bg-[#121212] border border-[#2a2a2a] font-mono text-xs text-[#e6e6e6] overflow-x-auto select-all">{NVIDIUM_CONFIG_CONTENT}</pre>
                </div>
              )}
            </section>
          )}

          {/* Performance Trade-off Summary */}
          {resourceProfile && (
            <section
              aria-label="Влияние на FPS и компромиссы"
              className="bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-4 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#2a2a2a]">
                <h3 className="text-sm font-semibold text-[#e6e6e6]">
                  Влияние и компромиссы
                </h3>
                <span
                  className={`text-xs font-medium ${
                    resourceProfile.hasTradeoff ? 'text-[#c99b52]' : 'text-[#6abf7b]'
                  }`}
                >
                  {resourceProfile.shortTag}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-[6px] bg-[#1a1a1a] border border-[#2a2a2a] p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6abf7b]">
                    Что ускоряет
                  </div>
                  <ul className="space-y-1 text-xs text-[#e6e6e6] leading-snug">
                    {resourceProfile.gains.map((g, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#6abf7b] shrink-0 mt-0.5">+</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[6px] bg-[#1a1a1a] border border-[#2a2a2a] p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#c99b52]">
                    Нюансы / ограничения
                  </div>
                  <ul className="space-y-1 text-xs text-[#e6e6e6] leading-snug">
                    {resourceProfile.costs.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#c99b52] shrink-0">—</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-xs text-[#8f8f8f] leading-relaxed pt-0.5">
                {resourceProfile.tradeoffNote}
              </p>
            </section>
          )}

          {/* Contextual Pack Impact */}
          {contextImpact && (() => {
            const coUsageLabelMap: Record<CoUsageVerdict, string> = {
              synergy: 'Синергия со сборкой',
              solo: 'Работает автономно',
              overlap: 'Частичное пересечение',
              redundant: 'Перекрыт / без потребителя',
              dependency: 'Опорная зависимость',
              conflict: 'Конфликт / несовместимость',
            };
            const relPctText =
              contextImpact.relativeImpactPct > 0
                ? `+${contextImpact.relativeImpactPct}%`
                : `${contextImpact.relativeImpactPct}%`;
            const impactTone =
              contextImpact.relativeImpactPct > 0
                ? 'text-[#6abf7b]'
                : contextImpact.relativeImpactPct < 0
                  ? 'text-[#cf6d6d]'
                  : 'text-[#c99b52]';
            const betterMod = contextImpact.betterAnalogId
              ? MODS_DATABASE.find(m => m.id === contextImpact.betterAnalogId) || null
              : null;

            return (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-4 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2.5 border-b border-[#2a2a2a]">
                  <div>
                    <h3 className="text-sm font-semibold text-[#e6e6e6]">
                      Взаимодействие и относительный импакт ({contextSourceLabel})
                    </h3>
                    <p className="text-[11px] text-[#8f8f8f] mt-0.5">
                      {contextImpact.inPack
                        ? `Уже в сборке · ${coUsageLabelMap[contextImpact.coUsageVerdict]}`
                        : `При добавлении к текущей сборке · ${coUsageLabelMap[contextImpact.coUsageVerdict]}`}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2.5 font-mono text-xs tabular-nums">
                    <span className={`font-semibold ${impactTone}`}>
                      {contextImpact.inPack ? 'Вклад ' : 'Добавит '}
                      {relPctText}
                    </span>
                    <span className="text-[#2a2a2a]" aria-hidden="true">·</span>
                    <span className="font-semibold text-[#e6e6e6]">{contextImpact.impactPoints} / 100 б.</span>
                    <span className="text-[#2a2a2a]" aria-hidden="true">·</span>
                    <span className="text-[#8f8f8f]">{contextImpact.label}</span>
                  </div>
                </div>
                <p className="text-xs text-[#e6e6e6] leading-relaxed">{contextImpact.summary}</p>
                {betterMod && contextImpact.betterAnalogDeltaPoints !== undefined && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-[4px] bg-[#1a1a1a] border border-[#2a2a2a] text-xs">
                    <span className="text-[#e6e6e6]">
                      Сильнее аналог: <strong className="text-[#e6e6e6]">{betterMod.name}</strong>{' '}
                      <span className="text-[#6abf7b] font-mono font-semibold tabular-nums">
                        (+{contextImpact.betterAnalogDeltaPoints} б.)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectMod(betterMod)}
                      className="px-2.5 py-1 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#4caf6a] text-[11px] font-semibold"
                    >
                      Сравнить с {betterMod.name}
                    </button>
                  </div>
                )}
                {contextImpact.interactions.length > 0 && (
                  <div className="divide-y divide-[#2a2a2a] rounded-[4px] border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
                    {contextImpact.interactions.map((inter, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-2 text-[11px] leading-snug ${
                          inter.kind === 'conflict'
                            ? 'text-[#cf6d6d]'
                            : inter.kind === 'overlap'
                              ? 'text-[#c99b52]'
                              : inter.kind === 'synergy'
                                ? 'text-[#6abf7b]'
                                : 'text-[#8f8f8f]'
                        }`}
                      >
                        {inter.targetNames.length > 0 && (
                          <span className="font-semibold text-[#e6e6e6]">[{inter.targetNames.join(' + ')}] </span>
                        )}
                        {inter.summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Dual Port Choice */}
          {dualPairMods && dualPairMods.forgeMod && dualPairMods.fabricMod && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#e6e6e6]">
                  Выбор реализации: {dualPairMods.pair.title}
                </h3>
                <span className="text-[11px] text-[#8f8f8f]">
                  {dualPairMods.pair.switchableOnForge
                    ? 'Оба варианта работают на Forge 1.20.1'
                    : 'На Forge работает только нативный порт'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    role: 'Нативный Forge-порт',
                    target: dualPairMods.forgeMod,
                    summary: dualPairMods.pair.forgeSummary,
                    tone: 'emerald' as const,
                    canPick: true,
                  },
                  {
                    role: dualPairMods.pair.switchableOnForge ? 'Fabric + Sinytra Connector' : 'Fabric-оригинал (справка)',
                    target: dualPairMods.fabricMod,
                    summary: dualPairMods.pair.fabricSummary,
                    tone: isUnsupportedOnForge(dualPairMods.fabricMod) ? ('rose' as const) : ('sky' as const),
                    canPick: dualPairMods.pair.switchableOnForge && !isUnsupportedOnForge(dualPairMods.fabricMod),
                  },
                ].map(item => {
                  const isCurrent = item.target.id === mod.id;
                  const borderCls =
                    item.tone === 'rose'
                      ? 'border-[#cf6d6d]/40 bg-[#cf6d6d]/[0.05]'
                      : isCurrent
                        ? 'border-[#4caf6a] bg-[#4caf6a]/[0.06]'
                        : 'border-[#2a2a2a] bg-[#1a1a1a]';
                  return (
                    <div key={item.target.id} className={`rounded-[6px] border p-3 flex flex-col justify-between gap-2.5 ${borderCls}`}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-[#8f8f8f]">{item.role}</span>
                          <a
                            href={item.target.curseforgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-[#8f8f8f] hover:text-[#e6e6e6] inline-flex items-center gap-1"
                          >
                            CF <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-xs font-semibold text-[#e6e6e6]">{item.target.name}</div>
                        <p className="text-[11px] text-[#8f8f8f] leading-snug">{item.summary}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => onSelectMod(item.target)}
                            className="px-2.5 py-1 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[11px] text-[#e6e6e6] font-medium"
                          >
                            Открыть
                          </button>
                        )}
                        {onChooseVariantInBuilder && item.canPick && (
                          <button
                            type="button"
                            onClick={() => onChooseVariantInBuilder(item.target)}
                            className="px-2.5 py-1 rounded-[4px] text-[11px] font-semibold bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] transition-colors"
                          >
                            Выбрать в Клипании
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compatible Group Addons */}
          {groupInfo && groupInfo.addons.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#e6e6e6]">
                  Совместимые аддоны и дополнения ({groupInfo.addons.length})
                </h3>
                <span className="text-[11px] text-[#8f8f8f]">Дополняют лидера, не заменяя его</span>
              </div>
              <div className="divide-y divide-[#2a2a2a] border border-[#2a2a2a] rounded-[6px] overflow-hidden bg-[#141414]">
                {groupInfo.addons.map(addon => {
                  const addonTier = getBaseHealthTier(addon);
                  const statusTone =
                    addonTier === 'red'
                      ? 'text-[#cf6d6d]'
                      : addonTier === 'green'
                        ? 'text-[#6abf7b]'
                        : addonTier === 'lime'
                          ? 'text-[#9ab86a]'
                          : 'text-[#c99b52]';
                  const addonRp = getModResourceProfile(addon);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => onSelectMod(addon)}
                      className="px-4 py-2.5 hover:bg-[#1f1f1f] cursor-pointer transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                          <span className="font-semibold text-[#e6e6e6]">{addon.name}</span>
                          <span className={statusTone}>{cleanStatusLabel(addon.statusLabel)}</span>
                          <span className="text-[#8f8f8f]">· {addon.platform}</span>
                          {addonRp.hasTradeoff && (
                            <span className="text-[#c99b52] text-[11px]">· {addonRp.shortTag}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8f8f8f] mt-0.5 truncate">{formatShortOneLineDescription(addon.description)}</p>
                      </div>
                      <a
                        href={addon.curseforgeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[#8f8f8f] hover:text-[#e6e6e6] p-1 rounded-[4px] shrink-0"
                        title="Открыть на CurseForge"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analogs & Co-Usage Comparison */}
          {analogsComparison.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#e6e6e6]">
                  Аналоги, замены и совместная работа ({analogsComparison.length})
                </h3>
                <span className="text-[11px] text-[#8f8f8f]">
                  Сравнение по баллам и совместимости с {mod.name}
                </span>
              </div>
              {groupInfo?.group.conflictReason && (
                <p className="text-xs text-[#8f8f8f] bg-[#141414] border border-[#2a2a2a] rounded-[6px] px-3 py-2">
                  {groupInfo.group.conflictReason}
                </p>
              )}
              <div className="divide-y divide-[#2a2a2a] border border-[#2a2a2a] rounded-[6px] overflow-hidden bg-[#141414]">
                {analogsComparison.map(entry => {
                  const alt = entry.mod;
                  const altTier = getBaseHealthTier(alt);
                  const statusTone =
                    altTier === 'red'
                      ? 'text-[#cf6d6d]'
                      : altTier === 'green'
                        ? 'text-[#6abf7b]'
                        : altTier === 'lime'
                          ? 'text-[#9ab86a]'
                          : 'text-[#c99b52]';
                  const relColor =
                    entry.relation === 'better-replacement' || entry.relation === 'leader' || entry.relation === 'addon-synergy'
                      ? 'text-[#6abf7b]'
                      : entry.relation === 'conflict' || entry.relation === 'overlap-duplicate'
                        ? 'text-[#cf6d6d]'
                        : 'text-[#8f8f8f]';
                  const deltaSign =
                    entry.relativeDeltaPoints > 0
                      ? `+${entry.relativeDeltaPoints} б.`
                      : `${entry.relativeDeltaPoints} б.`;
                  const pctText =
                    entry.marginalPct > 0
                      ? `+${entry.marginalPct}%`
                      : `${entry.marginalPct}%`;
                  const altRp = getModResourceProfile(alt);
                  return (
                    <div
                      key={alt.id}
                      onClick={() => onSelectMod(alt)}
                      className="px-4 py-2.5 hover:bg-[#1f1f1f] cursor-pointer transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                          <span className="font-semibold text-[#e6e6e6]">{alt.name}</span>
                          {entry.isSelectedInContext && (
                            <span className="text-[11px] font-semibold text-[#4caf6a]">в сборке</span>
                          )}
                          <span className="text-[#2a2a2a]" aria-hidden="true">·</span>
                          <span className={`text-[11px] font-medium ${relColor}`}>{entry.relationLabel}</span>
                          <span className="text-[#2a2a2a]" aria-hidden="true">·</span>
                          <span className={`text-[11px] font-medium ${statusTone}`}>{cleanStatusLabel(alt.statusLabel)}</span>
                          <span className="text-[#2a2a2a]" aria-hidden="true">·</span>
                          <span className="text-[11px] font-mono text-[#e6e6e6] tabular-nums">
                            {entry.points} б. ({pctText})
                          </span>
                          {entry.relativeDeltaPoints !== 0 && (
                            <span
                              className={`text-[11px] font-mono font-semibold tabular-nums ${
                                entry.relativeDeltaPoints > 0 ? 'text-[#6abf7b]' : 'text-[#8f8f8f]'
                              }`}
                            >
                              {deltaSign} vs {mod.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8f8f8f] mt-1 leading-snug">
                          <span className={entry.canUseTogether ? 'text-[#6abf7b] font-medium' : 'text-[#c99b52] font-medium'}>
                            {entry.canUseTogether ? 'Совместим: ' : 'Несовместно: '}
                          </span>
                          {entry.coUsageNote}
                          {altRp.hasTradeoff && (
                            <span className="text-[#c99b52]"> · {altRp.shortTag}</span>
                          )}
                        </p>
                      </div>
                      <a
                        href={alt.curseforgeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#1a1a1a] hover:bg-[#222222] border border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6] text-[11px] font-mono transition-colors"
                      >
                        CF
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {builtInCoveredMods.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-[#e6e6e6]">
                Моды, уже включённые в {mod.name} ({builtInCoveredMods.length})
              </h3>
              <div className="divide-y divide-[#2a2a2a] border border-[#2a2a2a] rounded-[6px] overflow-hidden bg-[#141414]">
                {builtInCoveredMods.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => onSelectMod(sub)}
                    className="px-4 py-2 hover:bg-[#1f1f1f] cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#e6e6e6]">{sub.name}</div>
                      <div className="text-[11px] text-[#8f8f8f] truncate">{formatShortOneLineDescription(sub.description)}</div>
                    </div>
                    <a
                      href={sub.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 text-[#8f8f8f] hover:text-[#e6e6e6] p-1"
                      title="CurseForge"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

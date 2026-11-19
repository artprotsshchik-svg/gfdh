import { useEffect, useMemo, useState } from 'react';
import {
  MODS_DATABASE,
  MOD_GROUPS,
  type ModItem,
} from '../data/modsData.ts';
import {
  cleanModDescription,
  formatShortOneLineDescription,
  getModEnvBadge,
  getModLoaderBadge,
  getRecommendedConfigForMod,
} from '../utils/displayFormatters.ts';
import {
  INITIAL_BUILDER_PREFS,
  MOD_BY_ID,
  buildSmartAssembly,
  evaluateAssemblyHealth,
  evaluateModImpactInPack,
  getCheckerTier,
  getDirectDependencies,
  getModSuperseder,
  getRuleConflictingIds,
  isModIncompatibleWithSelection,
  isUnsupportedOnForge,
  organizeAssemblyTree,
  shouldHideMod,
  smartFixAssembly,
  summarizeAssemblyImpact,
  toggleModSmart,
  type AssemblyPreferences,
  type PackScale,
  type PortStrategy,
  type RecipeViewerChoice,
} from '../utils/modLogic.ts';
import { estimateFpsRange } from '../utils/fpsEstimator.ts';
import {
  addMissingDependenciesForMod,
  getConflictsForMod,
  getMissingDependenciesForMod,
  replaceConflictingWithMod,
} from '../utils/modInteractions.ts';
import { exportAssemblyAsJson, triggerFileDownload } from '../utils/exportFormats.ts';
import { DubiousModsModal } from './DubiousModsModal.tsx';
import { AssemblyDetailModal, type AnalyzedAssemblyModRow } from './AssemblyDetailModal.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  PanelRightOpen,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';

interface AssemblyBuilderTabProps {
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  prefs: AssemblyPreferences;
  setPrefs: (updater: AssemblyPreferences | ((prev: AssemblyPreferences) => AssemblyPreferences)) => void;
  onOpenDetail: (mod: ModItem) => void;
  onSendToChecker: (ids: string[]) => void;
}

type CategoryKey =
  | 'all'
  | 'render'
  | 'culling'
  | 'memory'
  | 'lighting'
  | 'entities'
  | 'worldgen'
  | 'network'
  | 'cpu'
  | 'sinytra'
  | 'recipes'
  | 'profilers';

interface SidebarCategory {
  key: CategoryKey;
  label: string;
  groupIds: string[];
}

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  { key: 'all', label: 'Все категории', groupIds: [] },
  {
    key: 'render',
    label: 'Рендер',
    groupIds: ['core-renderer', 'shaders-pipeline', 'lod-nvidium', 'upscaling-bg'],
  },
  {
    key: 'culling',
    label: 'Куллинг',
    groupIds: ['block-culling', 'leaves-culling', 'block-entities'],
  },
  { key: 'memory', label: 'Память', groupIds: ['memory-core'] },
  { key: 'lighting', label: 'Освещение', groupIds: ['lighting-engine'] },
  {
    key: 'entities',
    label: 'Сущности и TPS',
    groupIds: ['tick-physics-engine', 'items-clearlag'],
  },
  { key: 'worldgen', label: 'Чанки и мир', groupIds: ['worldgen-chunks'] },
  { key: 'network', label: 'Сеть', groupIds: ['networking'] },
  {
    key: 'cpu',
    label: 'Потоки и старт',
    groupIds: ['cpu-threads', 'boot-loading', 'particles-audio', 'animations-compat', 'potato-tweaks'],
  },
  { key: 'sinytra', label: 'Sinytra-мост', groupIds: ['sinytra-bridge'] },
  { key: 'recipes', label: 'JEI / EMI', groupIds: ['recipes-jei'] },
  { key: 'profilers', label: 'Профилировщики', groupIds: ['profilers'] },
];

const GROUP_TO_CATEGORY = new Map<string, CategoryKey>();
for (const cat of SIDEBAR_CATEGORIES) {
  for (const gid of cat.groupIds) {
    GROUP_TO_CATEGORY.set(gid, cat.key);
  }
}

export function AssemblyBuilderTab({
  selectedIds,
  setSelectedIds,
  prefs,
  setPrefs,
  onOpenDetail,
  onSendToChecker,
}: AssemblyBuilderTabProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [hideUselessCovered, setHideUselessCovered] = useState(true);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [copiedList, setCopiedList] = useState(false);
  const [copiedConfigModId, setCopiedConfigModId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showDubiousModal, setShowDubiousModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileDrawerOpen]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const analysis = useMemo(() => evaluateAssemblyHealth(selectedIds), [selectedIds]);
  const assemblyImpact = useMemo(
    () => summarizeAssemblyImpact(selectedIds, analysis, prefs),
    [selectedIds, analysis, prefs]
  );
  const fpsEstimate = useMemo(
    () => estimateFpsRange(selectedIds, assemblyImpact, prefs),
    [selectedIds, assemblyImpact, prefs]
  );

  const warningByMod = useMemo(() => {
    const map = new Map<string, { severity: 'red' | 'yellow'; messages: string[] }>();
    for (const w of analysis.warnings) {
      const prev = map.get(w.modId);
      const severity = prev?.severity === 'red' || w.severity === 'red' ? 'red' : 'yellow';
      map.set(w.modId, { severity, messages: prev ? [...prev.messages, w.message] : [w.message] });
    }
    return map;
  }, [analysis.warnings]);

  const categorySelectedCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: selectedIds.length,
      render: 0,
      culling: 0,
      memory: 0,
      lighting: 0,
      entities: 0,
      worldgen: 0,
      network: 0,
      cpu: 0,
      sinytra: 0,
      recipes: 0,
      profilers: 0,
    };
    for (const id of selectedIds) {
      const mod = MOD_BY_ID.get(id);
      if (!mod?.groupId) continue;
      const catKey = GROUP_TO_CATEGORY.get(mod.groupId);
      if (catKey) counts[catKey]++;
    }
    return counts;
  }, [selectedIds]);

  const groupTitleById = useMemo(() => {
    const map = new Map<string, string>();
    MOD_GROUPS.forEach(g => map.set(g.id, g.title));
    return map;
  }, []);

  const analyzedMods: AnalyzedAssemblyModRow[] = useMemo(() => {
    const dubiousMap = new Map(assemblyImpact.dubiousMods.map(d => [d.modId, d.artifactContributionPct]));
    return analysis.selectedMods.map(mod => ({
      mod,
      impact: evaluateModImpactInPack(mod, selectedSet, analysis, prefs),
      artifactDeltaPct: dubiousMap.get(mod.id) ?? 0,
      groupTitle: mod.groupId ? groupTitleById.get(mod.groupId) || mod.category : mod.category,
    }));
  }, [analysis, selectedSet, prefs, assemblyImpact.dubiousMods, groupTitleById]);

  // Fixed deterministic order: group order from MOD_GROUPS, members in group.memberIds order
  const orderedGroups = useMemo(() => {
    const cat = SIDEBAR_CATEGORIES.find(c => c.key === activeCategory);
    const allowedGroupSet =
      activeCategory === 'all' || !cat ? null : new Set(cat.groupIds);

    const q = searchQuery.trim().toLowerCase();

    return MOD_GROUPS.filter(g => !allowedGroupSet || allowedGroupSet.has(g.id))
      .map(group => {
        const seen = new Set<string>();
        const members: ModItem[] = [];
        for (const id of group.memberIds) {
          const m = MOD_BY_ID.get(id);
          if (m && !seen.has(m.id)) {
            seen.add(m.id);
            members.push(m);
          }
        }
        for (const m of MODS_DATABASE) {
          if (m.groupId === group.id && !seen.has(m.id)) {
            seen.add(m.id);
            members.push(m);
          }
        }

        const visibleMods = members.filter(m => {
          const isSelected = selectedSet.has(m.id);
          if (onlySelected && !isSelected) return false;

          if (q) {
            const matches =
              m.name.toLowerCase().includes(q) ||
              m.description.toLowerCase().includes(q) ||
              m.id.toLowerCase().includes(q) ||
              (m.tags && m.tags.some(t => t.toLowerCase().includes(q)));
            if (!matches) return false;
            if (onlyCompatible && !isSelected && isModIncompatibleWithSelection(m, selectedSet, prefs)) {
              return false;
            }
            return true;
          }

          if (onlyCompatible && !isSelected && isModIncompatibleWithSelection(m, selectedSet, prefs)) {
            return false;
          }

          if (
            hideUselessCovered &&
            !isSelected &&
            shouldHideMod(m, selectedSet, prefs, { hideIncompatible: false, hideUselessCovered: true })
          ) {
            // Also keep explicit leader/addons or Nvidium visible unless danger/unsupported/covered
            return false;
          }

          return true;
        });

        return { group, mods: visibleMods };
      })
      .filter(entry => entry.mods.length > 0);
  }, [activeCategory, searchQuery, onlySelected, onlyCompatible, hideUselessCovered, selectedSet, prefs]);

  const totalVisibleModsCount = useMemo(
    () => orderedGroups.reduce((acc, g) => acc + g.mods.length, 0),
    [orderedGroups]
  );

  const showGroupSubheaders = orderedGroups.length > 1;
  const currentRecipeViewer = prefs.recipeViewer ?? 'none';
  const currentPortStrategy: 'auto' | PortStrategy = prefs.portStrategy ?? 'auto';
  const currentPackScale: PackScale = prefs.packScale ?? 'medium';
  const isRecipesSection = activeCategory === 'recipes';

  const handleToggleMod = (mod: ModItem) => {
    const res = toggleModSmart(selectedIds, mod.id, { strict: true, prefs });
    setSelectedIds(res.nextIds);
  };

  const handleBuildSmart = () => {
    const fixedPrefs: AssemblyPreferences = {
      ...prefs,
      gpu: 'nvidia',
      mode: 'singleplayer',
      goal: 'balanced',
      useCreate: false,
    };
    const built = buildSmartAssembly(fixedPrefs);
    setSelectedIds(built.modIds);
  };

  const handleFixIssues = () => {
    setSelectedIds(smartFixAssembly(selectedIds, prefs));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setOnlySelected(false);
    setOnlyCompatible(false);
    setHideUselessCovered(true);
    setActiveCategory('all');
  };

  const executeResetAll = () => {
    setSelectedIds([]);
    setPrefs({ ...INITIAL_BUILDER_PREFS, recipeViewer: 'none', focusModId: null });
    setSearchQuery('');
    setOnlySelected(false);
    setOnlyCompatible(false);
    setHideUselessCovered(true);
    setActiveCategory('all');
    setExpandedRowIds({});
  };

  const handleCopyNamesList = () => {
    if (selectedIds.length === 0) return;
    const treeNodes = organizeAssemblyTree(selectedIds);
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
    for (const id of selectedIds) {
      if (!seen.has(id)) {
        const m = MOD_BY_ID.get(id);
        if (m) {
          seen.add(id);
          orderedNames.push(m.name);
        }
      }
    }
    navigator.clipboard.writeText(orderedNames.join('\n'));
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 1800);
  };

  const handleDownloadJson = () => {
    if (selectedIds.length === 0) return;
    triggerFileDownload(
      'forge-1.20.1-assembly.json',
      exportAssemblyAsJson(selectedIds, assemblyImpact, fpsEstimate, prefs),
      'application/json;charset=utf-8'
    );
  };

  const handleCopyConfig = (modId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedConfigModId(modId);
    setTimeout(() => setCopiedConfigModId(prev => (prev === modId ? null : prev)), 1800);
  };

  const getRowCompatibility = (mod: ModItem) => {
    const isSelected = selectedSet.has(mod.id);
    const w = warningByMod.get(mod.id);
    const conflictIssue = getConflictsForMod(mod.id, selectedSet, mod.groupId);
    const missingDeps = getMissingDependenciesForMod(mod.id, selectedSet, analysis.warnings);
    const hasConflictWithSelected = !isSelected && conflictIssue.conflictingIds.length > 0;

    const effectiveConflictSet = isSelected
      ? analysis.conflictingIdSet
      : hasConflictWithSelected
        ? new Set([mod.id])
        : new Set<string>();

    const effectiveSeverity: 'red' | 'yellow' | undefined = isSelected
      ? w?.severity
      : hasConflictWithSelected
        ? 'red'
        : undefined;

    const checker = getCheckerTier(mod, effectiveConflictSet, effectiveSeverity);

    let statusTier = checker.tier;
    let statusLabel =
      statusTier === 'red'
        ? 'Конфликт'
        : statusTier === 'yellow'
          ? 'Предупреждение'
          : 'Совместимо';

    if (isSelected && missingDeps.hasMissingForSelected && statusTier !== 'red') {
      statusTier = 'yellow';
      statusLabel = 'Предупреждение';
    }

    return {
      isSelected,
      statusTier,
      statusLabel,
      conflictIssue,
      missingDeps,
      warningMessages: w?.messages ?? [],
    };
  };

  const hasAnyIssues = analysis.conflicts.length > 0 || analysis.warnings.length > 0;

  const renderSelectedPanelContent = () => (
    <>
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#2a2e33]">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-[#e6e8ea]">Выбрано</h2>
          <span className="font-mono text-xs font-semibold tabular-nums text-[#3ddc84]">
            {selectedIds.length}
          </span>
        </div>
        <div className="flex items-baseline gap-2 text-xs font-mono tabular-nums">
          <span className="text-[#3ddc84] font-semibold">{assemblyImpact.assemblyScore}/100</span>
          <span className="text-[#8b9199]">{fpsEstimate.label}</span>
        </div>
      </div>

      {hasAnyIssues ? (
        <div className="space-y-2">
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
            {analysis.conflicts.map((c, idx) => (
              <div
                key={`c-${idx}`}
                className="p-2 rounded-[4px] bg-[#e55353]/10 border border-[#e55353]/40 text-xs space-y-0.5"
              >
                <div className="font-medium text-[#e55353] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{c.matchedNames.join(' + ')}</span>
                </div>
                <p className="text-[11px] text-[#e6e8ea] leading-snug">{c.rule.explanation}</p>
              </div>
            ))}
            {analysis.warnings.map((w, idx) => (
              <div
                key={`w-${idx}`}
                className={`p-2 rounded-[4px] border text-[11px] flex items-start gap-1.5 leading-snug ${
                  w.severity === 'red'
                    ? 'bg-[#e55353]/10 border-[#e55353]/40 text-[#e55353]'
                    : 'bg-[#e5a93c]/10 border-[#e5a93c]/40 text-[#e5a93c]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleFixIssues}
            className="w-full py-1.5 px-3 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-xs font-semibold transition-colors duration-150"
          >
            Исправить
          </button>
        </div>
      ) : selectedIds.length > 0 ? (
        <div className="px-2.5 py-2 rounded-[4px] bg-[#3ddc84]/10 border border-[#3ddc84]/30 text-xs text-[#3ddc84] flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Конфликтов не обнаружено</span>
        </div>
      ) : (
        <div className="px-2.5 py-3 rounded-[4px] bg-[#121417] border border-[#2a2e33] text-xs text-[#8b9199]">
          Список пуст. Отметьте моды или нажмите «Умный подбор».
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="max-h-[40vh] overflow-y-auto divide-y divide-[#2a2e33] border border-[#2a2e33] rounded-[4px] bg-[#121417]">
          {analysis.selectedMods.map(mod => {
            const loader = getModLoaderBadge(mod);
            const hasWarning = analysis.conflictingIdSet.has(mod.id) || warningByMod.has(mod.id);
            return (
              <div
                key={mod.id}
                className="px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-[#22262b] transition-colors duration-150 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onOpenDetail(mod)}
                  className={`min-w-0 flex-1 text-left truncate hover:text-[#3ddc84] transition-colors duration-150 ${
                    hasWarning ? 'text-[#e5a93c]' : 'text-[#e6e8ea]'
                  }`}
                >
                  {mod.name}
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {loader !== 'Forge' && (
                    <span className="font-mono text-[10px] text-[#8b9199]">{loader}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleMod(mod)}
                    className="p-0.5 rounded-[4px] text-[#8b9199] hover:text-[#e55353] hover:bg-[#1a1d21] transition-colors duration-150"
                    aria-label={`Удалить ${mod.name}`}
                    title="Убрать"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-[#2a2e33]">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyNamesList}
            disabled={selectedIds.length === 0}
            className="py-2 px-2.5 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap"
          >
            {copiedList ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedList ? 'Скопировано' : 'Копировать список'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            disabled={selectedIds.length === 0}
            className="py-2 px-2.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#e6e8ea] text-xs font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#3ddc84]" />
            <span>Скачать JSON</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px]">
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setShowDetailModal(true)}
            className="text-[#8b9199] hover:text-[#e6e8ea] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            Подробный отчёт
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => onSendToChecker(selectedIds)}
            className="inline-flex items-center gap-1 text-[#8b9199] hover:text-[#3ddc84] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            <span>Открыть в Чекере</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Top Search & Compact Controls Bar */}
      <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="w-3.5 h-3.5 text-[#8b9199] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            data-search-input="true"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, описанию или id… (/)"
            aria-label="Поиск модов"
            className="w-full pl-8 pr-7 py-1.5 bg-[#121417] border border-[#2a2e33] rounded-[4px] text-xs text-[#e6e8ea] placeholder-[#8b9199] focus:border-[#3ddc84] transition-colors duration-150"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Очистить поиск"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b9199] hover:text-[#e6e8ea] p-0.5 rounded-[4px]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <label className="inline-flex items-center gap-1.5 text-xs text-[#8b9199]">
          <span>Масштаб</span>
          <select
            aria-label="Масштаб модпака"
            value={currentPackScale}
            onChange={e => setPrefs(p => ({ ...p, packScale: e.target.value as PackScale }))}
            className="px-2 py-1.5 bg-[#121417] border border-[#2a2e33] rounded-[4px] text-xs text-[#e6e8ea] focus:border-[#3ddc84] transition-colors duration-150"
          >
            <option value="light">Лёгкий (&lt;80)</option>
            <option value="medium">Средний (100–200)</option>
            <option value="heavy">Тяжёлый (200+)</option>
          </select>
        </label>

        <label className="inline-flex items-center gap-1.5 text-xs text-[#8b9199]">
          <span>Порты</span>
          <select
            aria-label="Стратегия портов"
            value={currentPortStrategy}
            onChange={e => {
              const raw = e.target.value;
              const val: PortStrategy | undefined = raw === 'auto' ? undefined : (raw as PortStrategy);
              setPrefs(p => ({
                ...p,
                portStrategy: val,
                allowSinytra: val === 'native-forge' ? false : true,
              }));
            }}
            className="px-2 py-1.5 bg-[#121417] border border-[#2a2e33] rounded-[4px] text-xs text-[#e6e8ea] focus:border-[#3ddc84] transition-colors duration-150"
          >
            <option value="auto">Авто</option>
            <option value="native-forge">Нативный Forge</option>
            <option value="hybrid">Гибрид</option>
            <option value="fabric-sinytra">Fabric + Sinytra</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => setPrefs(p => ({ ...p, useShaders: !p.useShaders }))}
          aria-pressed={prefs.useShaders}
          className={`px-2.5 py-1.5 rounded-[4px] text-xs font-medium border transition-colors duration-150 whitespace-nowrap ${
            prefs.useShaders
              ? 'bg-[#22262b] border-[#3ddc84] text-[#e6e8ea]'
              : 'bg-[#121417] border-[#2a2e33] text-[#8b9199] hover:text-[#e6e8ea] hover:bg-[#22262b]'
          }`}
        >
          {prefs.useShaders ? 'Шейдеры: Да' : 'Шейдеры: Нет'}
        </button>

        <button
          type="button"
          onClick={() => setOnlyCompatible(v => !v)}
          aria-pressed={onlyCompatible}
          className={`px-2.5 py-1.5 rounded-[4px] text-xs font-medium border transition-colors duration-150 whitespace-nowrap ${
            onlyCompatible
              ? 'bg-[#22262b] border-[#3ddc84] text-[#e6e8ea]'
              : 'bg-[#121417] border-[#2a2e33] text-[#8b9199] hover:text-[#e6e8ea] hover:bg-[#22262b]'
          }`}
        >
          Только совм.
        </button>

        <button
          type="button"
          onClick={() => setOnlySelected(v => !v)}
          aria-pressed={onlySelected}
          className={`px-2.5 py-1.5 rounded-[4px] text-xs font-medium border transition-colors duration-150 whitespace-nowrap ${
            onlySelected
              ? 'bg-[#22262b] border-[#3ddc84] text-[#e6e8ea]'
              : 'bg-[#121417] border-[#2a2e33] text-[#8b9199] hover:text-[#e6e8ea] hover:bg-[#22262b]'
          }`}
        >
          Выбранные
        </button>

        <button
          type="button"
          onClick={handleBuildSmart}
          className="px-3.5 py-1.5 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-xs font-semibold transition-colors duration-150 whitespace-nowrap ml-auto"
        >
          Умный подбор
        </button>

        <button
          type="button"
          onClick={() => (selectedIds.length > 0 ? setConfirmResetOpen(true) : executeResetAll())}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#8b9199] hover:text-[#e55353] text-xs font-medium transition-colors duration-150 whitespace-nowrap"
          title="Сбросить выбор и фильтры"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Сброс</span>
        </button>
      </div>

      {/* Responsive Mobile Category Dropdown (< lg) */}
      <div className="lg:hidden">
        <select
          aria-label="Категория модов"
          value={activeCategory}
          onChange={e => setActiveCategory(e.target.value as CategoryKey)}
          className="w-full px-3 py-2 bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] text-xs text-[#e6e8ea] font-medium focus:border-[#3ddc84]"
        >
          {SIDEBAR_CATEGORIES.map(cat => (
            <option key={cat.key} value={cat.key}>
              {cat.label} ({categorySelectedCounts[cat.key]})
            </option>
          ))}
        </select>
      </div>

      {/* 3-Column Optimizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Narrow Category Navigation Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 xl:col-span-2 lg:sticky lg:top-16">
          <nav
            aria-label="Категории модов"
            className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-1.5 space-y-0.5"
          >
            {SIDEBAR_CATEGORIES.map(cat => {
              const active = activeCategory === cat.key;
              const count = categorySelectedCounts[cat.key];
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full px-2.5 py-1.5 rounded-[4px] text-xs flex items-center justify-between gap-2 transition-colors duration-150 text-left ${
                    active
                      ? 'bg-[#22262b] text-[#e6e8ea] font-semibold border-l-2 border-[#3ddc84]'
                      : 'text-[#8b9199] hover:text-[#e6e8ea] hover:bg-[#22262b]/60'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums shrink-0 ${
                      active || count > 0 ? 'text-[#3ddc84] font-semibold' : 'text-[#8b9199]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Center: Dense Mod Rows List */}
        <section className="lg:col-span-6 xl:col-span-7 space-y-3" aria-label="Список модов">
          {/* JEI / EMI Section-only Recipe Viewer Switcher */}
          {isRecipesSection && (
            <div
              data-recipe-selector="true"
              className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5"
            >
              <span className="text-xs font-medium text-[#e6e8ea]">Просмотрщик рецептов (JEI / EMI)</span>
              <div
                className="flex items-center gap-1 bg-[#121417] border border-[#2a2e33] rounded-[4px] p-0.5 text-xs"
                role="group"
                aria-label="Режим просмотрщика рецептов"
              >
                {[
                  { k: 'none', label: 'Нет' },
                  { k: 'jei', label: 'JEI' },
                  { k: 'emi', label: 'EMI' },
                  { k: 'emi-jei', label: 'EMI+JEI' },
                ].map(opt => {
                  const active = currentRecipeViewer === opt.k;
                  return (
                    <button
                      key={opt.k}
                      type="button"
                      onClick={() =>
                        setPrefs(p => ({ ...p, recipeViewer: opt.k as RecipeViewerChoice }))
                      }
                      className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors duration-150 whitespace-nowrap ${
                        active
                          ? 'bg-[#3ddc84] text-[#0f1411] font-semibold'
                          : 'text-[#8b9199] hover:text-[#e6e8ea]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {totalVisibleModsCount === 0 ? (
            <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-8 text-center space-y-2.5">
              <p className="text-sm font-medium text-[#e6e8ea]">Моды не найдены</p>
              <p className="text-xs text-[#8b9199] max-w-md mx-auto">
                Попробуйте изменить поисковый запрос, отключить фильтры «Только совм.» / «Выбранные» или перейти во «Все категории».
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-xs font-semibold transition-colors duration-150"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Сбросить поиск и фильтры
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] overflow-hidden divide-y divide-[#2a2e33]">
              {orderedGroups.map(({ group, mods }) => (
                <div key={group.id}>
                  {showGroupSubheaders && (
                    <div className="px-3 py-1.5 bg-[#121417] border-b border-[#2a2e33] text-[11px] font-medium text-[#8b9199]">
                      {group.title}
                    </div>
                  )}

                  <div className="divide-y divide-[#2a2e33]">
                    {mods.map(mod => {
                      const {
                        isSelected,
                        statusTier,
                        statusLabel,
                        conflictIssue,
                        missingDeps,
                        warningMessages,
                      } = getRowCompatibility(mod);
                      const isExpanded = Boolean(expandedRowIds[mod.id]);
                      const loaderBadge = getModLoaderBadge(mod);
                      const envBadge = getModEnvBadge(mod);
                      const directDeps = getDirectDependencies(mod.id, selectedSet);
                      const depMods = directDeps
                        .map(id => MOD_BY_ID.get(id))
                        .filter((m): m is ModItem => Boolean(m));
                      const recommendedConfig = getRecommendedConfigForMod(mod.id);
                      const ruleConflictIds = getRuleConflictingIds(mod.id);
                      const superseder = getModSuperseder(mod, selectedSet, prefs, false);

                      return (
                        <div
                          key={mod.id}
                          data-mod-row="true"
                          data-mod-id={mod.id}
                          data-mod-context="builder"
                          tabIndex={0}
                          className={`transition-colors duration-150 ${
                            isSelected ? 'bg-[#3ddc84]/[0.04]' : ''
                          }`}
                        >
                          {/* Compact Row Header */}
                          <div
                            onClick={() =>
                              setExpandedRowIds(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))
                            }
                            role="button"
                            aria-expanded={isExpanded}
                            tabIndex={-1}
                            className="px-3 py-2 flex items-center gap-3 hover:bg-[#22262b] transition-colors duration-150 cursor-pointer"
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isSelected}
                              aria-label={`${isSelected ? 'Убрать' : 'Выбрать'} ${mod.name}`}
                              onClick={e => {
                                e.stopPropagation();
                                handleToggleMod(mod);
                              }}
                              className={`w-7 h-4 rounded-[4px] border shrink-0 relative transition-colors duration-150 ${
                                isSelected
                                  ? 'bg-[#3ddc84] border-[#3ddc84]'
                                  : 'bg-[#121417] border-[#2a2e33] hover:border-[#8b9199]'
                              }`}
                            >
                              <span
                                className={`block w-2.5 h-2.5 rounded-[2px] transition-transform duration-150 ${
                                  isSelected
                                    ? 'translate-x-3.5 bg-[#0f1411]'
                                    : 'translate-x-0.5 bg-[#8b9199]'
                                }`}
                              />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[13px] font-medium text-[#e6e8ea] truncate">
                                  {mod.name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded-[4px] border text-[10px] font-mono shrink-0 ${
                                    loaderBadge === 'Sinytra'
                                      ? 'border-[#e5a93c]/40 text-[#e5a93c] bg-[#121417]'
                                      : loaderBadge === 'NeoForge' || loaderBadge === 'Fabric'
                                        ? 'border-[#e55353]/40 text-[#e55353] bg-[#121417]'
                                        : 'border-[#2a2e33] text-[#8b9199] bg-[#121417]'
                                  }`}
                                >
                                  {loaderBadge}
                                </span>
                                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-[4px] border border-[#2a2e33] bg-[#121417] text-[10px] text-[#8b9199] shrink-0">
                                  {envBadge}
                                </span>
                              </div>
                              <p className="text-xs text-[#8b9199] truncate mt-0.5">
                                {formatShortOneLineDescription(mod.description)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <StatusBadge
                                tier={statusTier}
                                label={statusLabel}
                                className="text-[11px]"
                              />
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-[#3ddc84]" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[#8b9199]" aria-hidden="true" />
                              )}
                            </div>
                          </div>

                          {/* Inline Expanded Details */}
                          {isExpanded && (
                            <div className="px-3 py-3 pl-3 sm:pl-12 border-t border-[#2a2e33] bg-[#121417] space-y-2.5 text-xs transition-all duration-150">
                              <p className="text-[#e6e8ea] leading-relaxed">
                                {cleanModDescription(mod.description)}
                              </p>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#8b9199]">
                                <span>id: {mod.id}</span>
                                <span>1.20.1 · {mod.platform}</span>
                                <span>Среда: {envBadge}</span>
                              </div>

                              {/* Dependencies */}
                              {depMods.length > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[4px] bg-[#1a1d21] border border-[#2a2e33]">
                                  <div className="text-[11px] text-[#8b9199]">
                                    <span className="text-[#e6e8ea] font-medium">Зависимости:</span>{' '}
                                    {depMods.map(d => d.name).join(', ')}
                                  </div>
                                  {isSelected && missingDeps.hasMissingForSelected && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const res = addMissingDependenciesForMod(selectedIds, mod.id, prefs);
                                        setSelectedIds(res.nextIds);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-[11px] font-semibold transition-colors duration-150 whitespace-nowrap"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Добавить зависимость
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Active Conflicts with 1-click Replace */}
                              {conflictIssue.conflictingIds.length > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[4px] bg-[#e55353]/10 border border-[#e55353]/40 text-[11px]">
                                  <span className="text-[#e55353]">
                                    Конфликт с выбранным: {conflictIssue.conflictingNames.join(', ')}
                                  </span>
                                  {conflictIssue.canReplace && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const res = replaceConflictingWithMod(selectedIds, mod.id, prefs);
                                        setSelectedIds(res.nextIds);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-[11px] font-semibold transition-colors duration-150 whitespace-nowrap"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                      Заменить
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Warnings / Known Incompatibilities */}
                              {(warningMessages.length > 0 || mod.warning || superseder) && (
                                <div className="p-2 rounded-[4px] bg-[#e5a93c]/10 border border-[#e5a93c]/35 text-[11px] text-[#e5a93c] space-y-0.5">
                                  {warningMessages.map((msg, i) => (
                                    <div key={i}>{msg}</div>
                                  ))}
                                  {mod.warning && !warningMessages.includes(mod.warning) && (
                                    <div>{mod.warning}</div>
                                  )}
                                  {superseder && <div>Перекрыт: {superseder.reason}</div>}
                                </div>
                              )}

                              {conflictIssue.conflictingIds.length === 0 && ruleConflictIds.length > 0 && (
                                <div className="text-[11px] text-[#8b9199]">
                                  <span className="text-[#e6e8ea]">Несовместим с:</span>{' '}
                                  {ruleConflictIds
                                    .slice(0, 5)
                                    .map(id => MOD_BY_ID.get(id)?.name || id)
                                    .join(', ')}
                                  {ruleConflictIds.length > 5 ? ` (+${ruleConflictIds.length - 5})` : ''}
                                </div>
                              )}

                              {/* Config / JSON Code Block (including Nvidium) */}
                              {recommendedConfig && (
                                <div className="rounded-[4px] bg-[#121417] border border-[#2a2e33] overflow-hidden">
                                  <div className="px-2.5 py-1.5 bg-[#1a1d21] border-b border-[#2a2e33] flex items-center justify-between gap-2">
                                    <span className="font-mono text-[11px] text-[#8b9199]">
                                      {mod.id === 'nvidium' ? 'config/nvidium.json' : recommendedConfig.filePath}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyConfig(mod.id, recommendedConfig.content)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[11px] font-medium text-[#e6e8ea] transition-colors duration-150"
                                    >
                                      {copiedConfigModId === mod.id ? (
                                        <>
                                          <Check className="w-3 h-3 text-[#3ddc84]" />
                                          <span>Скопировано</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Копировать</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="p-2.5 font-mono text-xs text-[#e6e8ea] overflow-x-auto select-all">
                                    {recommendedConfig.content}
                                  </pre>
                                </div>
                              )}

                              <div className="flex items-center gap-3 pt-0.5 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => onOpenDetail(mod)}
                                  className="text-[#3ddc84] hover:underline font-medium"
                                >
                                  Полная карточка
                                </button>
                                <a
                                  href={mod.curseforgeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#8b9199] hover:text-[#e6e8ea] font-mono"
                                >
                                  <span>CurseForge</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Sticky «Выбрано» Panel */}
        <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-16">
          <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-3.5 space-y-3">
            {renderSelectedPanelContent()}
          </div>
        </aside>
      </div>

      {/* Mobile (< lg) Sticky Bottom Bar & Drawer */}
      <div className="lg:hidden h-14" aria-hidden="true" />
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#1a1d21] border-t border-[#2a2e33] px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2 text-xs font-mono tabular-nums">
          <span className="text-[#e6e8ea] font-semibold">Выбрано: {selectedIds.length}</span>
          <span className="text-[#2a2e33]">·</span>
          <span className="text-[#3ddc84]">{assemblyImpact.assemblyScore}/100</span>
          {hasAnyIssues && (
            <AlertTriangle className="w-3.5 h-3.5 text-[#e5a93c] shrink-0" aria-label="Есть предупреждения" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150"
        >
          <PanelRightOpen className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Выбрано ({selectedIds.length})</span>
        </button>
      </div>

      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/75 flex justify-end"
          onClick={() => setMobileDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Выбрано"
        >
          <div
            className="w-full max-w-md h-full bg-[#1a1d21] border-l border-[#2a2e33] overflow-y-auto p-4 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-[4px] text-[#8b9199] hover:text-[#e6e8ea] hover:bg-[#22262b] transition-colors duration-150"
                aria-label="Закрыть панель выбранных"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderSelectedPanelContent()}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        title="Сбросить текущую сборку?"
        description={`Будут сняты все выбранные моды (${selectedIds.length}) и сброшены параметры фильтров.`}
        confirmLabel="Сбросить всё"
        onConfirm={() => {
          executeResetAll();
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />

      <DubiousModsModal
        isOpen={showDubiousModal}
        onClose={() => setShowDubiousModal(false)}
        dubiousMods={assemblyImpact.dubiousMods}
        artifactRisk={assemblyImpact.artifactRisk}
        totalModsCount={selectedIds.length}
        onRemoveMod={modId => {
          const res = toggleModSmart(selectedIds, modId, { strict: true, prefs });
          setSelectedIds(res.nextIds);
        }}
        onReplaceMod={(oldModId, newModId) => {
          const withoutOld = selectedIds.filter(id => id !== oldModId);
          const res = toggleModSmart(withoutOld, newModId, { strict: true, prefs });
          setSelectedIds(res.nextIds);
        }}
        onRemoveAllRisky={modIds => {
          const dropSet = new Set(modIds);
          setSelectedIds(selectedIds.filter(id => !dropSet.has(id)));
        }}
        onAutoFix={handleFixIssues}
        onInspectMod={mod => {
          setShowDubiousModal(false);
          onOpenDetail(mod);
        }}
      />

      <AssemblyDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        summary={assemblyImpact}
        prefs={prefs}
        analyzedMods={analyzedMods}
        onInspectMod={onOpenDetail}
        onRemoveMod={modId => {
          const m = MOD_BY_ID.get(modId);
          if (m) handleToggleMod(m);
        }}
        onReplaceMod={(oldModId, newModId) => {
          const withoutOld = selectedIds.filter(id => id !== oldModId);
          const res = toggleModSmart(withoutOld, newModId, { strict: true, prefs });
          setSelectedIds(res.nextIds);
        }}
        onAutoFix={handleFixIssues}
        onOpenDubiousModal={() => setShowDubiousModal(true)}
      />
    </div>
  );
}

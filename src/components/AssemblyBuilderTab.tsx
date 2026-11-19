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
  getPortWarningForMod,
  getRecommendedConfigForMod,
  isModAvailableInPort,
  type PortMode,
} from '../utils/displayFormatters.ts';
import {
  INITIAL_BUILDER_PREFS,
  MOD_BY_ID,
  buildSmartAssembly,
  evaluateAssemblyHealth,
  getCheckerTier,
  getDirectDependencies,
  getModSuperseder,
  getRuleConflictingIds,
  shouldHideMod,
  smartFixAssembly,
  summarizeAssemblyImpact,
  toggleModSmart,
  type AssemblyPreferences,
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
import { StatusBadge } from './StatusBadge.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
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
  onSendToChecker?: (ids: string[]) => void;
}

type CategoryKey =
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

interface CategoryTab {
  key: CategoryKey;
  label: string;
  groupIds: string[];
}

const EXCLUDED_GROUP_IDS = new Set(['shaders-pipeline']);

const CATEGORY_TABS: CategoryTab[] = [
  {
    key: 'render',
    label: 'Рендер',
    groupIds: ['core-renderer', 'lod-nvidium', 'upscaling-bg'],
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
for (const cat of CATEGORY_TABS) {
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
}: AssemblyBuilderTabProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('render');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [copiedConfigModId, setCopiedConfigModId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [issuesPanelOpen, setIssuesPanelOpen] = useState(false);

  const portMode: PortMode =
    prefs.portStrategy === 'native-forge' || prefs.allowSinytra === false ? 'forge' : 'hybrid';

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

  const portIncompatibleSelectedMods = useMemo(() => {
    return analysis.selectedMods.filter(m => !isModAvailableInPort(m, portMode));
  }, [analysis.selectedMods, portMode]);

  const categoryMeta = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
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
    const issueSeverity: Partial<Record<CategoryKey, 'red' | 'yellow'>> = {};

    for (const id of selectedIds) {
      const mod = MOD_BY_ID.get(id);
      if (!mod?.groupId || EXCLUDED_GROUP_IDS.has(mod.groupId)) continue;
      const catKey = GROUP_TO_CATEGORY.get(mod.groupId);
      if (!catKey) continue;
      counts[catKey]++;

      const hasConflict = analysis.conflictingIdSet.has(id) || warningByMod.get(id)?.severity === 'red';
      const hasWarn =
        Boolean(warningByMod.get(id)) || !isModAvailableInPort(mod, portMode);

      if (hasConflict) {
        issueSeverity[catKey] = 'red';
      } else if (hasWarn && issueSeverity[catKey] !== 'red') {
        issueSeverity[catKey] = 'yellow';
      }
    }

    return { counts, issueSeverity };
  }, [selectedIds, analysis.conflictingIdSet, warningByMod, portMode]);

  const visibleTabs = useMemo(() => {
    return CATEGORY_TABS.filter(cat => {
      if (cat.key === 'sinytra' && portMode === 'forge') {
        return categoryMeta.counts.sinytra > 0;
      }
      return true;
    });
  }, [portMode, categoryMeta.counts.sinytra]);

  useEffect(() => {
    if (!visibleTabs.some(t => t.key === activeCategory)) {
      setActiveCategory('render');
    }
  }, [visibleTabs, activeCategory]);

  // Collect deterministic mod list for active category (or all categories when searching)
  const { pinnedSelectedMods, availableUnselectedMods } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const isSearching = q.length > 0;
    const currentTab = CATEGORY_TABS.find(c => c.key === activeCategory);
    const allowedGroupSet = isSearching || !currentTab ? null : new Set(currentTab.groupIds);

    const seen = new Set<string>();
    const ordered: ModItem[] = [];

    for (const group of MOD_GROUPS) {
      if (EXCLUDED_GROUP_IDS.has(group.id)) continue;
      if (allowedGroupSet && !allowedGroupSet.has(group.id)) continue;

      const groupMembers: ModItem[] = [];
      for (const id of group.memberIds) {
        const m = MOD_BY_ID.get(id);
        if (m && !seen.has(m.id)) {
          seen.add(m.id);
          groupMembers.push(m);
        }
      }
      for (const m of MODS_DATABASE) {
        if (m.groupId === group.id && !seen.has(m.id)) {
          seen.add(m.id);
          groupMembers.push(m);
        }
      }

      for (const m of groupMembers) {
        const isSelected = selectedSet.has(m.id);

        if (isSearching) {
          const matches =
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.id.toLowerCase().includes(q) ||
            (m.tags && m.tags.some(t => t.toLowerCase().includes(q)));
          if (!matches) continue;
          // Keep already-selected mods visible even if unavailable in active port; hide unavailable unselected mods
          if (!isSelected && !isModAvailableInPort(m, portMode)) continue;
          ordered.push(m);
          continue;
        }

        // Selected mods stay visible in their tab (with amber warning if port-unavailable)
        if (isSelected) {
          ordered.push(m);
          continue;
        }

        if (!isModAvailableInPort(m, portMode)) continue;

        if (shouldHideMod(m, selectedSet, prefs, { hideIncompatible: false, hideUselessCovered: true })) {
          continue;
        }

        ordered.push(m);
      }
    }

    const selectedList = ordered.filter(m => selectedSet.has(m.id));
    const unselectedList = ordered.filter(m => !selectedSet.has(m.id));

    // In the Render tab, ensure Nvidium leads the pinned selected mods when selected
    if (!isSearching && activeCategory === 'render') {
      selectedList.sort((a, b) => {
        if (a.id === 'nvidium' && b.id !== 'nvidium') return -1;
        if (b.id === 'nvidium' && a.id !== 'nvidium') return 1;
        return 0;
      });
    }

    return {
      pinnedSelectedMods: selectedList,
      availableUnselectedMods: unselectedList,
    };
  }, [activeCategory, searchQuery, selectedSet, portMode, prefs]);

  const totalVisibleModsCount = pinnedSelectedMods.length + availableUnselectedMods.length;
  const currentRecipeViewer = prefs.recipeViewer ?? 'none';
  const isSearching = searchQuery.trim().length > 0;
  const isRecipesTab = activeCategory === 'recipes' && !isSearching;

  const handlePortSwitch = (nextPort: PortMode) => {
    if (nextPort === portMode) return;
    // Never silently delete selected mods when switching ports; only update port mode preference
    setPrefs(p => ({
      ...p,
      portStrategy: nextPort === 'hybrid' ? 'hybrid' : 'native-forge',
      allowSinytra: nextPort === 'hybrid',
      useShaders: false,
      packScale: 'medium',
    }));
  };

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
      useShaders: false,
      packScale: 'medium',
      portStrategy: portMode === 'hybrid' ? 'hybrid' : 'native-forge',
      allowSinytra: portMode === 'hybrid',
    };
    const built = buildSmartAssembly(fixedPrefs);
    setSelectedIds(built.modIds);
  };

  const handleRecipeViewerChange = (nextViewer: RecipeViewerChoice) => {
    const nextPrefs: AssemblyPreferences = {
      ...prefs,
      recipeViewer: nextViewer,
      useShaders: false,
      packScale: 'medium',
    };
    setPrefs(nextPrefs);

    const nextSet = new Set(selectedIds);
    if (nextViewer === 'jei') {
      nextSet.add('just-enough-items-jei');
      nextSet.add('jei-emi-optimizations');
    } else if (nextViewer === 'emi') {
      nextSet.add('emi');
      nextSet.add('tmrv-updated');
      nextSet.add('jei-emi-optimizations');
    } else if (nextViewer === 'emi-jei') {
      nextSet.add('emi');
      nextSet.add('just-enough-items-jei');
      nextSet.add('jei-emi-optimizations');
    }
    setSelectedIds(smartFixAssembly(Array.from(nextSet), nextPrefs));
  };

  const handleFixIssues = () => {
    const portFiltered = selectedIds.filter(id => {
      const mod = MOD_BY_ID.get(id);
      return mod ? isModAvailableInPort(mod, portMode) : false;
    });
    setSelectedIds(smartFixAssembly(portFiltered, prefs));
    setIssuesPanelOpen(false);
  };

  const executeResetAll = () => {
    setSelectedIds([]);
    setPrefs({
      ...INITIAL_BUILDER_PREFS,
      portStrategy: portMode === 'hybrid' ? 'hybrid' : 'native-forge',
      allowSinytra: portMode === 'hybrid',
      useShaders: false,
      packScale: 'medium',
      recipeViewer: 'none',
      focusModId: null,
    });
    setSearchQuery('');
    setExpandedRowIds({});
    setIssuesPanelOpen(false);
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
    const portWarning = getPortWarningForMod(mod, isSelected, portMode);
    const hasConflictWithSelected = !isSelected && conflictIssue.conflictingIds.length > 0;

    const effectiveConflictSet = isSelected
      ? analysis.conflictingIdSet
      : hasConflictWithSelected
        ? new Set([mod.id])
        : new Set<string>();

    const effectiveSeverity: 'red' | 'yellow' | undefined = isSelected
      ? w?.severity ?? (portWarning ? 'yellow' : undefined)
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

    if (isSelected && (missingDeps.hasMissingForSelected || portWarning) && statusTier !== 'red') {
      statusTier = 'yellow';
      statusLabel = 'Предупреждение';
    }

    return {
      isSelected,
      statusTier,
      statusLabel,
      conflictIssue,
      missingDeps,
      portWarning,
      warningMessages: w?.messages ?? [],
    };
  };

  const totalWarningsCount =
    analysis.conflicts.length + analysis.warnings.length + portIncompatibleSelectedMods.length;
  const hasAnyIssues = totalWarningsCount > 0;
  const hasCriticalConflict =
    analysis.conflicts.length > 0 || analysis.warnings.some(w => w.severity === 'red');

  const renderModRow = (mod: ModItem, pinned: boolean) => {
    const {
      isSelected,
      statusTier,
      statusLabel,
      conflictIssue,
      missingDeps,
      portWarning,
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

    const leftAccentCls = pinned
      ? statusTier === 'red'
        ? 'border-l-2 border-l-[#e55353] bg-[#e55353]/[0.04]'
        : statusTier === 'yellow'
          ? 'border-l-2 border-l-[#e5a93c] bg-[#e5a93c]/[0.04]'
          : 'border-l-2 border-l-[#3ddc84] bg-[#3ddc84]/[0.04]'
      : 'border-l-2 border-l-transparent';

    return (
      <div
        key={mod.id}
        data-mod-row="true"
        data-mod-id={mod.id}
        data-mod-context="builder"
        data-pinned={pinned ? 'true' : 'false'}
        tabIndex={0}
        className={`transition-colors duration-150 ${leftAccentCls}`}
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
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0">
              <span className="text-[13px] font-medium text-[#e6e8ea] leading-snug sm:truncate">
                {mod.name}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-[4px] border text-[10px] font-mono shrink-0 whitespace-nowrap ${
                  loaderBadge === 'Fabric via Sinytra'
                    ? 'border-[#e5a93c]/40 text-[#e5a93c] bg-[#121417]'
                    : loaderBadge === 'NeoForge' || loaderBadge === 'Fabric'
                      ? 'border-[#e55353]/40 text-[#e55353] bg-[#121417]'
                      : 'border-[#2a2e33] text-[#8b9199] bg-[#121417]'
                }`}
              >
                {loaderBadge}
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-[4px] border border-[#2a2e33] bg-[#121417] text-[10px] text-[#8b9199] shrink-0 whitespace-nowrap">
                {envBadge}
              </span>
            </div>
            <p className="text-xs text-[#8b9199] truncate mt-0.5">
              {portWarning ? portWarning : formatShortOneLineDescription(mod.description)}
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

            {/* Port Incompatibility Warning */}
            {portWarning && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[4px] bg-[#e5a93c]/10 border border-[#e5a93c]/40 text-[11px] text-[#e5a93c]">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{portWarning}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handlePortSwitch('hybrid')}
                  className="px-2 py-1 rounded-[4px] bg-[#1a1d21] hover:bg-[#22262b] border border-[#e5a93c]/40 text-[#e6e8ea] text-[11px] font-medium transition-colors duration-150 whitespace-nowrap"
                >
                  Включить Гибрид
                </button>
              </div>
            )}

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
  };

  return (
    <div className="space-y-3 pb-16">
      {/* Top Bar: Port Switcher + Search + Quick Actions */}
      <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-2.5 flex flex-wrap items-center gap-2">
        {/* Segmented Port Switcher */}
        <div
          role="group"
          aria-label="Выбор порта"
          data-port-switcher="true"
          className="inline-flex items-center bg-[#121417] border border-[#2a2e33] rounded-[4px] p-0.5 shrink-0"
        >
          <button
            type="button"
            aria-pressed={portMode === 'hybrid'}
            onClick={() => handlePortSwitch('hybrid')}
            className={`px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
              portMode === 'hybrid'
                ? 'bg-[#22262b] text-[#3ddc84] border border-[#3ddc84]/50 font-semibold'
                : 'text-[#8b9199] hover:text-[#e6e8ea] border border-transparent'
            }`}
          >
            Гибрид (Forge + Fabric)
          </button>
          <button
            type="button"
            aria-pressed={portMode === 'forge'}
            onClick={() => handlePortSwitch('forge')}
            className={`px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
              portMode === 'forge'
                ? 'bg-[#22262b] text-[#3ddc84] border border-[#3ddc84]/50 font-semibold'
                : 'text-[#8b9199] hover:text-[#e6e8ea] border border-transparent'
            }`}
          >
            Forge
          </button>
        </div>

        {/* Instant Search Input */}
        <div className="relative flex-1 min-w-[200px]">
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

        {/* Utility Actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleBuildSmart}
            className="px-3 py-1.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-xs font-medium text-[#e6e8ea] transition-colors duration-150 whitespace-nowrap"
          >
            Автоподбор
          </button>
          <button
            type="button"
            onClick={() => (selectedIds.length > 0 ? setConfirmResetOpen(true) : executeResetAll())}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#8b9199] hover:text-[#e55353] text-xs font-medium transition-colors duration-150 whitespace-nowrap"
            title="Сбросить выбор"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Сброс</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Bar (Horizontal Scrollable on Narrow Screens) */}
      <div
        role="tablist"
        aria-label="Категории модов"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-[#2a2e33] pb-1"
      >
        {visibleTabs.map(cat => {
          const active = activeCategory === cat.key && !isSearching;
          const count = categoryMeta.counts[cat.key];
          const sev = categoryMeta.issueSeverity[cat.key];
          const countColor =
            sev === 'red'
              ? 'text-[#e55353]'
              : sev === 'yellow'
                ? 'text-[#e5a93c]'
                : active || count > 0
                  ? 'text-[#3ddc84]'
                  : 'text-[#8b9199]';

          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(cat.key);
              }}
              className={`px-2.5 py-1.5 rounded-[4px] text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 border ${
                active
                  ? 'bg-[#22262b] border-[#3ddc84] text-[#e6e8ea] font-semibold'
                  : 'bg-[#1a1d21] border-[#2a2e33] text-[#8b9199] hover:text-[#e6e8ea] hover:bg-[#22262b]'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`font-mono text-[11px] tabular-nums font-semibold ${countColor}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* JEI / EMI Section-only Recipe Viewer Switcher */}
      {isRecipesTab && (
        <div
          data-recipe-selector="true"
          className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] px-3 py-2 flex flex-wrap items-center justify-between gap-2"
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
                  onClick={() => handleRecipeViewerChange(opt.k as RecipeViewerChoice)}
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

      {/* Mod List Container (Pinned Selected Top + Thin Divider + Unselected Below) */}
      {totalVisibleModsCount === 0 ? (
        <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-8 text-center space-y-2.5">
          <p className="text-sm font-medium text-[#e6e8ea]">Моды не найдены</p>
          <p className="text-xs text-[#8b9199] max-w-md mx-auto">
            {isSearching
              ? 'Попробуйте изменить поисковый запрос или переключить режим порта.'
              : 'В этой категории нет модов, доступных для выбранного порта.'}
          </p>
          {isSearching && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-xs font-semibold transition-colors duration-150"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Очистить поиск
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          data-mod-list="true"
          className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] overflow-hidden"
        >
          {pinnedSelectedMods.length > 0 && (
            <div data-pinned-section="true" className="divide-y divide-[#2a2e33]">
              {pinnedSelectedMods.map(mod => renderModRow(mod, true))}
            </div>
          )}

          {pinnedSelectedMods.length > 0 && availableUnselectedMods.length > 0 && (
            <div
              data-selected-divider="true"
              className="border-t-2 border-[#2a2e33]"
              aria-hidden="true"
            />
          )}

          {availableUnselectedMods.length > 0 && (
            <div className="divide-y divide-[#2a2e33]">
              {availableUnselectedMods.map(mod => renderModRow(mod, false))}
            </div>
          )}
        </div>
      )}

      {/* Pinned Compact Bottom Bar */}
      <div
        data-bottom-bar="true"
        className="fixed bottom-0 inset-x-0 z-30 bg-[#1a1d21] border-t border-[#2a2e33]"
      >
        {issuesPanelOpen && hasAnyIssues && (
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-2.5 pb-2 border-b border-[#2a2e33] bg-[#121417] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#e6e8ea]">
                Предупреждения и конфликты ({totalWarningsCount})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFixIssues}
                  className="px-2.5 py-1 rounded-[4px] bg-[#22262b] hover:bg-[#2a2e33] border border-[#3ddc84]/50 text-[#3ddc84] text-[11px] font-semibold transition-colors duration-150"
                >
                  Исправить автоматически
                </button>
                <button
                  type="button"
                  onClick={() => setIssuesPanelOpen(false)}
                  aria-label="Скрыть предупреждения"
                  className="p-1 rounded-[4px] text-[#8b9199] hover:text-[#e6e8ea]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
              {portIncompatibleSelectedMods.map(m => (
                <div
                  key={`port-${m.id}`}
                  className="px-2.5 py-1.5 rounded-[4px] bg-[#e5a93c]/10 border border-[#e5a93c]/40 text-[#e5a93c] flex items-center justify-between gap-2"
                >
                  <span>
                    <strong className="font-medium">{m.name}:</strong> недоступен в порте «Forge» (требует Гибрид / Sinytra)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleMod(m)}
                    className="text-[11px] underline shrink-0 hover:text-[#e6e8ea]"
                  >
                    Убрать
                  </button>
                </div>
              ))}
              {analysis.conflicts.map((c, idx) => (
                <div
                  key={`conf-${idx}`}
                  className="px-2.5 py-1.5 rounded-[4px] bg-[#e55353]/10 border border-[#e55353]/40 text-[#e55353]"
                >
                  <strong>{c.matchedNames.join(' + ')}:</strong> {c.rule.explanation}
                </div>
              ))}
              {analysis.warnings.map((w, idx) => (
                <div
                  key={`warn-${idx}`}
                  className={`px-2.5 py-1.5 rounded-[4px] border ${
                    w.severity === 'red'
                      ? 'bg-[#e55353]/10 border-[#e55353]/40 text-[#e55353]'
                      : 'bg-[#e5a93c]/10 border-[#e5a93c]/40 text-[#e5a93c]'
                  }`}
                >
                  <strong>{w.modName}:</strong> {w.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3 text-xs">
            <span className="font-mono tabular-nums font-semibold text-[#e6e8ea] whitespace-nowrap">
              Выбрано: {selectedIds.length}
            </span>

            {hasAnyIssues ? (
              <button
                type="button"
                onClick={() => setIssuesPanelOpen(v => !v)}
                aria-expanded={issuesPanelOpen}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] border text-[11px] font-medium truncate transition-colors duration-150 ${
                  hasCriticalConflict
                    ? 'bg-[#e55353]/10 border-[#e55353]/40 text-[#e55353] hover:bg-[#e55353]/15'
                    : 'bg-[#e5a93c]/10 border-[#e5a93c]/40 text-[#e5a93c] hover:bg-[#e5a93c]/15'
                }`}
              >
                {hasCriticalConflict ? (
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">
                  {portIncompatibleSelectedMods.length > 0 && analysis.conflicts.length === 0
                    ? `Несовместимо с портом: ${portIncompatibleSelectedMods.length}`
                    : `Конфликты и предупреждения: ${totalWarningsCount}`}
                </span>
                {issuesPanelOpen ? (
                  <ChevronDown className="w-3 h-3 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronUp className="w-3 h-3 shrink-0" aria-hidden="true" />
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#3ddc84] truncate">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Конфликтов нет</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadJson}
            disabled={selectedIds.length === 0}
            className="py-1.5 px-3 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#0f1411] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Скачать JSON</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Сбросить текущую сборку?"
        description={`Будут сняты все выбранные моды (${selectedIds.length}).`}
        confirmLabel="Сбросить"
        onConfirm={() => {
          executeResetAll();
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}

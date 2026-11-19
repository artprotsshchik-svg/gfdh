import { useEffect, useMemo, useState } from 'react';
import {
  MODS_DATABASE,
  MOD_GROUPS,
  type ModItem,
} from '../data/modsData.ts';
import { cleanModDescription, formatShortOneLineDescription } from '../utils/displayFormatters.ts';
import {
  EXCLUSIVE_ENGINE_POOLS,
  INITIAL_BUILDER_PREFS,
  buildSmartAssembly,
  evaluateAssemblyHealth,
  evaluateModImpactInPack,
  getCheckerTier,
  getModEffectivenessScore,
  getModResourceProfile,
  getModRestrictionBadge,
  getModSuperseder,
  isModIncompatibleWithSelection,
  isUnsupportedOnForge,
  organizeAssemblyTree,
  removeModsCascade,
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
  previewModToggleDelta,
  replaceConflictingWithMod,
  type ModHoverDeltaPreview,
} from '../utils/modInteractions.ts';
import { DubiousModsModal } from './DubiousModsModal.tsx';
import { AssemblyDetailModal, type AnalyzedAssemblyModRow } from './AssemblyDetailModal.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { ExportMenu } from './ExportMenu.tsx';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Lock,
  Maximize2,
  PanelRightOpen,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Unlock,
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

type BuilderSection = 'all' | 'optimization' | 'recipes';
type SlotFilter = 'all' | 'selected' | 'issues';
type ExtraDrawerFilter = 'all' | 'viable' | 'legacy';
type InspectorTab = 'overview' | 'mods' | 'links';
type InspectorModFilter = 'all' | 'issues' | 'core';

export function AssemblyBuilderTab({
  selectedIds,
  setSelectedIds,
  prefs,
  setPrefs,
  onOpenDetail,
  onSendToChecker,
}: AssemblyBuilderTabProps) {
  const [actionNotice, setActionNotice] = useState<{ text: string; tone: 'info' | 'warn' } | null>(null);
  const [builderSection, setBuilderSection] = useState<BuilderSection>('all');
  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all');
  const [slotSearch, setSlotSearch] = useState('');
  const [strictExclusive, setStrictExclusive] = useState(true);
  const [hideUselessCovered, setHideUselessCovered] = useState(true);
  const [hideIncompatible, setHideIncompatible] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('overview');
  const [inspectorModFilter, setInspectorModFilter] = useState<InspectorModFilter>('all');
  const [expandedSubsystemKey, setExpandedSubsystemKey] = useState<string | null>(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [showArtifactFactors, setShowArtifactFactors] = useState(false);
  const [showDubiousModal, setShowDubiousModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});
  const [extraSearchByGroup, setExtraSearchByGroup] = useState<Record<string, string>>({});
  const [extraFilterByGroup, setExtraFilterByGroup] = useState<Record<string, ExtraDrawerFilter>>({});
  const [hoveredPreview, setHoveredPreview] = useState<ModHoverDeltaPreview | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    run: () => void;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!mobileInspectorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileInspectorOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileInspectorOpen]);

  const modById = useMemo(() => {
    const map = new Map<string, ModItem>();
    MODS_DATABASE.forEach(m => map.set(m.id, m));
    return map;
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const incompatibleWithActiveSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of MODS_DATABASE) {
      if (isModIncompatibleWithSelection(m, selectedSet, prefs)) {
        set.add(m.id);
      }
    }
    return set;
  }, [selectedSet, prefs]);

  const uselessOrSupersededSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of MODS_DATABASE) {
      if (selectedSet.has(m.id)) continue;
      if (
        m.status === 'danger' ||
        isUnsupportedOnForge(m) ||
        getModSuperseder(m, selectedSet, prefs, true) !== null
      ) {
        set.add(m.id);
      }
    }
    return set;
  }, [selectedSet, prefs]);

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

  const summaryCounts = useMemo(() => {
    let green = 0;
    let lime = 0;
    let yellow = 0;
    let red = 0;
    for (const m of analysis.selectedMods) {
      const w = warningByMod.get(m.id);
      const t = getCheckerTier(m, analysis.conflictingIdSet, w?.severity);
      if (t.tier === 'green') green++;
      else if (t.tier === 'lime') lime++;
      else if (t.tier === 'yellow') yellow++;
      else red++;
    }
    return { green, lime, yellow, red, total: analysis.selectedMods.length };
  }, [analysis.selectedMods, analysis.conflictingIdSet, warningByMod]);

  const handleToggleMod = (mod: ModItem) => {
    const res = toggleModSmart(selectedIds, mod.id, { strict: strictExclusive, prefs });
    setSelectedIds(res.nextIds);
    if (res.notice) {
      setActionNotice({ text: res.notice, tone: res.noticeTone });
    } else {
      setActionNotice(null);
    }
  };

  const handleFixIssues = () => {
    const fixed = smartFixAssembly(selectedIds, prefs);
    setSelectedIds(fixed);
    setActionNotice({
      text: 'Конфликты и дубли устранены, недостающие зависимости добавлены.',
      tone: 'info',
    });
  };

  const handleBuildSmart = (nextPrefs: AssemblyPreferences = prefs) => {
    const fixedPrefs: AssemblyPreferences = {
      ...nextPrefs,
      gpu: 'nvidia',
      mode: 'singleplayer',
      goal: 'balanced',
      useCreate: false,
    };
    const built = buildSmartAssembly(fixedPrefs);
    setSelectedIds(built.modIds);
    setActionNotice(null);
  };

  const handleResetFilters = () => {
    setBuilderSection('all');
    setSlotFilter('all');
    setSlotSearch('');
    setHideUselessCovered(false);
    setHideIncompatible(false);
  };

  const executeResetAll = () => {
    setSelectedIds([]);
    setPrefs({ ...INITIAL_BUILDER_PREFS, recipeViewer: 'none', focusModId: null });
    setBuilderSection('all');
    setSlotFilter('all');
    setSlotSearch('');
    setStrictExclusive(true);
    setHideUselessCovered(true);
    setHideIncompatible(true);
    setExpandedGroups({});
    setExtraSearchByGroup({});
    setExtraFilterByGroup({});
    setActionNotice({ text: 'Все моды и параметры сброшены.', tone: 'info' });
  };

  const handleResetAll = () => {
    if (selectedIds.length === 0) {
      executeResetAll();
      return;
    }
    setConfirmAction({
      title: 'Сбросить текущую сборку?',
      description: `Будут сняты все выбранные моды (${selectedIds.length}) и сброшены параметры фильтров.`,
      confirmLabel: 'Сбросить всё',
      run: () => {
        executeResetAll();
        setConfirmAction(null);
      },
    });
  };

  const handleQuickSelectSlotLeader = (_groupId: string, leaderId: string, memberIds: string[]) => {
    let next = selectedIds;
    if (strictExclusive) {
      const res = toggleModSmart(
        selectedIds.includes(leaderId)
          ? selectedIds
          : selectedIds.filter(id => !memberIds.includes(id)),
        leaderId,
        { strict: true, prefs }
      );
      next = res.nextIds;
    } else if (!selectedIds.includes(leaderId)) {
      next = [...selectedIds, leaderId];
    }
    setSelectedIds(next);
    const leaderName = modById.get(leaderId)?.name || leaderId;
    setActionNotice({ text: `В слот добавлен: ${leaderName}.`, tone: 'info' });
  };

  const executeClearSlot = (memberIds: string[], groupTitle: string) => {
    if (!strictExclusive) {
      setSelectedIds(selectedIds.filter(id => !memberIds.includes(id)));
      setActionNotice({ text: `Слот «${groupTitle}» очищен.`, tone: 'info' });
      return;
    }
    const res = removeModsCascade(selectedIds, memberIds);
    setSelectedIds(res.nextIds);
    if (res.cascadedNames.length > 0) {
      setActionNotice({
        text: `Слот «${groupTitle}» очищен (также убраны зависимые: ${res.cascadedNames.join(', ')}).`,
        tone: 'info',
      });
    } else {
      setActionNotice({ text: `Слот «${groupTitle}» очищен.`, tone: 'info' });
    }
  };

  const handleClearSlot = (memberIds: string[], groupTitle: string) => {
    setConfirmAction({
      title: `Очистить слот «${groupTitle}»?`,
      description: 'Выбранные моды в этом слоте (и зависимые от них модули в строгом режиме) будут убраны из сборки.',
      confirmLabel: 'Очистить слот',
      run: () => {
        executeClearSlot(memberIds, groupTitle);
        setConfirmAction(null);
      },
    });
  };

  const handleAddDependencyForMod = (mod: ModItem) => {
    const res = addMissingDependenciesForMod(selectedIds, mod.id, prefs);
    setSelectedIds(res.nextIds);
    if (res.addedNames.length > 0) {
      setActionNotice({
        text: `Для ${mod.name} добавлены зависимости: ${res.addedNames.join(', ')}.`,
        tone: 'info',
      });
    }
  };

  const handleReplaceConflictWithMod = (mod: ModItem) => {
    const res = replaceConflictingWithMod(selectedIds, mod.id, prefs);
    setSelectedIds(res.nextIds);
    if (res.notice) {
      setActionNotice({ text: res.notice, tone: 'info' });
    }
  };

  const handleModHoverOrFocus = (mod: ModItem) => {
    const preview = previewModToggleDelta(
      mod,
      selectedIds,
      assemblyImpact.assemblyScore,
      fpsEstimate.label,
      prefs
    );
    setHoveredPreview(preview);
  };

  const handleCopyNamesList = () => {
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
        const m = modById.get(id);
        if (m) {
          seen.add(id);
          orderedNames.push(m.name);
        }
      }
    }
    navigator.clipboard.writeText(orderedNames.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const sortMods = (mods: ModItem[], leaderId: string, addonIds: string[]) => {
    const addonSet = new Set(addonIds);
    return [...mods].sort((a, b) => {
      const rank = (m: ModItem) => (m.id === leaderId ? 2000 : addonSet.has(m.id) ? 1200 : 0);
      return rank(b) + getModEffectivenessScore(b) - (rank(a) + getModEffectivenessScore(a));
    });
  };

  const missingSlotGroupIds = useMemo(
    () => new Set(analysis.missingCoreSlots.map(s => s.groupId)),
    [analysis.missingCoreSlots]
  );

  const visibleGroups = useMemo(() => {
    const q = slotSearch.trim().toLowerCase();
    return MOD_GROUPS.filter(group => {
      const isRecipeGroup = group.id === 'recipes-jei';
      if (builderSection === 'optimization' && isRecipeGroup) return false;
      if (builderSection === 'recipes' && !isRecipeGroup) return false;

      const selectedInGroup = group.memberIds.filter(id => selectedSet.has(id));
      const hasIssues =
        missingSlotGroupIds.has(group.id) ||
        selectedInGroup.some(id => analysis.conflictingIdSet.has(id) || warningByMod.has(id));

      if (slotFilter === 'selected' && selectedInGroup.length === 0) return false;
      if (slotFilter === 'issues' && !hasIssues) return false;

      if (!q) return true;
      if (group.title.toLowerCase().includes(q) || group.description.toLowerCase().includes(q)) return true;
      return group.memberIds.some(id => {
        const m = modById.get(id);
        return m && (m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
      });
    });
  }, [slotSearch, slotFilter, builderSection, selectedSet, missingSlotGroupIds, analysis.conflictingIdSet, warningByMod, modById]);

  const optimizationGroups = useMemo(
    () => visibleGroups.filter(g => g.id !== 'recipes-jei'),
    [visibleGroups]
  );
  const recipeGroups = useMemo(
    () => visibleGroups.filter(g => g.id === 'recipes-jei'),
    [visibleGroups]
  );

  const restrictionTextClass = (tone: 'red' | 'amber' | 'violet' | 'sky') => {
    switch (tone) {
      case 'red':
        return 'text-[#cf6d6d]';
      case 'amber':
        return 'text-[#c99b52]';
      case 'violet':
      case 'sky':
        return 'text-[#6abf7b]';
    }
  };

  const tierShortText = (tier: 'green' | 'lime' | 'yellow' | 'red') => {
    switch (tier) {
      case 'green':
        return { text: 'Стаб.', textCls: 'text-[#6abf7b]' };
      case 'lime':
        return { text: 'Сносно', textCls: 'text-[#9ab86a]' };
      case 'yellow':
        return { text: 'Усл.', textCls: 'text-[#c99b52]' };
      case 'red':
        return { text: 'Исключ.', textCls: 'text-[#cf6d6d]' };
    }
  };

  const currentRecipeViewer = prefs.recipeViewer ?? 'none';
  const currentPortStrategy: 'auto' | PortStrategy = prefs.portStrategy ?? 'auto';
  const currentPackScale: PackScale = prefs.packScale ?? 'medium';
  const focusMod = prefs.focusModId ? modById.get(prefs.focusModId) ?? null : null;

  const artifactRisk = assemblyImpact.artifactRisk;
  const dubiousMods = assemblyImpact.dubiousMods;
  const scoreBreakdown = assemblyImpact.scoreBreakdown;
  const resourceBalance = assemblyImpact.resourceBalance;
  const dubiousHighCount = dubiousMods.filter(d => d.severity === 'high').length;
  const dubiousMedCount = dubiousMods.filter(d => d.severity === 'medium').length;

  const groupTitleById = useMemo(() => {
    const map = new Map<string, string>();
    MOD_GROUPS.forEach(g => map.set(g.id, g.title));
    return map;
  }, []);

  const analyzedMods: AnalyzedAssemblyModRow[] = useMemo(() => {
    const dubiousMap = new Map(dubiousMods.map(d => [d.modId, d.artifactContributionPct]));
    const levelOrder: Record<string, number> = {
      negative: 0,
      zero: 1,
      conditional: 2,
      core: 3,
      high: 4,
      medium: 5,
      support: 6,
      diagnostic: 7,
    };
    return analysis.selectedMods
      .map(mod => ({
        mod,
        impact: evaluateModImpactInPack(mod, selectedSet, analysis, prefs),
        artifactDeltaPct: dubiousMap.get(mod.id) ?? 0,
        groupTitle: mod.groupId ? groupTitleById.get(mod.groupId) || mod.category : mod.category,
      }))
      .sort(
        (a, b) =>
          (levelOrder[a.impact.level] ?? 9) - (levelOrder[b.impact.level] ?? 9) ||
          b.impact.impactPoints - a.impact.impactPoints ||
          a.mod.name.localeCompare(b.mod.name, 'ru')
      );
  }, [analysis, selectedSet, prefs, dubiousMods, groupTitleById]);

  const artifactColorCls =
    artifactRisk.level === 'critical'
      ? 'text-[#cf6d6d]'
      : artifactRisk.level === 'high' || artifactRisk.level === 'moderate'
        ? 'text-[#c99b52]'
        : 'text-[#6abf7b]';

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] p-3.5 space-y-2.5">
        {/* Row 1: Scale, Ports, Shaders + Auto-Build CTA (A1) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#2a2a2a]">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-1.5 text-[11px] text-[#8f8f8f]" title="Масштаб общей сборки">
              <span>Масштаб</span>
              <select
                aria-label="Масштаб модпака"
                value={currentPackScale}
                onChange={e => setPrefs(p => ({ ...p, packScale: e.target.value as PackScale }))}
                className="px-2 py-1 bg-[#141414] border border-[#2a2a2a] rounded-[4px] text-xs text-[#e6e6e6] focus:border-[#4caf6a]"
              >
                <option value="light">Лёгкий (&lt;80)</option>
                <option value="medium">Средний (100–200)</option>
                <option value="heavy">Тяжёлый (200+)</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-1.5 text-[11px] text-[#8f8f8f]">
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
                className="px-2 py-1 bg-[#141414] border border-[#2a2a2a] rounded-[4px] text-xs text-[#e6e6e6] focus:border-[#4caf6a]"
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
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                prefs.useShaders
                  ? 'bg-[#242424] border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
              }`}
            >
              {prefs.useShaders ? 'Шейдеры: Да' : 'Шейдеры: Нет'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleBuildSmart(prefs)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Умный подбор
          </button>
        </div>

        {/* Active Focus Anchor Banner */}
        {focusMod && (
          <div className="rounded-[6px] px-3 py-2 bg-[#141414] border border-[#4caf6a]/50 text-xs text-[#e6e6e6] flex items-center justify-between gap-3">
            <span className="truncate">
              Упор сборки: <strong className="text-[#e6e6e6]">{focusMod.name}</strong> (зависимости защищены от замены)
            </span>
            <button
              type="button"
              onClick={() => setPrefs(p => ({ ...p, focusModId: null }))}
              className="text-[11px] px-2 py-0.5 rounded-[4px] bg-[#1a1a1a] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] whitespace-nowrap shrink-0"
            >
              Снять упор
            </button>
          </div>
        )}

        {/* Row 2: Search + Slot & Visibility Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#8f8f8f] absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                data-search-input="true"
                value={slotSearch}
                onChange={e => setSlotSearch(e.target.value)}
                placeholder="Поиск слота или мода... (/)"
                aria-label="Поиск слота или мода"
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded-[6px] text-xs text-[#e6e6e6] placeholder-[#8f8f8f] focus:border-[#4caf6a]"
              />
            </div>

            <div className="flex items-center bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-0.5 text-xs">
              {[
                { k: 'all', label: 'Все' },
                { k: 'selected', label: 'Выбранные' },
                { k: 'issues', label: `Проблемы${analysis.missingCoreSlots.length + analysis.conflicts.length > 0 ? '!' : ''}` },
              ].map(f => (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setSlotFilter(f.k as SlotFilter)}
                  className={`px-2 py-0.5 rounded-[4px] transition-colors whitespace-nowrap ${
                    slotFilter === f.k ? 'bg-[#242424] text-[#4caf6a] font-semibold' : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-0.5 text-xs" role="group" aria-label="Секции сборок">
              {[
                { k: 'all', label: 'Все секции' },
                { k: 'optimization', label: 'Оптимизация' },
                { k: 'recipes', label: 'JEI / EMI' },
              ].map(sec => (
                <button
                  key={sec.k}
                  type="button"
                  onClick={() => setBuilderSection(sec.k as BuilderSection)}
                  className={`px-2 py-0.5 rounded-[4px] font-medium transition-colors whitespace-nowrap ${
                    builderSection === sec.k
                      ? 'bg-[#4caf6a] text-[#121212] font-semibold'
                      : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStrictExclusive(v => !v)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors whitespace-nowrap ${
                strictExclusive
                  ? 'bg-[#141414] border-[#4caf6a]/60 text-[#6abf7b]'
                  : 'bg-[#141414] border-[#c99b52]/50 text-[#c99b52]'
              }`}
              title="Автоматически подбирать зависимости и заменять конфликты при клике"
            >
              {strictExclusive ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {strictExclusive ? '1 слот' : 'Свободно'}
            </button>

            <button
              type="button"
              onClick={() => setHideIncompatible(v => !v)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors whitespace-nowrap tabular-nums ${
                hideIncompatible
                  ? 'bg-[#242424] border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
              }`}
              title="Скрывать моды, конфликтующие с активной сборкой"
            >
              {hideIncompatible ? <EyeOff className="w-3 h-3 text-[#4caf6a]" /> : <Eye className="w-3 h-3" />}
              {hideIncompatible ? `Несовм. (${incompatibleWithActiveSet.size})` : 'Все совм.'}
            </button>

            <button
              type="button"
              onClick={() => setHideUselessCovered(v => !v)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors whitespace-nowrap tabular-nums ${
                hideUselessCovered
                  ? 'bg-[#242424] border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
              }`}
              title="Скрывать перекрытые и бесполезные аналоги"
            >
              {hideUselessCovered ? <EyeOff className="w-3 h-3 text-[#4caf6a]" /> : <Eye className="w-3 h-3" />}
              {hideUselessCovered ? `Лишние (${uselessOrSupersededSet.size})` : 'Скрыть лишн.'}
            </button>

            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] hover:border-[#cf6d6d]/50 text-[#e6e6e6] hover:text-[#cf6d6d] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>
        </div>

        {actionNotice && (
          <div
            className={`rounded-[6px] px-3 py-2 text-xs flex items-center justify-between gap-3 border bg-[#141414] ${
              actionNotice.tone === 'warn'
                ? 'border-[#c99b52]/50 text-[#c99b52]'
                : 'border-[#4caf6a]/50 text-[#e6e6e6]'
            }`}
          >
            <span>{actionNotice.text}</span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="p-0.5 rounded-[4px] hover:bg-[#222222] shrink-0"
              aria-label="Скрыть уведомление"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main 2-column workspace: Slots Left (7/12) + Comfortable Analytical Состав сборки Right (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Functional Group Slots */}
        <div className="lg:col-span-7 space-y-5">
          {visibleGroups.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] p-8 text-center space-y-3">
              <p className="text-sm font-medium text-[#e6e6e6]">
                По текущему фильтру слоты не найдены
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Сбросить фильтры
              </button>
            </div>
          ) : (
            [
              {
                key: 'optimization',
                title: 'Оптимизация',
                subtitle: 'Рендер, память, освещение, тики, чанки, сеть',
                groups: optimizationGroups,
              },
              {
                key: 'recipes',
                title: 'JEI / EMI (рецепты)',
                subtitle: 'Просмотрщики рецептов и плагины',
                groups: recipeGroups,
              },
            ]
              .filter(sec => sec.groups.length > 0 || (sec.key === 'recipes' && builderSection !== 'optimization' && !slotSearch.trim()))
              .map(sec => (
                <section key={sec.key} className="space-y-3" data-slot-section={sec.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6e6e6]">{sec.title}</h3>
                      <span className="text-xs font-mono text-[#8f8f8f] tabular-nums">({sec.groups.length})</span>
                    </div>
                    <span className="text-[11px] text-[#8f8f8f]">{sec.subtitle}</span>
                  </div>

                  {/* A2: Dedicated Recipe Viewer block at the start of JEI / EMI section */}
                  {sec.key === 'recipes' && (
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
                      <span className="text-xs font-medium text-[#e6e6e6]">Режим просмотрщика рецептов</span>
                      <div className="flex items-center gap-1 bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-0.5 text-xs" role="group" aria-label="Режим просмотрщика рецептов">
                        <span className="text-[11px] text-[#8f8f8f] pl-1.5">Рецепты:</span>
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
                              className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors whitespace-nowrap ${
                                active ? 'bg-[#4caf6a] text-[#121212] font-semibold' : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {sec.groups.map(group => {
                      const addonSet = new Set(group.addonIds);
                      const allMembers = group.memberIds
                        .map(id => modById.get(id))
                        .filter((m): m is ModItem => Boolean(m));
                      const sortedMembers = sortMods(allMembers, group.leaderId, group.addonIds);

                      const q = slotSearch.trim().toLowerCase();
                      const hiddenSupersededInGroupCount = sortedMembers.filter(
                        m => !selectedSet.has(m.id) && uselessOrSupersededSet.has(m.id)
                      ).length;
                      const hiddenIncompatibleInGroupCount = sortedMembers.filter(
                        m =>
                          !selectedSet.has(m.id) &&
                          incompatibleWithActiveSet.has(m.id) &&
                          !(hideUselessCovered && uselessOrSupersededSet.has(m.id))
                      ).length;

                      const primaryMembers = sortedMembers.filter(m => {
                        if (shouldHideMod(m, selectedSet, prefs, { hideIncompatible, hideUselessCovered })) {
                          return false;
                        }
                        if (q && (m.name.toLowerCase().includes(q) || (m.tags && m.tags.some(t => t.toLowerCase().includes(q))))) {
                          return true;
                        }
                        if (selectedSet.has(m.id)) return true;
                        if (m.id === group.leaderId || addonSet.has(m.id)) return true;
                        return false;
                      });

                      const primaryIdSet = new Set(primaryMembers.map(m => m.id));
                      const extraMembersAll = sortedMembers.filter(m => {
                        if (primaryIdSet.has(m.id)) return false;
                        if (shouldHideMod(m, selectedSet, prefs, { hideIncompatible, hideUselessCovered })) {
                          return false;
                        }
                        return true;
                      });

                      const hiddenCount = extraMembersAll.length;
                      const isExtraOpen = Boolean(expandedGroups[group.id]);
                      const extraSearch = (extraSearchByGroup[group.id] || '').trim().toLowerCase();
                      const extraFilter: ExtraDrawerFilter = extraFilterByGroup[group.id] || 'all';

                      const extraFiltered = extraMembersAll.filter(m => {
                        if (
                          extraSearch &&
                          !m.name.toLowerCase().includes(extraSearch) &&
                          !m.description.toLowerCase().includes(extraSearch) &&
                          !(m.tags && m.tags.some(t => t.toLowerCase().includes(extraSearch)))
                        ) {
                          return false;
                        }
                        const tier = getCheckerTier(m, analysis.conflictingIdSet, warningByMod.get(m.id)?.severity).tier;
                        if (extraFilter === 'viable') return tier === 'green' || tier === 'lime' || tier === 'yellow';
                        if (extraFilter === 'legacy') return tier === 'red' || Boolean(m.coveredBy);
                        return true;
                      });

                      const viableCount = extraMembersAll.filter(m => {
                        const t = getCheckerTier(m, analysis.conflictingIdSet, warningByMod.get(m.id)?.severity).tier;
                        return t === 'green' || t === 'lime' || t === 'yellow';
                      }).length;
                      const legacyCount = extraMembersAll.length - viableCount;

                      const exclusivePoolIds = EXCLUSIVE_ENGINE_POOLS[group.id] || [];
                      const exclusivePoolSet = new Set(exclusivePoolIds);
                      const selectedInGroup = group.memberIds.filter(id => selectedSet.has(id));
                      const selectedInCore = exclusivePoolIds.filter(id => selectedSet.has(id));
                      const hasExclusiveConflict = exclusivePoolIds.length > 1 && selectedInCore.length > 1;
                      const isMissingCore = missingSlotGroupIds.has(group.id);

                      return (
                        <div
                          key={group.id}
                          className={`bg-[#1a1a1a] border rounded-[6px] overflow-hidden ${
                            hasExclusiveConflict
                              ? 'border-[#cf6d6d]/60'
                              : isMissingCore
                                ? 'border-[#c99b52]/50'
                                : 'border-[#2a2a2a]'
                          }`}
                        >
                          {/* Slot Header */}
                          <div className="px-4 py-3 flex flex-wrap items-start justify-between gap-3 border-b border-[#2a2a2a]">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                                <h4 className="text-sm font-semibold text-[#e6e6e6]">{group.title}</h4>
                                <span className="text-[11px] text-[#8f8f8f] tabular-nums">
                                  {exclusivePoolIds.length > 1 ? '1 основа + аддоны' : 'совместимые модули'}
                                  <span aria-hidden="true"> · </span>
                                  {selectedInGroup.length > 0 ? (
                                    <span className="text-[#6abf7b] font-semibold">выбрано {selectedInGroup.length}</span>
                                  ) : isMissingCore ? (
                                    <span className="text-[#c99b52] font-semibold">рекомендуется</span>
                                  ) : (
                                    <span>0 выбрано</span>
                                  )}
                                  {hideIncompatible && hiddenIncompatibleInGroupCount > 0 && (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span className="text-[#8f8f8f]">скрыто несовм. {hiddenIncompatibleInGroupCount}</span>
                                    </>
                                  )}
                                  {hideUselessCovered && hiddenSupersededInGroupCount > 0 && (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span className="text-[#8f8f8f]">перекрыто/лишних {hiddenSupersededInGroupCount}</span>
                                    </>
                                  )}
                                </span>
                              </div>
                              <p className="text-xs text-[#8f8f8f] mt-1 leading-relaxed">{group.description}</p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!selectedSet.has(group.leaderId) && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickSelectSlotLeader(group.id, group.leaderId, group.memberIds)}
                                  className="text-[11px] px-2.5 py-1 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#4caf6a] font-semibold transition-colors whitespace-nowrap"
                                >
                                  + Лидер
                                </button>
                              )}
                              {selectedInGroup.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleClearSlot(group.memberIds, group.title)}
                                  className="text-[11px] px-2.5 py-1 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6] transition-colors whitespace-nowrap"
                                >
                                  Очистить
                                </button>
                              )}
                              {hiddenCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                                  className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-[4px] border font-semibold transition-colors whitespace-nowrap tabular-nums ${
                                    isExtraOpen
                                      ? 'bg-[#4caf6a] border-[#4caf6a] text-[#121212]'
                                      : 'bg-[#141414] hover:bg-[#222222] border-[#2a2a2a] text-[#e6e6e6]'
                                  }`}
                                >
                                  <span>{isExtraOpen ? 'Свернуть доп.' : `Доп. (${hiddenCount})`}</span>
                                  {isExtraOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {hasExclusiveConflict && (
                            <div className="mx-4 mt-3 bg-[#cf6d6d]/[0.06] border border-[#cf6d6d]/40 rounded-[4px] px-3 py-2 text-xs text-[#cf6d6d] flex items-start gap-2">
                              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Конфликт внутри слота:</span> выбрано сразу{' '}
                                {selectedInCore.map(id => modById.get(id)?.name).join(' + ')}.{' '}
                                {group.conflictReason || 'Оставьте только 1 вариант (лучше лидера).'}
                              </div>
                            </div>
                          )}

                          {/* Extra Drawer */}
                          {isExtraOpen && extraMembersAll.length > 0 && (
                            <div className="bg-[#141414] border-b border-[#2a2a2a] p-3 space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                  <span className="text-[11px] font-semibold text-[#e6e6e6] shrink-0">
                                    Дополнительные и аналоги
                                  </span>
                                  {extraMembersAll.length > 6 && (
                                    <div className="relative w-44 max-w-full">
                                      <Search className="w-3 h-3 text-[#8f8f8f] absolute left-2.5 top-1/2 -translate-y-1/2" />
                                      <input
                                        type="text"
                                        value={extraSearchByGroup[group.id] || ''}
                                        onChange={e =>
                                          setExtraSearchByGroup(prev => ({ ...prev, [group.id]: e.target.value }))
                                        }
                                        placeholder={`Поиск среди ${extraMembersAll.length}...`}
                                        className="w-full pl-7 pr-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[4px] text-[11px] text-[#e6e6e6] placeholder-[#8f8f8f] focus:border-[#4caf6a]"
                                      />
                                    </div>
                                  )}

                                  <div className="flex items-center gap-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[4px] p-0.5 text-[11px]">
                                    {[
                                      { k: 'all', label: `Все (${extraMembersAll.length})` },
                                      { k: 'viable', label: `Рабочие (${viableCount})` },
                                      { k: 'legacy', label: `Устар./конфл. (${legacyCount})` },
                                    ].map(f => (
                                      <button
                                        key={f.k}
                                        type="button"
                                        onClick={() =>
                                          setExtraFilterByGroup(prev => ({
                                            ...prev,
                                            [group.id]: f.k as ExtraDrawerFilter,
                                          }))
                                        }
                                        className={`px-2 py-0.5 rounded-[4px] transition-colors whitespace-nowrap tabular-nums ${
                                          extraFilter === f.k
                                            ? 'bg-[#242424] text-[#4caf6a] font-semibold'
                                            : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                                        }`}
                                      >
                                        {f.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {hiddenIncompatibleInGroupCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setHideIncompatible(v => !v)}
                                      className="text-[11px] text-[#4caf6a] hover:underline px-2 py-1 rounded-[4px] hover:bg-[#222222] whitespace-nowrap"
                                    >
                                      {hideIncompatible
                                        ? `Показать несовм. (${hiddenIncompatibleInGroupCount})`
                                        : 'Скрыть несовм.'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: false }))}
                                    className="inline-flex items-center gap-1 text-[11px] text-[#8f8f8f] hover:text-[#e6e6e6] px-2 py-1 rounded-[4px] hover:bg-[#222222] whitespace-nowrap"
                                  >
                                    <span>Свернуть</span>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {extraFiltered.length === 0 ? (
                                <div className="py-4 text-center text-xs text-[#8f8f8f]">
                                  По фильтру ничего не найдено.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
                                  {extraFiltered.map(mod => {
                                    const isSelected = selectedSet.has(mod.id);
                                    const isCoreExclusiveItem = exclusivePoolSet.has(mod.id);
                                    const w = warningByMod.get(mod.id);
                                    const modTier = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity).tier;
                                    const statusInfo = tierShortText(modTier);
                                    const restriction = getModRestrictionBadge(mod, selectedSet, prefs);
                                    const isIncompat = incompatibleWithActiveSet.has(mod.id);
                                    const rp = getModResourceProfile(mod);

                                    const cardHighlight =
                                      modTier === 'red' || isIncompat || (isSelected && hasExclusiveConflict && isCoreExclusiveItem)
                                        ? isSelected
                                          ? 'bg-[#cf6d6d]/[0.1] border-[#cf6d6d]/70'
                                          : 'bg-[#cf6d6d]/[0.04] border-[#cf6d6d]/35 hover:border-[#cf6d6d]/60'
                                        : modTier === 'yellow' || restriction?.tone === 'amber'
                                          ? isSelected
                                            ? 'bg-[#c99b52]/[0.1] border-[#c99b52]/70'
                                            : 'bg-[#c99b52]/[0.04] border-[#c99b52]/35 hover:border-[#c99b52]/60'
                                          : isSelected
                                            ? 'bg-[#4caf6a]/[0.08] border-[#4caf6a]'
                                            : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]';

                                    return (
                                      <div
                                        key={mod.id}
                                        className={`rounded-[4px] border px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors ${cardHighlight}`}
                                      >
                                        <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                                          <input
                                            type={strictExclusive && isCoreExclusiveItem ? 'radio' : 'checkbox'}
                                            name={strictExclusive && isCoreExclusiveItem ? `group-extra-${group.id}` : undefined}
                                            checked={isSelected}
                                            onChange={() => handleToggleMod(mod)}
                                            className="accent-[#4caf6a] w-3 h-3 shrink-0"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="text-[11px] font-medium text-[#e6e6e6] truncate">
                                                {mod.name}
                                              </span>
                                              <span className={`text-[10px] font-medium shrink-0 ${statusInfo.textCls}`}>
                                                {statusInfo.text}
                                              </span>
                                            </div>
                                            <div
                                              className={`text-[10px] truncate ${
                                                modTier === 'red' || isIncompat
                                                  ? 'text-[#cf6d6d]'
                                                  : modTier === 'yellow' || rp.hasTradeoff
                                                    ? 'text-[#c99b52]'
                                                    : 'text-[#8f8f8f]'
                                              }`}
                                              title={rp.tradeoffNote}
                                            >
                                              {mod.coveredBy
                                                ? `Встроено: ${mod.coveredBy}`
                                                : restriction?.text || (rp.hasTradeoff ? rp.shortTag : mod.platform)}
                                            </div>
                                          </div>
                                        </label>

                                        <button
                                          type="button"
                                          onClick={() => onOpenDetail(mod)}
                                          className="p-1 rounded-[4px] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222] transition-colors shrink-0"
                                          title="Подробнее"
                                          aria-label={`Подробнее о ${mod.name}`}
                                        >
                                          <Info className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Primary Visible Mods List */}
                          <div className="divide-y divide-[#2a2a2a]">
                            {primaryMembers.map(mod => {
                              const isSelected = selectedSet.has(mod.id);
                              const isLeader = mod.id === group.leaderId;
                              const isCoreExclusiveItem = exclusivePoolSet.has(mod.id);
                              const w = warningByMod.get(mod.id);
                              const modTier = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity).tier;
                              const isIncompat = incompatibleWithActiveSet.has(mod.id);
                              const restriction = getModRestrictionBadge(mod, selectedSet, prefs);
                              const statusInfo = tierShortText(modTier);
                              const depIssue = isSelected
                                ? getMissingDependenciesForMod(mod.id, selectedSet, analysis.warnings)
                                : { missingIds: [], missingNames: [], hasMissingForSelected: false };
                              const conflictIssue = getConflictsForMod(mod.id, selectedSet, group.id);
                              const isDescExpanded = Boolean(expandedDescIds[mod.id]);

                              const isRed = modTier === 'red' || isIncompat || (isSelected && hasExclusiveConflict && isCoreExclusiveItem);
                              const isYellow = !isRed && (modTier === 'yellow' || restriction?.tone === 'amber' || depIssue.hasMissingForSelected);

                              const rowCls = isRed
                                ? isSelected
                                  ? 'bg-[#cf6d6d]/[0.10]'
                                  : 'bg-[#cf6d6d]/[0.04] hover:bg-[#cf6d6d]/[0.07]'
                                : isYellow
                                  ? isSelected
                                    ? 'bg-[#c99b52]/[0.08]'
                                    : 'bg-[#c99b52]/[0.03] hover:bg-[#c99b52]/[0.06]'
                                  : isSelected
                                    ? 'bg-[#4caf6a]/[0.07]'
                                    : 'hover:bg-[#222222]';

                              const modImpact = evaluateModImpactInPack(mod, selectedSet, isSelected ? analysis : undefined, prefs);
                              const rp = modImpact.resourceProfile;
                              const relPctStr =
                                modImpact.relativeImpactPct > 0
                                  ? `+${modImpact.relativeImpactPct}%`
                                  : `${modImpact.relativeImpactPct}%`;

                              return (
                                <div
                                  key={mod.id}
                                  data-mod-row="true"
                                  data-mod-id={mod.id}
                                  data-mod-context="builder"
                                  tabIndex={0}
                                  onMouseEnter={() => handleModHoverOrFocus(mod)}
                                  onFocus={() => handleModHoverOrFocus(mod)}
                                  onMouseLeave={() =>
                                    setHoveredPreview(prev => (prev?.modId === mod.id ? null : prev))
                                  }
                                  className={`px-4 py-2.5 flex items-start justify-between gap-3 transition-colors focus:bg-[#242424] ${rowCls}`}
                                >
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <input
                                      type={strictExclusive && isCoreExclusiveItem ? 'radio' : 'checkbox'}
                                      name={strictExclusive && isCoreExclusiveItem ? `group-${group.id}` : undefined}
                                      checked={isSelected}
                                      onChange={() => handleToggleMod(mod)}
                                      aria-label={`Выбрать ${mod.name}`}
                                      className="accent-[#4caf6a] w-3.5 h-3.5 shrink-0 mt-1 cursor-pointer"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleMod(mod)}
                                          className="text-[13px] font-semibold text-[#e6e6e6] hover:text-[#4caf6a] text-left"
                                        >
                                          {mod.name}
                                        </button>
                                        <StatusBadge
                                          tier={modTier}
                                          label={statusInfo.text}
                                          className="text-[11px]"
                                        />
                                        <span
                                          className={`text-[11px] font-mono font-semibold tabular-nums ${
                                            modImpact.relativeImpactPct > 0
                                              ? 'text-[#6abf7b]'
                                              : modImpact.relativeImpactPct < 0
                                                ? 'text-[#cf6d6d]'
                                                : 'text-[#8f8f8f]'
                                          }`}
                                          title={`Оценка в текущей сборке: ${modImpact.impactPoints}/100 б.`}
                                        >
                                          {relPctStr}
                                        </span>
                                        {(isLeader || mod.platform.includes('Sinytra')) && (
                                          <span className="text-[11px] text-[#8f8f8f]">
                                            ·{' '}
                                            {[
                                              isLeader ? 'Лидер' : null,
                                              mod.platform.includes('Sinytra') ? 'Sinytra' : null,
                                            ]
                                              .filter(Boolean)
                                              .join(' · ')}
                                          </span>
                                        )}
                                        {rp.hasTradeoff && (
                                          <span
                                            className="text-[11px] text-[#c99b52] font-medium"
                                            title={rp.tradeoffNote}
                                          >
                                            · {rp.shortTag}
                                          </span>
                                        )}
                                        {restriction && (
                                          <span className={`text-[11px] font-medium ${restrictionTextClass(restriction.tone)}`}>
                                            · {restriction.text}
                                          </span>
                                        )}
                                      </div>

                                      {/* C3: Compact 1-line summary expandable to full description */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedDescIds(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))
                                        }
                                        aria-expanded={isDescExpanded}
                                        className="w-full text-left flex items-start gap-1 text-xs text-[#8f8f8f] hover:text-[#e6e6e6] mt-0.5 transition-colors"
                                      >
                                        <span className={isDescExpanded ? 'whitespace-normal leading-relaxed' : 'truncate flex-1'}>
                                          {isDescExpanded
                                            ? cleanModDescription(mod.description)
                                            : w
                                              ? w.messages[0]
                                              : formatShortOneLineDescription(mod.description)}
                                        </span>
                                        {isDescExpanded ? (
                                          <ChevronUp className="w-3 h-3 shrink-0 mt-0.5 text-[#4caf6a]" aria-hidden="true" />
                                        ) : (
                                          <ChevronDown className="w-3 h-3 shrink-0 mt-0.5 text-[#8f8f8f]" aria-hidden="true" />
                                        )}
                                      </button>

                                      {/* C2: Direct inline dependency / conflict replacement actions */}
                                      {(depIssue.hasMissingForSelected || conflictIssue.canReplace) && (
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                          {depIssue.hasMissingForSelected && (
                                            <button
                                              type="button"
                                              onClick={() => handleAddDependencyForMod(mod)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-[11px] font-semibold transition-colors"
                                              title={`Нужно: ${depIssue.missingNames.join(', ')}`}
                                            >
                                              <Plus className="w-3 h-3" aria-hidden="true" />
                                              Добавить зависимость ({depIssue.missingNames[0]}
                                              {depIssue.missingNames.length > 1 ? ` +${depIssue.missingNames.length - 1}` : ''})
                                            </button>
                                          )}
                                          {conflictIssue.canReplace && (
                                            <button
                                              type="button"
                                              onClick={() => handleReplaceConflictWithMod(mod)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#c99b52]/60 text-[#c99b52] text-[11px] font-semibold transition-colors"
                                              title={`Заменит конфликт: ${conflictIssue.conflictingNames.join(', ')}`}
                                            >
                                              <ArrowRightLeft className="w-3 h-3" aria-hidden="true" />
                                              Заменить ({conflictIssue.conflictingNames[0]})
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onOpenDetail(mod)}
                                      className="p-1.5 rounded-[4px] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222] transition-colors"
                                      title="Подробнее о моде"
                                      aria-label={`Подробнее о ${mod.name}`}
                                    >
                                      <Info className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                    <a
                                      href={mod.curseforgeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-[4px] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222] transition-colors"
                                      title="CurseForge"
                                      aria-label={`${mod.name} на CurseForge`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Expandable Footer */}
                          {hiddenCount > 0 && !isExtraOpen && (
                            <button
                              type="button"
                              onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: true }))}
                              className="w-full px-4 py-2 bg-[#141414] hover:bg-[#222222] border-t border-[#2a2a2a] text-xs text-[#8f8f8f] hover:text-[#e6e6e6] flex items-center justify-between transition-colors"
                            >
                              <span>Показать дополнительные моды и аналоги ({hiddenCount})</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
          )}
        </div>

        {/* Right Sticky "Состав сборки" Inspector (Desktop lg+) */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-16 space-y-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] p-4 space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#e6e6e6]">Состав сборки</h3>
                  <span className="text-xs font-mono tabular-nums text-[#8f8f8f]">
                    ({summaryCounts.total})
                  </span>
                </div>
                {summaryCounts.total > 0 && (
                  <div className="text-[11px] text-[#8f8f8f] tabular-nums mt-0.5">
                    <span className="text-[#6abf7b]">{resourceBalance.effectiveCount} актив.</span>
                    {resourceBalance.conditionalCount > 0 && (
                      <span> · {resourceBalance.conditionalCount} усл./опора</span>
                    )}
                    {resourceBalance.redundantCount > 0 && (
                      <span className="text-[#c99b52]"> · {resourceBalance.redundantCount} лишн.</span>
                    )}
                    {resourceBalance.conflictCount > 0 && (
                      <span className="text-[#cf6d6d]"> · {resourceBalance.conflictCount} конфл.</span>
                    )}
                  </div>
                )}
              </div>

              {summaryCounts.total > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDetailModal(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                  title="Открыть детальный разбор всей сборки на весь экран"
                >
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Детально
                </button>
              )}
            </div>

            {/* C2: Live Hover/Focus Delta Preview Strip (fixed compact height, zero jump) */}
            <div
              data-hover-preview="true"
              className="rounded-[4px] bg-[#141414] border border-[#2a2a2a] px-2.5 py-1.5 text-[11px] min-h-[28px] flex items-center justify-between gap-2 tabular-nums"
            >
              {hoveredPreview ? (
                <>
                  <span className="text-[#e6e6e6] truncate">
                    {hoveredPreview.action === 'add' ? '+' : '−'} {hoveredPreview.modName}:{' '}
                    <strong
                      className={`font-mono ${
                        hoveredPreview.scoreDelta > 0
                          ? 'text-[#6abf7b]'
                          : hoveredPreview.scoreDelta < 0
                            ? 'text-[#cf6d6d]'
                            : 'text-[#8f8f8f]'
                      }`}
                    >
                      {hoveredPreview.scoreDelta > 0
                        ? `+${hoveredPreview.scoreDelta}`
                        : hoveredPreview.scoreDelta}{' '}
                      б.
                    </strong>{' '}
                    <span className="text-[#8f8f8f]">→ {hoveredPreview.nextScore}/100</span>
                  </span>
                  <span className="font-mono text-[#6abf7b] shrink-0">{hoveredPreview.nextFpsLabel}</span>
                </>
              ) : (
                <span className="text-[#8f8f8f] truncate">
                  Наведите на мод слева, чтобы увидеть прогноз изменения оценки и FPS
                </span>
              )}
            </div>

            {/* Inspector Sub-Tabs */}
            {summaryCounts.total > 0 && (
              <div className="grid grid-cols-3 bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-0.5 text-xs">
                {[
                  { k: 'overview' as const, label: 'Обзор' },
                  { k: 'mods' as const, label: `Моды (${summaryCounts.total})` },
                  { k: 'links' as const, label: `Связки (${assemblyImpact.synergies.length})` },
                ].map(tab => (
                  <button
                    key={tab.k}
                    type="button"
                    onClick={() => setInspectorTab(tab.k)}
                    className={`py-1.5 px-2 rounded-[4px] font-medium transition-colors whitespace-nowrap tabular-nums ${
                      inspectorTab === tab.k
                        ? 'bg-[#242424] text-[#4caf6a] font-semibold'
                        : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {summaryCounts.total > 0 && inspectorTab === 'overview' && (
              <div className="space-y-3">
                {/* Dual Interactive KPIs */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowScoreBreakdown(v => !v)}
                    aria-expanded={showScoreBreakdown}
                    className="rounded-[6px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] p-3 space-y-1.5 text-left transition-colors"
                    title="Показать из чего складывается оценка сборки"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#8f8f8f]">
                      <span>Оценка сборки</span>
                      {showScoreBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                    <div className="flex items-baseline gap-1 tabular-nums">
                      <span
                        className={`text-xl font-semibold font-mono ${
                          assemblyImpact.assemblyScore >= 80
                            ? 'text-[#6abf7b]'
                            : assemblyImpact.assemblyScore >= 55
                              ? 'text-[#e6e6e6]'
                              : 'text-[#c99b52]'
                        }`}
                      >
                        {assemblyImpact.assemblyScore}
                      </span>
                      <span className="text-xs text-[#8f8f8f] font-mono">/ 100</span>
                    </div>
                    <div className="h-1 rounded-[2px] bg-[#2a2a2a] overflow-hidden">
                      <div
                        className="h-full bg-[#4caf6a]"
                        style={{ width: `${assemblyImpact.assemblyScore}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[#8f8f8f] font-mono tabular-nums pt-0.5 truncate">
                      Эффект. {scoreBreakdown.efficiencyScore} · Стаб. {scoreBreakdown.stabilityScore}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowArtifactFactors(v => !v)}
                    aria-expanded={showArtifactFactors}
                    className="rounded-[6px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] p-3 space-y-1.5 text-left transition-colors"
                    title="Показать факторы риска визуальных артефактов"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#8f8f8f]">
                      <span>Шанс артефактов</span>
                      {showArtifactFactors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                    <div className="flex items-baseline gap-1.5 tabular-nums">
                      <span className={`text-xl font-semibold font-mono ${artifactColorCls}`}>
                        {artifactRisk.chancePct}%
                      </span>
                      <span className={`text-[11px] font-medium ${artifactColorCls}`}>
                        {artifactRisk.label}
                      </span>
                    </div>
                    <div className="h-1 rounded-[2px] bg-[#2a2a2a] overflow-hidden">
                      <div
                        className="h-full bg-[#4caf6a]"
                        style={{ width: `${Math.min(100, Math.max(artifactRisk.chancePct, 4))}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-[#8f8f8f] truncate">
                      {artifactRisk.factors.length > 0 ? `${artifactRisk.factors.length} фактора(ов) риска` : 'Без факторов риска'}
                    </div>
                  </button>
                </div>

                {/* C1: Expandable Score Equation + Pillars Explanation */}
                {showScoreBreakdown && (
                  <div className="rounded-[6px] bg-[#141414] border border-[#2a2a2a] p-3 space-y-2 text-[11px] tabular-nums">
                    <div className="text-[#8f8f8f] leading-relaxed space-y-1 pb-1.5 border-b border-[#2a2a2a]">
                      <div>
                        <strong className="text-[#e6e6e6]">Эффективность ({scoreBreakdown.efficiencyScore}):</strong> покрытие 7 подсистем и синергии.
                      </div>
                      <div>
                        <strong className="text-[#6abf7b]">Стабильность ({scoreBreakdown.stabilityScore}):</strong> совместимость версий и портов Forge 1.20.1.
                      </div>
                      <div>
                        <strong className="text-[#cf6d6d]">Конфликты и балласт:</strong> штрафы за несовместимости, дубли и артефакты.
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#8f8f8f]">Покрытие 7 подсистем</span>
                        <span className="font-mono text-[#6abf7b]">+{scoreBreakdown.coverageScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8f8f8f]">Синергии модов</span>
                        <span className="font-mono text-[#6abf7b]">+{scoreBreakdown.synergyBonus}</span>
                      </div>
                      {scoreBreakdown.penaltyPoints > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#8f8f8f]">Штраф за конфликты / ошибки</span>
                          <span className="font-mono text-[#cf6d6d]">−{scoreBreakdown.penaltyPoints}</span>
                        </div>
                      )}
                      {scoreBreakdown.bloatPenalty > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#8f8f8f]">Дубли / избыточность</span>
                          <span className="font-mono text-[#c99b52]">−{scoreBreakdown.bloatPenalty}</span>
                        </div>
                      )}
                      {scoreBreakdown.artifactPenalty > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#8f8f8f]">Риск визуальных артефактов</span>
                          <span className="font-mono text-[#c99b52]">−{scoreBreakdown.artifactPenalty}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expandable Artifact Risk Factors */}
                {showArtifactFactors && (
                  <div className="rounded-[6px] bg-[#141414] border border-[#2a2a2a] p-3 space-y-2 text-[11px]">
                    <p className="text-[#8f8f8f] leading-relaxed">{artifactRisk.summary}</p>
                    {artifactRisk.factors.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-[#2a2a2a]">
                        {artifactRisk.factors.map((f, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 tabular-nums">
                            <span className="text-[#e6e6e6] truncate">{f.label}</span>
                            <span
                              className={`font-mono font-semibold shrink-0 ${
                                f.tone === 'mitigation' ? 'text-[#6abf7b]' : 'text-[#c99b52]'
                              }`}
                            >
                              {f.deltaPct > 0 ? `+${f.deltaPct}%` : `${f.deltaPct}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Dubious Mods Modal Trigger */}
                <button
                  type="button"
                  onClick={() => setShowDubiousModal(true)}
                  className={`w-full rounded-[6px] border px-3 py-2.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                    dubiousHighCount > 0
                      ? 'bg-[#cf6d6d]/[0.06] hover:bg-[#cf6d6d]/[0.1] border-[#cf6d6d]/40 text-[#cf6d6d]'
                      : dubiousMedCount > 0
                        ? 'bg-[#c99b52]/[0.06] hover:bg-[#c99b52]/[0.1] border-[#c99b52]/40 text-[#c99b52]'
                        : 'bg-[#141414] hover:bg-[#222222] border-[#2a2a2a] text-[#e6e6e6]'
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Сомнительные моды ({dubiousMods.length})
                  </span>
                  <span className="text-[11px] text-[#8f8f8f] tabular-nums shrink-0">
                    {dubiousMods.length > 0 ? 'Открыть окно →' : 'Всё чисто'}
                  </span>
                </button>

                {/* C1: Honest Resource & Diminishing-Returns FPS Estimate */}
                <div className="rounded-[6px] bg-[#141414] border border-[#2a2a2a] p-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#e6e6e6]">Прогноз прироста</span>
                    <span
                      className={`font-mono tabular-nums ${
                        fpsEstimate.hasConflicts ? 'text-[#cf6d6d]' : 'text-[#6abf7b]'
                      }`}
                      title={fpsEstimate.note}
                    >
                      {fpsEstimate.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 tabular-nums">
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8f8f8f] mb-0.5">
                        <span>FPS</span>
                        <span className="font-mono text-[#e6e6e6]">{resourceBalance.fpsScore}</span>
                      </div>
                      <div className="h-1 rounded-[2px] bg-[#2a2a2a] overflow-hidden">
                        <div className="h-full bg-[#4caf6a]" style={{ width: `${resourceBalance.fpsScore}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8f8f8f] mb-0.5">
                        <span>TPS</span>
                        <span className="font-mono text-[#e6e6e6]">{resourceBalance.tpsScore}</span>
                      </div>
                      <div className="h-1 rounded-[2px] bg-[#2a2a2a] overflow-hidden">
                        <div className="h-full bg-[#4caf6a]" style={{ width: `${resourceBalance.tpsScore}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-[#8f8f8f] mb-0.5">
                        <span>ОЗУ</span>
                        <span className="font-mono text-[#e6e6e6]">{resourceBalance.memoryScore}</span>
                      </div>
                      <div className="h-1 rounded-[2px] bg-[#2a2a2a] overflow-hidden">
                        <div className="h-full bg-[#4caf6a]" style={{ width: `${resourceBalance.memoryScore}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-[#2a2a2a] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8f8f8f]">
                    <span className="font-mono">{resourceBalance.ramDeltaLabel}</span>
                    <span>Убывающая отдача</span>
                  </div>
                </div>

                {/* Clickable 7-Subsystem Coverage Breakdown */}
                <div className="rounded-[6px] bg-[#141414] border border-[#2a2a2a] p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] pb-1">
                    <span className="font-semibold text-[#e6e6e6]">
                      Покрытие подсистем
                    </span>
                    <span className="font-mono text-[#8f8f8f] tabular-nums">
                      {assemblyImpact.coveredSubsystems.length}/7 ({assemblyImpact.coveragePct}%)
                    </span>
                  </div>
                  <div className="space-y-1">
                    {assemblyImpact.subsystemScores.map(sub => {
                      const isExpanded = expandedSubsystemKey === sub.id;
                      const subMods = analyzedMods.filter(row => {
                        const gid = row.mod.groupId || '';
                        if (sub.id === 'render') return gid === 'core-renderer' || gid === 'shaders-pipeline';
                        if (sub.id === 'memory') return gid === 'memory-core';
                        if (sub.id === 'tps') return gid === 'tick-physics-engine';
                        if (sub.id === 'culling') return ['block-culling', 'leaves-culling', 'block-entities'].includes(gid);
                        if (sub.id === 'worldgen') return gid === 'worldgen-chunks' || gid === 'lighting-engine';
                        if (sub.id === 'cpu-audio') return ['upscaling-bg', 'cpu-threads', 'particles-audio', 'boot-loading'].includes(gid);
                        return ['networking', 'items-clearlag', 'recipes-jei'].includes(gid);
                      });
                      return (
                        <div key={sub.id} className="rounded-[4px] hover:bg-[#1a1a1a] transition-colors">
                          <button
                            type="button"
                            onClick={() => setExpandedSubsystemKey(isExpanded ? null : sub.id)}
                            aria-expanded={isExpanded}
                            className="w-full px-1.5 py-1 text-left space-y-1 text-[11px]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={sub.covered ? 'text-[#e6e6e6] truncate' : 'text-[#8f8f8f] truncate'}>
                                {sub.title}
                              </span>
                              <span className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`font-mono tabular-nums ${
                                    sub.scorePct >= 75
                                      ? 'text-[#6abf7b]'
                                      : sub.scorePct >= 40
                                        ? 'text-[#e6e6e6]'
                                        : 'text-[#c99b52]'
                                  }`}
                                >
                                  {sub.scorePct}%
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3 text-[#8f8f8f]" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-[#8f8f8f]" />
                                )}
                              </span>
                            </div>
                            <div className="h-1 rounded-[2px] bg-[#2a2a2a] overflow-hidden">
                              <div
                                className="h-full bg-[#4caf6a]"
                                style={{ width: `${Math.max(sub.scorePct, sub.covered ? 8 : 0)}%` }}
                              />
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-2 pb-1.5 pt-0.5 text-[10px] text-[#8f8f8f]">
                              {subMods.length > 0 ? (
                                <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                                  {subMods.map(x => (
                                    <span key={x.mod.id} className="text-[#e6e6e6]">
                                      {x.mod.name}{' '}
                                      <span className="font-mono text-[#6abf7b]">
                                        {x.impact.relativeImpactPct > 0 ? `+${x.impact.relativeImpactPct}%` : `${x.impact.relativeImpactPct}%`}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span>В этой подсистеме моды не выбраны.</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PER-MOD ANALYZER INSIDE СОСТАВ СБОРКИ */}
            {summaryCounts.total > 0 && inspectorTab === 'mods' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1 bg-[#141414] border border-[#2a2a2a] rounded-[4px] p-0.5">
                    {[
                      { k: 'all' as const, label: `Все (${analyzedMods.length})` },
                      { k: 'core' as const, label: 'Ядро' },
                      { k: 'issues' as const, label: `Риск/0% (${resourceBalance.redundantCount + resourceBalance.conflictCount})` },
                    ].map(f => (
                      <button
                        key={f.k}
                        type="button"
                        onClick={() => setInspectorModFilter(f.k)}
                        className={`px-2 py-0.5 rounded-[4px] transition-colors whitespace-nowrap tabular-nums ${
                          inspectorModFilter === f.k
                            ? 'bg-[#242424] text-[#4caf6a] font-semibold'
                            : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-[#2a2a2a] border border-[#2a2a2a] rounded-[6px] bg-[#141414] max-h-96 overflow-y-auto">
                  {analyzedMods
                    .filter(row => {
                      if (inspectorModFilter === 'core') {
                        return row.impact.level === 'core' || row.impact.level === 'high';
                      }
                      if (inspectorModFilter === 'issues') {
                        return row.impact.level === 'negative' || row.impact.level === 'zero' || row.artifactDeltaPct >= 4;
                      }
                      return true;
                    })
                    .map(({ mod, impact, artifactDeltaPct }) => {
                      const relStr =
                        impact.relativeImpactPct > 0 ? `+${impact.relativeImpactPct}%` : `${impact.relativeImpactPct}%`;
                      const impactCls =
                        impact.level === 'negative'
                          ? 'text-[#cf6d6d]'
                          : impact.level === 'zero' || impact.level === 'conditional'
                            ? 'text-[#c99b52]'
                            : impact.level === 'core' || impact.level === 'high'
                              ? 'text-[#6abf7b]'
                              : 'text-[#8f8f8f]';

                      return (
                        <div key={mod.id} className="px-3 py-2 flex items-start justify-between gap-2 hover:bg-[#1f1f1f]">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs">
                              <button
                                type="button"
                                onClick={() => onOpenDetail(mod)}
                                className="font-semibold text-[#e6e6e6] hover:text-[#4caf6a] text-left truncate"
                              >
                                {mod.name}
                              </button>
                              <span className={`font-mono text-[11px] font-semibold tabular-nums ${impactCls}`}>
                                {relStr}
                              </span>
                              <span className="text-[10px] text-[#8f8f8f] font-mono tabular-nums">
                                ({impact.impactPoints}б.)
                              </span>
                              {artifactDeltaPct > 0 && (
                                <span className="text-[10px] font-mono text-[#c99b52] tabular-nums">
                                  +{artifactDeltaPct}% арт.
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#8f8f8f] truncate mt-0.5">{impact.summary}</p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 pt-0.5">
                            {impact.betterAnalogId && impact.betterAnalogName && (
                              <button
                                type="button"
                                onClick={() => {
                                  const withoutOld = selectedIds.filter(id => id !== mod.id);
                                  const res = toggleModSmart(withoutOld, impact.betterAnalogId!, { strict: true, prefs });
                                  setSelectedIds(res.nextIds);
                                  setActionNotice({ text: `${mod.name} заменён на ${impact.betterAnalogName}.`, tone: 'info' });
                                }}
                                className="p-1 rounded-[4px] text-[#4caf6a] hover:bg-[#222222]"
                                title={`Заменить на ${impact.betterAnalogName}`}
                                aria-label={`Заменить ${mod.name} на ${impact.betterAnalogName}`}
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleMod(mod)}
                              className="p-1 rounded-[4px] text-[#8f8f8f] hover:text-[#cf6d6d] hover:bg-[#222222]"
                              title="Убрать из сборки"
                              aria-label={`Убрать ${mod.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 3: SYNERGIES & OVERLAPS */}
            {summaryCounts.total > 0 && inspectorTab === 'links' && (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-0.5 text-[11px]">
                {assemblyImpact.synergies.length > 0 && (
                  <div className="rounded-[6px] bg-[#141414] border border-[#2a2a2a] p-3 space-y-2">
                    <div className="font-semibold text-[#6abf7b]">
                      Активные синергии ({assemblyImpact.synergies.length})
                    </div>
                    <div className="space-y-1.5">
                      {assemblyImpact.synergies.map((s, i) => (
                        <div key={i} className="text-[#8f8f8f] leading-snug">
                          <strong className="text-[#e6e6e6]">{s.targetNames.join(' + ')}:</strong> {s.summary}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assemblyImpact.overlaps.length > 0 && (
                  <div className="rounded-[6px] bg-[#c99b52]/[0.06] border border-[#c99b52]/30 p-3 space-y-1.5">
                    <div className="font-semibold text-[#c99b52]">
                      Пересечения и дубли ({assemblyImpact.overlaps.length})
                    </div>
                    {assemblyImpact.overlaps.map((o, i) => (
                      <div key={i} className="text-[#e6e6e6] leading-snug">{o.summary}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Missing Critical Slots Check */}
            {analysis.missingCoreSlots.length > 0 && (
              <div className="p-3 rounded-[6px] bg-[#c99b52]/[0.06] border border-[#c99b52]/35 space-y-2">
                <div className="text-xs font-semibold text-[#c99b52] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Пропущены базовые слоты ({analysis.missingCoreSlots.length})
                </div>
                <div className="space-y-1.5">
                  {analysis.missingCoreSlots.map(slot => (
                    <div key={slot.groupId} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-[#e6e6e6] truncate">{slot.groupTitle}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const res = toggleModSmart(selectedIds, slot.leaderId, { strict: true, prefs });
                          setSelectedIds(res.nextIds);
                        }}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#4caf6a] font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        {slot.leaderName}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.conflicts.length > 0 || analysis.warnings.length > 0 || summaryCounts.red > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {analysis.conflicts.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-[4px] bg-[#cf6d6d]/[0.06] border border-[#cf6d6d]/35 text-xs space-y-1">
                    <div className="font-semibold text-[#cf6d6d] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      {c.matchedNames.join(' + ')}
                    </div>
                    <p className="text-[11px] text-[#e6e6e6]">{c.rule.explanation}</p>
                  </div>
                ))}
                {analysis.warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-[4px] border text-xs flex items-start gap-2 ${
                      w.severity === 'red'
                        ? 'bg-[#cf6d6d]/[0.06] border-[#cf6d6d]/35 text-[#cf6d6d]'
                        : 'bg-[#c99b52]/[0.06] border-[#c99b52]/35 text-[#c99b52]'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="text-[11px]">{w.message}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleFixIssues}
                  className="w-full py-2 px-3 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold transition-colors"
                >
                  Исправить конфликты и добрать зависимости
                </button>
              </div>
            ) : summaryCounts.total > 0 ? (
              <div className="p-2.5 rounded-[4px] bg-[#4caf6a]/[0.07] border border-[#4caf6a]/30 text-xs text-[#6abf7b] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Конфликтов и пропущенных зависимостей нет.
              </div>
            ) : (
              <div className="p-3 rounded-[6px] bg-[#141414] border border-[#2a2a2a] text-xs text-[#8f8f8f]">
                Сборка пуста. Выберите моды слева или нажмите «Умный подбор».
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2a2a2a]">
              <button
                type="button"
                onClick={handleCopyNamesList}
                disabled={summaryCounts.total === 0}
                className="flex-1 py-2 px-3 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
              <ExportMenu
                modIds={selectedIds}
                summary={assemblyImpact}
                fpsEstimate={fpsEstimate}
                prefs={prefs}
                filenamePrefix="forge-1.20.1-assembly"
              />
              <button
                type="button"
                onClick={() => onSendToChecker(selectedIds)}
                disabled={summaryCounts.total === 0}
                className="py-2 px-3 rounded-[6px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                В Чекер
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* C6: Mobile / Tablet (< lg) Sticky Bottom Bar & Slide-Over Drawer for Состав сборки */}
      <div className="lg:hidden h-14" aria-hidden="true" />
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#1a1a1a] border-t border-[#2a2a2a] px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#e6e6e6] flex items-center gap-2 tabular-nums">
            <span>Состав: <span className="font-mono">{summaryCounts.total}</span></span>
            <span className="text-[#2a2a2a]">·</span>
            <span className="font-mono text-[#4caf6a]">{assemblyImpact.assemblyScore}/100</span>
          </div>
          <div className="text-[11px] font-mono text-[#6abf7b] truncate">
            {fpsEstimate.label}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileInspectorOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <PanelRightOpen className="w-3.5 h-3.5" aria-hidden="true" />
          Состав сборки
        </button>
      </div>

      {mobileInspectorOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/75 flex justify-end"
          onClick={() => setMobileInspectorOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Состав сборки"
        >
          <div
            className="w-full max-w-md h-full bg-[#1a1a1a] border-l border-[#2a2a2a] overflow-y-auto p-4 space-y-3.5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#2a2a2a]">
              <div>
                <h3 className="text-sm font-semibold text-[#e6e6e6]">
                  Состав сборки ({summaryCounts.total})
                </h3>
                <p className="text-[11px] font-mono text-[#6abf7b]">{fpsEstimate.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileInspectorOpen(false)}
                className="p-1.5 rounded-[4px] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222]"
                aria-label="Закрыть панель состава"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-[6px] bg-[#141414] border border-[#2a2a2a] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8f8f8f]">Оценка сборки</span>
                <span className="font-mono font-semibold text-[#4caf6a]">{assemblyImpact.assemblyScore}/100</span>
              </div>
              <div className="text-[11px] text-[#8f8f8f] space-y-0.5">
                <div>Эффективность: {scoreBreakdown.efficiencyScore} · Стабильность: {scoreBreakdown.stabilityScore}</div>
                <div>Покрытие: {assemblyImpact.coveredSubsystems.length}/7 подсистем · Артефакты: {artifactRisk.chancePct}%</div>
              </div>
            </div>

            {analysis.conflicts.length > 0 || analysis.warnings.length > 0 ? (
              <button
                type="button"
                onClick={handleFixIssues}
                className="w-full py-2 px-3 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold"
              >
                Исправить конфликты и добрать зависимости
              </button>
            ) : (
              <div className="p-2.5 rounded-[4px] bg-[#4caf6a]/[0.07] border border-[#4caf6a]/30 text-xs text-[#6abf7b]">
                Конфликтов и пропущенных зависимостей нет.
              </div>
            )}

            <div className="divide-y divide-[#2a2a2a] border border-[#2a2a2a] rounded-[6px] bg-[#141414] max-h-72 overflow-y-auto">
              {analyzedMods.map(({ mod, impact }) => (
                <div key={mod.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileInspectorOpen(false);
                      onOpenDetail(mod);
                    }}
                    className="font-medium text-[#e6e6e6] hover:text-[#4caf6a] text-left truncate"
                  >
                    {mod.name}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] text-[#6abf7b]">
                      {impact.relativeImpactPct > 0 ? `+${impact.relativeImpactPct}%` : `${impact.relativeImpactPct}%`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleMod(mod)}
                      className="p-1 text-[#8f8f8f] hover:text-[#cf6d6d]"
                      aria-label={`Убрать ${mod.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2a2a2a]">
              <button
                type="button"
                onClick={handleCopyNamesList}
                disabled={summaryCounts.total === 0}
                className="flex-1 py-2 px-3 rounded-[6px] bg-[#4caf6a] text-[#121212] text-xs font-semibold"
              >
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
              <ExportMenu
                modIds={selectedIds}
                summary={assemblyImpact}
                fpsEstimate={fpsEstimate}
                prefs={prefs}
                filenamePrefix="forge-1.20.1-assembly"
              />
              {summaryCounts.total > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileInspectorOpen(false);
                    setShowDetailModal(true);
                  }}
                  className="py-2 px-3 rounded-[6px] bg-[#141414] border border-[#2a2a2a] text-[#e6e6e6] text-xs font-medium"
                >
                  Детально
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel={confirmAction?.confirmLabel || 'Подтвердить'}
        onConfirm={() => confirmAction?.run()}
        onCancel={() => setConfirmAction(null)}
      />

      <DubiousModsModal
        isOpen={showDubiousModal}
        onClose={() => setShowDubiousModal(false)}
        dubiousMods={dubiousMods}
        artifactRisk={artifactRisk}
        totalModsCount={summaryCounts.total}
        onRemoveMod={modId => {
          const res = toggleModSmart(selectedIds, modId, { strict: strictExclusive, prefs });
          setSelectedIds(res.nextIds);
          if (res.notice) setActionNotice({ text: res.notice, tone: res.noticeTone });
        }}
        onReplaceMod={(oldModId, newModId) => {
          const withoutOld = selectedIds.filter(id => id !== oldModId);
          const res = toggleModSmart(withoutOld, newModId, { strict: true, prefs });
          setSelectedIds(res.nextIds);
          const newName = modById.get(newModId)?.name || newModId;
          const oldName = modById.get(oldModId)?.name || oldModId;
          setActionNotice({ text: `${oldName} заменён на ${newName}.`, tone: 'info' });
        }}
        onRemoveAllRisky={modIds => {
          if (strictExclusive) {
            const res = removeModsCascade(selectedIds, modIds);
            setSelectedIds(res.nextIds);
          } else {
            const dropSet = new Set(modIds);
            setSelectedIds(selectedIds.filter(id => !dropSet.has(id)));
          }
          setActionNotice({ text: `Убраны рискованные моды (${modIds.length}).`, tone: 'info' });
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
          const m = modById.get(modId);
          if (m) handleToggleMod(m);
        }}
        onReplaceMod={(oldModId, newModId) => {
          const withoutOld = selectedIds.filter(id => id !== oldModId);
          const res = toggleModSmart(withoutOld, newModId, { strict: true, prefs });
          setSelectedIds(res.nextIds);
          const newName = modById.get(newModId)?.name || newModId;
          const oldName = modById.get(oldModId)?.name || oldModId;
          setActionNotice({ text: `${oldName} заменён на ${newName}.`, tone: 'info' });
        }}
        onAutoFix={handleFixIssues}
        onOpenDubiousModal={() => setShowDubiousModal(true)}
      />
    </div>
  );
}

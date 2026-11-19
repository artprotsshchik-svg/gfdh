import { useMemo, useState } from 'react';
import {
  MODS_DATABASE,
  MOD_PRESETS,
  type ModItem,
} from '../data/modsData.ts';
import {
  analyzeSelection,
  evaluateModImpactInPack,
  findModByDisplayName,
  getCheckerTier,
  getModEffectivenessScore,
  getModRestrictionBadge,
  getRecipeBridgeStatus,
  organizeAssemblyTree,
  removeModsCascade,
  shouldHideMod,
  smartFixAssembly,
  summarizeAssemblyImpact,
  toggleModSmart,
  type CheckerTier,
  type ModImpactLevel,
} from '../utils/modLogic.ts';
import { estimateFpsRange } from '../utils/fpsEstimator.ts';
import {
  addMissingDependenciesForMod,
  getMissingDependenciesForMod,
} from '../utils/modInteractions.ts';
import { DubiousModsModal } from './DubiousModsModal.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { ExportMenu } from './ExportMenu.tsx';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileUp,
  FolderOpen,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { matchJarFilenamesToMods } from '../utils/jarMatcher.ts';

interface CheckerTabProps {
  checkedModIds: string[];
  setCheckedModIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  onOpenDetail: (mod: ModItem) => void;
}

const MOD_BY_ID = new Map(MODS_DATABASE.map(m => [m.id, m]));

export function CheckerTab({ checkedModIds, setCheckedModIds, onOpenDetail }: CheckerTabProps) {
  const [tierFilter, setTierFilter] = useState<'all' | CheckerTier>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'status'>('tree');
  const [addSearch, setAddSearch] = useState('');
  const [hideIncompatibleSuggestions, setHideIncompatibleSuggestions] = useState(true);
  const [copiedList, setCopiedList] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [showArtifactFactors, setShowArtifactFactors] = useState(false);
  const [showDubiousModal, setShowDubiousModal] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importNotice, setImportNotice] = useState<{
    matchedCount: number;
    unmatched: string[];
    mode: 'replace' | 'merge';
  } | null>(null);

  const checkedSet = useMemo(() => new Set(checkedModIds), [checkedModIds]);
  const analysis = useMemo(() => analyzeSelection(checkedModIds), [checkedModIds]);

  const warningMap = useMemo(() => {
    const map = new Map<string, { severity: 'red' | 'yellow'; messages: string[] }>();
    for (const w of analysis.warnings) {
      const prev = map.get(w.modId);
      const sev = prev?.severity === 'red' || w.severity === 'red' ? 'red' : 'yellow';
      const msgs = prev ? [...prev.messages, w.message] : [w.message];
      map.set(w.modId, { severity: sev, messages: msgs });
    }
    return map;
  }, [analysis.warnings]);

  const impactSummary = useMemo(
    () => summarizeAssemblyImpact(checkedModIds, analysis),
    [checkedModIds, analysis]
  );
  const fpsEstimate = useMemo(
    () => estimateFpsRange(checkedModIds, impactSummary),
    [checkedModIds, impactSummary]
  );

  const rows = useMemo(() => {
    return analysis.selectedMods
      .map(mod => {
        const w = warningMap.get(mod.id);
        const checker = getCheckerTier(mod, analysis.conflictingIdSet, w?.severity);
        const bridge = getRecipeBridgeStatus(mod, checkedSet);
        const impact = evaluateModImpactInPack(mod, checkedSet, analysis);
        return {
          mod,
          tier: checker.tier,
          label: checker.label,
          reason: w?.messages[0] || checker.reason,
          viaBridge: bridge.compatible ? bridge.viaBridge : undefined,
          impact,
        };
      })
      .sort((a, b) => {
        const order: Record<CheckerTier, number> = { red: 0, yellow: 1, lime: 2, green: 3 };
        return order[a.tier] - order[b.tier] || a.mod.name.localeCompare(b.mod.name, 'ru');
      });
  }, [analysis, warningMap, checkedSet]);

  const counts = useMemo(() => {
    let green = 0;
    let lime = 0;
    let yellow = 0;
    let red = 0;
    for (const r of rows) {
      if (r.tier === 'green') green++;
      else if (r.tier === 'lime') lime++;
      else if (r.tier === 'yellow') yellow++;
      else red++;
    }
    return { green, lime, yellow, red, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (tierFilter === 'all') return rows;
    return rows.filter(r => r.tier === tierFilter);
  }, [rows, tierFilter]);

  const addSuggestions = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return [];
    return MODS_DATABASE.filter(m => {
      if (checkedSet.has(m.id)) return false;
      const matches =
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.bestAlternative && m.bestAlternative.toLowerCase().includes(q)) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(q)));
      if (!matches) return false;
      if (
        hideIncompatibleSuggestions &&
        shouldHideMod(m, checkedSet, undefined, { hideIncompatible: true, hideUselessCovered: true })
      ) {
        return false;
      }
      return true;
    }).slice(0, 8);
  }, [addSearch, checkedSet, hideIncompatibleSuggestions]);

  const rowByModId = useMemo(() => new Map(rows.map(r => [r.mod.id, r])), [rows]);

  const hierarchicalRows = useMemo(() => {
    const filteredIds = filteredRows.map(r => r.mod.id);
    const tree = organizeAssemblyTree(filteredIds);
    const out: Array<{
      row: (typeof rows)[number];
      isChild: boolean;
      relationLabel?: string;
      rootIndex?: number;
      childCount?: number;
    }> = [];
    tree.forEach((node, idx) => {
      const parentRow = rowByModId.get(node.parent.id);
      if (parentRow) {
        out.push({
          row: parentRow,
          isChild: false,
          rootIndex: idx + 1,
          childCount: node.children.length,
        });
      }
      for (const ch of node.children) {
        const childRow = rowByModId.get(ch.mod.id);
        if (childRow) {
          out.push({
            row: childRow,
            isChild: true,
            relationLabel: ch.relationLabel,
          });
        }
      }
    });
    return out;
  }, [filteredRows, rowByModId]);

  const displayRows = useMemo(() => {
    if (viewMode === 'tree') return hierarchicalRows;
    return filteredRows.map(row => ({
      row,
      isChild: false,
      relationLabel: undefined as string | undefined,
      rootIndex: undefined as number | undefined,
      childCount: undefined as number | undefined,
    }));
  }, [viewMode, hierarchicalRows, filteredRows]);

  const handleCopyNamesList = () => {
    const tree = organizeAssemblyTree(checkedModIds);
    const orderedNames: string[] = [];
    const seen = new Set<string>();
    for (const node of tree) {
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
    for (const id of checkedModIds) {
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

  const handleScanDesktopFolder = async () => {
    if (!window.desktopAPI?.scanModsFolder) return;
    const res = await window.desktopAPI.scanModsFolder();
    if (res.canceled) return;
    const { matchedIds } = matchJarFilenamesToMods(res.jarFiles);
    if (matchedIds.length > 0) {
      setCheckedModIds(matchedIds);
    }
  };

  const parseImportEntries = (rawText: string): { matchedIds: string[]; unmatched: string[] } => {
    const tokens = rawText
      .split(/[\n,;]+/)
      .map(s => s.trim().replace(/^["']|["']$/g, '').replace(/^\d+\.\s*/, '').replace(/^↳\s*/, ''))
      .filter(Boolean);

    const matchedSet = new Set<string>();
    const unmatched: string[] = [];

    const jarTokens = tokens.filter(t => /\.jar$/i.test(t) || /[-_+]\d+\.\d+/.test(t));
    const plainTokens = tokens.filter(t => !jarTokens.includes(t));

    if (jarTokens.length > 0) {
      const jarRes = matchJarFilenamesToMods(jarTokens);
      for (const id of jarRes.matchedIds) matchedSet.add(id);
      for (const u of jarRes.unmatchedJars) {
        const byName = findModByDisplayName(u.replace(/\.jar$/i, ''));
        if (byName) matchedSet.add(byName.id);
        else unmatched.push(u);
      }
    }

    for (const token of plainTokens) {
      const cleanName = token.split('[обн.')[0].split('(')[0].trim();
      const byName = findModByDisplayName(token) || findModByDisplayName(cleanName);
      if (byName) {
        matchedSet.add(byName.id);
      } else {
        const fallbackJar = matchJarFilenamesToMods([`${token}.jar`]);
        if (fallbackJar.matchedIds.length > 0) {
          fallbackJar.matchedIds.forEach(id => matchedSet.add(id));
        } else {
          unmatched.push(token);
        }
      }
    }

    return { matchedIds: Array.from(matchedSet), unmatched };
  };

  const applyImportedList = (rawText: string, mode: 'replace' | 'merge') => {
    const { matchedIds, unmatched } = parseImportEntries(rawText);
    if (matchedIds.length > 0) {
      setCheckedModIds(prev =>
        mode === 'replace' ? matchedIds : Array.from(new Set([...prev, ...matchedIds]))
      );
      setTierFilter('all');
    }
    setImportNotice({ matchedCount: matchedIds.length, unmatched, mode });
  };

  const handleJarFileInput = (files: FileList | null, mode: 'replace' | 'merge' = 'replace') => {
    if (!files || files.length === 0) return;
    const names = Array.from(files)
      .map(f => f.name)
      .filter(n => n.toLowerCase().endsWith('.jar'));
    if (names.length === 0) return;
    setImportText(names.join('\n'));
    applyImportedList(names.join('\n'), mode);
  };

  const redWarnings = analysis.warnings.filter(w => w.severity === 'red');
  const yellowWarnings = analysis.warnings.filter(w => w.severity === 'yellow');
  const hasAnyIssues = analysis.conflicts.length > 0 || analysis.warnings.length > 0;

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#8f8f8f] mr-1">Основные сборки:</span>
            {MOD_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCheckedModIds([...preset.modIds])}
                className="px-2.5 py-1 rounded-[4px] text-xs font-medium border bg-[#141414] border-[#2a2a2a] text-[#e6e6e6] hover:border-[#4caf6a] hover:bg-[#222222] transition-colors whitespace-nowrap"
              >
                {preset.name.split('(')[0].trim()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {window.desktopAPI?.isDesktop && (
              <button
                type="button"
                onClick={handleScanDesktopFolder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] transition-colors whitespace-nowrap"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#4caf6a]" />
                Папка mods
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowImportPanel(v => !v)}
              aria-expanded={showImportPanel}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold border transition-colors whitespace-nowrap ${
                showImportPanel
                  ? 'bg-[#242424] border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] hover:bg-[#222222] border-[#2a2a2a] text-[#e6e6e6]'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-[#4caf6a]" />
              Импорт .jar / списка
            </button>
            {hasAnyIssues && (
              <button
                type="button"
                onClick={() => setCheckedModIds(smartFixAssembly(checkedModIds))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] transition-colors whitespace-nowrap"
              >
                Исправить автоматически
              </button>
            )}
            <ExportMenu
              modIds={checkedModIds}
              summary={impactSummary}
              fpsEstimate={fpsEstimate}
              filenamePrefix="forge-1.20.1-checker"
            />
            <button
              type="button"
              onClick={handleCopyNamesList}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {copiedList ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedList ? 'Список скопирован' : 'Копировать списком'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] hover:border-[#cf6d6d]/50 text-[#e6e6e6] hover:text-[#cf6d6d] disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить
            </button>
          </div>
        </div>

        {/* Web JAR & Mod-List Importer */}
        {showImportPanel && (
          <div className="pt-3 border-t border-[#2a2a2a] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[#8f8f8f]">
                Вставьте имена <span className="font-mono text-[#e6e6e6]">.jar</span> файлов или названия модов (по одному на строку), либо выберите файлы с диска:
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] cursor-pointer transition-colors whitespace-nowrap">
                <FileUp className="w-3.5 h-3.5" />
                Выбрать .jar файлы
                <input
                  type="file"
                  multiple
                  accept=".jar"
                  onChange={e => handleJarFileInput(e.target.files, 'replace')}
                  className="sr-only"
                />
              </label>
            </div>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={3}
              placeholder={'embeddium-0.3.31+mc1.20.1.jar\nxenon-0.3.31+mc1.20.1.jar\nOptiFine_1.20.1_HD_U_I6.jar\nmodernfix-forge-5.19.5+mc1.20.1.jar'}
              aria-label="Список .jar файлов или названий модов"
              className="w-full p-2.5 bg-[#141414] border border-[#2a2a2a] rounded-[6px] text-xs font-mono text-[#e6e6e6] placeholder-[#8f8f8f] focus:border-[#4caf6a]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!importText.trim()}
                  onClick={() => applyImportedList(importText, 'replace')}
                  className="px-3 py-1.5 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] disabled:opacity-40 text-[#121212] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  Проверить список (заменить)
                </button>
                <button
                  type="button"
                  disabled={!importText.trim()}
                  onClick={() => applyImportedList(importText, 'merge')}
                  className="px-3 py-1.5 rounded-[6px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] disabled:opacity-40 text-[#e6e6e6] text-xs font-medium transition-colors whitespace-nowrap"
                >
                  Добавить к текущему
                </button>
              </div>
              {importNotice && (
                <div className="text-[11px] tabular-nums">
                  <span className="text-[#6abf7b] font-semibold">
                    Распознано модов: <span className="font-mono">{importNotice.matchedCount}</span>
                  </span>
                  {importNotice.unmatched.length > 0 && (
                    <span className="text-[#8f8f8f] ml-2">
                      · не в базе ({importNotice.unmatched.length}): {importNotice.unmatched.slice(0, 3).join(', ')}
                      {importNotice.unmatched.length > 3 ? '…' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4-tier filter counters + Add mod search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[#2a2a2a]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold tabular-nums transition-colors whitespace-nowrap ${
                tierFilter === 'all'
                  ? 'bg-[#4caf6a] text-[#121212]'
                  : 'bg-[#141414] border border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
              }`}
            >
              Все ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('green')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'green'
                  ? 'bg-[#242424] text-[#6abf7b] border-[#4caf6a]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#6abf7b] hover:border-[#3a3a3a]'
              }`}
            >
              Стабильно ({counts.green})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('lime')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'lime'
                  ? 'bg-[#242424] text-[#9ab86a] border-[#4caf6a]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#9ab86a] hover:border-[#3a3a3a]'
              }`}
            >
              Сносно ({counts.lime})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('yellow')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'yellow'
                  ? 'bg-[#242424] text-[#c99b52] border-[#c99b52]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#c99b52] hover:border-[#3a3a3a]'
              }`}
            >
              Условно ({counts.yellow})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('red')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium tabular-nums border transition-colors whitespace-nowrap ${
                tierFilter === 'red'
                  ? 'bg-[#242424] text-[#cf6d6d] border-[#cf6d6d]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#cf6d6d] hover:border-[#3a3a3a]'
              }`}
            >
              Конфликт / плацебо ({counts.red})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#141414] border border-[#2a2a2a] rounded-[6px] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-2.5 py-1 rounded-[4px] transition-colors whitespace-nowrap ${
                  viewMode === 'tree' ? 'bg-[#242424] text-[#4caf6a] font-semibold' : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                }`}
              >
                Дерево
              </button>
              <button
                type="button"
                onClick={() => setViewMode('status')}
                className={`px-2.5 py-1 rounded-[4px] transition-colors whitespace-nowrap ${
                  viewMode === 'status' ? 'bg-[#242424] text-[#4caf6a] font-semibold' : 'text-[#8f8f8f] hover:text-[#e6e6e6]'
                }`}
              >
                По статусу
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHideIncompatibleSuggestions(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-xs font-medium border transition-colors whitespace-nowrap ${
                hideIncompatibleSuggestions
                  ? 'bg-[#242424] border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
              }`}
              title="Скрывать несовместимые с текущим списком, нерабочие на Forge и перекрытые моды"
            >
              {hideIncompatibleSuggestions ? <EyeOff className="w-3.5 h-3.5 text-[#4caf6a]" /> : <Eye className="w-3.5 h-3.5" />}
              {hideIncompatibleSuggestions ? 'Только совм.' : 'Все в поиске'}
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#8f8f8f] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                data-search-input="true"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Добавить мод по названию... (/)"
                aria-label="Добавить мод по названию"
                className="w-full pl-8 pr-3 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded-[6px] text-xs text-[#e6e6e6] placeholder-[#8f8f8f] focus:border-[#4caf6a]"
              />
              {addSuggestions.length > 0 && (
                <div className="absolute right-0 left-0 top-full mt-1 z-30 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] divide-y divide-[#2a2a2a] max-h-64 overflow-y-auto">
                  {addSuggestions.map(s => {
                    const restriction = getModRestrictionBadge(s, checkedSet);
                    const addImpact = evaluateModImpactInPack(s, checkedSet, analysis);
                    const addPct = addImpact.relativeImpactPct > 0 ? `+${addImpact.relativeImpactPct}%` : `${addImpact.relativeImpactPct}%`;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCheckedModIds(prev => (prev.includes(s.id) ? prev : [...prev, s.id]));
                          setAddSearch('');
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#222222] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-[#e6e6e6] truncate">{s.name}</span>
                            <span
                              className={`text-[10px] font-mono font-semibold tabular-nums shrink-0 ${
                                addImpact.relativeImpactPct > 0
                                  ? 'text-[#6abf7b]'
                                  : addImpact.relativeImpactPct < 0
                                    ? 'text-[#cf6d6d]'
                                    : 'text-[#8f8f8f]'
                              }`}
                            >
                              {addPct} · {addImpact.impactPoints}б.
                            </span>
                          </div>
                          <div className="text-[10px] text-[#8f8f8f] truncate">
                            {restriction ? (
                              <span
                                className={
                                  restriction.tone === 'red'
                                    ? 'text-[#cf6d6d]'
                                    : restriction.tone === 'amber'
                                      ? 'text-[#c99b52]'
                                      : 'text-[#8f8f8f]'
                                }
                              >
                                {restriction.text}
                              </span>
                            ) : (
                              `${addImpact.resourceProfile.shortTag} · ${s.platform}`
                            )}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-[#4caf6a] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Conflict / Dependency Banner */}
      {hasAnyIssues && (
        <div
          className={`bg-[#1a1a1a] border rounded-[6px] p-4 space-y-2.5 ${
            analysis.conflicts.length > 0 || redWarnings.length > 0 ? 'border-[#cf6d6d]/45' : 'border-[#c99b52]/45'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                analysis.conflicts.length > 0 || redWarnings.length > 0 ? 'text-[#cf6d6d]' : 'text-[#c99b52]'
              }`}
            >
              {analysis.conflicts.length > 0 || redWarnings.length > 0 ? (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              {analysis.conflicts.length > 0 || redWarnings.length > 0
                ? `Обнаружены конфликты и ошибки (${analysis.conflicts.length + redWarnings.length})`
                : `Замечания и условные моды (${yellowWarnings.length})`}
            </div>
          </div>
          <div className="space-y-2">
            {analysis.conflicts.map((c, idx) => {
              const sortedMatched = [...c.matchedIds].sort((a, b) => {
                const ma = MOD_BY_ID.get(a);
                const mb = MOD_BY_ID.get(b);
                const la = ma?.isGroupLeader ? 1 : 0;
                const lb = mb?.isGroupLeader ? 1 : 0;
                if (lb !== la) return lb - la;
                return (mb ? getModEffectivenessScore(mb) : 0) - (ma ? getModEffectivenessScore(ma) : 0);
              });
              const winnerId = sortedMatched[0];
              const winnerMod = winnerId ? MOD_BY_ID.get(winnerId) : undefined;
              const canKeepWinner = Boolean(winnerMod && winnerMod.status !== 'danger');
              const loserIds = canKeepWinner ? sortedMatched.slice(1) : sortedMatched;

              return (
                <div key={idx} className="bg-[#cf6d6d]/[0.05] border border-[#cf6d6d]/30 rounded-[4px] p-3 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-semibold text-[#cf6d6d]">
                      {c.rule.title}: <span className="text-[#e6e6e6]">{c.matchedNames.join(' + ')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCheckedModIds(prev => prev.filter(id => !loserIds.includes(id)))}
                      className="shrink-0 px-2.5 py-1 rounded-[4px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-[11px] font-semibold transition-colors whitespace-nowrap"
                    >
                      {canKeepWinner ? `Оставить ${winnerMod!.name}` : 'Убрать конфликтные'}
                    </button>
                  </div>
                  <p className="text-[#8f8f8f]">{c.rule.explanation}</p>
                  <p className="text-[#6abf7b] font-medium">Решение: {c.rule.recommendation}</p>
                </div>
              );
            })}
            {redWarnings.map((w, idx) => (
              <div key={`rw-${idx}`} className="bg-[#cf6d6d]/[0.05] border border-[#cf6d6d]/30 rounded-[4px] p-3 text-xs flex items-center justify-between gap-3">
                <span className="text-[#cf6d6d]">{w.message}</span>
                {w.fixModIds && (
                  <button
                    type="button"
                    onClick={() =>
                      setCheckedModIds(prev => Array.from(new Set([...prev, ...w.fixModIds!])))
                    }
                    className="shrink-0 px-2.5 py-1 rounded-[4px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] font-semibold"
                  >
                    Добавить нужное
                  </button>
                )}
              </div>
            ))}
            {yellowWarnings.map((w, idx) => (
              <div key={`yw-${idx}`} className="bg-[#c99b52]/[0.05] border border-[#c99b52]/30 rounded-[4px] p-3 text-xs flex items-center justify-between gap-3">
                <span className="text-[#c99b52]">{w.message}</span>
                {w.fixModIds && (
                  <button
                    type="button"
                    onClick={() =>
                      setCheckedModIds(prev => Array.from(new Set([...prev, ...w.fixModIds!])))
                    }
                    className="shrink-0 px-2.5 py-1 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#e6e6e6] font-medium"
                  >
                    Добавить базу
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Summary Bar */}
      {rows.length > 0 && (() => {
        const risk = impactSummary.artifactRisk;
        const sb = impactSummary.scoreBreakdown;
        const rb = impactSummary.resourceBalance;
        const dubiousCount = impactSummary.dubiousMods.length;
        const riskTextCls =
          risk.level === 'critical'
            ? 'text-[#cf6d6d]'
            : risk.level === 'high' || risk.level === 'moderate'
              ? 'text-[#c99b52]'
              : 'text-[#6abf7b]';

        return (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] px-4 py-3 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <button
                  type="button"
                  onClick={() => setShowScoreBreakdown(v => !v)}
                  aria-expanded={showScoreBreakdown}
                  className="inline-flex items-center gap-1 text-[#8f8f8f] hover:text-[#e6e6e6] transition-colors"
                >
                  <span>Оценка:</span>
                  <strong className="text-[#4caf6a] font-mono font-semibold tabular-nums">
                    {impactSummary.assemblyScore}/100
                  </strong>
                  {showScoreBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowArtifactFactors(v => !v)}
                  aria-expanded={showArtifactFactors}
                  className="inline-flex items-center gap-1 text-[#8f8f8f] hover:text-[#e6e6e6] transition-colors"
                >
                  <span>Шанс артефактов:</span>
                  <strong className={`font-mono font-semibold tabular-nums ${riskTextCls}`}>
                    {risk.chancePct}% · {risk.label}
                  </strong>
                  {showArtifactFactors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <span
                  className="text-[#8f8f8f] tabular-nums"
                  title={fpsEstimate.note}
                >
                  Прогноз: <strong className={`font-mono ${fpsEstimate.hasConflicts ? 'text-[#cf6d6d]' : 'text-[#6abf7b]'}`}>{fpsEstimate.label}</strong>
                  <span className="text-[#2a2a2a] mx-1">·</span>
                  <strong className="text-[#e6e6e6] font-mono">{rb.ramDeltaLabel}</strong>
                </span>

                <span className="text-[#8f8f8f]">
                  Подсистемы: <strong className="text-[#e6e6e6] font-mono font-semibold tabular-nums">{impactSummary.coveredSubsystems.length}/7</strong>
                  {impactSummary.missingSubsystems.length > 0 && (
                    <span className="text-[#c99b52] ml-1.5">· нет: {impactSummary.missingSubsystems.slice(0, 2).join(', ')}</span>
                  )}
                </span>

                <span className="text-[#8f8f8f]">
                  Синергии: <strong className="text-[#6abf7b] font-mono font-semibold tabular-nums">{impactSummary.synergies.length}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDubiousModal(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  dubiousCount > 0
                    ? 'bg-[#c99b52]/[0.08] border-[#c99b52]/40 text-[#c99b52]'
                    : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                Сомнительные моды ({dubiousCount})
              </button>
            </div>

            {showScoreBreakdown && (
              <div className="pt-2 border-t border-[#2a2a2a] space-y-1.5 text-[11px] text-[#8f8f8f] tabular-nums">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Эффективность (покрытие 7 подсистем + синергии): <strong className="text-[#e6e6e6] font-mono">{sb.efficiencyScore}</strong></span>
                  <span>Стабильность (совместимость Forge 1.20.1): <strong className="text-[#6abf7b] font-mono">{sb.stabilityScore}</strong></span>
                  <span>Покрытие: <strong className="text-[#e6e6e6] font-mono">{sb.coverageScore}</strong></span>
                  <span>Синергии: <strong className="text-[#6abf7b] font-mono">+{sb.synergyBonus}</strong></span>
                  {(sb.bloatPenalty > 0 || sb.artifactPenalty > 0 || sb.penaltyPoints > 0) && (
                    <span className="text-[#cf6d6d] font-mono">
                      Штрафы за конфликты/балласт: -{sb.penaltyPoints + sb.bloatPenalty + sb.artifactPenalty}
                    </span>
                  )}
                </div>
              </div>
            )}

            {showArtifactFactors && (
              <div className="pt-2 border-t border-[#2a2a2a] space-y-1 text-[11px]">
                <div className="text-[#8f8f8f]">{risk.summary}</div>
                {risk.factors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
                    {risk.factors.map((f, idx) => (
                      <span key={idx} className={`font-mono ${f.tone === 'risk' ? 'text-[#cf6d6d]' : 'text-[#6abf7b]'}`}>
                        {f.deltaPct > 0 ? `+${f.deltaPct}%` : `${f.deltaPct}%`} · {f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-[#2a2a2a] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span className="text-[#8f8f8f] font-medium">Подсистемы:</span>
              {impactSummary.subsystemScores.map(sub => (
                <span key={sub.id} className="tabular-nums">
                  <span className={sub.covered ? 'text-[#e6e6e6]' : 'text-[#8f8f8f]'}>{sub.title}:</span>{' '}
                  <strong
                    className={`font-mono ${
                      sub.scorePct >= 75
                        ? 'text-[#6abf7b]'
                        : sub.scorePct >= 40
                          ? 'text-[#e6e6e6]'
                          : 'text-[#c99b52]'
                    }`}
                  >
                    {sub.scorePct}%
                  </strong>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Compact Vertical List */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-[#8f8f8f]">
              {rows.length === 0
                ? 'Список пуст. Загрузите сборку, импортируйте .jar файлы или добавьте моды через поиск.'
                : 'В этом фильтре статуса модов нет.'}
            </p>
            {rows.length > 0 && tierFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Показать все ({counts.total})
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2a]">
            {displayRows.map(({ row: { mod, tier, label, reason, viaBridge, impact }, isChild, relationLabel, rootIndex, childCount }) => {
              const rp = impact.resourceProfile;
              const impactColorMap: Record<ModImpactLevel, string> = {
                core: 'text-[#4caf6a]',
                high: 'text-[#6abf7b]',
                medium: 'text-[#e6e6e6]',
                conditional: 'text-[#c99b52]',
                support: 'text-[#8f8f8f]',
                diagnostic: 'text-[#8f8f8f]',
                zero: 'text-[#c99b52]',
                negative: 'text-[#cf6d6d]',
              };
              const relPctText = impact.relativeImpactPct > 0 ? `+${impact.relativeImpactPct}%` : `${impact.relativeImpactPct}%`;
              const primaryInteraction = impact.interactions.find(i => i.kind === 'overlap' || i.kind === 'conflict' || i.kind === 'synergy');
              const showContextSubline =
                tier !== 'green' ||
                impact.level === 'zero' ||
                impact.level === 'support' ||
                impact.level === 'conditional' ||
                Boolean(impact.betterAnalogName) ||
                Boolean(primaryInteraction) ||
                rp.hasTradeoff;
              const sublineText =
                tier === 'red'
                  ? reason
                  : impact.betterAnalogName && impact.betterAnalogDeltaPoints
                    ? `${impact.summary} · Лучше: ${impact.betterAnalogName} (+${impact.betterAnalogDeltaPoints} б.)`
                    : tier === 'yellow' || impact.level === 'zero' || primaryInteraction?.kind === 'overlap'
                      ? impact.summary
                      : primaryInteraction?.summary || rp.tradeoffNote;

              const rowBg =
                tier === 'red'
                  ? 'bg-[#cf6d6d]/[0.04] hover:bg-[#cf6d6d]/[0.07]'
                  : tier === 'yellow'
                    ? 'bg-[#c99b52]/[0.03] hover:bg-[#c99b52]/[0.06]'
                    : isChild
                      ? 'bg-[#141414] hover:bg-[#222222]'
                      : 'hover:bg-[#222222]';

              const statusTextCls =
                tier === 'green'
                  ? 'text-[#6abf7b]'
                  : tier === 'lime'
                    ? 'text-[#9ab86a]'
                    : tier === 'yellow'
                      ? 'text-[#c99b52]'
                      : 'text-[#cf6d6d]';

              const depIssue = getMissingDependenciesForMod(mod.id, checkedSet, analysis.warnings);

              return (
                <div
                  key={mod.id}
                  data-mod-row="true"
                  data-mod-id={mod.id}
                  data-mod-context="checker"
                  tabIndex={0}
                  className={`py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 transition-colors focus:bg-[#242424] ${rowBg} ${
                    isChild ? 'pl-6 sm:pl-10 pr-4' : 'px-4'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {!isChild && rootIndex !== undefined && (
                      <span className="text-[11px] font-mono text-[#8f8f8f] w-5 text-right shrink-0 tabular-nums mt-0.5 sm:mt-0">
                        {rootIndex}.
                      </span>
                    )}
                    {isChild && (
                      <span className="text-xs font-mono text-[#4caf6a] w-4 sm:w-5 text-right shrink-0 mt-0.5 sm:mt-0">
                        ↳
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                        <StatusBadge tier={tier} label={label} className="text-[11px] shrink-0" />
                        <span className="text-[#2a2a2a]" aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => onOpenDetail(mod)}
                          className="text-sm font-semibold text-[#e6e6e6] hover:text-[#4caf6a] text-left break-words"
                        >
                          {mod.name}
                        </button>
                        <span className="text-[#2a2a2a]" aria-hidden="true">·</span>
                        <span
                          className={`text-[11px] font-mono font-semibold tabular-nums ${impactColorMap[impact.level]}`}
                          title={`Вклад в сборку: ${impact.impactPoints} б.`}
                        >
                          {impact.label} · {relPctText}
                        </span>
                        {rp.hasTradeoff && (
                          <span
                            className="text-[11px] text-[#c99b52] font-medium"
                            title={rp.tradeoffNote}
                          >
                            · {rp.shortTag}
                          </span>
                        )}
                        {isChild && relationLabel && (
                          <span className="text-[11px] text-[#4caf6a] font-medium">
                            · {relationLabel}
                          </span>
                        )}
                        {!isChild && childCount !== undefined && childCount > 0 && (
                          <span className="text-[11px] font-mono text-[#8f8f8f] tabular-nums">
                            · +{childCount}
                          </span>
                        )}
                        <span className="text-[11px] text-[#8f8f8f]">· {mod.platform}</span>
                        {viaBridge && (
                          <span className="text-[11px] text-[#4caf6a] font-medium">· {viaBridge}</span>
                        )}
                      </div>
                      {showContextSubline && (
                        <p
                          className={`text-xs mt-0.5 break-words sm:truncate ${
                            tier === 'red'
                              ? 'text-[#cf6d6d]'
                              : tier === 'yellow' || impact.level === 'zero' || primaryInteraction?.kind === 'overlap'
                                ? 'text-[#c99b52]'
                                : primaryInteraction?.kind === 'synergy'
                                  ? 'text-[#6abf7b]'
                                  : 'text-[#8f8f8f]'
                          }`}
                        >
                          {sublineText}
                        </p>
                      )}
                      {depIssue.hasMissingForSelected && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const res = addMissingDependenciesForMod(checkedModIds, mod.id);
                              setCheckedModIds(res.nextIds);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-[11px] font-semibold"
                          >
                            <Plus className="w-3 h-3" aria-hidden="true" />
                            Добавить зависимость ({depIssue.missingNames[0]})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                    <a
                      href={mod.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-mono font-medium bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6] transition-colors"
                      title="Открыть на CurseForge"
                    >
                      CF
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setCheckedModIds(prev => prev.filter(id => id !== mod.id))}
                      className="p-1.5 rounded-[4px] text-[#8f8f8f] hover:text-[#cf6d6d] hover:bg-[#222222] transition-colors"
                      title="Убрать из списка"
                      aria-label={`Убрать ${mod.name}`}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Очистить список модов в Чекере?"
        description={`Будут удалены все моды из текущей проверки (${checkedModIds.length}). Вы сможете вернуть список через Ctrl+Z.`}
        confirmLabel="Очистить список"
        onConfirm={() => {
          setCheckedModIds([]);
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />

      <DubiousModsModal
        isOpen={showDubiousModal}
        onClose={() => setShowDubiousModal(false)}
        dubiousMods={impactSummary.dubiousMods}
        artifactRisk={impactSummary.artifactRisk}
        totalModsCount={checkedModIds.length}
        onRemoveMod={modId => setCheckedModIds(prev => removeModsCascade(prev, [modId]).nextIds)}
        onReplaceMod={(oldModId, newModId) =>
          setCheckedModIds(
            prev =>
              toggleModSmart(removeModsCascade(prev, [oldModId]).nextIds, newModId, {
                strict: true,
              }).nextIds
          )
        }
        onRemoveAllRisky={ids => setCheckedModIds(prev => removeModsCascade(prev, ids).nextIds)}
        onAutoFix={hasAnyIssues ? () => setCheckedModIds(smartFixAssembly(checkedModIds)) : undefined}
        onInspectMod={onOpenDetail}
      />
    </div>
  );
}

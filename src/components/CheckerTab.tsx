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
      <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-[#8b9199] mr-1">Основные сборки:</span>
            {MOD_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCheckedModIds([...preset.modIds])}
                className="px-2.5 py-1 rounded-[4px] text-xs font-medium border bg-[#121417] border-[#2a2e33] text-[#e6e8ea] hover:border-[#3ddc84] hover:bg-[#22262b] transition-colors duration-150 whitespace-nowrap"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#e6e8ea] transition-colors duration-150 whitespace-nowrap"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#3ddc84]" />
                Папка mods
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowImportPanel(v => !v)}
              aria-expanded={showImportPanel}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold border transition-colors duration-150 whitespace-nowrap ${
                showImportPanel
                  ? 'bg-[#22262b] border-[#3ddc84] text-[#e6e8ea]'
                  : 'bg-[#121417] hover:bg-[#22262b] border-[#2a2e33] text-[#e6e8ea]'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-[#3ddc84]" />
              Импорт .jar / списка
            </button>
            {hasAnyIssues && (
              <button
                type="button"
                onClick={() => setCheckedModIds(smartFixAssembly(checkedModIds))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#3ddc84] hover:bg-[#34c776] text-[#121417] transition-colors duration-150 whitespace-nowrap"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#3ddc84] hover:bg-[#34c776] text-[#121417] disabled:opacity-40 transition-colors duration-150 whitespace-nowrap"
            >
              {copiedList ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedList ? 'Список скопирован' : 'Копировать списком'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] hover:border-[#e55353]/50 text-[#e6e8ea] hover:text-[#e55353] disabled:opacity-40 transition-colors duration-150 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить
            </button>
          </div>
        </div>

        {/* Web JAR & Mod-List Importer */}
        {showImportPanel && (
          <div className="pt-3 border-t border-[#2a2e33] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[#8b9199]">
                Вставьте имена <span className="font-mono text-[#e6e8ea]">.jar</span> файлов или названия модов (по одному на строку), либо выберите файлы с диска:
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#e6e8ea] cursor-pointer transition-colors duration-150 whitespace-nowrap">
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
              className="w-full p-2.5 bg-[#121417] border border-[#2a2e33] rounded-[6px] text-xs font-mono text-[#e6e8ea] placeholder-[#8b9199] focus:border-[#3ddc84]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!importText.trim()}
                  onClick={() => applyImportedList(importText, 'replace')}
                  className="px-3 py-1.5 rounded-[6px] bg-[#3ddc84] hover:bg-[#34c776] disabled:opacity-40 text-[#121417] text-xs font-semibold transition-colors duration-150 whitespace-nowrap"
                >
                  Проверить список (заменить)
                </button>
                <button
                  type="button"
                  disabled={!importText.trim()}
                  onClick={() => applyImportedList(importText, 'merge')}
                  className="px-3 py-1.5 rounded-[6px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] disabled:opacity-40 text-[#e6e8ea] text-xs font-medium transition-colors duration-150 whitespace-nowrap"
                >
                  Добавить к текущему
                </button>
              </div>
              {importNotice && (
                <div className="text-[11px] tabular-nums">
                  <span className="text-[#3ddc84] font-semibold">
                    Распознано модов: <span className="font-mono">{importNotice.matchedCount}</span>
                  </span>
                  {importNotice.unmatched.length > 0 && (
                    <span className="text-[#8b9199] ml-2">
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[#2a2e33]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold tabular-nums transition-colors duration-150 whitespace-nowrap ${
                tierFilter === 'all'
                  ? 'bg-[#3ddc84] text-[#121417]'
                  : 'bg-[#121417] border border-[#2a2e33] text-[#8b9199] hover:text-[#e6e8ea]'
              }`}
            >
              Все ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('green')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium tabular-nums border transition-colors duration-150 whitespace-nowrap ${
                tierFilter === 'green'
                  ? 'bg-[#22262b] text-[#3ddc84] border-[#3ddc84]'
                  : 'bg-[#121417] border-[#2a2e33] text-[#3ddc84] hover:border-[#2a2e33]'
              }`}
            >
              Стабильно ({counts.green})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('lime')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium tabular-nums border transition-colors duration-150 whitespace-nowrap ${
                tierFilter === 'lime'
                  ? 'bg-[#22262b] text-[#3ddc84] border-[#3ddc84]'
                  : 'bg-[#121417] border-[#2a2e33] text-[#3ddc84] hover:border-[#2a2e33]'
              }`}
            >
              Сносно ({counts.lime})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('yellow')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium tabular-nums border transition-colors duration-150 whitespace-nowrap ${
                tierFilter === 'yellow'
                  ? 'bg-[#22262b] text-[#e5a93c] border-[#e5a93c]'
                  : 'bg-[#121417] border-[#2a2e33] text-[#e5a93c] hover:border-[#2a2e33]'
              }`}
            >
              Условно ({counts.yellow})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('red')}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium tabular-nums border transition-colors duration-150 whitespace-nowrap ${
                tierFilter === 'red'
                  ? 'bg-[#22262b] text-[#e55353] border-[#e55353]'
                  : 'bg-[#121417] border-[#2a2e33] text-[#e55353] hover:border-[#2a2e33]'
              }`}
            >
              Конфликт / плацебо ({counts.red})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#121417] border border-[#2a2e33] rounded-[6px] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-2.5 py-1 rounded-[4px] transition-colors duration-150 whitespace-nowrap ${
                  viewMode === 'tree' ? 'bg-[#22262b] text-[#3ddc84] font-semibold' : 'text-[#8b9199] hover:text-[#e6e8ea]'
                }`}
              >
                Дерево
              </button>
              <button
                type="button"
                onClick={() => setViewMode('status')}
                className={`px-2.5 py-1 rounded-[4px] transition-colors duration-150 whitespace-nowrap ${
                  viewMode === 'status' ? 'bg-[#22262b] text-[#3ddc84] font-semibold' : 'text-[#8b9199] hover:text-[#e6e8ea]'
                }`}
              >
                По статусу
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHideIncompatibleSuggestions(v => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-xs font-medium border transition-colors duration-150 whitespace-nowrap ${
                hideIncompatibleSuggestions
                  ? 'bg-[#22262b] border-[#3ddc84] text-[#e6e8ea]'
                  : 'bg-[#121417] border-[#2a2e33] text-[#8b9199] hover:text-[#e6e8ea]'
              }`}
              title="Скрывать несовместимые с текущим списком, нерабочие на Forge и перекрытые моды"
            >
              {hideIncompatibleSuggestions ? <EyeOff className="w-3.5 h-3.5 text-[#3ddc84]" /> : <Eye className="w-3.5 h-3.5" />}
              {hideIncompatibleSuggestions ? 'Только совм.' : 'Все в поиске'}
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#8b9199] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                data-search-input="true"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Добавить мод по названию... (/)"
                aria-label="Добавить мод по названию"
                className="w-full pl-8 pr-3 py-1.5 bg-[#121417] border border-[#2a2e33] rounded-[6px] text-xs text-[#e6e8ea] placeholder-[#8b9199] focus:border-[#3ddc84]"
              />
              {addSuggestions.length > 0 && (
                <div className="absolute right-0 left-0 top-full mt-1 z-30 bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] divide-y divide-[#2a2e33] max-h-64 overflow-y-auto">
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
                        className="w-full px-3 py-2 text-left hover:bg-[#22262b] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-[#e6e8ea] truncate">{s.name}</span>
                            <span
                              className={`text-[10px] font-mono font-semibold tabular-nums shrink-0 ${
                                addImpact.relativeImpactPct > 0
                                  ? 'text-[#3ddc84]'
                                  : addImpact.relativeImpactPct < 0
                                    ? 'text-[#e55353]'
                                    : 'text-[#8b9199]'
                              }`}
                            >
                              {addPct} · {addImpact.impactPoints}б.
                            </span>
                          </div>
                          <div className="text-[10px] text-[#8b9199] truncate">
                            {restriction ? (
                              <span
                                className={
                                  restriction.tone === 'red'
                                    ? 'text-[#e55353]'
                                    : restriction.tone === 'amber'
                                      ? 'text-[#e5a93c]'
                                      : 'text-[#8b9199]'
                                }
                              >
                                {restriction.text}
                              </span>
                            ) : (
                              `${addImpact.resourceProfile.shortTag} · ${s.platform}`
                            )}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-[#3ddc84] shrink-0" />
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
          className={`bg-[#1a1d21] border rounded-[6px] p-4 space-y-2.5 ${
            analysis.conflicts.length > 0 || redWarnings.length > 0 ? 'border-[#e55353]/45' : 'border-[#e5a93c]/45'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                analysis.conflicts.length > 0 || redWarnings.length > 0 ? 'text-[#e55353]' : 'text-[#e5a93c]'
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
                <div key={idx} className="bg-[#e55353]/[0.05] border border-[#e55353]/30 rounded-[4px] p-3 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-semibold text-[#e55353]">
                      {c.rule.title}: <span className="text-[#e6e8ea]">{c.matchedNames.join(' + ')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCheckedModIds(prev => prev.filter(id => !loserIds.includes(id)))}
                      className="shrink-0 px-2.5 py-1 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#121417] text-[11px] font-semibold transition-colors duration-150 whitespace-nowrap"
                    >
                      {canKeepWinner ? `Оставить ${winnerMod!.name}` : 'Убрать конфликтные'}
                    </button>
                  </div>
                  <p className="text-[#8b9199]">{c.rule.explanation}</p>
                  <p className="text-[#3ddc84] font-medium">Решение: {c.rule.recommendation}</p>
                </div>
              );
            })}
            {redWarnings.map((w, idx) => (
              <div key={`rw-${idx}`} className="bg-[#e55353]/[0.05] border border-[#e55353]/30 rounded-[4px] p-3 text-xs flex items-center justify-between gap-3">
                <span className="text-[#e55353]">{w.message}</span>
                {w.fixModIds && (
                  <button
                    type="button"
                    onClick={() =>
                      setCheckedModIds(prev => Array.from(new Set([...prev, ...w.fixModIds!])))
                    }
                    className="shrink-0 px-2.5 py-1 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#121417] font-semibold"
                  >
                    Добавить нужное
                  </button>
                )}
              </div>
            ))}
            {yellowWarnings.map((w, idx) => (
              <div key={`yw-${idx}`} className="bg-[#e5a93c]/[0.05] border border-[#e5a93c]/30 rounded-[4px] p-3 text-xs flex items-center justify-between gap-3">
                <span className="text-[#e5a93c]">{w.message}</span>
                {w.fixModIds && (
                  <button
                    type="button"
                    onClick={() =>
                      setCheckedModIds(prev => Array.from(new Set([...prev, ...w.fixModIds!])))
                    }
                    className="shrink-0 px-2.5 py-1 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#e6e8ea] font-medium"
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
            ? 'text-[#e55353]'
            : risk.level === 'high' || risk.level === 'moderate'
              ? 'text-[#e5a93c]'
              : 'text-[#3ddc84]';

        return (
          <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] px-4 py-3 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <button
                  type="button"
                  onClick={() => setShowScoreBreakdown(v => !v)}
                  aria-expanded={showScoreBreakdown}
                  className="inline-flex items-center gap-1 text-[#8b9199] hover:text-[#e6e8ea] transition-colors duration-150"
                >
                  <span>Оценка:</span>
                  <strong className="text-[#3ddc84] font-mono font-semibold tabular-nums">
                    {impactSummary.assemblyScore}/100
                  </strong>
                  {showScoreBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowArtifactFactors(v => !v)}
                  aria-expanded={showArtifactFactors}
                  className="inline-flex items-center gap-1 text-[#8b9199] hover:text-[#e6e8ea] transition-colors duration-150"
                >
                  <span>Шанс артефактов:</span>
                  <strong className={`font-mono font-semibold tabular-nums ${riskTextCls}`}>
                    {risk.chancePct}% · {risk.label}
                  </strong>
                  {showArtifactFactors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <span
                  className="text-[#8b9199] tabular-nums"
                  title={fpsEstimate.note}
                >
                  Прогноз: <strong className={`font-mono ${fpsEstimate.hasConflicts ? 'text-[#e55353]' : 'text-[#3ddc84]'}`}>{fpsEstimate.label}</strong>
                  <span className="text-[#2a2e33] mx-1">·</span>
                  <strong className="text-[#e6e8ea] font-mono">{rb.ramDeltaLabel}</strong>
                </span>

                <span className="text-[#8b9199]">
                  Подсистемы: <strong className="text-[#e6e8ea] font-mono font-semibold tabular-nums">{impactSummary.coveredSubsystems.length}/7</strong>
                  {impactSummary.missingSubsystems.length > 0 && (
                    <span className="text-[#e5a93c] ml-1.5">· нет: {impactSummary.missingSubsystems.slice(0, 2).join(', ')}</span>
                  )}
                </span>

                <span className="text-[#8b9199]">
                  Синергии: <strong className="text-[#3ddc84] font-mono font-semibold tabular-nums">{impactSummary.synergies.length}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDubiousModal(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-xs font-semibold transition-colors duration-150 whitespace-nowrap tabular-nums ${
                  dubiousCount > 0
                    ? 'bg-[#e5a93c]/[0.08] border-[#e5a93c]/40 text-[#e5a93c]'
                    : 'bg-[#121417] border-[#2a2e33] text-[#8b9199] hover:text-[#e6e8ea]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                Сомнительные моды ({dubiousCount})
              </button>
            </div>

            {showScoreBreakdown && (
              <div className="pt-2 border-t border-[#2a2e33] space-y-1.5 text-[11px] text-[#8b9199] tabular-nums">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Эффективность (покрытие 7 подсистем + синергии): <strong className="text-[#e6e8ea] font-mono">{sb.efficiencyScore}</strong></span>
                  <span>Стабильность (совместимость Forge 1.20.1): <strong className="text-[#3ddc84] font-mono">{sb.stabilityScore}</strong></span>
                  <span>Покрытие: <strong className="text-[#e6e8ea] font-mono">{sb.coverageScore}</strong></span>
                  <span>Синергии: <strong className="text-[#3ddc84] font-mono">+{sb.synergyBonus}</strong></span>
                  {(sb.bloatPenalty > 0 || sb.artifactPenalty > 0 || sb.penaltyPoints > 0) && (
                    <span className="text-[#e55353] font-mono">
                      Штрафы за конфликты/балласт: -{sb.penaltyPoints + sb.bloatPenalty + sb.artifactPenalty}
                    </span>
                  )}
                </div>
              </div>
            )}

            {showArtifactFactors && (
              <div className="pt-2 border-t border-[#2a2e33] space-y-1 text-[11px]">
                <div className="text-[#8b9199]">{risk.summary}</div>
                {risk.factors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
                    {risk.factors.map((f, idx) => (
                      <span key={idx} className={`font-mono ${f.tone === 'risk' ? 'text-[#e55353]' : 'text-[#3ddc84]'}`}>
                        {f.deltaPct > 0 ? `+${f.deltaPct}%` : `${f.deltaPct}%`} · {f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-[#2a2e33] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span className="text-[#8b9199] font-medium">Подсистемы:</span>
              {impactSummary.subsystemScores.map(sub => (
                <span key={sub.id} className="tabular-nums">
                  <span className={sub.covered ? 'text-[#e6e8ea]' : 'text-[#8b9199]'}>{sub.title}:</span>{' '}
                  <strong
                    className={`font-mono ${
                      sub.scorePct >= 75
                        ? 'text-[#3ddc84]'
                        : sub.scorePct >= 40
                          ? 'text-[#e6e8ea]'
                          : 'text-[#e5a93c]'
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
      <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-[#8b9199]">
              {rows.length === 0
                ? 'Список пуст. Загрузите сборку, импортируйте .jar файлы или добавьте моды через поиск.'
                : 'В этом фильтре статуса модов нет.'}
            </p>
            {rows.length > 0 && tierFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#3ddc84] hover:bg-[#34c776] text-[#121417] text-xs font-semibold transition-colors duration-150 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Показать все ({counts.total})
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#2a2e33]">
            {displayRows.map(({ row: { mod, tier, label, reason, viaBridge, impact }, isChild, relationLabel, rootIndex, childCount }) => {
              const rp = impact.resourceProfile;
              const impactColorMap: Record<ModImpactLevel, string> = {
                core: 'text-[#3ddc84]',
                high: 'text-[#3ddc84]',
                medium: 'text-[#e6e8ea]',
                conditional: 'text-[#e5a93c]',
                support: 'text-[#8b9199]',
                diagnostic: 'text-[#8b9199]',
                zero: 'text-[#e5a93c]',
                negative: 'text-[#e55353]',
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
                  ? 'bg-[#e55353]/[0.04] hover:bg-[#e55353]/[0.07]'
                  : tier === 'yellow'
                    ? 'bg-[#e5a93c]/[0.03] hover:bg-[#e5a93c]/[0.06]'
                    : isChild
                      ? 'bg-[#121417] hover:bg-[#22262b]'
                      : 'hover:bg-[#22262b]';

              const statusTextCls =
                tier === 'green'
                  ? 'text-[#3ddc84]'
                  : tier === 'lime'
                    ? 'text-[#3ddc84]'
                    : tier === 'yellow'
                      ? 'text-[#e5a93c]'
                      : 'text-[#e55353]';

              const depIssue = getMissingDependenciesForMod(mod.id, checkedSet, analysis.warnings);

              return (
                <div
                  key={mod.id}
                  data-mod-row="true"
                  data-mod-id={mod.id}
                  data-mod-context="checker"
                  tabIndex={0}
                  className={`py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 transition-colors duration-150 focus:bg-[#22262b] ${rowBg} ${
                    isChild ? 'pl-6 sm:pl-10 pr-4' : 'px-4'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {!isChild && rootIndex !== undefined && (
                      <span className="text-[11px] font-mono text-[#8b9199] w-5 text-right shrink-0 tabular-nums mt-0.5 sm:mt-0">
                        {rootIndex}.
                      </span>
                    )}
                    {isChild && (
                      <span className="text-xs font-mono text-[#3ddc84] w-4 sm:w-5 text-right shrink-0 mt-0.5 sm:mt-0">
                        ↳
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                        <StatusBadge tier={tier} label={label} className="text-[11px] shrink-0" />
                        <span className="text-[#2a2e33]" aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => onOpenDetail(mod)}
                          className="text-sm font-semibold text-[#e6e8ea] hover:text-[#3ddc84] text-left break-words"
                        >
                          {mod.name}
                        </button>
                        <span className="text-[#2a2e33]" aria-hidden="true">·</span>
                        <span
                          className={`text-[11px] font-mono font-semibold tabular-nums ${impactColorMap[impact.level]}`}
                          title={`Вклад в сборку: ${impact.impactPoints} б.`}
                        >
                          {impact.label} · {relPctText}
                        </span>
                        {rp.hasTradeoff && (
                          <span
                            className="text-[11px] text-[#e5a93c] font-medium"
                            title={rp.tradeoffNote}
                          >
                            · {rp.shortTag}
                          </span>
                        )}
                        {isChild && relationLabel && (
                          <span className="text-[11px] text-[#3ddc84] font-medium">
                            · {relationLabel}
                          </span>
                        )}
                        {!isChild && childCount !== undefined && childCount > 0 && (
                          <span className="text-[11px] font-mono text-[#8b9199] tabular-nums">
                            · +{childCount}
                          </span>
                        )}
                        <span className="text-[11px] text-[#8b9199]">· {mod.platform}</span>
                        {viaBridge && (
                          <span className="text-[11px] text-[#3ddc84] font-medium">· {viaBridge}</span>
                        )}
                      </div>
                      {showContextSubline && (
                        <p
                          className={`text-xs mt-0.5 break-words sm:truncate ${
                            tier === 'red'
                              ? 'text-[#e55353]'
                              : tier === 'yellow' || impact.level === 'zero' || primaryInteraction?.kind === 'overlap'
                                ? 'text-[#e5a93c]'
                                : primaryInteraction?.kind === 'synergy'
                                  ? 'text-[#3ddc84]'
                                  : 'text-[#8b9199]'
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] text-[#121417] text-[11px] font-semibold"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-mono font-medium bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#8b9199] hover:text-[#e6e8ea] transition-colors duration-150"
                      title="Открыть на CurseForge"
                    >
                      CF
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setCheckedModIds(prev => prev.filter(id => id !== mod.id))}
                      className="p-1.5 rounded-[4px] text-[#8b9199] hover:text-[#e55353] hover:bg-[#22262b] transition-colors duration-150"
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

import { useState, useMemo, useEffect, useRef, useCallback, type SetStateAction } from 'react';
import {
  DATABASE_UPDATED_AT,
  MODS_DATABASE,
  MOD_PRESETS,
  type ModItem,
  type ModPreset,
} from './data/modsData.ts';
import { MOD_RECOMMENDED_CONFIGS } from './data/modConfigs.ts';
import {
  buildSmartAssembly,
  toggleModSmart,
  INITIAL_BUILDER_PREFS,
  type AssemblyPreferences,
} from './utils/modLogic.ts';
import {
  decodeShareHash,
  encodeShareHash,
  formatRuDate,
  loadLocalAppState,
  parsePersistedState,
  saveLocalAppState,
  type PersistedAppState,
  type PersistedTabKey,
} from './utils/persistence.ts';
import { ModDetailModal } from './components/ModDetailModal.tsx';
import { CheckerTab } from './components/CheckerTab.tsx';
import { AssemblyBuilderTab } from './components/AssemblyBuilderTab.tsx';
import { CatalogTab } from './components/CatalogTab.tsx';
import { PresetsTab } from './components/PresetsTab.tsx';
import { ConfigsTab } from './components/ConfigsTab.tsx';
import { Check, Link2, Redo2, Undo2 } from 'lucide-react';

const DEFAULT_CHECKED_MOD_IDS: string[] = [
  'embeddium',
  'sodium-chloride',
  'alloyium',
  'immediatelyfast',
  'entity-culling',
  'more-culling-reforged',
  'enhanced-block-entities-reloaded',
  'matlib',
  'culllessleaves-reforged',
  'modernfix',
  'ferritecore',
  'alltheleaks-memory-leak-fix',
  'radium-re-reforged',
  'badoptimizations',
  'noisiumed',
  'ixeris',
  'smooth-boot-reloaded',
  'dynamic-fps',
  'clumps',
  'packet-fixer',
  'spark',
];

interface HistorySnapshot {
  builderModIds: string[];
  checkedModIds: string[];
  builderPrefs: AssemblyPreferences;
}

const MAX_HISTORY = 50;

export default function App() {
  const initialLocal = useMemo(() => loadLocalAppState(), []);
  const initialPrefs: AssemblyPreferences = {
    ...(initialLocal?.builderPrefs ?? INITIAL_BUILDER_PREFS),
    gpu: 'nvidia',
    mode: 'singleplayer',
    goal: 'balanced',
    useCreate: false,
  };

  const [activeTab, setActiveTabState] = useState<PersistedTabKey>(
    initialLocal?.activeTab ?? 'assembler'
  );
  const [selectedModDetail, setSelectedModDetail] = useState<ModItem | null>(null);
  const [checkedModIds, setCheckedModIdsState] = useState<string[]>(
    initialLocal?.checkedModIds ?? DEFAULT_CHECKED_MOD_IDS
  );
  const [builderPrefs, setBuilderPrefsState] = useState<AssemblyPreferences>(initialPrefs);
  const [builderModIds, setBuilderModIdsState] = useState<string[]>(
    () => initialLocal?.builderModIds ?? buildSmartAssembly(initialPrefs).modIds
  );
  const [dbUpdatedAt, setDbUpdatedAt] = useState<string>(
    initialLocal?.dbUpdatedAt ?? DATABASE_UPDATED_AT
  );
  const [lastSavedDate, setLastSavedDate] = useState<string>(
    initialLocal?.lastSavedDate ?? initialLocal?.dbUpdatedAt ?? DATABASE_UPDATED_AT
  );
  const [shareCopied, setShareCopied] = useState(false);

  // Undo / Redo history (C4)
  const pastRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const [historyCounts, setHistoryCounts] = useState({ past: 0, future: 0 });

  const stateRef = useRef<HistorySnapshot>({
    builderModIds,
    checkedModIds,
    builderPrefs,
  });
  stateRef.current = { builderModIds, checkedModIds, builderPrefs };

  const syncHistoryCounts = useCallback(() => {
    setHistoryCounts({
      past: pastRef.current.length,
      future: futureRef.current.length,
    });
  }, []);

  const pushHistoryBeforeMutation = useCallback(() => {
    const snap = stateRef.current;
    pastRef.current = [
      ...pastRef.current.slice(-(MAX_HISTORY - 1)),
      {
        builderModIds: [...snap.builderModIds],
        checkedModIds: [...snap.checkedModIds],
        builderPrefs: { ...snap.builderPrefs },
      },
    ];
    futureRef.current = [];
    syncHistoryCounts();
  }, [syncHistoryCounts]);

  const hydratedRef = useRef(false);
  const userMutatedRef = useRef(false);

  const touchSavedDate = () => {
    userMutatedRef.current = true;
    setLastSavedDate(formatRuDate());
  };

  const setActiveTab = (next: PersistedTabKey) => {
    touchSavedDate();
    setActiveTabState(next);
  };

  const setCheckedModIds = (action: SetStateAction<string[]>) => {
    touchSavedDate();
    pushHistoryBeforeMutation();
    setCheckedModIdsState(action);
  };

  const setBuilderPrefs = (action: SetStateAction<AssemblyPreferences>) => {
    touchSavedDate();
    pushHistoryBeforeMutation();
    setBuilderPrefsState(action);
  };

  const setBuilderModIds = (action: SetStateAction<string[]>) => {
    touchSavedDate();
    pushHistoryBeforeMutation();
    setBuilderModIdsState(action);
  };

  const handleUndo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    const current = stateRef.current;
    futureRef.current = [
      ...futureRef.current.slice(-(MAX_HISTORY - 1)),
      {
        builderModIds: [...current.builderModIds],
        checkedModIds: [...current.checkedModIds],
        builderPrefs: { ...current.builderPrefs },
      },
    ];
    touchSavedDate();
    setBuilderModIdsState(prev.builderModIds);
    setCheckedModIdsState(prev.checkedModIds);
    setBuilderPrefsState(prev.builderPrefs);
    syncHistoryCounts();
  }, [syncHistoryCounts]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    const current = stateRef.current;
    pastRef.current = [
      ...pastRef.current.slice(-(MAX_HISTORY - 1)),
      {
        builderModIds: [...current.builderModIds],
        checkedModIds: [...current.checkedModIds],
        builderPrefs: { ...current.builderPrefs },
      },
    ];
    touchSavedDate();
    setBuilderModIdsState(next.builderModIds);
    setCheckedModIdsState(next.checkedModIds);
    setBuilderPrefsState(next.builderPrefs);
    syncHistoryCounts();
  }, [syncHistoryCounts]);

  useEffect(() => {
    let cancelled = false;
    const api = window.desktopAPI;
    const hasHashState = Boolean(
      typeof window !== 'undefined' && window.location?.hash && decodeShareHash(window.location.hash)
    );
    if (!api || hasHashState) {
      hydratedRef.current = true;
      return;
    }

    (async () => {
      try {
        const [meta, rawDesktopState] = await Promise.all([
          api.getAppMeta?.().catch(() => null),
          api.loadAppState?.().catch(() => null),
        ]);
        if (cancelled) return;

        const hotUpdatedAt = meta?.hotManifest?.updatedAt;
        if (hotUpdatedAt && typeof hotUpdatedAt === 'string') {
          setDbUpdatedAt(hotUpdatedAt);
        }

        const parsed = parsePersistedState(rawDesktopState);
        if (parsed && !userMutatedRef.current) {
          if (parsed.activeTab) setActiveTabState(parsed.activeTab);
          if (parsed.checkedModIds) setCheckedModIdsState(parsed.checkedModIds);
          if (parsed.builderPrefs) setBuilderPrefsState(parsed.builderPrefs);
          if (parsed.builderModIds) setBuilderModIdsState(parsed.builderModIds);
          if (parsed.lastSavedDate) setLastSavedDate(parsed.lastSavedDate);
          if (parsed.dbUpdatedAt && !hotUpdatedAt) setDbUpdatedAt(parsed.dbUpdatedAt);
        }
      } finally {
        hydratedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const snapshot: PersistedAppState = {
      schemaVersion: 2,
      dbUpdatedAt,
      lastSavedDate,
      activeTab,
      checkedModIds,
      builderModIds,
      builderPrefs,
      focusModId: null,
    };
    saveLocalAppState(snapshot);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const shareHash = encodeShareHash({
        activeTab,
        builderModIds,
        checkedModIds,
        builderPrefs,
      });
      if (window.location.hash !== shareHash) {
        window.history.replaceState(null, '', shareHash);
      }
    }
    void window.desktopAPI?.saveAppState?.(snapshot as unknown as Record<string, unknown>);
  }, [dbUpdatedAt, lastSavedDate, activeTab, checkedModIds, builderModIds, builderPrefs]);

  const builderSet = useMemo(() => new Set(builderModIds), [builderModIds]);

  const toggleCheckerMod = useCallback((id: string) => {
    setCheckedModIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const toggleBuilderMod = useCallback((id: string) => {
    setBuilderModIds(prev => toggleModSmart(prev, id, { strict: true, prefs: stateRef.current.builderPrefs }).nextIds);
  }, []);

  // Global Keyboard Hotkeys: Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y, /, ArrowUp/ArrowDown, Space
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditing =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey && !isEditing) {
          e.preventDefault();
          handleUndo();
          return;
        }
        if (((key === 'z' && e.shiftKey) || key === 'y') && !isEditing) {
          e.preventDefault();
          handleRedo();
          return;
        }
      }

      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

      if (e.key === '/' && !isEditing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input="true"]');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      if (isEditing) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-mod-row="true"]'));
        if (rows.length === 0) return;
        e.preventDefault();
        const activeIdx = rows.findIndex(r => r === document.activeElement || r.contains(document.activeElement));
        let nextIdx = 0;
        if (activeIdx === -1) {
          nextIdx = e.key === 'ArrowDown' ? 0 : rows.length - 1;
        } else {
          nextIdx =
            e.key === 'ArrowDown'
              ? Math.min(rows.length - 1, activeIdx + 1)
              : Math.max(0, activeIdx - 1);
        }
        const nextRow = rows[nextIdx];
        if (nextRow) {
          nextRow.focus({ preventScroll: false });
          nextRow.scrollIntoView({ block: 'nearest' });
        }
        return;
      }

      if (e.key === ' ') {
        const activeRow =
          target?.dataset?.modRow === 'true'
            ? target
            : (target?.closest?.('[data-mod-row="true"]') as HTMLElement | null);
        if (!activeRow) return;
        if (tag === 'button' || tag === 'a' || tag === 'input') return;
        const modId = activeRow.dataset.modId;
        const modContext = activeRow.dataset.modContext;
        if (!modId) return;
        e.preventDefault();
        if (modContext === 'checker') {
          toggleCheckerMod(modId);
        } else {
          toggleBuilderMod(modId);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, toggleBuilderMod, toggleCheckerMod]);

  const handleFocusModInBuilder = (mod: ModItem) => {
    const nextPrefs: AssemblyPreferences = { ...builderPrefs, focusModId: mod.id };
    const built = buildSmartAssembly(nextPrefs);
    setBuilderPrefs(nextPrefs);
    setBuilderModIds(built.modIds);
    setSelectedModDetail(null);
    setActiveTab('assembler');
  };

  const loadPresetToChecker = (preset: ModPreset) => {
    setCheckedModIds([...preset.modIds]);
    setActiveTab('checker');
  };

  const loadPresetToBuilder = (preset: ModPreset) => {
    setBuilderModIds([...preset.modIds]);
    setActiveTab('assembler');
  };

  const handleCopyShareLink = () => {
    const shareHash = encodeShareHash({
      activeTab,
      builderModIds,
      checkedModIds,
      builderPrefs,
    });
    const url = `${window.location.origin}${window.location.pathname}${shareHash}`;
    window.history.replaceState(null, '', shareHash);
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1800);
  };

  const navItems: Array<{
    id: PersistedTabKey;
    label: string;
    count: number;
  }> = [
    { id: 'assembler', label: 'Подбор', count: builderModIds.length },
    { id: 'catalog', label: 'Каталог', count: MODS_DATABASE.length },
    { id: 'presets', label: 'Сборки', count: MOD_PRESETS.length },
    { id: 'checker', label: 'Чекер', count: checkedModIds.length },
    { id: 'configs', label: 'Конфиги', count: MOD_RECOMMENDED_CONFIGS.length },
  ];

  return (
    <div className="min-h-screen bg-[#121417] text-[#e6e8ea] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#1a1d21] border-b border-[#2a2e33]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <a
            href="#top"
            onClick={e => {
              e.preventDefault();
              setActiveTab('assembler');
            }}
            className="text-sm font-semibold tracking-tight text-[#e6e8ea] hover:text-[#3ddc84] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Mod Optimizer
          </a>

          <nav className="hidden md:flex items-center gap-1" aria-label="Разделы">
            {navItems.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-[4px] text-[13px] font-medium transition-colors duration-150 flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                    active
                      ? 'bg-[#22262b] text-[#e6e8ea] font-semibold border-[#3ddc84]'
                      : 'bg-transparent text-[#8b9199] hover:bg-[#22262b] hover:text-[#e6e8ea] border-transparent'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      active ? 'text-[#3ddc84]' : 'text-[#8b9199]'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyCounts.past === 0}
              className="p-1.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#e6e8ea] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              title="Отменить (Ctrl+Z)"
              aria-label="Отменить (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyCounts.future === 0}
              className="p-1.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[#e6e8ea] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              title="Повторить (Ctrl+Shift+Z)"
              aria-label="Повторить (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-[11px] font-medium text-[#e6e8ea] transition-colors duration-150 whitespace-nowrap"
              title="Скопировать ссылку с состоянием сборки (#hash)"
            >
              {shareCopied ? <Check className="w-3 h-3 text-[#3ddc84]" /> : <Link2 className="w-3 h-3 text-[#8b9199]" />}
              <span className="hidden sm:inline">{shareCopied ? 'Скопировано' : 'Ссылка'}</span>
            </button>
            <span className="hidden xl:inline text-[11px] font-mono tabular-nums text-[#8b9199] pl-1 whitespace-nowrap">
              Forge 1.20.1
            </span>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav
          className="flex md:hidden items-center gap-3 px-4 sm:px-6 border-t border-[#2a2e33] overflow-x-auto no-scrollbar"
          aria-label="Разделы"
        >
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-2 border-b-2 text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 flex items-center gap-1 ${
                  active
                    ? 'border-[#3ddc84] text-[#e6e8ea] font-semibold'
                    : 'border-transparent text-[#8b9199] hover:text-[#e6e8ea]'
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[10px] sm:text-[11px] font-mono tabular-nums ${active ? 'text-[#3ddc84]' : 'text-[#8b9199]'}`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-4">
        {activeTab === 'assembler' && (
          <AssemblyBuilderTab
            selectedIds={builderModIds}
            setSelectedIds={setBuilderModIds}
            prefs={builderPrefs}
            setPrefs={setBuilderPrefs}
            onOpenDetail={setSelectedModDetail}
            onSendToChecker={ids => {
              setCheckedModIds(ids);
              setActiveTab('checker');
            }}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogTab
            checkedModIds={checkedModIds}
            toggleCheckerMod={toggleCheckerMod}
            builderSet={builderSet}
            onToggleBuilderMod={toggleBuilderMod}
            builderPrefs={builderPrefs}
            onOpenDetail={setSelectedModDetail}
          />
        )}

        {activeTab === 'presets' && (
          <PresetsTab
            onLoadToChecker={loadPresetToChecker}
            onLoadToBuilder={loadPresetToBuilder}
            onOpenDetail={setSelectedModDetail}
          />
        )}

        {activeTab === 'checker' && (
          <CheckerTab
            checkedModIds={checkedModIds}
            setCheckedModIds={setCheckedModIds}
            onOpenDetail={setSelectedModDetail}
          />
        )}

        {activeTab === 'configs' && (
          <ConfigsTab
            activeModIds={builderModIds}
            onOpenDetail={setSelectedModDetail}
          />
        )}
      </main>

      <ModDetailModal
        mod={selectedModDetail}
        onClose={() => setSelectedModDetail(null)}
        onSelectMod={setSelectedModDetail}
        checkedModIds={checkedModIds}
        onToggleCheckMod={toggleCheckerMod}
        builderModIds={builderModIds}
        onToggleBuilderMod={toggleBuilderMod}
        activeModIds={activeTab === 'checker' ? checkedModIds : builderModIds}
        contextSourceLabel={activeTab === 'checker' ? 'Чекер' : 'Подбор'}
        builderPrefs={builderPrefs}
        onChooseVariantInBuilder={mod => {
          const alreadySelected = builderModIds.includes(mod.id);
          if (!alreadySelected) {
            const res = toggleModSmart(builderModIds, mod.id, { strict: true, prefs: builderPrefs });
            setBuilderModIds(res.nextIds);
          }
          setSelectedModDetail(null);
          setActiveTab('assembler');
        }}
        onFocusModInBuilder={handleFocusModInBuilder}
      />
    </div>
  );
}

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  MODS_DATABASE,
  type ModItem,
} from '../data/modsData.ts';
import {
  cleanModDescription,
  cleanStatusLabel,
  formatShortOneLineDescription,
} from '../utils/displayFormatters.ts';
import {
  evaluateModImpactInPack,
  getBaseHealthTier,
  getModEffectivenessScore,
  getModRestrictionBadge,
  getModSuperseder,
  isModIncompatibleWithSelection,
  isUnsupportedOnForge,
  type AssemblyPreferences,
  type CheckerTier,
} from '../utils/modLogic.ts';
import { StatusBadge } from './StatusBadge.tsx';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';

type HealthFilter = 'all' | CheckerTier;

interface CatalogTabProps {
  checkedModIds: string[];
  toggleCheckerMod: (id: string) => void;
  builderSet: Set<string>;
  onToggleBuilderMod: (id: string) => void;
  builderPrefs: AssemblyPreferences;
  onOpenDetail: (mod: ModItem) => void;
}

const COMPACT_ROW_HEIGHT = 76;
const EXPANDED_ROW_HEIGHT = 136;
const VIEWPORT_HEIGHT = 600;
const OVERSCAN = 6;

export function getHealthBadge(mod: ModItem) {
  const tier = getBaseHealthTier(mod);
  const text = cleanStatusLabel(mod.statusLabel);
  if (tier === 'red') {
    return { tier, textCls: 'text-[#cf6d6d]', text };
  }
  if (tier === 'green') {
    return { tier, textCls: 'text-[#6abf7b]', text };
  }
  if (tier === 'lime') {
    return { tier, textCls: 'text-[#9ab86a]', text };
  }
  return { tier, textCls: 'text-[#c99b52]', text };
}

export function CatalogTab({
  checkedModIds,
  toggleCheckerMod,
  builderSet,
  onToggleBuilderMod,
  builderPrefs,
  onOpenDetail,
}: CatalogTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [onlyLeaders, setOnlyLeaders] = useState(true);
  const [hideUselessCovered, setHideUselessCovered] = useState(true);
  const [onlyCompatibleInCatalog, setOnlyCompatibleInCatalog] = useState(false);
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(VIEWPORT_HEIGHT);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const measuredHeightsRef = useRef<Record<string, number>>({});
  const [measureVersion, setMeasureVersion] = useState(0);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    MODS_DATABASE.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return ['Все', ...Object.keys(counts)];
  }, []);

  const filteredMods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = MODS_DATABASE.filter(mod => {
      if (selectedCategory !== 'Все' && mod.category !== selectedCategory) return false;

      const modHealth = getBaseHealthTier(mod);
      if (healthFilter !== 'all' && modHealth !== healthFilter) return false;

      if (onlyCompatibleInCatalog && isModIncompatibleWithSelection(mod, builderSet, builderPrefs)) {
        return false;
      }

      if (!q) {
        if (
          hideUselessCovered &&
          (mod.coveredBy ||
            mod.status === 'danger' ||
            isUnsupportedOnForge(mod) ||
            getModSuperseder(mod, builderSet, builderPrefs, true) !== null)
        ) {
          return false;
        }
        if (onlyLeaders && mod.groupId && !mod.isGroupLeader) {
          return false;
        }
      } else {
        const matches =
          mod.name.toLowerCase().includes(q) ||
          mod.description.toLowerCase().includes(q) ||
          (mod.bestAlternative && mod.bestAlternative.toLowerCase().includes(q)) ||
          mod.category.toLowerCase().includes(q) ||
          mod.platform.toLowerCase().includes(q) ||
          (mod.tags && mod.tags.some(t => t.toLowerCase().includes(q)));
        if (!matches) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      const lA = a.isGroupLeader ? 1 : 0;
      const lB = b.isGroupLeader ? 1 : 0;
      if (lB !== lA) return lB - lA;
      return getModEffectivenessScore(b) - getModEffectivenessScore(a);
    });
  }, [searchQuery, selectedCategory, healthFilter, onlyLeaders, hideUselessCovered, onlyCompatibleInCatalog, builderSet, builderPrefs]);

  // Reset scroll when filters change
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [searchQuery, selectedCategory, healthFilter, onlyLeaders, hideUselessCovered, onlyCompatibleInCatalog]);

  // Track virtual container height
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      if (el.clientHeight > 0) setContainerHeight(el.clientHeight);
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [filteredMods.length]);

  const { offsets, totalHeight } = useMemo(() => {
    const arr = new Array<number>(filteredMods.length);
    let y = 0;
    for (let i = 0; i < filteredMods.length; i++) {
      arr[i] = y;
      const id = filteredMods[i].id;
      const isExp = Boolean(expandedDescIds[id]);
      const measured = measuredHeightsRef.current[`${id}:${isExp ? '1' : '0'}`];
      y += measured ?? (isExp ? EXPANDED_ROW_HEIGHT : COMPACT_ROW_HEIGHT);
    }
    return { offsets: arr, totalHeight: y };
  }, [filteredMods, expandedDescIds, measureVersion]);

  const { startIndex, endIndex } = useMemo(() => {
    if (filteredMods.length === 0) return { startIndex: 0, endIndex: -1 };
    let lo = 0;
    let hi = filteredMods.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= scrollTop) lo = mid;
      else hi = mid - 1;
    }
    const start = Math.max(0, lo - OVERSCAN);
    const maxBottom = scrollTop + containerHeight;
    let end = lo;
    while (end < filteredMods.length - 1 && offsets[end] < maxBottom) {
      end++;
    }
    end = Math.min(filteredMods.length - 1, end + OVERSCAN);
    return { startIndex: start, endIndex: end };
  }, [filteredMods.length, offsets, scrollTop, containerHeight]);

  const measureRowRef = useCallback((cacheKey: string) => (el: HTMLDivElement | null) => {
    if (!el) return;
    const h = Math.ceil(el.getBoundingClientRect().height);
    if (h > 0 && measuredHeightsRef.current[cacheKey] !== h) {
      measuredHeightsRef.current[cacheKey] = h;
      setMeasureVersion(v => v + 1);
    }
  }, []);

  const visibleSlice = useMemo(() => {
    if (endIndex < startIndex) return [];
    const items: Array<{ mod: ModItem; index: number; top: number }> = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({ mod: filteredMods[i], index: i, top: offsets[i] });
    }
    return items;
  }, [filteredMods, offsets, startIndex, endIndex]);

  const toggleExpandDesc = (id: string) => {
    setExpandedDescIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetCatalogFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Все');
    setHealthFilter('all');
    setOnlyLeaders(false);
    setHideUselessCovered(false);
    setOnlyCompatibleInCatalog(false);
  };

  const checkedSet = useMemo(() => new Set(checkedModIds), [checkedModIds]);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-[#8f8f8f] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              data-search-input="true"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, описанию или аналогу... (клавиша /)"
              aria-label="Поиск модов в каталоге"
              className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-[6px] text-xs text-[#e6e6e6] placeholder-[#8f8f8f] focus:border-[#4caf6a] transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Категория модов"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-[6px] text-xs text-[#e6e6e6] focus:border-[#4caf6a] transition-colors"
            >
              {categories.map(c => (
                <option key={c} value={c}>
                  {c === 'Все' ? 'Все категории' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Статус модов"
              value={healthFilter}
              onChange={e => setHealthFilter(e.target.value as HealthFilter)}
              className="w-full px-3 py-2 bg-[#141414] border border-[#2a2a2a] rounded-[6px] text-xs text-[#e6e6e6] focus:border-[#4caf6a] transition-colors"
            >
              <option value="all">Любой статус</option>
              <option value="green">Стабильно</option>
              <option value="lime">Сносно</option>
              <option value="yellow">Условно</option>
              <option value="red">Опасно / конфликт</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2a2a2a]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyLeaders(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-colors whitespace-nowrap ${
                onlyLeaders
                  ? 'bg-[#242424] border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
              }`}
            >
              Только лидеры групп
            </button>

            <button
              type="button"
              onClick={() => setHideUselessCovered(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-colors whitespace-nowrap ${
                hideUselessCovered
                  ? 'bg-[#242424] border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
              }`}
              title="Скрывать плацебо, нерабочие на Forge, встроенные и полностью перекрытые моды"
            >
              {hideUselessCovered ? <EyeOff className="w-3.5 h-3.5 text-[#4caf6a]" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
              Скрыть лишние и перекрытые
            </button>

            <button
              type="button"
              onClick={() => setOnlyCompatibleInCatalog(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-colors whitespace-nowrap ${
                onlyCompatibleInCatalog
                  ? 'bg-[#242424] border-[#4caf6a] text-[#e6e6e6]'
                  : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6]'
              }`}
              title="Показывать только моды, совместимые с текущей активной сборкой"
            >
              {onlyCompatibleInCatalog ? <EyeOff className="w-3.5 h-3.5 text-[#4caf6a]" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
              Совм. со сборкой
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#8f8f8f] tabular-nums">
            <span>
              Показано: <strong className="text-[#e6e6e6] font-mono">{filteredMods.length}</strong>
            </span>
            <span className="hidden sm:inline text-[11px] text-[#8f8f8f]">
              ↑/↓ выбор · Пробел в сборку
            </span>
          </div>
        </div>
      </div>

      {filteredMods.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] p-10 text-center space-y-3">
          <p className="text-sm font-medium text-[#e6e6e6]">
            По текущим фильтрам моды не найдены
          </p>
          <p className="text-xs text-[#8f8f8f]">
            Попробуйте ослабить статус, выключить фильтр лидеров или очистить поисковую строку.
          </p>
          <button
            type="button"
            onClick={resetCatalogFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-[#4caf6a] hover:bg-[#439f5e] text-[#121212] text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
          data-virtual-total={filteredMods.length}
          data-virtual-rendered={visibleSlice.length}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] h-[68vh] min-h-[420px] overflow-y-auto relative"
        >
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            {visibleSlice.map(({ mod, top }) => {
              const badge = getHealthBadge(mod);
              const isInChecker = checkedSet.has(mod.id);
              const isInBuilder = builderSet.has(mod.id);
              const restriction = getModRestrictionBadge(mod, builderSet, builderPrefs);
              const catImpact = evaluateModImpactInPack(mod, builderSet, undefined, builderPrefs);
              const rp = catImpact.resourceProfile;
              const relPctStr =
                catImpact.relativeImpactPct > 0
                  ? `+${catImpact.relativeImpactPct}%`
                  : `${catImpact.relativeImpactPct}%`;
              const isExpanded = Boolean(expandedDescIds[mod.id]);
              const cacheKey = `${mod.id}:${isExpanded ? '1' : '0'}`;

              const rowTint =
                badge.tier === 'red' || restriction?.tone === 'red'
                  ? 'bg-[#cf6d6d]/[0.04] hover:bg-[#cf6d6d]/[0.07]'
                  : badge.tier === 'yellow' || restriction?.tone === 'amber'
                    ? 'bg-[#c99b52]/[0.03] hover:bg-[#c99b52]/[0.06]'
                    : 'hover:bg-[#222222]';

              return (
                <div
                  key={mod.id}
                  ref={measureRowRef(cacheKey)}
                  style={{ position: 'absolute', top: `${top}px`, left: 0, right: 0 }}
                  data-mod-row="true"
                  data-mod-id={mod.id}
                  data-mod-context="builder"
                  tabIndex={0}
                  className={`px-4 py-2.5 border-b border-[#2a2a2a] flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 transition-colors focus:bg-[#242424] ${rowTint}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(mod)}
                        className="text-sm font-semibold text-[#e6e6e6] hover:text-[#4caf6a] text-left"
                      >
                        {mod.name}
                      </button>
                      <StatusBadge tier={badge.tier} label={badge.text} className="text-[11px]" />
                      <span
                        className={`font-mono font-semibold text-[11px] tabular-nums ${
                          catImpact.relativeImpactPct > 0
                            ? 'text-[#6abf7b]'
                            : catImpact.relativeImpactPct < 0
                              ? 'text-[#cf6d6d]'
                              : 'text-[#8f8f8f]'
                        }`}
                      >
                        {relPctStr}
                      </span>
                      <span className="text-[11px] text-[#8f8f8f]">{mod.platform}</span>
                      {restriction && (restriction.tone === 'red' || restriction.tone === 'amber') && (
                        <span
                          className={`text-[11px] font-medium ${
                            restriction.tone === 'red' ? 'text-[#cf6d6d]' : 'text-[#c99b52]'
                          }`}
                        >
                          · {restriction.text}
                        </span>
                      )}
                      {rp.hasTradeoff && (
                        <span className="text-[11px] text-[#c99b52]" title={rp.tradeoffNote}>
                          · {rp.shortTag}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandDesc(mod.id)}
                      aria-expanded={isExpanded}
                      className="mt-1 w-full text-left flex items-start gap-1.5 text-xs text-[#8f8f8f] hover:text-[#e6e6e6] transition-colors"
                    >
                      <span className={isExpanded ? 'whitespace-normal leading-relaxed' : 'truncate flex-1'}>
                        {isExpanded
                          ? cleanModDescription(mod.description)
                          : formatShortOneLineDescription(mod.description)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#4caf6a]" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#8f8f8f]" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onToggleBuilderMod(mod.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        isInBuilder
                          ? 'bg-[#4caf6a]/15 border-[#4caf6a] text-[#e6e6e6]'
                          : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222]'
                      }`}
                    >
                      {isInBuilder ? <Check className="w-3 h-3 text-[#4caf6a]" aria-hidden="true" /> : <Plus className="w-3 h-3" aria-hidden="true" />}
                      {isInBuilder ? 'В сборке' : 'В сборку'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCheckerMod(mod.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        isInChecker
                          ? 'bg-[#4caf6a]/15 border-[#4caf6a] text-[#e6e6e6]'
                          : 'bg-[#141414] border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222]'
                      }`}
                    >
                      {isInChecker ? <Check className="w-3 h-3 text-[#4caf6a]" aria-hidden="true" /> : <Plus className="w-3 h-3" aria-hidden="true" />}
                      Чекер
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(mod)}
                      className="p-1.5 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6] transition-colors shrink-0"
                      title="Подробнее о моде"
                      aria-label={`Подробнее о ${mod.name}`}
                    >
                      <Info className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <a
                      href={mod.curseforgeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-[#8f8f8f] hover:text-[#e6e6e6] text-[11px] font-mono transition-colors whitespace-nowrap shrink-0"
                      title="CurseForge"
                    >
                      CF
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

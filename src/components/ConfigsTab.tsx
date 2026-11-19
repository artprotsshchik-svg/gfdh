import { useMemo, useState } from 'react';
import { MOD_RECOMMENDED_CONFIGS } from '../data/modConfigs.ts';
import { MODS_DATABASE, type ModItem } from '../data/modsData.ts';
import { Check, Copy, Search } from 'lucide-react';

interface ConfigsTabProps {
  activeModIds: string[];
  onOpenDetail: (mod: ModItem) => void;
}

const MOD_BY_ID = new Map(MODS_DATABASE.map(m => [m.id, m]));

export function ConfigsTab({ activeModIds, onOpenDetail }: ConfigsTabProps) {
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const activeSet = useMemo(() => new Set(activeModIds), [activeModIds]);

  const visibleConfigs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOD_RECOMMENDED_CONFIGS.filter(entry => {
      if (scope === 'active' && !activeSet.has(entry.modId)) return false;
      if (!q) return true;
      return (
        entry.modName.toLowerCase().includes(q) ||
        entry.filePath.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q) ||
        entry.note.toLowerCase().includes(q)
      );
    });
  }, [scope, activeSet, search]);

  const handleCopyOne = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(key);
    setTimeout(() => setCopiedId(prev => (prev === key ? null : prev)), 1800);
  };

  const handleCopyAll = () => {
    if (visibleConfigs.length === 0) return;
    const bundle = visibleConfigs
      .map(
        cfg =>
          `=== ${cfg.modName} (${cfg.filePath}) ===\n${cfg.content}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(bundle);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#e6e8ea] tracking-tight">
            Конфиги ({visibleConfigs.length})
          </h2>

          <button
            type="button"
            disabled={visibleConfigs.length === 0}
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#3ddc84] hover:bg-[#34c776] disabled:opacity-40 disabled:cursor-not-allowed text-[#0f1411] text-xs font-semibold transition-colors duration-150 whitespace-nowrap"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedAll ? 'Всё скопировано' : 'Скопировать всё'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#2a2e33]">
          <div className="flex items-center bg-[#121417] border border-[#2a2e33] rounded-[4px] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setScope('active')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors duration-150 whitespace-nowrap tabular-nums ${
                scope === 'active'
                  ? 'bg-[#22262b] text-[#3ddc84] font-semibold'
                  : 'text-[#8b9199] hover:text-[#e6e8ea]'
              }`}
            >
              Активные в сборке
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors duration-150 whitespace-nowrap tabular-nums ${
                scope === 'all'
                  ? 'bg-[#22262b] text-[#3ddc84] font-semibold'
                  : 'text-[#8b9199] hover:text-[#e6e8ea]'
              }`}
            >
              Все ({MOD_RECOMMENDED_CONFIGS.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8b9199] absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              data-search-input="true"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по моду или файлу... (/)"
              aria-label="Поиск конфигов"
              className="w-full pl-8 pr-2.5 py-1.5 bg-[#121417] border border-[#2a2e33] rounded-[4px] text-xs text-[#e6e8ea] placeholder-[#8b9199] focus:border-[#3ddc84] transition-colors duration-150"
            />
          </div>
        </div>
      </div>

      {visibleConfigs.length === 0 ? (
        <div className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-8 text-center space-y-3">
          <p className="text-xs text-[#8b9199]">
            Для выбранных сейчас модов нет отдельных обязательных правок конфига.
          </p>
          {scope === 'active' && (
            <button
              type="button"
              onClick={() => setScope('all')}
              className="px-3 py-1.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-xs font-medium text-[#e6e8ea] transition-colors duration-150"
            >
              Показать все конфиги ({MOD_RECOMMENDED_CONFIGS.length})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleConfigs.map(cfg => {
            const mod = MOD_BY_ID.get(cfg.modId);
            const isActive = activeSet.has(cfg.modId);
            const key = `${cfg.modId}:${cfg.filePath}`;
            return (
              <div
                key={key}
                className="bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      {mod ? (
                        <button
                          type="button"
                          onClick={() => onOpenDetail(mod)}
                          className="text-sm font-semibold text-[#e6e8ea] hover:text-[#3ddc84] text-left transition-colors duration-150"
                        >
                          {cfg.modName}
                        </button>
                      ) : (
                        <span className="text-sm font-semibold text-[#e6e8ea]">{cfg.modName}</span>
                      )}
                      <span className="font-mono text-[11px] text-[#8b9199]">{cfg.filePath}</span>
                      {isActive && (
                        <span className="text-[11px] font-medium text-[#3ddc84]">в сборке</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-[#e6e8ea] mt-0.5">{cfg.title}</div>
                    <p className="text-xs text-[#8b9199] mt-0.5">{cfg.note}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyOne(key, cfg.content)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-xs font-medium text-[#e6e8ea] transition-colors duration-150 shrink-0"
                  >
                    {copiedId === key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#3ddc84]" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Копировать
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 rounded-[4px] bg-[#121417] border border-[#2a2e33] font-mono text-xs text-[#e6e8ea] overflow-x-auto select-all">
                  {cfg.content}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

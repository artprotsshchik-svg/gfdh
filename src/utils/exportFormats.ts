import { MODS_DATABASE, type ModItem } from '../data/modsData.ts';
import type { AssemblyImpactSummary, AssemblyPreferences } from './modTypes.ts';
import type { HonestFpsEstimate } from './fpsEstimator.ts';
import { cleanStatusLabel } from './displayFormatters.ts';
import { evaluateModImpactInPack, organizeAssemblyTree } from './modLogic.ts';

export const MRPACK_UNAVAILABLE_REASON =
  'Экспорт в .mrpack недоступен: в локальной базе отсутствуют Modrinth ID и SHA-хеши файлов.';

const MOD_BY_ID = new Map(MODS_DATABASE.map(m => [m.id, m]));

function getOrderedMods(selectedIds: string[]): ModItem[] {
  const tree = organizeAssemblyTree(selectedIds);
  const seen = new Set<string>();
  const ordered: ModItem[] = [];

  for (const node of tree) {
    if (!seen.has(node.parent.id)) {
      seen.add(node.parent.id);
      ordered.push(node.parent);
    }
    for (const ch of node.children) {
      if (!seen.has(ch.mod.id)) {
        seen.add(ch.mod.id);
        ordered.push(ch.mod);
      }
    }
  }
  for (const id of selectedIds) {
    if (!seen.has(id)) {
      const m = MOD_BY_ID.get(id);
      if (m) {
        seen.add(id);
        ordered.push(m);
      }
    }
  }
  return ordered;
}

export function exportAssemblyAsTxt(
  selectedIds: string[],
  summary: AssemblyImpactSummary,
  fpsEstimate: HonestFpsEstimate
): string {
  const mods = getOrderedMods(selectedIds);
  const lines: string[] = [
    'Mod Optimizer — Сборка Forge 1.20.1',
    `Оценка сборки: ${summary.assemblyScore}/100`,
    `Прогноз FPS: ${fpsEstimate.label}`,
    `Экономия ОЗУ: ${summary.resourceBalance.ramDeltaLabel}`,
    `Модов: ${mods.length}`,
    '',
    'Список модов:',
    ...mods.map(
      (m, idx) =>
        `${idx + 1}. ${m.name} [${cleanStatusLabel(m.statusLabel)} · ${m.platform}] — ${m.curseforgeUrl}`
    ),
  ];
  return lines.join('\n');
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAssemblyAsCsv(
  selectedIds: string[],
  prefs?: AssemblyPreferences
): string {
  const mods = getOrderedMods(selectedIds);
  const selectedSet = new Set(selectedIds);
  const header = ['id', 'name', 'category', 'group', 'platform', 'status', 'impact_points', 'curseforge_url'];
  const rows = mods.map(mod => {
    const impact = evaluateModImpactInPack(mod, selectedSet, undefined, prefs);
    return [
      escapeCsvCell(mod.id),
      escapeCsvCell(mod.name),
      escapeCsvCell(mod.category),
      escapeCsvCell(mod.groupTitle || ''),
      escapeCsvCell(mod.platform),
      escapeCsvCell(cleanStatusLabel(mod.statusLabel)),
      escapeCsvCell(impact.impactPoints),
      escapeCsvCell(mod.curseforgeUrl),
    ].join(',');
  });
  return '\uFEFF' + [header.join(','), ...rows].join('\n');
}

export function exportAssemblyAsJson(
  selectedIds: string[],
  summary: AssemblyImpactSummary,
  fpsEstimate: HonestFpsEstimate,
  prefs?: AssemblyPreferences
): string {
  const mods = getOrderedMods(selectedIds);
  const selectedSet = new Set(selectedIds);
  const payload = {
    schemaVersion: 1,
    minecraftVersion: '1.20.1',
    loader: 'forge',
    exportedAt: new Date().toISOString(),
    assemblyScore: summary.assemblyScore,
    fpsEstimate: {
      minPct: fpsEstimate.minPct,
      maxPct: fpsEstimate.maxPct,
      label: fpsEstimate.label,
    },
    scoreBreakdown: summary.scoreBreakdown,
    preferences: prefs ?? null,
    mods: mods.map(mod => {
      const impact = evaluateModImpactInPack(mod, selectedSet, undefined, prefs);
      return {
        id: mod.id,
        name: mod.name,
        category: mod.category,
        groupId: mod.groupId || null,
        platform: mod.platform,
        status: cleanStatusLabel(mod.statusLabel),
        impactPoints: impact.impactPoints,
        curseforgeUrl: mod.curseforgeUrl,
      };
    }),
  };
  return JSON.stringify(payload, null, 2);
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

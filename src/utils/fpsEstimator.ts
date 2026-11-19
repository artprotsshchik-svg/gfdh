import { MODS_DATABASE } from '../data/modsData.ts';
import type {
  AssemblyImpactSummary,
  AssemblyPreferences,
} from './modTypes.ts';
import {
  analyzeSelection,
  getModEffectivenessScore,
} from './modAnalyzer.ts';

export interface HonestFpsEstimate {
  minPct: number;
  maxPct: number;
  /** Human-readable range always marked with "оценка", never inflated by naive summation */
  label: string;
  shortLabel: string;
  note: string;
  hasConflicts: boolean;
  hasShaders: boolean;
}

const MOD_BY_ID = new Map(MODS_DATABASE.map(m => [m.id, m]));

const FPS_WEIGHT_OVERRIDE: Record<string, number> = {
  embeddium: 0.44,
  emberbium: 0.44,
  xenon: 0.36,
  immediatelyfast: 0.14,
  flerovium: 0.14,
  'entity-culling': 0.14,
  'enhanced-block-entities-reloaded': 0.10,
  'more-culling-reforged': 0.08,
  'culllessleaves-reforged': 0.06,
  modernfix: 0.08,
  ferritecore: 0.04,
  'radium-re-reforged': 0.08,
  badoptimizations: 0.06,
  noisiumed: 0.05,
  'accelerated-rendering': 0.15,
  alloyium: 0.09,
  'particle-core': 0.06,
  'fast-ip-ping': 0.01,
  'smooth-boot-reloaded': 0.02,
  'dynamic-fps': 0.01,
  'faster-iris-shadow-mapper': 0.12,
  shadowlod: 0.09,
  'iris-flywheel-compat': 0.05,
};

/**
 * Computes an honest, diminishing-returns FPS gain range for Forge 1.20.1.
 * Individual mod percentages are NEVER summed directly:
 * combined efficiency uses multiplicative diminishing returns:
 *   gain = cap * (1 - prod(1 - w_i))
 */
export function estimateFpsRange(
  selectedIds: string[],
  summary?: AssemblyImpactSummary,
  prefs?: AssemblyPreferences
): HonestFpsEstimate {
  if (selectedIds.length === 0) {
    return {
      minPct: 0,
      maxPct: 0,
      label: '0% (оценка)',
      shortLabel: '0% (оценка)',
      note: 'Моды не выбраны — базовая производительность ванильного клиента.',
      hasConflicts: false,
      hasShaders: Boolean(prefs?.useShaders),
    };
  }

  const selectedSet = new Set(selectedIds);
  const analysis = analyzeSelection(selectedIds);
  const hasConflicts =
    analysis.conflicts.length > 0 ||
    analysis.warnings.some(w => w.severity === 'red') ||
    (summary?.resourceBalance.conflictCount ?? 0) > 0;
  const hasShaders =
    Boolean(prefs?.useShaders) ||
    selectedSet.has('oculus') ||
    selectedSet.has('emberlens');

  if (hasConflicts) {
    return {
      minPct: -15,
      maxPct: 5,
      label: 'Конфликт / нестабильно (оценка)',
      shortLabel: 'Конфликт (оценка)',
      note: 'При активных конфликтах или ошибках зависимостей прирост FPS непредсказуем.',
      hasConflicts: true,
      hasShaders,
    };
  }

  // Diminishing returns product across distinct non-redundant active FPS-relevant mods
  let remainingSlowdown = 1.0;
  let activeContributors = 0;

  for (const id of selectedSet) {
    const mod = MOD_BY_ID.get(id);
    if (!mod || mod.status === 'danger' || mod.coveredBy) continue;

    let w = FPS_WEIGHT_OVERRIDE[id];
    if (w === undefined) {
      const eff = getModEffectivenessScore(mod);
      if (mod.category.includes('Рендер') || mod.category.includes('Отрисовка')) {
        w = eff >= 80 ? 0.09 : eff >= 60 ? 0.05 : 0.02;
      } else if (mod.category.includes('Тики') || mod.category.includes('Память') || mod.category.includes('Чанки')) {
        w = eff >= 80 ? 0.05 : 0.025;
      } else {
        w = 0.012;
      }
    }

    if (id === 'alloyium' && !selectedSet.has('embeddium')) {
      w = 0.01;
    }
    if ((id === 'faster-iris-shadow-mapper' || id === 'shadowlod') && !hasShaders) {
      w = 0.01;
    }

    const clampedW = Math.max(0, Math.min(0.48, w));
    remainingSlowdown *= 1 - clampedW;
    if (clampedW >= 0.02) activeContributors++;
  }

  const combinedRatio = 1 - remainingSlowdown;
  // Realism bounds:
  // Without shaders on Forge 1.20.1, well-built stack realistically yields up to ~55–90% FPS (sometimes more in synthetic scenes, never 300% average).
  // With shaders, shader pass overhead dominates GPU time, so realistic gain over unoptimized shaders is ~15–38%.
  const ceiling = hasShaders ? 42 : 95;
  const center = combinedRatio * ceiling;

  if (activeContributors === 0 || center < 4) {
    return {
      minPct: 2,
      maxPct: 8,
      label: '+2–8% FPS (оценка)',
      shortLabel: '+2–8% (оценка)',
      note: 'Минимальное влияние на средний FPS; возможен эффект только на фреймтайме или памяти.',
      hasConflicts: false,
      hasShaders,
    };
  }

  const rawMin = Math.max(5, Math.round((center * 0.72) / 5) * 5);
  const rawMax = Math.min(ceiling, Math.max(rawMin + 10, Math.round((center * 1.15) / 5) * 5));

  return {
    minPct: rawMin,
    maxPct: rawMax,
    label: `+${rawMin}–${rawMax}% FPS (оценка)`,
    shortLabel: `+${rawMin}–${rawMax}% (оценка)`,
    note: hasShaders
      ? 'Учитывает нагрузку шейдер-пайплайна (Oculus/Emberlens) и убывающую отдачу оптимизаций.'
      : 'Рассчитано с учётом убывающей отдачи: проценты отдельных модов не суммируются напрямую.',
    hasConflicts: false,
    hasShaders,
  };
}

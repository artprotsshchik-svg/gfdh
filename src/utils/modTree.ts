import type { ModItem } from '../data/modsData.ts';
import { getModUpdatedLabel } from './modDates.ts';
import { MOD_BY_ID, MOD_HARD_DEPENDENCIES } from './modAnalyzer.ts';

export interface AssemblyTreeChild {
  mod: ModItem;
  relationLabel: string;
}

export interface AssemblyTreeNode {
  parent: ModItem;
  children: AssemblyTreeChild[];
}

const ADDON_PARENT_PRIORITY: Record<string, { parents: string[]; relation: string }> = {
  'embeddium-extras': { parents: ['embeddium'], relation: 'Аддон' },
  'sodium-chloride': { parents: ['embeddium', 'emberbium'], relation: 'Аддон' },
  'alloyium': { parents: ['embeddium', 'emberbium'], relation: 'GPU Compute аддон' },
  'flerovium': { parents: ['embeddium', 'emberbium'], relation: 'Аддон рендера' },
  'immediatelyfast': { parents: ['embeddium', 'emberbium'], relation: 'Аддон UI/шрифтов' },
  'accelerated-rendering': { parents: ['embeddium', 'emberbium'], relation: 'GPU-кэш (много VRAM)' },
  'accelerated-rendering-turned': { parents: ['embeddium', 'emberbium'], relation: 'GPU-кэш (много VRAM)' },
  'accelerated-recoiling': { parents: ['accelerated-rendering', 'accelerated-rendering-turned'], relation: 'Патч отдачи' },
  'amd-fsr-upscaler-render-scale-for-embeddium': { parents: ['embeddium'], relation: 'FSR-аддон' },
  'revidium-accedium': { parents: ['embeddium', 'emberbium'], relation: 'Аддон чанков' },
  'sodium-sightline': { parents: ['embeddium'], relation: 'Отсечение взгляда' },
  'sodium-streamline': { parents: ['embeddium'], relation: 'Очередь VRAM' },
  'sodium-fovea': { parents: ['embeddium'], relation: 'Фовеальный рендер' },
  'maple-mesh-render': { parents: ['embeddium'], relation: 'Меши чанков' },
  'embeddium-x-polytone-block-colormap-fix-polytone': { parents: ['embeddium'], relation: 'Фикс Polytone' },
  'nvidium': { parents: ['emberbium', 'embeddium', 'sinytra-connector'], relation: 'Mesh Shaders (Sinytra + .connector)' },
  'sodium-embeddium-options-api': { parents: ['emberbium', 'embeddium'], relation: 'API меню настроек' },
  'sodium-embeddium-dynamic-lights': { parents: ['emberbium', 'embeddium', 'sodium-embeddium-options-api'], relation: 'Аддон дин. света' },

  'faster-iris-shadow-mapper': { parents: ['oculus', 'embeddium'], relation: 'Аддон теней' },
  'shadowlod': { parents: ['oculus', 'emberlens'], relation: 'Аддон теней' },
  'gputape': { parents: ['oculus', 'emberlens', 'embeddium', 'emberbium'], relation: 'Фикс VRAM' },
  'bons-dlss-diet-complementary-unbound': { parents: ['oculus', 'emberlens'], relation: 'Аддон Complementary' },
  'unofficial-luxium-compatibility-luxium-oculus': { parents: ['oculus'], relation: 'Фикс Luxium' },

  'forgified-fabric-api': { parents: ['sinytra-connector'], relation: 'Зависимость' },
  'connector-extras': { parents: ['sinytra-connector'], relation: 'Мост совместимости' },
  'voxy': { parents: ['sinytra-connector', 'embeddium', 'emberbium'], relation: 'LOD через Sinytra' },
  'c2me-concurrent-chunk-management-engine': { parents: ['sinytra-connector'], relation: 'Чанки через Sinytra' },
  'very-many-players-vmp': { parents: ['sinytra-connector'], relation: 'Сеть/игроки через Sinytra' },

  'matlib': { parents: ['enhanced-block-entities-reloaded'], relation: 'Зависимость' },
  'fzzy-config': { parents: ['particle-core'], relation: 'Зависимость' },
  'kotlin-for-forge': { parents: ['particle-core', 'fzzy-config'], relation: 'Зависимость' },
  'particull': { parents: ['particle-core'], relation: 'Дубль куллинга' },
  'cupboard': { parents: ['connectivity'], relation: 'Зависимость' },
  'soundgc': { parents: ['fast-sounds', 'particle-core'], relation: 'Опц. аддон' },
  'reload-looping-sound-fix': { parents: ['fast-sounds', 'particle-core'], relation: 'Фикс звука' },
  'lightstar': { parents: ['solix'], relation: 'Клиентский кэш' },
  'light-config': { parents: ['solix'], relation: 'Конфиг света' },
  'optimized-fullbright': { parents: ['solix'], relation: 'Аддон яркости' },
  'distant-horizons-memory-fix-dh': { parents: ['distant-horizons'], relation: 'Фикс утечек DH' },
  'bobby-reforged': { parents: ['distant-horizons'], relation: 'Дубль кэша (перекрыт)' },
  'geckolib-animation-optimizer': { parents: ['geckolib'], relation: 'Оптимизатор GeckoLib' },
  'geckolibbetterfps': { parents: ['geckolib'], relation: 'Оптимизатор GeckoLib' },
  'vanillin': { parents: ['flywheel'], relation: 'Аддон сущностей' },
  'chunkyborder': { parents: ['chunky'], relation: 'Аддон границ' },
  'drd-dynamic-render-distance': { parents: ['dynamicrenderdistance'], relation: 'Вариант DRD' },
  'config-preset-switch-low-medium-high-f10': { parents: ['dynamicrenderdistance'], relation: 'Пресеты F10' },

  'tmrv-updated': { parents: ['emi'], relation: 'Мост плагинов JEI' },
  'emi-loot': { parents: ['emi'], relation: 'Плагин дропа' },
  'emi-ores': { parents: ['emi'], relation: 'Плагин руд' },
  'emiffect': { parents: ['emi'], relation: 'Плагин эффектов' },
  'emi-trades': { parents: ['emi'], relation: 'Плагин торгов' },
  'emi-professions': { parents: ['emi'], relation: 'Плагин профессий' },
  'jeioptimizer': { parents: ['just-enough-items-jei'], relation: 'Оптимизатор JEI' },
  'just-enough-freezes': { parents: ['just-enough-items-jei'], relation: 'Фикс фризов JEI' },
  'just-enough-threads': { parents: ['just-enough-items-jei'], relation: 'Потоки JEI' },
  'jeir-jei-rewired': { parents: ['just-enough-items-jei'], relation: 'Поиск JEI' },
  'just-enough-resources-jer': { parents: ['just-enough-items-jei', 'tmrv-updated', 'emi'], relation: 'Плагин JEI' },
  'just-enough-professions-jep': { parents: ['just-enough-items-jei', 'tmrv-updated', 'emi'], relation: 'Плагин JEI' },
  'just-enough-effect-descriptions-jeed': { parents: ['just-enough-items-jei', 'tmrv-updated', 'emi'], relation: 'Плагин JEI' },
  'fastali': { parents: ['advanced-loot-info-ali'], relation: 'Оптимизатор ALI' },
};

const ROOT_PRIORITY_ORDER: Record<string, number> = {
  'emberbium': 10,
  'embeddium': 11,
  'oculus': 20,
  'emberlens': 21,
  'sinytra-connector': 30,
  'distant-horizons': 35,
  'solix': 40,
  'enhanced-block-entities-reloaded': 45,
  'particle-core': 50,
  'fast-sounds': 55,
  'geckolib': 58,
  'flywheel': 60,
  'emi': 65,
  'just-enough-items-jei': 66,
  'connectivity': 70,
  'chunky': 75,
  'dynamicrenderdistance': 80,
};

export function organizeAssemblyTree(modIds: string[]): AssemblyTreeNode[] {
  const uniqueIds = Array.from(new Set(modIds));
  const selectedSet = new Set(uniqueIds);
  const mods = uniqueIds
    .map(id => MOD_BY_ID.get(id))
    .filter((m): m is ModItem => Boolean(m));

  const parentForChild = new Map<string, { parentId: string; relation: string }>();

  const wouldCreateCycle = (childId: string, candidateParentId: string): boolean => {
    let curr: string | undefined = candidateParentId;
    const visited = new Set<string>([childId]);
    while (curr) {
      if (visited.has(curr)) return true;
      visited.add(curr);
      curr = parentForChild.get(curr)?.parentId;
    }
    return false;
  };

  for (const mod of mods) {
    const spec = ADDON_PARENT_PRIORITY[mod.id];
    if (spec) {
      const parentId = spec.parents.find(
        pid => pid !== mod.id && selectedSet.has(pid) && !wouldCreateCycle(mod.id, pid)
      );
      if (parentId) {
        parentForChild.set(mod.id, { parentId, relation: spec.relation });
        continue;
      }
    }

    if (mod.recipeEcosystem === 'jei-plugin') {
      const fallbackParent = ['just-enough-items-jei', 'tmrv-updated', 'emi'].find(
        pid => pid !== mod.id && selectedSet.has(pid) && !wouldCreateCycle(mod.id, pid)
      );
      if (fallbackParent) {
        parentForChild.set(mod.id, { parentId: fallbackParent, relation: 'Плагин рецептов' });
        continue;
      }
    }

    const hardDeps = MOD_HARD_DEPENDENCIES[mod.id] || [];
    if (
      hardDeps.length === 1 &&
      selectedSet.has(hardDeps[0]) &&
      hardDeps[0] !== mod.id &&
      !ADDON_PARENT_PRIORITY[hardDeps[0]] &&
      !wouldCreateCycle(mod.id, hardDeps[0])
    ) {
      parentForChild.set(mod.id, { parentId: hardDeps[0], relation: 'Аддон' });
    }
  }

  const resolveTopRoot = (startId: string): { rootId: string; relation: string } | null => {
    let curr = startId;
    const directRel = parentForChild.get(startId)?.relation;
    if (!directRel) return null;
    const seen = new Set<string>([startId]);
    while (parentForChild.has(curr)) {
      const next = parentForChild.get(curr)!.parentId;
      if (seen.has(next)) return null;
      seen.add(next);
      curr = next;
    }
    return curr !== startId ? { rootId: curr, relation: directRel } : null;
  };

  const childrenByRoot = new Map<string, AssemblyTreeChild[]>();
  const childSet = new Set<string>();

  for (const mod of mods) {
    const resolved = resolveTopRoot(mod.id);
    if (resolved) {
      childSet.add(mod.id);
      const list = childrenByRoot.get(resolved.rootId) || [];
      list.push({ mod, relationLabel: resolved.relation });
      childrenByRoot.set(resolved.rootId, list);
    }
  }

  const roots = mods.filter(m => !childSet.has(m.id));
  roots.sort((a, b) => {
    const aHasChildren = (childrenByRoot.get(a.id)?.length || 0) > 0;
    const bHasChildren = (childrenByRoot.get(b.id)?.length || 0) > 0;
    if (aHasChildren !== bHasChildren) return aHasChildren ? -1 : 1;

    const prioA = ROOT_PRIORITY_ORDER[a.id] ?? 999;
    const prioB = ROOT_PRIORITY_ORDER[b.id] ?? 999;
    if (prioA !== prioB) return prioA - prioB;

    return a.name.localeCompare(b.name, 'ru');
  });

  return roots.map(parent => ({
    parent,
    children: childrenByRoot.get(parent.id) || [],
  }));
}

export function formatAssemblyTreeText(modIds: string[], includeUrls = true): string {
  const tree = organizeAssemblyTree(modIds);
  const lines: string[] = [];
  tree.forEach((node, idx) => {
    const pUpdated = getModUpdatedLabel(node.parent);
    const pMeta = pUpdated ? ` [обн. ${pUpdated}]` : '';
    const pUrl = includeUrls ? ` — ${node.parent.curseforgeUrl}` : '';
    lines.push(`${idx + 1}. ${node.parent.name}${pMeta}${pUrl}`);
    for (const child of node.children) {
      const cUpdated = getModUpdatedLabel(child.mod);
      const cMeta = cUpdated ? `, обн. ${cUpdated}` : '';
      const cUrl = includeUrls ? ` — ${child.mod.curseforgeUrl}` : '';
      lines.push(`   ↳ ${child.mod.name} (${child.relationLabel}${cMeta})${cUrl}`);
    }
  });
  return lines.join('\n');
}

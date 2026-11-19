import {
  MODS_DATABASE,
  MOD_GROUPS,
  INCOMPATIBILITY_RULES,
  type ModItem,
} from '../data/modsData.ts';
import type {
  AnalogComparisonEntry,
  AnalogRelationKind,
  ArtifactRiskFactor,
  ArtifactRiskProfile,
  AssemblyImpactSummary,
  AssemblyPreferences,
  AssemblyResourceBalance,
  AssemblyScoreBreakdown,
  AssemblySubsystemScore,
  CheckerTier,
  ConflictDetection,
  ContextualModImpact,
  CoUsageVerdict,
  DependencyWarning,
  DualPortPair,
  DubiousModEntry,
  MissingSlotWarning,
  ModImpactLevel,
  ModInteractionNote,
  ModResourceProfile,
  RecipeBridgeStatus,
  SupersederInfo,
} from './modTypes.ts';

export const MOD_BY_ID = new Map<string, ModItem>(MODS_DATABASE.map(m => [m.id, m]));

export function normalizeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isUnsupportedOnForge(mod: ModItem): boolean {
  return (
    mod.platform.includes('Несовм.') ||
    mod.platform.includes('Fabric (Справка') ||
    mod.platform.includes('1.20.4 / 1.21+') ||
    mod.platform.includes('NeoForge 1.21+')
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesCoveredByName(coveredBy: string | undefined, modName: string): boolean {
  if (!coveredBy) return false;
  const normalizedTarget = coveredBy.trim().toLowerCase();
  const normalizedMod = modName.trim().toLowerCase();
  if (!normalizedTarget || !normalizedMod) return false;
  if (normalizedTarget === normalizedMod) return true;
  const regex = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedMod)}([^a-z0-9]|$)`, 'i');
  return regex.test(coveredBy);
}

export const EXCLUSIVE_ENGINE_POOLS: Record<string, string[]> = {
  'core-renderer': [
    'embeddium',
    'emberbium',
    'xenon',
    'rubidium',
    'prismanium',
    'polidium',
    'xenon-debloated',
    'accelerium',
    'unbinilium',
    'aluminium',
    'fermium',
    'xfermium',
    'carbons',
    'sodium',
    'vulkanmod',
    'optifine',
  ],
  'shaders-pipeline': ['oculus', 'emberlens', 'iris-shaders'],
  'leaves-culling': [
    'culllessleaves-reforged',
    'leaves-culling',
    'sodium-leaf-culling-unofficial',
    'sodium-embeddium-leaf-culling',
    'tritium',
  ],
  'block-entities': [
    'enhanced-block-entities-reloaded',
    'legendary-block-entities',
    'enhanced-block-entities-reforged-unofficial',
    'fastchest-revived',
    'optimized-block-entities-obe',
  ],
  'lighting-engine': ['solix', 'scalablelux', 'starlight-with-create-fix', 'radon', 'lucis'],
  'tick-physics-engine': ['radium-re-reforged', 'radium-reforged', 'canary', 'lithium'],
  'networking': [
    'krypton-reno',
    'krypton-hybrid',
    'pluto',
    'krypton-foxified',
    'krypton',
    'aegisnetworking-krypton-hybrid',
  ],
  'render-upscalers': [
    'amd-fsr-upscaler-render-scale-for-embeddium',
    'renderscale',
    'super-resolution',
    'purescale',
    'upscalecraft-forge',
    'ggtu',
  ],
  'clearlag-sweepers': [
    'tct-clearlag',
    'clearlagplus',
    'item-purge',
    'clearlagg-server-forge',
    'customizable-entity-clear',
  ],
  'mob-despawn': ['let-me-despawn', 'despawntweaker'],
  'weather-disable': ['no-rain', 'disable-rain'],
  'potion-particles': ['no-more-potion-particles', 'noeffectparticles'],
  'damage-particles': ['limited-damage-indicator-particle', 'no-damage-indicator-heart-particles'],
};

export const MOD_HARD_DEPENDENCIES: Record<string, string[]> = {
  'alloyium': ['embeddium'],
  'oculus': ['embeddium'],
  'faster-iris-shadow-mapper': ['embeddium', 'oculus'],
  'unofficial-luxium-compatibility-luxium-oculus': ['oculus'],
  'embeddium-x-polytone-block-colormap-fix-polytone': ['embeddium'],
  'sodium-sightline': ['embeddium'],
  'sodium-streamline': ['embeddium'],
  'sodium-fovea': ['embeddium'],
  'maple-mesh-render': ['embeddium'],
  'revidium-accedium': ['embeddium'],
  'sodium-embeddium-dynamic-lights': ['sodium-embeddium-options-api'],
  'emberlens': ['emberbium'],
  'vanillin': ['flywheel'],
  'distant-horizons-memory-fix-dh': ['distant-horizons'],
  'sinytra-connector': ['forgified-fabric-api'],
  'nvidium': ['sinytra-connector', 'forgified-fabric-api'],
  'c2me-concurrent-chunk-management-engine': ['sinytra-connector', 'forgified-fabric-api'],
  'voxy': ['sinytra-connector', 'forgified-fabric-api', 'embeddium'],
  'very-many-players-vmp': ['sinytra-connector', 'forgified-fabric-api'],
  'connector-extras': ['sinytra-connector'],
  'particle-core': ['kotlin-for-forge', 'fzzy-config'],
  'fzzy-config': ['kotlin-for-forge'],
  'enhanced-block-entities-reloaded': ['matlib'],
  'connectivity': ['cupboard'],
  'fastali': ['advanced-loot-info-ali'],
  'tmrv-updated': ['emi'],
  'emi-loot': ['emi'],
  'emi-ores': ['emi'],
  'emiffect': ['emi'],
  'emi-trades': ['emi'],
  'emi-professions': ['emi'],
  'jeioptimizer': ['just-enough-items-jei'],
  'just-enough-freezes': ['just-enough-items-jei'],
  'just-enough-threads': ['just-enough-items-jei'],
  'jeir-jei-rewired': ['just-enough-items-jei'],
};

export const MOD_ALTERNATIVE_DEPENDENCIES: Record<string, string[][]> = {
  'embeddium-extras': [['embeddium', 'emberbium']],
  'sodium-chloride': [['embeddium', 'emberbium']],
  'lightstar': [['embeddium', 'emberbium']],
  'amd-fsr-upscaler-render-scale-for-embeddium': [['embeddium', 'emberbium']],
  'gputape': [['embeddium', 'emberbium']],
  'nvidium': [['embeddium', 'emberbium']],
  'flerovium': [['embeddium', 'emberbium']],
  'sodium-embeddium-options-api': [['embeddium', 'emberbium']],
  'sodium-embeddium-dynamic-lights': [['embeddium', 'emberbium']],
  'accelerated-rendering': [['embeddium', 'emberbium']],
  'accelerated-rendering-turned': [['embeddium', 'emberbium']],
  'accelerated-recoiling': [['accelerated-rendering', 'accelerated-rendering-turned']],
  'bons-dlss-diet-complementary-unbound': [['oculus', 'emberlens']],
  'shadowlod': [['oculus', 'emberlens']],
};

const NVIDIUM_FAMILY_IDS = new Set(['nvidium']);

const PURE_LIBRARY_MOD_IDS = new Set([
  'kotlin-for-forge',
  'fzzy-config',
  'matlib',
  'cupboard',
  'cloth-config-v12',
  'resourceful-config',
  'sodium-embeddium-options-api',
  'geckolib',
]);

export function findModByDisplayName(name: string): ModItem | undefined {
  const target = normalizeSlug(name);
  if (!target) return undefined;
  const exact = MODS_DATABASE.find(m => normalizeSlug(m.name) === target);
  if (exact) return exact;
  const strippedTarget = normalizeSlug(name.replace(/\([^)]*\)/g, ''));
  if (strippedTarget) {
    const strippedMatch = MODS_DATABASE.find(m => normalizeSlug(m.name.replace(/\([^)]*\)/g, '')) === strippedTarget);
    if (strippedMatch) return strippedMatch;
  }
  return MODS_DATABASE.find(m => normalizeSlug(m.name).startsWith(target));
}

export const FABRIC_TO_FORGE_SWAP: Record<string, string> = {
  'lithium': 'radium-re-reforged',
  'krypton': 'krypton-reno',
  'sodium': 'embeddium',
  'iris-shaders': 'oculus',
  'very-many-players-vmp': 'vmp-forge',
  'c2me-concurrent-chunk-management-engine': 'concurrent-chunk-management-engine-forge-c2me',
  'dashloader': 'modernfix',
  'exordium': 'immediatelyfast',
};

export const DUAL_PORT_PAIRS: DualPortPair[] = [
  {
    id: 'gpu-chunk-renderer',
    title: 'GPU-рендер чанков (без шейдеров)',
    forgeModId: 'alloyium',
    forgeLabel: 'Alloyium (Нативный Forge)',
    forgeSummary: 'OpenGL 4.3 Compute без Sinytra; +1.3×–1.6× FPS на любых GPU (NVIDIA/AMD/Intel) и с шейдерами.',
    fabricModId: 'nvidium',
    fabricLabel: 'Nvidium (Fabric + Sinytra)',
    fabricSummary: 'NVIDIA Mesh Shaders (3×–10× FPS) через Sinytra Connector + алиас Embeddium (только без шейдеров).',
    switchableOnForge: true,
    altForgeIds: ['revidium-accedium'],
  },
  {
    id: 'c2me',
    title: 'Многопоточные чанки (C2ME)',
    forgeModId: 'concurrent-chunk-management-engine-forge-c2me',
    forgeLabel: 'C2ME-Forge (C2MEF)',
    forgeSummary: 'Нативный порт без Sinytra Connector — избегает конфликтов шины событий Forge 1.20.1.',
    fabricModId: 'c2me-concurrent-chunk-management-engine',
    fabricLabel: 'C2ME (Fabric + Sinytra)',
    fabricSummary: 'Оригинальный Fabric C2ME от ishland через Sinytra (нужны Connector Extras и noTickViewDistance = false).',
    switchableOnForge: true,
    altForgeIds: ['c2mer'],
  },
  {
    id: 'vmp',
    title: 'Высокий онлайн / игроки (VMP)',
    forgeModId: 'vmp-forge',
    forgeLabel: 'Very Many Players (Forge)',
    forgeSummary: 'Нативный Forge-порт без Sinytra и без конфликтов миксинов трекинга сущностей.',
    fabricModId: 'very-many-players-vmp',
    fabricLabel: 'VMP (Fabric + Sinytra)',
    fabricSummary: 'Оригинальный Fabric VMP через Sinytra Connector (может конфликтовать миксинами в тяжёлых паках).',
    switchableOnForge: true,
  },
  {
    id: 'zip-loading',
    title: 'Чтение .zip паков (ModernFix ↔ Quick Pack)',
    forgeModId: 'modernfix',
    forgeLabel: 'ModernFix (Нативный Forge)',
    forgeSummary: 'Ускоряет загрузку ресурсов нативно в Forge 1.20.1 без сторонних мостов.',
    fabricModId: 'quick-pack',
    fabricLabel: 'Quick Pack (Fabric / Quick Pack-Fix)',
    fabricSummary: 'Оригинал drexhd под Fabric — на Forge 1.20.1 требует Quick Pack-Fix или Sinytra Connector.',
    switchableOnForge: true,
  },
  {
    id: 'lithium-tps',
    title: 'Физика и ИИ (Radium ↔ Lithium)',
    forgeModId: 'radium-re-reforged',
    forgeLabel: 'Radium Re-Reforged (Нативный Forge)',
    forgeSummary: 'Стабильный порт Lithium с патчами под Create, C2ME и Forge-краши NBT.',
    fabricModId: 'lithium',
    fabricLabel: 'Lithium (Fabric — несовм. с Forge)',
    fabricSummary: 'Оригинальный Fabric Lithium падает даже с Sinytra Connector — ставьте Radium Re-Reforged.',
    switchableOnForge: false,
  },
  {
    id: 'krypton-net',
    title: 'Сеть Netty (Krypton Reno / Krypton Hybrid ↔ Krypton)',
    forgeModId: 'krypton-reno',
    forgeLabel: 'Krypton Reno / Krypton Hybrid (Нативный Forge)',
    forgeSummary: 'Нативный сетевой стек для Forge 1.20.1 (Krypton Hybrid для Mohist/Arclight; Pluto остановился на 1.18.2).',
    fabricModId: 'krypton',
    fabricLabel: 'Krypton (Fabric — несовм. с Forge)',
    fabricSummary: 'Velocity-нативки Fabric Krypton не работают через Sinytra — нужен Krypton Reno.',
    switchableOnForge: false,
    altForgeIds: ['krypton-hybrid', 'pluto'],
  },
  {
    id: 'sodium-core',
    title: 'Базовый 3D-рендер (Embeddium ↔ Sodium)',
    forgeModId: 'embeddium',
    forgeLabel: 'Embeddium (Нативный Forge)',
    forgeSummary: 'Официальный стандарт для Forge 1.20.1 (с алиасом "embeddium": "sodium" для Nvidium в Sinytra).',
    fabricModId: 'sodium',
    fabricLabel: 'Sodium (Fabric — несовм. с Forge)',
    fabricSummary: 'Fabric-оригинал Sodium крашнет Forge даже с Sinytra Connector.',
    switchableOnForge: false,
    altForgeIds: ['emberbium'],
  },
  {
    id: 'iris-shaders',
    title: 'Шейдеры (Oculus / Emberlens ↔ Iris)',
    forgeModId: 'oculus',
    forgeLabel: 'Oculus / Emberlens (Нативный Forge)',
    forgeSummary: 'Нативный порт Iris Shaders для Embeddium (либо Emberlens поверх Emberbium).',
    fabricModId: 'iris-shaders',
    fabricLabel: 'Iris Shaders (Fabric — несовм. с Forge)',
    fabricSummary: 'Fabric Iris несовместим с Forge 1.20.1 — используйте Oculus или Emberlens.',
    switchableOnForge: false,
    altForgeIds: ['emberlens'],
  },
  {
    id: 'worldgen-noisium',
    title: 'Шум генерации мира (Noisiumed ↔ Noisium)',
    forgeModId: 'noisiumed',
    forgeLabel: 'Noisiumed (Актуальный форк Forge)',
    forgeSummary: 'Поддерживаемое продолжение архивного Noisium для Forge 1.20.1.',
    fabricModId: 'noisium',
    fabricLabel: 'Noisium (Архивный порт)',
    fabricSummary: 'Прекращённый предшественник Noisiumed — оставляйте только один из них.',
    switchableOnForge: true,
  },
];

export function getDualPortPairForMod(modId: string): DualPortPair | null {
  for (const pair of DUAL_PORT_PAIRS) {
    if (
      pair.forgeModId === modId ||
      pair.fabricModId === modId ||
      pair.altForgeIds?.includes(modId) ||
      pair.altFabricIds?.includes(modId)
    ) {
      return pair;
    }
  }
  return null;
}

export function getDirectDependencies(modId: string, contextSet?: Set<string>): string[] {
  const deps = new Set<string>(MOD_HARD_DEPENDENCIES[modId] || []);
  const altGroups = MOD_ALTERNATIVE_DEPENDENCIES[modId];
  if (altGroups) {
    for (const options of altGroups) {
      if (options.length === 0) continue;
      const satisfied = contextSet ? options.find(opt => contextSet.has(opt)) : undefined;
      deps.add(satisfied || options[0]);
    }
  }
  const mod = MOD_BY_ID.get(modId);
  if (mod && mod.platform.includes('Sinytra')) {
    deps.add('sinytra-connector');
    deps.add('forgified-fabric-api');
  }
  if (mod?.recipeEcosystem === 'jei-plugin') {
    if (contextSet?.has('just-enough-items-jei')) {
      deps.add('just-enough-items-jei');
    } else if (contextSet?.has('emi')) {
      deps.add('emi');
      deps.add('tmrv-updated');
    } else {
      deps.add('just-enough-items-jei');
    }
  }
  return Array.from(deps);
}

export function getTransitiveDependencies(
  modId: string,
  visited = new Set<string>(),
  contextSet?: Set<string>
): string[] {
  if (visited.has(modId)) return [];
  visited.add(modId);
  const direct = getDirectDependencies(modId, contextSet);
  const result = new Set<string>(direct);
  for (const d of direct) {
    for (const td of getTransitiveDependencies(d, visited, contextSet)) {
      result.add(td);
    }
  }
  return Array.from(result);
}

export function getExclusivePoolForMod(modId: string): { groupId: string; poolIds: string[] } | null {
  for (const [groupId, poolIds] of Object.entries(EXCLUSIVE_ENGINE_POOLS)) {
    if (poolIds.includes(modId)) {
      return { groupId, poolIds };
    }
  }
  return null;
}

export function getRuleConflictingIds(modId: string): string[] {
  const mod = MOD_BY_ID.get(modId);
  if (!mod) return [];
  const slug = normalizeSlug(mod.name);
  const conflicts = new Set<string>();

  for (const rule of INCOMPATIBILITY_RULES) {
    const ruleSlugs = rule.conflictingMods.map(normalizeSlug);
    if (!ruleSlugs.includes(slug)) continue;

    if (rule.title.includes('OptiFine')) {
      for (const m of MODS_DATABASE) {
        const ms = normalizeSlug(m.name);
        if (slug === 'optifine') {
          if (ms !== 'optifine' && ruleSlugs.includes(ms)) conflicts.add(m.id);
        } else if (ms === 'optifine') {
          conflicts.add(m.id);
        }
      }
      continue;
    }

    if (rule.title.includes('Nvidium и шейдеров')) {
      for (const m of MODS_DATABASE) {
        const ms = normalizeSlug(m.name);
        if (NVIDIUM_FAMILY_IDS.has(mod.id)) {
          if (!NVIDIUM_FAMILY_IDS.has(m.id) && ruleSlugs.includes(ms)) conflicts.add(m.id);
        } else if (NVIDIUM_FAMILY_IDS.has(m.id)) {
          conflicts.add(m.id);
        }
      }
      continue;
    }

    if (rule.title.includes('Nvidium ↔ Alloyium')) {
      for (const m of MODS_DATABASE) {
        const ms = normalizeSlug(m.name);
        if (m.id === modId || !ruleSlugs.includes(ms)) continue;
        if (NVIDIUM_FAMILY_IDS.has(mod.id) && NVIDIUM_FAMILY_IDS.has(m.id)) continue;
        conflicts.add(m.id);
      }
      continue;
    }

    if (rule.title.includes('Emberbium с аддонами Embeddium')) {
      for (const m of MODS_DATABASE) {
        const ms = normalizeSlug(m.name);
        if (mod.id === 'emberbium') {
          if (m.id !== 'emberbium' && ruleSlugs.includes(ms)) conflicts.add(m.id);
        } else if (m.id === 'emberbium') {
          conflicts.add(m.id);
        }
      }
      continue;
    }

    if (rule.title.includes('Acedium/Revidium с шейдерами')) {
      for (const m of MODS_DATABASE) {
        const ms = normalizeSlug(m.name);
        if (mod.id === 'revidium-accedium') {
          if (m.id !== 'revidium-accedium' && ruleSlugs.includes(ms)) conflicts.add(m.id);
        } else if (m.id === 'revidium-accedium') {
          conflicts.add(m.id);
        }
      }
      continue;
    }

    for (const m of MODS_DATABASE) {
      if (m.id !== modId && ruleSlugs.includes(normalizeSlug(m.name))) {
        conflicts.add(m.id);
      }
    }
  }

  const exclusive = getExclusivePoolForMod(modId);
  if (exclusive) {
    for (const pid of exclusive.poolIds) {
      if (pid !== modId) conflicts.add(pid);
    }
  }

  return Array.from(conflicts);
}

export function analyzeSelection(selectedIds: string[]) {
  const selectedSet = new Set(selectedIds);
  const selectedMods = MODS_DATABASE.filter(m => selectedSet.has(m.id));
  const conflicts: ConflictDetection[] = [];
  const conflictingIdSet = new Set<string>();

  for (const rule of INCOMPATIBILITY_RULES) {
    if (rule.title.includes('OptiFine')) {
      const opti = selectedMods.find(m => normalizeSlug(m.name) === 'optifine');
      if (!opti) continue;
      const others = selectedMods.filter(m => {
        const n = normalizeSlug(m.name);
        return n !== 'optifine' && rule.conflictingMods.some(cm => normalizeSlug(cm) === n);
      });
      if (others.length > 0) {
        const matched = [opti, ...others];
        matched.forEach(m => conflictingIdSet.add(m.id));
        conflicts.push({
          rule,
          matchedIds: matched.map(m => m.id),
          matchedNames: matched.map(m => m.name),
        });
      }
      continue;
    }

    if (rule.title.includes('Nvidium и шейдеров')) {
      const nvidMods = selectedMods.filter(m => NVIDIUM_FAMILY_IDS.has(m.id));
      if (nvidMods.length === 0) continue;
      const others = selectedMods.filter(
        m => !NVIDIUM_FAMILY_IDS.has(m.id) && rule.conflictingMods.some(cm => normalizeSlug(cm) === normalizeSlug(m.name))
      );
      if (others.length > 0) {
        const matched = [...nvidMods, ...others];
        matched.forEach(m => conflictingIdSet.add(m.id));
        conflicts.push({
          rule,
          matchedIds: matched.map(m => m.id),
          matchedNames: matched.map(m => m.name),
        });
      }
      continue;
    }

    if (rule.title.includes('Nvidium ↔ Alloyium')) {
      const matched = selectedMods.filter(sm =>
        rule.conflictingMods.some(cm => normalizeSlug(cm) === normalizeSlug(sm.name))
      );
      const hasNonNvidium = matched.some(m => !NVIDIUM_FAMILY_IDS.has(m.id));
      const distinctConflictGroups = new Set(matched.map(m => (NVIDIUM_FAMILY_IDS.has(m.id) ? 'nvidium-family' : m.id)));
      if (distinctConflictGroups.size > 1 && (hasNonNvidium || matched.length > 1)) {
        matched.forEach(m => conflictingIdSet.add(m.id));
        conflicts.push({
          rule,
          matchedIds: matched.map(m => m.id),
          matchedNames: matched.map(m => m.name),
        });
      }
      continue;
    }

    if (rule.title.includes('Emberbium с аддонами Embeddium')) {
      const ember = selectedMods.find(m => m.id === 'emberbium');
      if (!ember) continue;
      const others = selectedMods.filter(
        m => m.id !== 'emberbium' && rule.conflictingMods.some(cm => normalizeSlug(cm) === normalizeSlug(m.name))
      );
      if (others.length > 0) {
        const matched = [ember, ...others];
        matched.forEach(m => conflictingIdSet.add(m.id));
        conflicts.push({
          rule,
          matchedIds: matched.map(m => m.id),
          matchedNames: matched.map(m => m.name),
        });
      }
      continue;
    }

    if (rule.title.includes('Acedium/Revidium с шейдерами')) {
      const acedium = selectedMods.find(m => m.id === 'revidium-accedium');
      if (!acedium) continue;
      const others = selectedMods.filter(
        m => m.id !== 'revidium-accedium' && rule.conflictingMods.some(cm => normalizeSlug(cm) === normalizeSlug(m.name))
      );
      if (others.length > 0) {
        const matched = [acedium, ...others];
        matched.forEach(m => conflictingIdSet.add(m.id));
        conflicts.push({
          rule,
          matchedIds: matched.map(m => m.id),
          matchedNames: matched.map(m => m.name),
        });
      }
      continue;
    }

    const matched = selectedMods.filter(sm =>
      rule.conflictingMods.some(cm => normalizeSlug(cm) === normalizeSlug(sm.name))
    );
    if (matched.length > 1) {
      matched.forEach(m => conflictingIdSet.add(m.id));
      conflicts.push({
        rule,
        matchedIds: matched.map(m => m.id),
        matchedNames: matched.map(m => m.name),
      });
    }
  }

  const warnings: DependencyWarning[] = [];
  const hasSinytra = selectedSet.has('sinytra-connector');
  const hasFFAPI = selectedSet.has('forgified-fabric-api');
  const hasEmbeddium = selectedSet.has('embeddium');
  const hasEmberbium = selectedSet.has('emberbium');
  const hasEmi = selectedSet.has('emi');
  const hasJei = selectedSet.has('just-enough-items-jei');
  const hasTmrv = selectedSet.has('tmrv-updated');

  for (const mod of selectedMods) {
    if (mod.platform.includes('Sinytra')) {
      if (!hasSinytra || !hasFFAPI) {
        warnings.push({
          modId: mod.id,
          modName: mod.name,
          severity: 'red',
          message: `${mod.name} (Fabric-мод) не запустится на Forge без Sinytra Connector и Forgified Fabric API.`,
          fixModIds: ['sinytra-connector', 'forgified-fabric-api'],
        });
      }
      if (NVIDIUM_FAMILY_IDS.has(mod.id) && !hasEmbeddium && !hasEmberbium) {
        warnings.push({
          modId: mod.id,
          modName: mod.name,
          severity: 'red',
          message: `${mod.name} на Forge требует Embeddium или Emberbium (и алиас embeddium -> sodium в конфиге Sinytra .connector).`,
          fixModIds: ['embeddium'],
        });
      }
    }

    const hardDeps = MOD_HARD_DEPENDENCIES[mod.id] || [];
    const missingDeps = hardDeps.filter(depId => !selectedSet.has(depId));
    const missingNonSinytra = missingDeps.filter(
      depId => !(mod.platform.includes('Sinytra') && ['sinytra-connector', 'forgified-fabric-api', 'embeddium', 'emberbium'].includes(depId))
    );
    if (missingNonSinytra.length > 0) {
      const missingNames = missingNonSinytra.map(id => MOD_BY_ID.get(id)?.name || id);
      const isCriticalViewerMissing =
        mod.recipeEcosystem === 'emi-only' ||
        mod.recipeEcosystem === 'tmrv-bridge' ||
        mod.recipeEcosystem === 'jei-engine';
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: isCriticalViewerMissing ? 'red' : 'yellow',
        message: `${mod.name} требует: ${missingNames.join(' + ')}. Добавьте зависимость, иначе мод не сработает.`,
        fixModIds: missingNonSinytra,
      });
    }

    const altDepGroups = MOD_ALTERNATIVE_DEPENDENCIES[mod.id] || [];
    for (const options of altDepGroups) {
      if (NVIDIUM_FAMILY_IDS.has(mod.id) && options.includes('embeddium')) continue;
      if (options.length > 0 && !options.some(optId => selectedSet.has(optId))) {
        const optNames = options.map(id => MOD_BY_ID.get(id)?.name || id);
        warnings.push({
          modId: mod.id,
          modName: mod.name,
          severity: 'yellow',
          message: `${mod.name} требует один из базовых модов: ${optNames.join(' или ')}.`,
          fixModIds: [options[0]],
        });
      }
    }

    if (mod.recipeEcosystem === 'jei-plugin' && !hasJei && !(hasEmi && hasTmrv)) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'red',
        message: hasEmi
          ? `${mod.name} — плагин JEI: для работы внутри чистого EMI нужна прослойка TMRV Updated (или JEI).`
          : `${mod.name} — плагин JEI: установите Just Enough Items (JEI) или связку EMI + TMRV Updated.`,
        fixModIds: hasEmi ? ['tmrv-updated'] : ['just-enough-items-jei'],
      });
    }

    const activeSuperseder = getModSuperseder(mod, selectedSet, undefined, false);
    if (activeSuperseder && activeSuperseder.isActiveInSelection) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'yellow',
        message: `${mod.name} лишний — ${activeSuperseder.reason}.`,
      });
    } else if (mod.coveredBy && selectedMods.some(other => matchesCoveredByName(mod.coveredBy, other.name))) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'yellow',
        message: `${mod.name} избыточен — его функции уже встроены в ${mod.coveredBy}.`,
      });
    }

    if (isUnsupportedOnForge(mod)) {
      const hint = (mod.bestAlternative || 'удалите или замените Forge-портом').replace(/[.]+$/, '');
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'red',
        message: `${mod.name} (${mod.platform}) не работает нативно на Forge 1.20.1 — ${hint}.`,
      });
    } else if (mod.platform.includes('NeoForge') && !/\bForge\b/.test(mod.platform)) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'yellow',
        message: `${mod.name} рассчитан на ${mod.platform}, а не на Forge 1.20.1.`,
      });
    } else if (mod.name.includes('1.19.2')) {
      warnings.push({
        modId: mod.id,
        modName: mod.name,
        severity: 'yellow',
        message: `${mod.name} собран под устаревшую версию 1.19.2 и может работать нестабильно на 1.20.1.`,
      });
    }
  }

  if (selectedSet.has('sodium-chloride') && selectedSet.has('sodium-embeddium-dynamic-lights')) {
    warnings.push({
      modId: 'sodium-embeddium-dynamic-lights',
      modName: 'Sodium/Embeddium Dynamic Lights',
      severity: 'yellow',
      message: 'Дубль динамического освещения: (Sodium) Chloride уже содержит его — отключите динамический свет в настройках Chloride или оставьте один мод.',
    });
  }

  if (selectedSet.has('tritium')) {
    const chestMods = [
      'enhanced-block-entities-reloaded',
      'legendary-block-entities',
      'fastchest-revived',
      'enhanced-block-entities-reforged-unofficial',
      'optimized-block-entities-obe',
    ].filter(id => selectedSet.has(id));
    const overlapLabels: string[] = chestMods.map(id => MOD_BY_ID.get(id)?.name || id);
    if (selectedSet.has('dynamic-fps')) overlapLabels.push('Dynamic FPS');
    if (selectedSet.has('language-reload-reforged')) overlapLabels.push('Language Reload Reforged');
    if (selectedSet.has('languagereloadunofficial')) overlapLabels.push('LanguageReloadUnofficial');
    if (overlapLabels.length > 0) {
      warnings.push({
        modId: 'tritium',
        modName: 'Tritium',
        severity: 'yellow',
        message: `Tritium частично дублирует модули (${overlapLabels.join(', ')}) — отключите пересекающиеся функции в конфиге Tritium.`,
      });
    }
  }

  if (selectedSet.has('advanced-loot-info-ali') && !selectedSet.has('fastali')) {
    warnings.push({
      modId: 'advanced-loot-info-ali',
      modName: 'Advanced Loot Info (ALI)',
      severity: 'yellow',
      message: 'Advanced Loot Info без FastALI может вызывать фриз 10–20 сек. при входе в мир на сборках 150+ модов.',
      fixModIds: ['fastali'],
    });
  }

  if (
    selectedSet.has('distant-horizons') &&
    (selectedSet.has('oculus') || selectedSet.has('emberlens')) &&
    !selectedSet.has('distant-horizons-memory-fix-dh')
  ) {
    warnings.push({
      modId: 'distant-horizons',
      modName: 'Distant Horizons',
      severity: 'yellow',
      message: 'Связка Distant Horizons + шейдеры (Oculus/Emberlens) сильно нагружает память — добавьте Distant Horizons Memory Fix.',
      fixModIds: ['distant-horizons-memory-fix-dh'],
    });
  }

  if (selectedSet.has('c2me-concurrent-chunk-management-engine') && !selectedSet.has('connector-extras')) {
    warnings.push({
      modId: 'c2me-concurrent-chunk-management-engine',
      modName: 'C2ME (Concurrent Chunk Management Engine)',
      severity: 'yellow',
      message: 'Для работы Fabric C2ME через Sinytra рекомендуется Connector Extras (и noTickViewDistance = false в c2me.toml).',
      fixModIds: ['connector-extras'],
    });
  }

  const hasAnyC2ME =
    selectedSet.has('concurrent-chunk-management-engine-forge-c2me') ||
    selectedSet.has('c2me-concurrent-chunk-management-engine') ||
    selectedSet.has('c2mer');
  if (hasAnyC2ME) {
    for (const oldLithiumId of ['radium-reforged', 'canary']) {
      if (selectedSet.has(oldLithiumId)) {
        const oldName = MOD_BY_ID.get(oldLithiumId)?.name || oldLithiumId;
        warnings.push({
          modId: oldLithiumId,
          modName: oldName,
          severity: 'yellow',
          message: `${oldName} не содержит патчей совместимости с C2ME — замените на Radium Re-Reforged.`,
          fixModIds: ['radium-re-reforged'],
        });
      }
    }
  }

  if (selectedSet.has('calm-the-leaks') && !selectedSet.has('alltheleaks-memory-leak-fix')) {
    warnings.push({
      modId: 'calm-the-leaks',
      modName: 'Calm The Leaks',
      severity: 'yellow',
      message: 'Calm The Leaks — диагностический аддон для AllTheLeaks; без него практической пользы не даёт.',
      fixModIds: ['alltheleaks-memory-leak-fix'],
    });
  }

  if (selectedSet.has('geckolib-animation-optimizer') && selectedSet.has('geckolibbetterfps')) {
    warnings.push({
      modId: 'geckolib-animation-optimizer',
      modName: 'GeckoLib Animation Optimizer',
      severity: 'yellow',
      message: 'Установлены оба оптимизатора GeckoLib (GeckolibBetterFPS + GeckoLib Animation Optimizer) — обычно достаточно одного GeckolibBetterFPS.',
    });
  }

  const hasAnySinytraConsumer = selectedMods.some(m => m.platform.includes('Sinytra'));
  const hasNonBridgeMod = selectedMods.some(
    m => m.id !== 'sinytra-connector' && m.id !== 'forgified-fabric-api' && m.id !== 'connector-extras'
  );
  if (hasSinytra && !hasAnySinytraConsumer && hasNonBridgeMod) {
    warnings.push({
      modId: 'sinytra-connector',
      modName: 'Sinytra Connector',
      severity: 'yellow',
      message: 'Прослойка Sinytra Connector активна без единого Fabric-мода в списке — замедляет старт без практической пользы.',
    });
  }

  return {
    selectedMods,
    conflicts,
    conflictingIdSet,
    warnings,
  };
}

export function getCheckerTier(
  mod: ModItem,
  conflictingIdSet: Set<string> = new Set(),
  warningSeverity?: 'red' | 'yellow'
): { tier: CheckerTier; label: string; reason: string } {
  if (mod.status === 'danger' || conflictingIdSet.has(mod.id) || warningSeverity === 'red' || isUnsupportedOnForge(mod)) {
    const reason =
      mod.status === 'danger'
        ? mod.warning || 'Плацебо или высокий риск поломки/фризов'
        : conflictingIdSet.has(mod.id)
          ? 'Активный конфликт с другим выбранным модом'
          : mod.warning || mod.bestAlternative || 'Несовместим с Forge 1.20.1 или отсутствуют зависимости';
    return { tier: 'red', label: 'Плохо / Конфликт', reason };
  }

  if (mod.healthTier === 'green' && warningSeverity !== 'yellow') {
    return { tier: 'green', label: 'Стабильно', reason: 'Проверенный стабильный лидер для Forge' };
  }

  const isNeoForgeOnly = mod.platform.includes('NeoForge') && !/\bForge\b/.test(mod.platform);
  const isFabricOnly = mod.platform.includes('Fabric') && !mod.platform.includes('Forge') && !mod.platform.includes('Universal');
  const needsBridgeOrExperimental =
    mod.platform.includes('Sinytra') ||
    isFabricOnly ||
    mod.platform.includes('Quick Pack-Fix') ||
    mod.platform.includes('устаревший порт') ||
    mod.platform.includes('1.20.4') ||
    mod.platform.includes('Java 25') ||
    mod.name.includes('1.19.2') ||
    mod.platform.includes('Эксперимент') ||
    mod.id === 'concurrent-chunk-management-engine-forge-c2me' ||
    mod.id === 'c2mer' ||
    mod.id === 'hc-harichunk' ||
    mod.id === 'emberlens' ||
    mod.id === 'bobby-reforged' ||
    mod.id === 'better-biome-reblend' ||
    mod.id === 'tritium' ||
    mod.id === 'prismanium' ||
    mod.id === 'polidium' ||
    mod.id === 'voidengine' ||
    mod.id === 'maple-mesh-render' ||
    mod.id === 'bons-dlss-diet-complementary-unbound' ||
    mod.id === 'ksyxis' ||
    mod.id === 'better-tnt' ||
    mod.id === 'perfomant-boom';

  const hasBetterReplacement = Boolean(mod.supersededBy && mod.supersededBy.length > 0);
  const isSuitableNative =
    warningSeverity !== 'yellow' &&
    !mod.coveredBy &&
    !hasBetterReplacement &&
    !isNeoForgeOnly &&
    !needsBridgeOrExperimental &&
    (mod.status === 'useful' || mod.status === 'diagnostic');

  if (isSuitableNative) {
    const reason =
      mod.status === 'diagnostic'
        ? 'Инструмент диагностики — работает стабильно, FPS сам не повышает'
        : mod.bestAlternative || mod.description;
    return { tier: 'lime', label: 'Сносно / Подходит', reason };
  }

  let reason = mod.warning || mod.bestAlternative || '';
  if (!reason) {
    if (mod.platform.includes('Sinytra')) reason = 'Работает на Forge через Sinytra Connector (требует настройки)';
    else if (mod.coveredBy) reason = `Уже встроен в ${mod.coveredBy}`;
    else if (hasBetterReplacement) reason = `Есть более надёжный аналог: ${mod.supersededBy!.map(id => MOD_BY_ID.get(id)?.name || id).join(' / ')}`;
    else if (mod.status === 'outdated') reason = 'Устарел — есть более новый лидер';
    else reason = 'Условно полезен с ограничениями по версии или лоадеру';
  }

  return { tier: 'yellow', label: 'Не гарантировано', reason };
}

export function getBaseHealthTier(mod: ModItem): CheckerTier {
  return getCheckerTier(mod, new Set()).tier;
}

export function getModEffectivenessScore(mod: ModItem): number {
  let score = 0;
  if (mod.isGroupLeader) score += 500;
  if (mod.isGroupAddon) score += 250;
  if (mod.id === 'emberbium') score += 350;
  if (mod.installed) score += 120;
  switch (mod.status) {
    case 'recommended':
      score += 1000;
      break;
    case 'useful':
      score += 600;
      break;
    case 'diagnostic':
      score += 350;
      break;
    case 'redundant':
      score += 100;
      break;
    case 'outdated':
      score += 50;
      break;
    case 'danger':
      score -= 800;
      break;
  }
  if (mod.healthTier === 'green' && !mod.platform.includes('Sinytra')) score += 80;
  if (mod.platform.includes('Sinytra')) score -= 160;
  if (PURE_LIBRARY_MOD_IDS.has(mod.id)) score -= 220;
  if (mod.supersededBy && mod.supersededBy.length > 0) score -= 260;
  if (mod.supersededWhenAll && mod.supersededWhenAll.length > 0) score -= 120;
  if (mod.coveredBy) score -= 220;
  if (isUnsupportedOnForge(mod)) score -= 600;
  return score;
}

export function evaluateAssemblyHealth(selectedIds: string[]) {
  const analysis = analyzeSelection(selectedIds);
  const selectedSet = new Set(selectedIds);

  const essentialGroupIds = [
    'core-renderer',
    'memory-core',
    'tick-physics-engine',
    'block-culling',
    'networking',
  ];

  const missingCoreSlots: MissingSlotWarning[] = [];
  if (selectedIds.length > 0) {
    for (const gid of essentialGroupIds) {
      const grp = MOD_GROUPS.find(g => g.id === gid);
      if (!grp) continue;
      const hasAny = grp.memberIds.some(id => selectedSet.has(id));
      if (!hasAny) {
        const leader = MOD_BY_ID.get(grp.leaderId);
        if (leader) {
          missingCoreSlots.push({
            groupId: grp.id,
            groupTitle: grp.title,
            leaderId: leader.id,
            leaderName: leader.name,
          });
        }
      }
    }
  }

  return {
    ...analysis,
    missingCoreSlots,
  };
}

export function getRecipeBridgeStatus(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs?: AssemblyPreferences
): RecipeBridgeStatus {
  const hasEmi = selectedSet.has('emi');
  const hasJei = selectedSet.has('just-enough-items-jei');
  const hasTmrv = selectedSet.has('tmrv-updated');
  const viewerPref = prefs?.recipeViewer;

  if (mod.platform.includes('Sinytra')) {
    if (prefs && !prefs.allowSinytra) {
      return { compatible: false, reason: 'Прослойка Sinytra Connector выключена' };
    }
    if (selectedSet.has('sinytra-connector') && selectedSet.has('forgified-fabric-api')) {
      return { compatible: true, viaBridge: 'Через прослойку Sinytra Connector' };
    }
  }

  const allowsEmi = viewerPref === 'none' ? false : hasEmi || viewerPref === 'emi' || viewerPref === 'emi-jei';
  const allowsJei = viewerPref === 'none' ? false : hasJei || viewerPref === 'jei' || viewerPref === 'emi-jei';

  if (mod.id === 'emi') {
    if (viewerPref === 'jei' || viewerPref === 'none') {
      return { compatible: false, reason: viewerPref === 'none' ? 'Просмотрщик рецептов отключён' : 'Выбран режим JEI' };
    }
    return { compatible: true };
  }

  if (mod.id === 'just-enough-items-jei') {
    if (viewerPref === 'emi' || viewerPref === 'none') {
      return { compatible: false, reason: viewerPref === 'none' ? 'Просмотрщик рецептов отключён' : 'Выбран режим чистого EMI (без JEI)' };
    }
    return { compatible: true };
  }

  const eco = mod.recipeEcosystem;
  if (!eco) return { compatible: true };

  if (eco === 'emi-only') {
    if (viewerPref === 'jei' || viewerPref === 'none') {
      return { compatible: false, reason: 'Аддон работает только с EMI' };
    }
    if (!allowsEmi && (hasJei || viewerPref !== undefined)) {
      return { compatible: false, reason: 'Требует установленный EMI' };
    }
    return { compatible: true };
  }

  if (eco === 'tmrv-bridge') {
    if (viewerPref === 'none' || viewerPref === 'jei') {
      return { compatible: false, reason: 'Прослойка нужна только для EMI без JEI' };
    }
    if (hasJei || viewerPref === 'emi-jei') {
      return { compatible: false, reason: 'Не нужен при наличии JEI (EMI сам подхватит JEI)' };
    }
    if (!allowsEmi) {
      return { compatible: false, reason: 'Требует установленный EMI' };
    }
    return { compatible: true, viaBridge: 'Прослойка JEI-плагинов для EMI' };
  }

  if (eco === 'jei-engine') {
    if (viewerPref === 'emi' || viewerPref === 'none') {
      return { compatible: false, reason: 'Работает только с самим JEI (не работает в чистом EMI)' };
    }
    if (!allowsJei && (hasEmi || viewerPref !== undefined)) {
      return { compatible: false, reason: 'Требует сам JEI (не работает через TMRV)' };
    }
    return { compatible: true };
  }

  if (eco === 'jei-plugin') {
    if (viewerPref === 'none') {
      return { compatible: false, reason: 'Просмотрщик рецептов отключён' };
    }
    if (allowsJei && viewerPref !== 'emi') {
      if (hasEmi) return { compatible: true, viaBridge: 'Нативный мост EMI + JEI' };
      return { compatible: true };
    }
    if (allowsEmi) {
      if (hasTmrv) {
        return { compatible: true, viaBridge: 'Через прослойку TMRV Updated (EMI)' };
      }
      return { compatible: false, reason: 'В чистом EMI не работает без прослойки TMRV Updated' };
    }
    return { compatible: true };
  }

  if (eco === 'emi-or-jei') {
    if (viewerPref === 'none' && mod.id !== 'fast-recipe-search') {
      return { compatible: false, reason: 'Требует JEI или EMI' };
    }
    return { compatible: true };
  }

  return { compatible: true };
}

export function getModSuperseder(
  mod: ModItem,
  selectedSet?: Set<string>,
  prefs?: AssemblyPreferences,
  allowGlobalSupersede = false
): SupersederInfo | null {
  const activeSet = selectedSet ?? new Set<string>();

  if (mod.supersededWhenAll && mod.supersededWhenAll.length > 0) {
    if (mod.supersededWhenAll.every(id => activeSet.has(id))) {
      const names = mod.supersededWhenAll.map(id => MOD_BY_ID.get(id)?.name || id);
      return {
        byNames: names,
        isActiveInSelection: true,
        reason: `полностью перекрывается более лучшей связкой: ${names.join(' + ')}`,
      };
    }
  }

  if (mod.supersededBy && mod.supersededBy.length > 0) {
    const activeBest = mod.supersededBy.filter(id => activeSet.has(id));
    if (activeBest.length > 0) {
      const names = activeBest.map(id => MOD_BY_ID.get(id)?.name || id);
      return {
        byNames: names,
        isActiveInSelection: true,
        reason: `полностью перекрывается более лучшим: ${names.join(' / ')}`,
      };
    }

    if (allowGlobalSupersede) {
      const viableBest = mod.supersededBy.filter(id => {
        const bm = MOD_BY_ID.get(id);
        if (!bm || isUnsupportedOnForge(bm)) return false;
        if (prefs && !getRecipeBridgeStatus(bm, activeSet, prefs).compatible) return false;
        if (getRuleConflictingIds(bm.id).some(cid => activeSet.has(cid))) return false;
        return true;
      });
      if (viableBest.length > 0) {
        const names = viableBest.map(id => MOD_BY_ID.get(id)?.name || id);
        return {
          byNames: names,
          isActiveInSelection: false,
          reason: `есть более совершенный аналог: ${names.join(' / ')}`,
        };
      }
    }
  }

  if (mod.coveredBy) {
    const activeCover = Array.from(activeSet).some(id => {
      const other = MOD_BY_ID.get(id);
      return other ? matchesCoveredByName(mod.coveredBy, other.name) : false;
    });
    if (activeCover || allowGlobalSupersede) {
      return {
        byNames: [mod.coveredBy],
        isActiveInSelection: activeCover,
        reason: `уже встроено в ${mod.coveredBy}`,
      };
    }
  }

  return null;
}

export function getModRestrictionBadge(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs?: AssemblyPreferences
): { text: string; tone: 'red' | 'amber' | 'violet' | 'sky' } | null {
  if (mod.status === 'danger') {
    return { text: 'Опасно / Плацебо', tone: 'red' };
  }
  if (isUnsupportedOnForge(mod)) {
    const swapId = FABRIC_TO_FORGE_SWAP[mod.id];
    const swapName = swapId ? MOD_BY_ID.get(swapId)?.name : null;
    return {
      text: swapName ? `Только Fabric → есть ${swapName}` : 'Не работает на Forge',
      tone: 'red',
    };
  }

  const sup = getModSuperseder(mod, selectedSet, prefs, true);
  if (sup) {
    return {
      text: mod.coveredBy ? `Уже в ${mod.coveredBy}` : `Перекрыт: ${sup.byNames[0]}`,
      tone: 'amber',
    };
  }

  const bridge = getRecipeBridgeStatus(mod, selectedSet, prefs);
  if (!bridge.compatible) {
    return {
      text: bridge.reason || 'Не подходит к просмотрщику рецептов',
      tone: 'red',
    };
  }

  if (!selectedSet.has(mod.id)) {
    const activeConflicts = getRuleConflictingIds(mod.id)
      .filter(id => selectedSet.has(id))
      .map(id => MOD_BY_ID.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    if (activeConflicts.length > 0) {
      return {
        text: `Конфликт с ${activeConflicts.slice(0, 2).join(', ')}`,
        tone: 'red',
      };
    }

    const missingDeps = getDirectDependencies(mod.id, selectedSet)
      .filter(id => !selectedSet.has(id))
      .map(id => MOD_BY_ID.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    if (missingDeps.length > 0) {
      return {
        text: `Нужен ${missingDeps.join(' + ')}`,
        tone: 'sky',
      };
    }
  }

  if (bridge.viaBridge && mod.recipeEcosystem === 'jei-plugin') {
    return { text: bridge.viaBridge, tone: 'sky' };
  }

  if (NVIDIUM_FAMILY_IDS.has(mod.id) && prefs && prefs.gpu !== 'nvidia') {
    return { text: 'Только NVIDIA GTX 16xx/RTX', tone: 'violet' };
  }
  if (mod.id === 'accelerated-rendering' && prefs && (prefs.goal === 'potato' || prefs.gpu === 'integrated')) {
    return { text: 'OpenGL 4.6 · жрёт VRAM (опасно для встройки)', tone: 'amber' };
  }
  return null;
}

export function isModIncompatibleWithSelection(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs?: AssemblyPreferences
): boolean {
  if (selectedSet.has(mod.id)) return false;
  if (isUnsupportedOnForge(mod)) return true;

  if (!getRecipeBridgeStatus(mod, selectedSet, prefs).compatible) {
    return true;
  }

  if (getRuleConflictingIds(mod.id).some(cid => selectedSet.has(cid))) {
    return true;
  }

  const deps = getTransitiveDependencies(mod.id, new Set(), selectedSet);
  if (
    deps.some(
      depId =>
        !selectedSet.has(depId) &&
        getRuleConflictingIds(depId).some(cid => selectedSet.has(cid))
    )
  ) {
    return true;
  }

  if (
    prefs &&
    !prefs.allowSinytra &&
    (mod.platform.includes('Sinytra') || deps.includes('sinytra-connector'))
  ) {
    return true;
  }

  return false;
}

export function shouldHideMod(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs: AssemblyPreferences | undefined,
  options: { hideIncompatible: boolean; hideUselessCovered: boolean }
): boolean {
  if (selectedSet.has(mod.id)) return false;
  if (options.hideUselessCovered) {
    if (mod.status === 'danger') return true;
    if (isUnsupportedOnForge(mod)) return true;
    if (getModSuperseder(mod, selectedSet, prefs, true) !== null) return true;
  }
  if (options.hideIncompatible && isModIncompatibleWithSelection(mod, selectedSet, prefs)) {
    return true;
  }
  return false;
}

export function getGroupMembersByRole(groupId: string) {
  const group = MOD_GROUPS.find(g => g.id === groupId);
  if (!group) return null;
  const leader = MODS_DATABASE.find(m => m.id === group.leaderId) || null;
  const addons = group.addonIds
    .map(id => MODS_DATABASE.find(m => m.id === id))
    .filter((m): m is ModItem => Boolean(m));
  const excludedSet = new Set([group.leaderId, ...group.addonIds]);
  const removedAnalogs = group.memberIds
    .filter(id => !excludedSet.has(id))
    .map(id => MODS_DATABASE.find(m => m.id === id))
    .filter((m): m is ModItem => Boolean(m));
  return { group, leader, addons, removedAnalogs };
}

const CORE_PILLAR_IDS = new Set([
  'embeddium',
  'emberbium',
  'modernfix',
  'ferritecore',
  'radium-re-reforged',
  'entity-culling',
  'culllessleaves-reforged',
  'enhanced-block-entities-reloaded',
  'noisiumed',
  'clumps',
  'dynamic-fps',
  'ixeris',
  'particle-core',
  'oculus',
  'distant-horizons',
  'nvidium',
  'alloyium',
  'solix',
]);

const HIGH_SYNERGY_IDS = new Set([
  'flerovium',
  'immediatelyfast',
  'alltheleaks-memory-leak-fix',
  'jasione',
  'put-a-plug-in-it-papi',
  'duplicate-nbt-flattener',
  'sodium-chloride',
  'immersive-optimization',
  'badoptimizations',
  'fast-item-frames',
  'structure-layout-optimizer',
  'lightspeedre',
  'fast-recipe-search',
  'just-enough-items-jei',
  'emi',
  'tmrv-updated',
  'fastali',
]);

const NETWORK_MULTIPLAYER_IDS = new Set([
  'krypton-reno',
  'krypton-hybrid',
  'krypton-foxified',
  'aegisnetworking-krypton-hybrid',
  'pluto',
  'servercore',
  'connectivity',
  'vmp-forge',
  'very-many-players-vmp',
  'fast-ip-ping',
  'better-ping-display',
  'zstdnet',
  'packet-capper',
  'hp-hariplayer',
  'tcp-nodeway',
  'client-mixin-intercept',
]);

const CONTENT_FIX_IDS = new Set([
  'qnm-quark',
  'alltheleaks-fix-for-moonlight-2-13-4',
  'thirst-was-taken-mixin-server-fix-thirst-was-taken',
  'unofficial-luxium-compatibility-luxium-oculus',
  'embeddium-x-polytone-block-colormap-fix-polytone',
  'departure-inventory-halo-fix-tinker-s-domain',
  'iron-s-spells-anvil-on-demand-iron-s-spells',
  'qubit-s-aaa-tweaks-aaaparticles',
  'tom-s-simple-storage-performance-optimization',
  'bons-dlss-diet-complementary-unbound',
]);

const WORLDGEN_THREAD_IDS = new Set([
  'concurrent-chunk-management-engine-forge-c2me',
  'c2me-concurrent-chunk-management-engine',
  'c2mer',
  'hc-harichunk',
  'dimensional-threading-reforked',
]);

const HIGH_VRAM_IDS = new Set([
  'accelerated-rendering',
  'accelerated-rendering-turned',
  'nvidium',
  'distant-horizons',
  'oculus',
  'emberlens',
]);

const EXPLICIT_RESOURCE_PROFILES: Record<string, ModResourceProfile> = {
  nvidium: {
    gains: ['FPS вдали +3×–10× без шейдеров', 'Сильно разгружает CPU от геометрии чанков'],
    costs: ['GPU Mesh Shaders ↑ (только NVIDIA GTX 16xx / RTX)', 'VRAM +400–1200 МБ', 'Шейдеры (Oculus / Emberlens) не работают'],
    shortTag: 'FPS ↑↑↑ · но VRAM +0.5–1.2 ГБ, без шейдеров',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 2,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Переносит геометрию далёких чанков в Mesh Shaders NVIDIA GPU: FPS резко растёт и разгружается процессор, но видеопамять (VRAM) расходуется заметно активнее, а шейдеры блокируются.',
  },
  'accelerated-rendering': {
    gains: ['FPS в толпах мобов/сундуков ↑↑', 'Ускоряет скиннинг и трансформации моделей'],
    costs: ['GPU Compute ↑↑ (OpenGL 4.6)', 'VRAM +1–2.5 ГБ (нужно 8+ ГБ VRAM)', 'На 4–6 ГБ картах возможны статтеры/вылеты'],
    shortTag: 'FPS в толпах ↑↑ · но GPU ↑↑ и VRAM +1–2.5 ГБ',
    hasTradeoff: true,
    gpuLoad: 2,
    vramLoad: 2,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Выносит анимации сотен мобов, брони и блоков на вычислительные шейдеры видеокарты. Даёт мощный скачок FPS в густых фермах, но сильно нагружает GPU и требует 8+ ГБ VRAM.',
  },
  'accelerated-rendering-turned': {
    gains: ['FPS в толпах мобов ↑↑ (адаптированный порт)'],
    costs: ['GPU Compute ↑↑', 'VRAM +1–2.5 ГБ (рекомендуется 8+ ГБ VRAM)'],
    shortTag: 'FPS в толпах ↑↑ · но GPU ↑↑ и VRAM +1–2.5 ГБ',
    hasTradeoff: true,
    gpuLoad: 2,
    vramLoad: 2,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Альтернативная ветка Accelerated Rendering с тем же принципом: разгружает CPU ценой высокой нагрузки на GPU и большого объёма видеопамяти.',
  },
  alloyium: {
    gains: ['FPS +30–60% на дальних дистанциях', 'Работает на любых GPU и с шейдерами Oculus'],
    costs: ['GPU Compute ↑ (OpenGL 4.3+)', 'VRAM +200–500 МБ'],
    shortTag: 'FPS ↑ / CPU ↓ · но GPU и VRAM ↑',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 1,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Использует OpenGL Compute на видеокарте для отсечения невидимой геометрии и батчинга. В отличие от Nvidium совместим с AMD/Intel и Oculus, но слегка догружает GPU и VRAM.',
  },
  'revidium-accedium': {
    gains: ['FPS ↑ (альтернатива Nvidium для любых GPU)'],
    costs: ['GPU Compute ↑', 'VRAM +250–600 МБ', 'Несовместим с шейдерами и Emberbium'],
    shortTag: 'FPS ↑ · но GPU/VRAM ↑, без шейдеров',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 1,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Переносит вычисления видимости геометрии на GPU поверх Embeddium: поднимает FPS на слабом CPU, но повышает загрузку GPU/VRAM и конфликтует с Oculus.',
  },
  flywheel: {
    gains: ['FPS на механизмах Create и кинетике ↑↑', 'Снижает нагрузку на рендер-поток CPU'],
    costs: ['GPU Instancing ↑', 'VRAM +150–400 МБ под буферы инстансов'],
    shortTag: 'FPS на механизмах ↑↑ · но GPU/VRAM ↑',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 1,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Переводит рендеринг вращающихся шестерён и механизмов Create на аппаратный GPU-инстансинг: разгружает процессор и поднимает FPS на базах за счёт небольшой доп. нагрузки на GPU и VRAM.',
  },
  vanillin: {
    gains: ['FPS у складов, сундуков, вагонеток и рамок ↑↑', 'Разгрузка CPU-рендера'],
    costs: ['GPU Instancing ↑ (требует Flywheel)', 'VRAM +100–300 МБ'],
    shortTag: 'FPS на складах ↑↑ · но GPU/VRAM ↑',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 1,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Расширяет GPU-инстансинг Flywheel на ванильные сундуки, таблички и сущности — значительно выше FPS ценой умеренной нагрузки на GPU и видеопамять.',
  },
  oculus: {
    gains: ['Включает шейдеры (тени, вода, объёмный свет)'],
    costs: ['GPU ↑↑ (до 95–100% загрузки)', 'VRAM +0.5–1.5 ГБ', 'FPS ↓↓ (в 1.5–4 раза ниже)'],
    shortTag: 'Визуал ↑↑ · но GPU ↑↑, VRAM ↑↑, FPS ↓↓',
    hasTradeoff: true,
    gpuLoad: 2,
    vramLoad: 2,
    cpuLoad: 1,
    ramLoad: 0,
    tradeoffNote:
      'Визуальный шейдер-мод на Forge (порт Iris): добавляет тяжёлые проходы теней и постобработки, резко нагружая видеокарту, VRAM и снижая итоговый FPS.',
  },
  emberlens: {
    gains: ['Шейдеры поверх Emberbium'],
    costs: ['GPU ↑↑', 'VRAM +0.5–1.5 ГБ', 'FPS ↓↓', 'Экспериментальная совместимость с паками'],
    shortTag: 'Визуал ↑↑ · но GPU ↑↑, VRAM ↑↑, FPS ↓↓',
    hasTradeoff: true,
    gpuLoad: 2,
    vramLoad: 2,
    cpuLoad: 1,
    ramLoad: 0,
    tradeoffNote:
      'Шейдерный движок под Emberbium: как и Oculus, не повышает производительность, а обменивает ресурсы GPU, VRAM и FPS на шейдерную картинку.',
  },
  'faster-iris-shadow-mapper': {
    gains: ['FPS с включёнными шейдерами ↑ (+10–25%)'],
    costs: ['Работает только при активном Oculus/шейдерах'],
    shortTag: 'FPS с шейдерами ↑ · легче проход теней',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Уменьшает накладные расходы при отрисовке shadow-map проходов в шейдерах без лишнего расхода VRAM.',
  },
  'bons-dlss-diet-complementary-unbound': {
    gains: ['FPS с тяжёлыми шейдерами ↑↑', 'Сильно разгружает слабую GPU при шейдерах'],
    costs: ['Снижает разрешение рендера + отключает часть эффектов шейдера', 'Умеренное мыло/мерцание вдали'],
    shortTag: 'FPS с шейдерами ↑↑ · но чёткость и эффекты ↓',
    hasTradeoff: true,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Спец-твик с апскейлом и облегчённым рендером под шейдеры: существенно разгружает видеокарту ценой снижения чёткости и части постобработки.',
  },
  embeddium: {
    gains: ['Базовый FPS ↑↑↑ (+2×–4× к ванили)', 'Меньше статтеров и нагрузка CPU/GPU ↓'],
    costs: ['Полностью заменяет ванильный рендерер чанков (стандарт совместимости Forge)'],
    shortTag: 'FPS ↑↑↑ · основа рендера (CPU/GPU ↓)',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -2,
    ramLoad: 0,
    tradeoffNote:
      'Переписывает ванильный рендер чанков без перерисовок лишних буферов. Даёт максимальный базовый прирост FPS при снижении нагрузки на процессор и GPU.',
  },
  emberbium: {
    gains: ['Базовый FPS ↑↑↑', 'Radix-сортировка полупрозрачных блоков (выше стабильность кадра)'],
    costs: ['Отдельные Embeddium 0.3-аддоны несовместимы (Acedium, Sightline, Fovea)'],
    shortTag: 'FPS ↑↑↑ · Radix-сортировка (часть старых аддонов несовм.)',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -2,
    ramLoad: 0,
    tradeoffNote:
      'Современный преемник Embeddium с более быстрым батчингом и сортировкой геометрии: снижает нагрузку на CPU и GPU, но не подходит для части аддонов под старый API Embeddium 0.3.31.',
  },
  flerovium: {
    gains: ['Предметы +50% FPS, частицы +50%, сущности +30%', 'Разгрузка рендер-потока CPU и GPU'],
    costs: ['Без лишнего расхода VRAM и без потери качества'],
    shortTag: 'FPS предметов/частиц ↑↑ · CPU/GPU ↓',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Оптимизирует вызовы отрисовки 3D-предметов, частиц и сущностей поверх Embeddium/Emberbium без дополнительных затрат памяти.',
  },
  immediatelyfast: {
    gains: ['FPS в инвентаре, HUD, шрифтах, картах и 2D-частицах ↑↑'],
    costs: ['Миниатюрный буфер батчинга в памяти, без просадок'],
    shortTag: 'HUD / GUI / шрифты ↑↑ · CPU/GPU ↓',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Батчит Immediate-Mode вызовы OpenGL (текст, кнопки, инвентари, таблички), снижая число draw-calls на видеокарту и CPU.',
  },
  'amd-fsr-upscaler-render-scale-for-embeddium': {
    gains: ['FPS ↑↑ на слабой видеокарте / встройке', 'Загрузка GPU ↓↓'],
    costs: ['Чёткость картинки ↓ (внутреннее разрешение 50–80%)', 'Лёгкое мыло текста/листвы вдали'],
    shortTag: 'FPS ↑↑ / GPU ↓↓ · но чёткость картинки ↓',
    hasTradeoff: true,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Рендерит 3D-мир в пониженном разрешении и восстанавливает детали фильтром AMD FSR. Сильно снижает нагрузку на GPU, но делает контуры и мелкую листву мягче.',
  },
  renderscale: {
    gains: ['FPS ↑↑ на слабой GPU / 4K-экранах', 'GPU ↓↓'],
    costs: ['Чёткость 3D-рендера ↓ (интерфейс остаётся чётким)'],
    shortTag: 'FPS ↑↑ / GPU ↓↓ · но чёткость 3D ↓',
    hasTradeoff: true,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Понижает разрешение только 3D-сцены, оставляя чёткий UI — спасает слабые видеокарты ценой снижения резкости картинки.',
  },
  'super-resolution': {
    gains: ['FPS ↑↑ с апскейлерами (FSR1/NIS/SGSR)', 'GPU ↓↓'],
    costs: ['Снижение чёткости рендера', 'Доп. настройка совместимости с шейдерами'],
    shortTag: 'FPS ↑↑ / GPU ↓↓ · но чёткость ↓',
    hasTradeoff: true,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Продвинутый апскейл 3D-кадра с выбором алгоритма. Сильно снижает пиксельную нагрузку на GPU ценой лёгких артефактов масштабирования.',
  },
  purescale: {
    gains: ['FPS ↑↑ на слабой GPU', 'GPU ↓↓'],
    costs: ['Пониженное разрешение 3D-мира (чёткость ↓)'],
    shortTag: 'FPS ↑↑ / GPU ↓↓ · но чёткость ↓',
    hasTradeoff: true,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Масштабирует буфер рендеринга ниже нативного разрешения экрана ради снижения загрузки видеокарты.',
  },
  'upscalecraft-forge': {
    gains: ['FPS ↑ на слабых видеокартах', 'GPU ↓'],
    costs: ['Снижение резкости 3D-кадра'],
    shortTag: 'FPS ↑ / GPU ↓ · но чёткость ↓',
    hasTradeoff: true,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Уменьшает внутреннее разрешение рендера: освобождает GPU в тяжёлых сценах ценой мыла на дальних объектах.',
  },
  'distant-horizons': {
    gains: ['Горизонты LOD на 128–512 чанков вперёд', 'Позволяет снизить ванильный Render Distance ради FPS'],
    costs: ['CPU ↑↑ (генерация LOD-чанк кэша)', 'RAM +1–2.5 ГБ', 'VRAM +0.4–1 ГБ + место на диске'],
    shortTag: 'Обзор ↑↑↑ · но CPU ↑↑ и RAM +1–2 ГБ',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 1,
    cpuLoad: 2,
    ramLoad: 2,
    tradeoffNote:
      'Заменяет далёкие чанки на лёгкие LOD-модели. Даёт огромную дальность при умеренной нагрузке на GPU, но фоновая сборка LOD сильно нагружает процессор, ОЗУ и накопитель.',
  },
  'distant-horizons-memory-fix-dh': {
    gains: ['Убирает утечки RAM/буферов при связке DH + шейдеры'],
    costs: ['Работает только как страховка для Distant Horizons'],
    shortTag: 'ОЗУ для DH ↓ · чинит утечки LOD + шейдеров',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: -1,
    cpuLoad: 0,
    ramLoad: -1,
    tradeoffNote:
      'Предотвращает утечки памяти при долгой игре с Distant Horizons и шейдерами Oculus.',
  },
  'bobby-reforged': {
    gains: ['Дальний обзор сохранённых чанков на серверах'],
    costs: ['RAM и VRAM ↑ пропорционально радиусу', 'GPU ↑ больше чанков в кадре'],
    shortTag: 'Обзор на сервере ↑ · но RAM/VRAM/GPU ↑',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 1,
    cpuLoad: 0,
    ramLoad: 1,
    tradeoffNote:
      'Держит в клиенте дополнительные серверные чанки выше лимита сервера — повышает расход ОЗУ, видеопамяти и геометрическую нагрузку GPU.',
  },
  farsight: {
    gains: ['Показывает закэшированные дальние чанки на сервере'],
    costs: ['RAM/VRAM ↑ при высоком кэше чанков', 'Не нужен вместе с Distant Horizons'],
    shortTag: 'Обзор на сервере ↑ · но RAM/VRAM ↑',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 1,
    cpuLoad: 0,
    ramLoad: 1,
    tradeoffNote:
      'Кэширует клиентские чанки поверх лимита сервера: заметно повышает нагрузку GPU и памяти на высоком радиусе.',
  },
  'concurrent-chunk-management-engine-forge-c2me': {
    gains: ['Генерация и I/O чанков ↑↑↑ (полёт на элитрах без пустых дыр)'],
    costs: ['CPU ↑↑ (нагружает все свободные потоки)', 'RAM +0.5–1.5 ГБ под асинхронные буферы'],
    shortTag: 'Чанки ↑↑↑ · но CPU ↑↑ и RAM +0.5–1.5 ГБ',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 2,
    ramLoad: 1,
    tradeoffNote:
      'Переводит генерацию, освещение и сохранение чанков в многопоточный режим. На 8+ ядрах многократно ускоряет мир, на слабых 4–6-поточных CPU и малой ОЗУ может вызывать микрофризы.',
  },
  'c2me-concurrent-chunk-management-engine': {
    gains: ['Генерация и I/O чанков ↑↑↑ (оригинальный Fabric через Sinytra)'],
    costs: ['CPU ↑↑ (все потоки)', 'RAM +0.5–1.5 ГБ', 'Требует Sinytra + настройку noTickViewDistance'],
    shortTag: 'Чанки ↑↑↑ · но CPU ↑↑, RAM ↑ и Sinytra',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 2,
    ramLoad: 1,
    tradeoffNote:
      'Fabric-версия C2ME через Sinytra Connector: сильно ускоряет генерацию, но заметно грузит CPU, ОЗУ и требует внимательной настройки конфига.',
  },
  c2mer: {
    gains: ['Многопоточная генерация и загрузка чанков ↑↑'],
    costs: ['CPU ↑↑', 'RAM +0.5–1.2 ГБ'],
    shortTag: 'Чанки ↑↑ · но CPU ↑↑ и RAM ↑',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 2,
    ramLoad: 1,
    tradeoffNote:
      'Альтернативный Forge-порт C2ME: ускоряет прогрузку мира за счёт повышенной утилизации ядер CPU и оперативной памяти.',
  },
  'hc-harichunk': {
    gains: ['Агрессивное распараллеливание тиков/генерации чанков'],
    costs: ['CPU ↑↑', 'RAM ↑', 'Экспериментальная стабильность (риск десинков)'],
    shortTag: 'Чанки ↑↑ · но CPU ↑↑ и экспериментальный риск',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 2,
    ramLoad: 1,
    tradeoffNote:
      'Экспериментальный многопоточный менеджер чанков: нагружает CPU/RAM и может конфликтовать с другими модами мира.',
  },
  'dimensional-threading-reforked': {
    gains: ['Разносит измерения (Overworld/Nether/End) в отдельные потоки CPU'],
    costs: ['CPU ↑ при активных фермах в нескольких мирах', 'Высокий риск несовместимости со сложными модами'],
    shortTag: 'TPS разных миров ↑ · но CPU ↑ и риск крашей',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 1,
    ramLoad: 0,
    tradeoffNote:
      'Тикает измерения параллельно — полезно только на загруженных серверах с несколькими активными мирами; риск гонок потоков.',
  },
  noisiumed: {
    gains: ['Ускоряет генерацию шума биомов и чанков на 15–30%', 'Меньше статтеров при разведке'],
    costs: ['Практически нулевой оверхед'],
    shortTag: 'Генерация ↑ · без лишней нагрузки ПК',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Переписывает математику генератора чанков без многопоточного раздувания памяти — чистая экономия CPU при генерации мира.',
  },
  'structure-layout-optimizer': {
    gains: ['Генерация данжей/Jigsaw-структур и поиск кладов ↑↑'],
    costs: ['Без дополнительных затрат CPU/RAM'],
    shortTag: 'Структуры ↑↑ · без нагрузки ПК',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Оптимизирует коллизии при размещении крупных структур (деревни, крепости, данжи модов) без потери точности генерации.',
  },
  'entity-culling': {
    gains: ['FPS на базах и городах ↑↑', 'Отсекает невидимые за стенами сущности и блоки'],
    costs: ['Лёгкий фоновый поток трассировки (1 поток CPU)', 'На резком повороте камеры единичный силуэт может появиться на кадр позже'],
    shortTag: 'FPS ↑↑ / GPU ↓ · лёгкий фоновый луч CPU',
    hasTradeoff: false,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Не рендерит мобов, сундуки и таблички, скрытые за стенами — сильно разгружает GPU и основной поток рендера за счёт лёгкой асинхронной проверки видимости.',
  },
  'more-culling-reforged': {
    gains: ['FPS ↑ за счёт отсечения невидимых граней блоков и рамок'],
    costs: ['На агрессивном профиле возможны мелкие просветы граней ступенек/листвы'],
    shortTag: 'FPS ↑ / GPU ↓ · тонкие артефакты лишь на агрессивном профиле',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Сокращает количество лишних треугольников у блоков, табличек и рамок — снижает нагрузку на видеокарту без лишнего расхода памяти.',
  },
  'culllessleaves-reforged': {
    gains: ['FPS в густых лесах и джунглях ↑↑', 'GPU ↓↓ (внутренняя листва не рисуется)'],
    costs: ['Кроны деревьев выглядят чуть менее «сквозными» внутри (по умолчанию глубина 2 слоя)'],
    shortTag: 'FPS в лесу ↑↑ / GPU ↓ · чуть плотнее кроны',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Отсекает внутренние слои листьев в густых кронах деревьев — заметно разгружает GPU на модных лесных биомах.',
  },
  'enhanced-block-entities-reloaded': {
    gains: ['FPS на больших складах сундуков/шалкеров ↑↑'],
    costs: ['Использует запечённые модели вместо динамического рендера (нужен MatLib)'],
    shortTag: 'FPS на складах ↑↑ / GPU ↓ · запечённые сундуки',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Превращает сундуки, кровати и таблички в быстрые модели чанков: резко разгружает CPU и GPU на складах без значимых затрат VRAM.',
  },
  modernfix: {
    gains: ['ОЗУ ↓↓ (−1–2.5 ГБ в крупных сборках)', 'Время запуска игры и перезагрузки ресурсов ↑↑'],
    costs: ['Динамическая загрузка моделей экономит память ценой доли секунды при первой отрисовке редкого блока'],
    shortTag: 'ОЗУ ↓↓ / Старт ↑↑ · ленивые модели',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: -2,
    tradeoffNote:
      'Главный оптимизатор памяти и старта Forge: убирает дублирование данных, ускоряет загрузку и радикально снижает потребление ОЗУ.',
  },
  ferritecore: {
    gains: ['ОЗУ ↓↓ (−25–45% на состояниях блоков и коллекциях)', 'Меньше GC-фризов'],
    costs: ['Нет заметных минусов или визуальных компромиссов'],
    shortTag: 'ОЗУ ↓↓ / GC ↓ · без нагрузки ПК',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: -2,
    tradeoffNote:
      'Классическая структурная оптимизация памяти для BlockState и таблиц Minecraft — экономит сотни мегабайт RAM даже на ванили.',
  },
  'alltheleaks-memory-leak-fix': {
    gains: ['ОЗУ ↓↓ при долгой игре и перезаходе в миры', 'Устраняет утечки памяти 40+ популярных модов'],
    costs: ['Отсутствуют'],
    shortTag: 'ОЗУ ↓↓ · закрывает утечки в долгих сессиях',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: -2,
    tradeoffNote:
      'Чинит утечки объектов мира, сущностей и клиентских кэшей в десятках контент-модов, предотвращая деградацию FPS спустя 1–2 часа игры.',
  },
  jasione: {
    gains: ['ОЗУ ↓ и меньше микрофризов GC'],
    costs: ['Работает незаметно в фоне'],
    shortTag: 'ОЗУ ↓ / GC ↓ · без нагрузки ПК',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: -2,
    tradeoffNote:
      'Кэширует одноразовые аллокации и снижает давление на сборщик мусора Java в тяжёлых сборках.',
  },
  gputape: {
    gains: ['VRAM ↓ — периодически очищает зависшие буферы OpenGL'],
    costs: ['Без заметных просадок'],
    shortTag: 'VRAM ↓ · чистка видеопамяти',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: -1,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Контролирует освобождение старых GPU-буферов при частой смене чанков или ресурс-паков, особенно полезен на 4–6 ГБ VRAM.',
  },
  'fix-gpu-memory-leak': {
    gains: ['VRAM ↓ — закрывает утечку памяти GPU после выхода из мира'],
    costs: ['Без нагрузки ПК'],
    shortTag: 'VRAM ↓ · чинит утечки при смене мира',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: -1,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Сбрасывает текстурные и буферные ссылки GPU при смене миров и измерений.',
  },
  ksyxis: {
    gains: ['Вход в мир ↑↑ (ускоряет загрузку мира в 2–3×)'],
    costs: ['Отключает постоянную прогрузку spawn-чанков (автофермы на спавне встают вдали)'],
    shortTag: 'Вход ↑↑ · но отключает spawn-чанки',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: -1,
    tradeoffNote:
      'Пропускает генерацию и удержание в памяти 19×19 чанков спавна: мир открывается быстрее и экономит ОЗУ, но постоянные фермы на спавне перестают работать без игрока.',
  },
  fastload: {
    gains: ['Вход в мир ↑ (меньше начальный радиус загрузки чанков)'],
    costs: ['Активная пиковая работа диска при старте'],
    shortTag: 'Вход в мир ↑ · быстрее прогрузка',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Оптимизирует окно ожидания при загрузке первых чанков при входе в мир, не отключая механику spawn-чанков.',
  },
  'dynamic-fps': {
    gains: ['GPU и CPU ↓↓ при свёрнутом окне / простое', 'Экономит заряд и температуру'],
    costs: ['FPS ограничивается (1–15 FPS) только когда окно Minecraft неактивно'],
    shortTag: 'GPU/CPU в фоне ↓↓ · экономит нагрев',
    hasTradeoff: false,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: -2,
    ramLoad: 0,
    tradeoffNote:
      'Автоматически сбрасывает частоту кадров при потере фокуса окна или в фоне, почти до нуля снижая нагрузку на GPU и процессор.',
  },
  restmode: {
    gains: ['GPU/CPU ↓↓ в простое и паузе'],
    costs: ['Снижает FPS в меню паузы/фоне'],
    shortTag: 'GPU/CPU в фоне ↓↓',
    hasTradeoff: false,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: -2,
    ramLoad: 0,
    tradeoffNote:
      'Уводит рендер в энергосберегающий режим при отсутствии активности или свёрнутом окне.',
  },
  framepacer: {
    gains: ['Выравнивает время кадра и снижает лишний нагрев GPU в простое'],
    costs: ['Минимальные'],
    shortTag: 'Фреймтайм ↑ / фон GPU ↓',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote:
      'Сглаживает скачки frame-time и понижает ненужную перегрузку видеокарты в статичных меню.',
  },
  'idle-boost': {
    gains: ['GPU/CPU в фоне ↓↓'],
    costs: ['Ограничивает частоту кадров при бездействии'],
    shortTag: 'GPU/CPU в фоне ↓↓',
    hasTradeoff: false,
    gpuLoad: -2,
    vramLoad: 0,
    cpuLoad: -2,
    ramLoad: 0,
    tradeoffNote:
      'Понижает энергопотребление системы, ограничивая кадры при простое.',
  },
  'radium-re-reforged': {
    gains: ['TPS ↑↑ (быстрее ИИ, коллизии, вода, блоки, красные схемы)', 'Серверный поток CPU ↓↓'],
    costs: ['Минимальные; редкие мелкие конфиг-тогглы при очень нестандартных фермах'],
    shortTag: 'TPS ↑↑ / CPU ↓↓ · чистая оптимизация',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -2,
    ramLoad: 0,
    tradeoffNote:
      'Масштабная алгоритмическая переработка серверных тиков (порт Lithium с фиксом совместимости Forge, Create и C2ME) без затрат GPU или памяти.',
  },
  'immersive-optimization': {
    gains: ['TPS на фермах и с десятками мобов ↑↑', 'CPU тики сущностей ↓'],
    costs: ['Дальние сущности тикают реже (мягкий адаптивный троттлинг ИИ)'],
    shortTag: 'TPS ↑↑ / CPU ↓↓ · мягкий троттлинг дальних мобов',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -2,
    ramLoad: 0,
    tradeoffNote:
      'Снижает частоту обновления ИИ у далёких мобов и сущностей, резко освобождая процессор в загруженных фермах ценой лёгкого замедления реакций на дистанции.',
  },
  'let-me-despawn': {
    gains: ['TPS и RAM ↑ на сервере (убирает накопление застрявших мобов с лутом)'],
    costs: ['Мобы с подобранными вещами могут деспавниться (выпавший предмет сохраняется в списке исключений на выбор)'],
    shortTag: 'TPS ↑ · чистит мобов с лутом (настраивается)',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: -1,
    tradeoffNote:
      'Не позволяет зомби/скелетам со случайным лутом вечно висеть в загруженных чанках — освобождает лимит спавна и CPU, если не отключить деспавн для нужных вещей.',
  },
  'sinytra-connector': {
    gains: ['Открывает доступ к Fabric-модам (Nvidium, C2ME и др.) внутри Forge 1.20.1'],
    costs: ['Увеличивает время запуска на 5–15 сек.', 'RAM +150–300 МБ на трансляцию миксинов'],
    shortTag: 'Мост Fabric · старт +5–15с и ОЗУ +200 МБ',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 1,
    ramLoad: 1,
    tradeoffNote:
      'Прослойка совместимости без прямого ускорения игры: оправдана только при наличии активных Fabric-модов вроде Nvidium.',
  },
  spark: {
    gains: ['Точный поиск лагов TPS, фризов FPS и утечек ОЗУ (/spark profiler)'],
    costs: ['Прямого прироста FPS не даёт (0%)', 'Фоновый расход ~0.5% лишь во время записи профиля'],
    shortTag: 'Диагностика (0% FPS) · без нагрузки ПК',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote:
      'Диагностический профайлер: не ускоряет кадры сам по себе, но незаменим для поиска тяжёлых модов и лаг-машин.',
  },
  voxy: {
    gains: ['LOD-чанки на сотни чанков вперёд (конкурент Distant Horizons)'],
    costs: ['GPU Compute и VRAM ↑↑', 'Экспериментально на Forge (через Sinytra)'],
    shortTag: 'LOD-обзор ↑↑ · но GPU/VRAM ↑↑ и Sinytra',
    hasTradeoff: true,
    gpuLoad: 2,
    vramLoad: 2,
    cpuLoad: 1,
    ramLoad: 1,
    tradeoffNote: 'Воксельный LOD-рендер через Sinytra Connector: заметно нагружает GPU и VRAM и повышает риск визуальных глитчей.',
  },
  'sodium-fovea': {
    gains: ['Повышает FPS за счёт снижения детализации периферийных чанков'],
    costs: ['Экспериментальный рендер-хук', 'Несовместим с Emberbium'],
    shortTag: 'FPS ↑ · экспериментальный рендер',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 1,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Фовеальный/периферийный LOD для Embeddium 0.3: экспериментальные шейдеры и риск артефактов на краях поля зрения.',
  },
  'maple-mesh-render': {
    gains: ['Ускоряет построение мешей чанков поверх Embeddium'],
    costs: ['Экспериментальный хук мешинга'],
    shortTag: 'Меши чанков ↑ · экспериментально',
    hasTradeoff: true,
    gpuLoad: 1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Альтернативный конвейер сборки мешей чанков: возможны визуальные артефакты с ресурс-паками.',
  },
  shadowlod: {
    gains: ['FPS с шейдерами ↑ за счёт LOD теней на дистанции'],
    costs: ['Работает только при активных шейдерах', 'Мелкие тени вдали упрощаются'],
    shortTag: 'FPS с шейдерами ↑ · легче тени',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote: 'Оптимизирует отрисовку далёких теней в Oculus/Emberlens, снижая нагрузку на GPU без потери чёткости вблизи.',
  },
  'unofficial-luxium-compatibility-luxium-oculus': {
    gains: ['Фиксит визуальные баги освещения Luxium + Oculus'],
    costs: ['Нужен только при наличии Oculus и Luxium'],
    shortTag: 'Фикс Oculus + Luxium · без нагрузки',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote: 'Узкопрофильный мост совместимости для связки освещения Luxium и шейдеров Oculus.',
  },
  dynamicrenderdistance: {
    gains: ['Автоматически держит целевой FPS за счёт дальности прорисовки'],
    costs: ['Дальность обзора плавает в тяжёлых сценах'],
    shortTag: 'Стабильный FPS · авто-радиус чанков',
    hasTradeoff: true,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Адаптивно урезает Render Distance при просадках FPS: спасает кадры, но сокращает горизонт в плотных локациях.',
  },
  badoptimizations: {
    gains: ['Микро-оптимизации неба, тостов, фоновых проверок и частиц'],
    costs: ['Практически нулевой оверхед'],
    shortTag: 'Микро-FPS/CPU ↑ · без нагрузки ПК',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Убирает десяток лишних ванильных вычислений (цвет неба на каждом кадре, проверки тостов и т.д.).',
  },
  ixeris: {
    gains: ['Выносит опрос ввода мыши и окна из рендер-потока (ровнее фреймтайм)'],
    costs: ['Некоторые старые оверлей-моды требуют проверки ввода'],
    shortTag: 'Фреймтайм и отзывчивость ↑ · CPU ↓',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Развязывает polling ввода GLFW от главного потока рендеринга, убирая микростаттеры камеры.',
  },
  'particle-core': {
    gains: ['Куллинг и оптимизация рендера/тиков частиц (+FPS при эффектах)'],
    costs: ['Нужны Kotlin for Forge и Fzzy Config'],
    shortTag: 'Частицы/FPS ↑ · без лишней нагрузки',
    hasTradeoff: false,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Отсекает невидимые частицы и оптимизирует их спавн/отрисовку с заметным эффектом в боях и у ферм.',
  },
  servercore: {
    gains: ['Динамическая дистанция тиков и защита TPS на загруженных серверах'],
    costs: ['При перегрузке сокращает радиус активации далёких мобов'],
    shortTag: 'Серверный TPS ↑↑ · адаптирует дальность тиков',
    hasTradeoff: true,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -2,
    ramLoad: 0,
    tradeoffNote: 'Мощнейший контроллер серверного TPS: снижает нагрузку CPU в онлайне, почти не нужен в спокойном одиночном мире.',
  },
  clumps: {
    gains: ['Объединяет сферы опыта в один объект (убирает лаги на фермах XP)'],
    costs: ['Отсутствуют'],
    shortTag: 'TPS/FPS на фермах ↑↑ · без нагрузки',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Сливает сотни сфер опыта в единую сущность, предотвращая просадки на фермах и после убийства боссов.',
  },
  'packet-fixer': {
    gains: ['Предотвращает сетевые вылеты из-за переполнения NBT/пакетов в крупных паках'],
    costs: ['Прямого FPS не даёт, критичен для 150+ модов'],
    shortTag: 'Стабильность сети/NBT ↑ · без нагрузки',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: 0,
    ramLoad: 0,
    tradeoffNote: 'Расширяет лимиты размеров пакетов и NBT Forge 1.20.1, устраняя кики и краши при входе в мир.',
  },
  solix: {
    gains: ['Быстрый движок расчёта света в чанках (адаптация Starlight с фиксом Create)'],
    costs: ['Отсутствуют'],
    shortTag: 'Свет/генерация ↑↑ · без нагрузки ПК',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Переписывает ванильный движок освещения без конфликтов с Create и без затрат на видеокарту.',
  },
  'smooth-boot-reloaded': {
    gains: ['Распределяет потоки запуска Forge — игра не вешает весь ПК при старте'],
    costs: ['Без просадок в игре'],
    shortTag: 'Старт и потоки ↑ · комфорт CPU',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Ограничивает агрессивный захват всех ядер при инициализации сборки, снижая фризы запуска.',
  },
  lightspeedre: {
    gains: ['Ускоряет загрузку и кэширование ресурсов Forge на старте'],
    costs: ['Отсутствуют'],
    shortTag: 'Запуск сборки ↑ · без нагрузки',
    hasTradeoff: false,
    gpuLoad: 0,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Оптимизирует этапы инициализации Forge и загрузки моделей при запуске клиента/сервера.',
  },
  xenon: {
    gains: ['Форк Rubidium — базовый FPS ↑'],
    costs: ['Уступает Embeddium/Emberbium по стабильности и совместимости аддонов'],
    shortTag: 'Рендер (устар. форк) · лучше Embeddium',
    hasTradeoff: true,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Устаревший форк Sodium для Forge: перекрыт Embeddium и Emberbium с лучшей совместимостью.',
  },
  rubidium: {
    gains: ['Старый базовый рендерер'],
    costs: ['Заброшен, многочисленные баги и краши с современными модами'],
    shortTag: 'Устарел · замените на Embeddium',
    hasTradeoff: true,
    gpuLoad: -1,
    vramLoad: 0,
    cpuLoad: -1,
    ramLoad: 0,
    tradeoffNote: 'Архивный порт Sodium: замените на Embeddium или Emberbium.',
  },
};

export function getModResourceProfile(mod: ModItem): ModResourceProfile {
  const explicit = EXPLICIT_RESOURCE_PROFILES[mod.id];
  if (explicit) return explicit;

  if (mod.status === 'danger') {
    return {
      gains: ['Реального прироста производительности не даёт'],
      costs: [mod.warning || 'Высокий риск фризов, крашей, утечек памяти или поломки логики игры'],
      shortTag: 'Плацебо / риск краша · нагружает или ломает игру',
      hasTradeoff: true,
      gpuLoad: 0,
      vramLoad: 0,
      cpuLoad: 1,
      ramLoad: 1,
      tradeoffNote:
        mod.warning || 'Мод относится к категории опасных/плацебо: пользы нет, зато возможны статтеры, утечки или порча мира.',
    };
  }

  if (PURE_LIBRARY_MOD_IDS.has(mod.id) || SINYTRA_BRIDGE_IDS.has(mod.id)) {
    const isBridge = SINYTRA_BRIDGE_IDS.has(mod.id);
    return {
      gains: [isBridge ? 'Мост запуска Fabric-модов на Forge' : 'Опорная библиотека для зависимых модов'],
      costs: [isBridge ? 'Время запуска и ОЗУ чуть выше без целевых модов' : 'Сама по себе FPS/TPS не повышает'],
      shortTag: isBridge ? 'Мост (0% без Fabric-модов)' : 'Библиотека (0% без потребителя)',
      hasTradeoff: isBridge,
      gpuLoad: 0,
      vramLoad: 0,
      cpuLoad: 0,
      ramLoad: isBridge ? 1 : 0,
      tradeoffNote: isBridge
        ? 'Техническая часть прослойки Sinytra: нужна только для Fabric-модов.'
        : 'Техническая библиотека конфигурации или API: нужна лишь если её требует активный мод.',
    };
  }

  if (mod.status === 'diagnostic') {
    return {
      gains: ['Диагностика, мониторинг или отладка сборки'],
      costs: ['Прямого прироста FPS не даёт (0%)'],
      shortTag: 'Диагностика (0% FPS) · без нагрузки ПК',
      hasTradeoff: false,
      gpuLoad: 0,
      vramLoad: 0,
      cpuLoad: 0,
      ramLoad: 0,
      tradeoffNote: 'Инструмент контроля или телеметрии производительности, не влияющий напрямую на рендер и физику.',
    };
  }

  if (WORLDGEN_THREAD_IDS.has(mod.id)) {
    return {
      gains: ['Скорость генерации и подгрузки чанков ↑↑'],
      costs: ['CPU ↑↑ (многопоточная нагрузка)', 'RAM +0.4–1 ГБ'],
      shortTag: 'Генерация ↑↑ · но CPU ↑↑ и RAM ↑',
      hasTradeoff: true,
      gpuLoad: 0,
      vramLoad: 0,
      cpuLoad: 2,
      ramLoad: 1,
      tradeoffNote: 'Распараллеливает генерацию мира на много ядер — ускоряет карту за счёт возросшей нагрузки на CPU и ОЗУ.',
    };
  }

  if (NETWORK_MULTIPLAYER_IDS.has(mod.id)) {
    return {
      gains: ['Стабильность пакетов, пинг и TPS в онлайне ↑'],
      costs: ['В лёгкой одиночной игре эффект околонулевой'],
      shortTag: 'Онлайн / сервер ↑ · в соло ~0%',
      hasTradeoff: false,
      gpuLoad: 0,
      vramLoad: 0,
      cpuLoad: -1,
      ramLoad: 0,
      tradeoffNote: 'Оптимизирует сетевой стек и обработку пакетов/игроков; раскрывается на серверах и при высоком онлайне.',
    };
  }

  if (CONTENT_FIX_IDS.has(mod.id)) {
    return {
      gains: ['Убирает лаги/утечки конкретного контент-мода'],
      costs: ['Даёт 0% если целевой мод не установлен'],
      shortTag: 'Узкий фикс · работает лишь с целевым модом',
      hasTradeoff: false,
      gpuLoad: 0,
      vramLoad: 0,
      cpuLoad: -1,
      ramLoad: 0,
      tradeoffNote: 'Точечный патч производительности под конкретный сторонний мод.',
    };
  }

  switch (mod.groupId) {
    case 'core-renderer':
    case 'block-culling':
    case 'leaves-culling':
    case 'block-entities':
      return {
        gains: ['FPS ↑ (оптимизация рендера / отсечение геометрии)', 'Меньше лишних draw-calls'],
        costs: ['Минимум накладных расходов'],
        shortTag: 'FPS ↑ / GPU ↓ · без лишней нагрузки ПК',
        hasTradeoff: false,
        gpuLoad: -1,
        vramLoad: 0,
        cpuLoad: -1,
        ramLoad: 0,
        tradeoffNote: 'Сокращает объём отрисовываемой геометрии или перегруженных вызовов OpenGL.',
      };
    case 'shaders-pipeline':
      if (mod.id === 'oculus' || mod.id === 'emberlens' || mod.id === 'iris-shaders') {
        return {
          gains: ['Поддержка шейдеров'],
          costs: ['GPU ↑↑', 'VRAM +0.5–1.5 ГБ', 'FPS ниже чем без шейдеров'],
          shortTag: 'Визуал ↑ · но GPU ↑↑ и VRAM ↑',
          hasTradeoff: true,
          gpuLoad: 2,
          vramLoad: 2,
          cpuLoad: 1,
          ramLoad: 0,
          tradeoffNote: 'Шейдерный конвейер серьёзно нагружает видеокарту и видеопамять ради освещения и теней.',
        };
      }
      return {
        gains: ['Оптимизация или фикс совместимости шейдеров'],
        costs: ['Нужен установленный Oculus / Emberlens'],
        shortTag: 'Оптимизация шейдеров · GPU ↓',
        hasTradeoff: false,
        gpuLoad: -1,
        vramLoad: 0,
        cpuLoad: 0,
        ramLoad: 0,
        tradeoffNote: 'Снижает накладные расходы или исправляет баги при активных шейдерах.',
      };
    case 'upscaling-bg':
      return {
        gains: ['FPS ↑ или снижение энергопотребления GPU'],
        costs: ['Либо снижение разрешения 3D, либо ограничение кадров в фоне'],
        shortTag: 'GPU ↓ · за счёт апскейла или лимита в фоне',
        hasTradeoff: true,
        gpuLoad: -2,
        vramLoad: 0,
        cpuLoad: -1,
        ramLoad: 0,
        tradeoffNote: 'Разгружает видеокарту снижением разрешения рендера или частоты кадров вне фокуса.',
      };
    case 'memory-core':
      return {
        gains: ['ОЗУ ↓ и уменьшение микрофризов сборщика мусора Java'],
        costs: ['Затрат GPU/CPU нет'],
        shortTag: 'ОЗУ ↓ / GC ↓ · без нагрузки ПК',
        hasTradeoff: false,
        gpuLoad: 0,
        vramLoad: 0,
        cpuLoad: 0,
        ramLoad: -1,
        tradeoffNote: 'Снижает объём выделяемой памяти или чинит локальные утечки буферов.',
      };
    case 'tick-physics-engine':
    case 'items-clearlag':
    case 'cpu-threads':
      return {
        gains: ['TPS и стабильность фреймтайма ↑', 'Разгрузка главного потока CPU'],
        costs: ['Дополнительной нагрузки на видеокарту нет'],
        shortTag: 'TPS / CPU ↑ · без лишней нагрузки GPU',
        hasTradeoff: false,
        gpuLoad: 0,
        vramLoad: 0,
        cpuLoad: -1,
        ramLoad: 0,
        tradeoffNote: 'Уменьшает вычислительную нагрузку на процессор со стороны ИИ, потоков, предметов или физики.',
      };
    case 'worldgen-chunks':
    case 'lighting-engine':
      return {
        gains: ['Скорость прогрузки чанков и расчёта света ↑'],
        costs: ['Умеренная работа CPU при активной разведке карты'],
        shortTag: 'Чанки/свет ↑ · без лишней нагрузки GPU',
        hasTradeoff: false,
        gpuLoad: 0,
        vramLoad: 0,
        cpuLoad: -1,
        ramLoad: 0,
        tradeoffNote: 'Оптимизирует алгоритмы расчёта освещения и генерации новых чанков.',
      };
    case 'boot-loading':
    case 'particles-audio':
      return {
        gains: ['Быстрее запуск, поиск или тише/легче звук и частицы'],
        costs: ['Минимум ресурсов ПК'],
        shortTag: 'Запуск/аудио/частицы ↑ · без нагрузки',
        hasTradeoff: false,
        gpuLoad: 0,
        vramLoad: 0,
        cpuLoad: -1,
        ramLoad: 0,
        tradeoffNote: 'Уменьшает накладные расходы при старте сборки, работе со звуком OpenAL или частицами.',
      };
    case 'recipes-jei':
      return {
        gains: ['Удобство и скорость поиска рецептов / крафта'],
        costs: ['RAM +30–120 МБ на индекс предметов'],
        shortTag: 'Рецепты / UX ↑ · минимум RAM на индекс',
        hasTradeoff: false,
        gpuLoad: 0,
        vramLoad: 0,
        cpuLoad: 0,
        ramLoad: 0,
        tradeoffNote: 'Оптимизирует или дополняет индексацию и поиск рецептов в JEI/EMI.',
      };
    default:
      return {
        gains: [mod.bestAlternative || mod.description],
        costs: [mod.warning || 'Без заметных затрат GPU/RAM'],
        shortTag: mod.healthTier === 'yellow' ? 'Условный эффект · зависит от сборки' : 'Лёгкая оптимизация · без нагрузки ПК',
        hasTradeoff: mod.healthTier === 'yellow',
        gpuLoad: 0,
        vramLoad: 0,
        cpuLoad: 0,
        ramLoad: 0,
        tradeoffNote: mod.warning || mod.bestAlternative || mod.description,
      };
  }
}

export const LIBRARY_CONSUMER_MAP: Record<string, string[]> = {
  'matlib': ['enhanced-block-entities-reloaded'],
  'cupboard': ['connectivity'],
  'sodium-embeddium-options-api': ['sodium-embeddium-dynamic-lights'],
  'fzzy-config': ['particle-core'],
  'kotlin-for-forge': ['fzzy-config', 'particle-core', 'light-config'],
  'geckolib': ['geckolib-animation-optimizer', 'geckolibbetterfps'],
  'cloth-config-v12': ['sodium-embeddium-dynamic-lights', 'more-culling-reforged', 'entity-culling', 'dynamic-fps', 'culllessleaves-reforged'],
  'resourceful-config': [],
};

export const SINYTRA_BRIDGE_IDS = new Set(['sinytra-connector', 'forgified-fabric-api', 'connector-extras']);

const SUBSYSTEM_DEFINITIONS: Array<{
  key: string;
  title: string;
  maxScore: number;
  groupIds: string[];
  weights: Record<string, number>;
}> = [
  {
    key: 'render',
    title: '3D-рендер',
    maxScore: 28,
    groupIds: ['core-renderer', 'shaders-pipeline'],
    weights: {
      embeddium: 18,
      emberbium: 18,
      nvidium: 9.5,
      alloyium: 6.5,
      'revidium-accedium': 4,
      flerovium: 4,
      immediatelyfast: 3.5,
      'sodium-chloride': 2.5,
      'embeddium-extras': 2.5,
      'accelerated-rendering': 4,
      'accelerated-rendering-turned': 3,
      gputape: 2,
      oculus: 2.5,
      emberlens: 2,
      'faster-iris-shadow-mapper': 1.8,
      xenon: 9,
      rubidium: 7,
      prismanium: 5,
      polidium: 5,
      accelerium: 4,
      unbinilium: 4,
      aluminium: 4,
      fermium: 4,
      xfermium: 4,
      'sodium-sightline': 2,
      'sodium-streamline': 2,
      'sodium-fovea': 2,
      'maple-mesh-render': 1.5,
    },
  },
  {
    key: 'memory',
    title: 'Память и утечки',
    maxScore: 18,
    groupIds: ['memory-core'],
    weights: {
      modernfix: 10.5,
      ferritecore: 6.5,
      'alltheleaks-memory-leak-fix': 3.5,
      jasione: 2.5,
      'duplicate-nbt-flattener': 2,
      'put-a-plug-in-it-papi': 1.5,
      thulium: 1.5,
      mcreatormemfix: 1,
      'fix-gpu-memory-leak': 1,
      'collections-of-optimizations': 1,
    },
  },
  {
    key: 'tps',
    title: 'TPS и физика',
    maxScore: 16,
    groupIds: ['tick-physics-engine'],
    weights: {
      'radium-re-reforged': 10.5,
      'immersive-optimization': 4,
      badoptimizations: 3,
      servercore: 3.5,
      'alternate-current': 2,
      'entity-collision-optimization': 1.5,
      'villager-optimizer': 1.5,
      'capability-fix-revived': 1.5,
      'falling-blocks-fps-fix': 1,
      fastspawner: 1,
      flywheel: 2,
      vanillin: 2,
      'geckolibbetterfps': 2.5,
      'geckolib-animation-optimizer': 1.8,
      'radium-reforged': 5,
      canary: 5,
    },
  },
  {
    key: 'culling',
    title: 'Куллинг',
    maxScore: 14,
    groupIds: ['block-culling', 'leaves-culling', 'block-entities'],
    weights: {
      'entity-culling': 6.5,
      'culllessleaves-reforged': 3.5,
      'enhanced-block-entities-reloaded': 3.5,
      'more-culling-reforged': 2.5,
      'fast-item-frames': 2,
      'jem-adaptive-culling': 1.5,
      'legendary-block-entities': 2,
      'leaves-culling': 2,
      tritium: 2,
    },
  },
  {
    key: 'worldgen',
    title: 'Генерация и свет',
    maxScore: 10,
    groupIds: ['worldgen-chunks', 'lighting-engine'],
    weights: {
      noisiumed: 4,
      solix: 2.5,
      'structure-layout-optimizer': 2.5,
      'concurrent-chunk-management-engine-forge-c2me': 2.5,
      'c2me-concurrent-chunk-management-engine': 2,
      c2mer: 1.8,
      'distant-horizons': 3,
      lightstar: 1.5,
      chunky: 1.2,
      noisium: 1.8,
    },
  },
  {
    key: 'cpu-audio',
    title: 'Фон, ввод и частицы',
    maxScore: 8,
    groupIds: ['upscaling-bg', 'cpu-threads', 'particles-audio', 'boot-loading'],
    weights: {
      ixeris: 2.5,
      'particle-core': 2.5,
      'dynamic-fps': 1.5,
      'fast-sounds': 1.5,
      'stutterfix-reforged': 1.5,
      'threadtweak-reforged': 1.5,
      'reload-looping-sound-fix': 1,
      soundgc: 0.8,
      restmode: 0.8,
      framepacer: 0.8,
      'smooth-boot-reloaded': 1,
      lightspeedre: 1.2,
      fastload: 1.2,
      ksyxis: 0.8,
      'amd-fsr-upscaler-render-scale-for-embeddium': 1.5,
      particull: 1.2,
    },
  },
  {
    key: 'network',
    title: 'Сеть, опыт и рецепты',
    maxScore: 6,
    groupIds: ['networking', 'items-clearlag', 'recipes-jei'],
    weights: {
      clumps: 2.5,
      'let-me-despawn': 1.5,
      'packet-fixer': 1,
      'krypton-reno': 2.5,
      'krypton-hybrid': 1.8,
      pluto: 1.2,
      connectivity: 1.8,
      'vmp-forge': 2,
      'very-many-players-vmp': 1.5,
      emi: 1.5,
      'just-enough-items-jei': 1.2,
      'tmrv-updated': 1.2,
      fastsuite: 1,
      fastworkbench: 0.8,
      fastfurnace: 0.8,
      'optimized-recipe-book-orb': 0.8,
      fastvancements: 0.8,
      'fast-recipe-search': 0.8,
      fastali: 1,
      'advanced-loot-info-ali': 0.5,
    },
  },
];

const ARTIFACT_CULLER_IDS = new Set([
  'more-culling-reforged',
  'culllessleaves-reforged',
  'sodium-leaf-culling-unofficial',
  'sodium-embeddium-leaf-culling',
  'leaves-culling',
  'tritium',
]);

const ARTIFACT_BLOCK_ENTITY_BAKER_IDS = new Set([
  'enhanced-block-entities-reloaded',
  'legendary-block-entities',
  'enhanced-block-entities-reforged-unofficial',
  'fastchest-revived',
  'optimized-block-entities-obe',
]);

const ARTIFACT_UPSCALER_IDS = new Set([
  'amd-fsr-upscaler-render-scale-for-embeddium',
  'renderscale',
  'super-resolution',
  'purescale',
  'upscalecraft-forge',
]);

const ARTIFACT_MESH_RENDER_IDS = new Set([
  'voxy',
  'sodium-fovea',
  'maple-mesh-render',
  'sodium-sightline',
  'sodium-streamline',
]);

function computeZeroEffectiveSet(
  ids: string[],
  analysis: ReturnType<typeof analyzeSelection>,
  prefs?: AssemblyPreferences
): Set<string> {
  const selectedSet = new Set(ids);
  const zeroEffectiveSet = new Set<string>();
  const activeConsumersOfSinytra = analysis.selectedMods.some(m => m.platform.includes('Sinytra'));
  for (const m of analysis.selectedMods) {
    if (m.coveredBy) zeroEffectiveSet.add(m.id);
    const sup = getModSuperseder(m, selectedSet, prefs, false);
    if (sup?.isActiveInSelection) zeroEffectiveSet.add(m.id);
    if (SINYTRA_BRIDGE_IDS.has(m.id) && !activeConsumersOfSinytra) zeroEffectiveSet.add(m.id);
    if (m.id in LIBRARY_CONSUMER_MAP) {
      const hasConsumer = LIBRARY_CONSUMER_MAP[m.id].some(cid => selectedSet.has(cid));
      if (!hasConsumer) zeroEffectiveSet.add(m.id);
    }
    if ((m.id === 'geckolib-animation-optimizer' || m.id === 'geckolibbetterfps') && !selectedSet.has('geckolib')) {
      zeroEffectiveSet.add(m.id);
    }
    if (m.id === 'fastali' && !selectedSet.has('advanced-loot-info-ali')) {
      zeroEffectiveSet.add(m.id);
    }
  }
  return zeroEffectiveSet;
}

function computeArtifactRiskInternal(
  ids: string[],
  analysis: ReturnType<typeof analyzeSelection>,
  prefs?: AssemblyPreferences
): { profile: ArtifactRiskProfile; perModRisk: Map<string, number> } {
  const perModRisk = new Map<string, number>();
  const addModRisk = (modId: string, amount: number) => {
    if (amount <= 0) return;
    perModRisk.set(modId, (perModRisk.get(modId) ?? 0) + amount);
  };

  if (ids.length === 0) {
    return {
      profile: {
        chancePct: 0,
        level: 'low',
        label: 'Нет модов',
        summary: 'Добавьте моды, чтобы оценить вероятность визуальных артефактов.',
        factors: [],
      },
      perModRisk,
    };
  }

  const selectedSet = new Set(ids);
  const factors: ArtifactRiskFactor[] = [];
  let rawRisk = 0;

  const scale = prefs?.packScale ?? 'medium';
  const scaleMult = scale === 'heavy' ? 1.35 : scale === 'light' ? 0.85 : 1.0;

  // 1. Hard conflicts, danger mods, unsupported Forge mods & red dependency errors
  let conflictRisk = 0;
  if (analysis.conflicts.length > 0) {
    conflictRisk += analysis.conflicts.length * 24;
    for (const c of analysis.conflicts) {
      for (const mid of c.matchedIds) {
        addModRisk(mid, 14);
      }
    }
  }

  let criticalModRisk = 0;
  const criticalCounted = new Set<string>();
  for (const m of analysis.selectedMods) {
    if (m.status === 'danger' || isUnsupportedOnForge(m)) {
      criticalModRisk += 18;
      criticalCounted.add(m.id);
      addModRisk(m.id, 18);
    }
  }
  for (const w of analysis.warnings) {
    if (w.severity === 'red' && !criticalCounted.has(w.modId)) {
      criticalModRisk += 12;
      criticalCounted.add(w.modId);
      addModRisk(w.modId, 12);
    }
  }
  if (conflictRisk + criticalModRisk > 0) {
    const totalCrit = conflictRisk + criticalModRisk;
    rawRisk += totalCrit;
    factors.push({
      label: `Конфликты и критические ошибки (${analysis.conflicts.length + criticalCounted.size})`,
      deltaPct: totalCrit,
      tone: 'risk',
    });
  }

  // 2. Mixin surface density from stacking many optimization mods
  const n = analysis.selectedMods.length;
  const excessCount = Math.max(0, n - 18);
  const stackRisk = excessCount > 0 ? Math.min(22, Math.round(excessCount * 0.36 * scaleMult)) : scale === 'heavy' && n >= 10 ? 4 : 0;
  if (stackRisk > 0) {
    rawRisk += stackRisk;
    const scaleTag = scale === 'heavy' ? ', пак 200+ модов' : scale === 'light' ? ', лёгкий пак' : '';
    factors.push({
      label: `Плотность миксинов (${n} модов${scaleTag})`,
      deltaPct: stackRisk,
      tone: 'risk',
    });
  }

  // 3. Aggressive GPU Compute / Mesh Shaders / Pipeline Hooks
  let computeMeshRisk = 0;
  let gpuMismatchRisk = 0;
  if (selectedSet.has('nvidium')) {
    const hasGpuMismatch = Boolean(prefs && (prefs.gpu !== 'nvidia' || prefs.useShaders));
    if (hasGpuMismatch) {
      gpuMismatchRisk += 14;
      addModRisk('nvidium', 14);
    } else {
      computeMeshRisk += 4;
      addModRisk('nvidium', 4);
    }
  }
  if (selectedSet.has('alloyium')) {
    computeMeshRisk += 4;
    addModRisk('alloyium', 4);
  }
  if (selectedSet.has('revidium-accedium')) {
    computeMeshRisk += 7;
    addModRisk('revidium-accedium', 7);
  }
  for (const aid of ['accelerated-rendering', 'accelerated-rendering-turned']) {
    if (!selectedSet.has(aid)) continue;
    const isWeakGpu = prefs?.gpu === 'integrated' || prefs?.goal === 'potato';
    const d = isWeakGpu ? 11 : 6;
    if (isWeakGpu) gpuMismatchRisk += d;
    else computeMeshRisk += d;
    addModRisk(aid, d);
  }
  if (selectedSet.has('accelerated-recoiling')) {
    computeMeshRisk += 2;
    addModRisk('accelerated-recoiling', 2);
  }
  for (const mid of ARTIFACT_MESH_RENDER_IDS) {
    if (selectedSet.has(mid)) {
      computeMeshRisk += 5;
      addModRisk(mid, 5);
    }
  }
  if (selectedSet.has('immediatelyfast') && (selectedSet.has('oculus') || selectedSet.has('emberlens') || selectedSet.has('alloyium') || selectedSet.has('accelerated-rendering'))) {
    computeMeshRisk += 2;
    addModRisk('immediatelyfast', 2);
  }
  if (gpuMismatchRisk > 0) {
    rawRisk += gpuMismatchRisk;
    factors.push({
      label: 'Несоответствие GPU / шейдеров (Nvidium или Accelerated Rendering)',
      deltaPct: gpuMismatchRisk,
      tone: 'risk',
    });
  }
  if (computeMeshRisk > 0) {
    rawRisk += computeMeshRisk;
    factors.push({
      label: 'GPU Compute / Mesh Shaders и перехватчики рендера',
      deltaPct: computeMeshRisk,
      tone: 'risk',
    });
  }

  // 4. Upscalers
  let upscaleRisk = 0;
  for (const uid of ARTIFACT_UPSCALER_IDS) {
    if (selectedSet.has(uid)) {
      upscaleRisk += 3;
      addModRisk(uid, 3);
    }
  }
  if (upscaleRisk > 0) {
    rawRisk += upscaleRisk;
    factors.push({
      label: 'Апскейлеры разрешения (мыло текста и граней)',
      deltaPct: upscaleRisk,
      tone: 'risk',
    });
  }

  // 5. Face/leaf culling & baked block entities
  const activeCullers = Array.from(ARTIFACT_CULLER_IDS).filter(id => selectedSet.has(id));
  const activeBakers = Array.from(ARTIFACT_BLOCK_ENTITY_BAKER_IDS).filter(id => selectedSet.has(id));
  let cullingRisk = 0;
  for (const cid of activeCullers) {
    const base = cid === 'tritium' ? 4 : 2;
    cullingRisk += base;
    addModRisk(cid, base);
  }
  if (activeCullers.length >= 2) {
    cullingRisk += 2;
    for (const cid of activeCullers) addModRisk(cid, 1);
  }
  for (const bid of activeBakers) {
    cullingRisk += 1;
    addModRisk(bid, 1);
  }
  if (cullingRisk > 0) {
    rawRisk += cullingRisk;
    factors.push({
      label:
        activeCullers.length >= 2
          ? `Наложение куллинга граней/листвы (${activeCullers.length}) и запечённых моделей`
          : 'Куллинг граней/листвы или запечённые модели сундуков',
      deltaPct: cullingRisk,
      tone: 'risk',
    });
  }

  // 6. Distant Horizons & async chunk threaders & Create interactions
  let worldRisk = 0;
  if (selectedSet.has('distant-horizons')) {
    const hasShaders = selectedSet.has('oculus') || selectedSet.has('emberlens');
    const missingDhFix = hasShaders && !selectedSet.has('distant-horizons-memory-fix-dh');
    const d = missingDhFix ? 9 : 3;
    worldRisk += d;
    addModRisk('distant-horizons', d);
  }
  for (const wid of WORLDGEN_THREAD_IDS) {
    if (!selectedSet.has(wid)) continue;
    const d = wid === 'hc-harichunk' || wid === 'dimensional-threading-reforked' ? 8 : wid === 'concurrent-chunk-management-engine-forge-c2me' ? 3 : 4;
    worldRisk += d;
    addModRisk(wid, d);
  }
  if (prefs?.useCreate && (selectedSet.has('accelerated-rendering') || selectedSet.has('more-culling-reforged') || selectedSet.has('tritium'))) {
    worldRisk += 3;
  }
  if (worldRisk > 0) {
    rawRisk += worldRisk;
    factors.push({
      label: 'Асинхронные чанки / LOD (Distant Horizons, C2ME) и Create-кинетика',
      deltaPct: worldRisk,
      tone: 'risk',
    });
  }

  // 7. Sinytra Connector Fabric-to-Forge bridge layer
  const sinytraConsumers = analysis.selectedMods.filter(m => m.platform.includes('Sinytra'));
  if (selectedSet.has('sinytra-connector') || sinytraConsumers.length > 0) {
    const sinytraRisk = 5 + Math.min(10, sinytraConsumers.length * 2);
    rawRisk += sinytraRisk;
    addModRisk('sinytra-connector', 5);
    for (const sc of sinytraConsumers) addModRisk(sc.id, 2);
    factors.push({
      label: `Мост Sinytra Connector (${sinytraConsumers.length} Fabric-мод.)`,
      deltaPct: sinytraRisk,
      tone: 'risk',
    });
  }

  // 8. Yellow warnings, experimental/outdated mods & overlaps
  let cautionRisk = 0;
  const warnedMods = new Set<string>();
  for (const w of analysis.warnings) {
    if (w.severity === 'yellow' && !warnedMods.has(w.modId)) {
      warnedMods.add(w.modId);
      cautionRisk += 3;
      addModRisk(w.modId, 3);
    }
  }
  for (const m of analysis.selectedMods) {
    if (criticalCounted.has(m.id)) continue;
    const t = getCheckerTier(m, analysis.conflictingIdSet).tier;
    if (t === 'yellow' && !warnedMods.has(m.id)) {
      cautionRisk += 3;
      addModRisk(m.id, 3);
    } else if (t === 'lime' && m.status === 'outdated') {
      cautionRisk += 2;
      addModRisk(m.id, 2);
    }
  }
  if (selectedSet.has('embeddium-extras') && selectedSet.has('sodium-chloride')) {
    cautionRisk += 4;
    addModRisk('embeddium-extras', 3);
  }
  if (cautionRisk > 0) {
    rawRisk += cautionRisk;
    factors.push({
      label: 'Условные, устаревшие или частично дублирующие моды',
      deltaPct: cautionRisk,
      tone: 'risk',
    });
  }

  // 9. Mitigations (stability & leak fixers)
  let mitigation = 0;
  if (selectedSet.has('modernfix')) mitigation += 3;
  if (selectedSet.has('alltheleaks-memory-leak-fix')) mitigation += 2;
  if (selectedSet.has('packet-fixer') || selectedSet.has('capability-fix-revived') || selectedSet.has('fix-gpu-memory-leak')) {
    mitigation += 1;
  }
  if (selectedSet.has('distant-horizons') && selectedSet.has('distant-horizons-memory-fix-dh')) {
    mitigation += 2;
  }
  if (mitigation > 0) {
    rawRisk -= mitigation;
    factors.push({
      label: 'Стабилизаторы (ModernFix / AllTheLeaks / фиксы утечек)',
      deltaPct: -mitigation,
      tone: 'mitigation',
    });
  }

  const chancePct = Math.max(2, Math.min(96, Math.round(rawRisk)));
  let level: ArtifactRiskProfile['level'];
  let label: string;
  let summary: string;

  if (chancePct <= 12) {
    level = 'low';
    label = 'Минимальный';
    summary = 'Визуальные глитчи, мерцания текстур и артефакты маловероятны.';
  } else if (chancePct <= 28) {
    level = 'moderate';
    label = 'Умеренный';
    summary = 'Возможны редкие артефакты прогрузки, прозрачности листвы или шрифтов в плотных сценах.';
  } else if (chancePct <= 54) {
    level = 'high';
    label = 'Высокий';
    summary = 'Заметный риск мерцания граней, теней или графических сбоев — проверьте сомнительные моды.';
  } else {
    level = 'critical';
    label = 'Критический';
    summary = 'Высокая вероятность битых текстур, крашей рендера или серьёзных визуальных глитчей.';
  }

  factors.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  return {
    profile: {
      chancePct,
      level,
      label,
      summary,
      factors,
    },
    perModRisk,
  };
}

export function evaluateArtifactRisk(
  selectedIds: string[],
  analysisInput?: ReturnType<typeof analyzeSelection>,
  prefs?: AssemblyPreferences
): ArtifactRiskProfile {
  const analysis = analysisInput ?? analyzeSelection(selectedIds);
  return computeArtifactRiskInternal(selectedIds, analysis, prefs).profile;
}

export function evaluateDubiousMods(
  selectedIds: string[],
  analysisInput?: ReturnType<typeof analyzeSelection>,
  prefs?: AssemblyPreferences
): DubiousModEntry[] {
  if (selectedIds.length === 0) return [];
  const selectedSet = new Set(selectedIds);
  const analysis = analysisInput ?? analyzeSelection(selectedIds);
  const zeroEffectiveSet = computeZeroEffectiveSet(selectedIds, analysis, prefs);
  const { perModRisk } = computeArtifactRiskInternal(selectedIds, analysis, prefs);

  const warningByMod = new Map<string, DependencyWarning[]>();
  for (const w of analysis.warnings) {
    const arr = warningByMod.get(w.modId) ?? [];
    arr.push(w);
    warningByMod.set(w.modId, arr);
  }

  const entries: DubiousModEntry[] = [];

  for (const mod of analysis.selectedMods) {
    const warnings = warningByMod.get(mod.id) ?? [];
    const tierInfo = getCheckerTier(
      mod,
      analysis.conflictingIdSet,
      warnings.some(w => w.severity === 'red') ? 'red' : warnings.length > 0 ? 'yellow' : undefined
    );
    const bridge = getRecipeBridgeStatus(mod, selectedSet, prefs);
    const artifactContributionPct = perModRisk.get(mod.id) ?? 0;
    const sup = getModSuperseder(mod, selectedSet, prefs, false);

    let severity: DubiousModEntry['severity'] | null = null;
    let reason = '';

    const isNvidiaMismatch = NVIDIUM_FAMILY_IDS.has(mod.id) && Boolean(prefs && (prefs.gpu !== 'nvidia' || prefs.useShaders));
    const isPotatoGpuMismatch =
      (mod.id === 'accelerated-rendering' || mod.id === 'accelerated-rendering-turned') &&
      (prefs?.gpu === 'integrated' || prefs?.goal === 'potato');
    const isCoreProtected = ['embeddium', 'emberbium', 'modernfix', 'ferritecore'].includes(mod.id);

    if (tierInfo.tier === 'red' || !bridge.compatible) {
      severity = 'high';
      reason =
        warnings.find(w => w.severity === 'red')?.message ||
        bridge.reason ||
        tierInfo.reason ||
        mod.warning ||
        'Конфликт, плацебо или несовместимость с Forge 1.20.1.';
    } else if (isNvidiaMismatch) {
      severity = 'high';
      reason = prefs?.useShaders
        ? 'Nvidium несовместим с активными шейдерами — отключите либо Nvidium, либо шейдеры.'
        : 'Nvidium работает только на видеокартах NVIDIA GTX 16xx / RTX (Mesh Shaders).';
    } else if (isPotatoGpuMismatch) {
      severity = 'high';
      reason = 'Требует OpenGL 4.6 и 8+ ГБ VRAM — на слабом ПК/встройке вызывает статтеры или вылеты.';
    } else if (zeroEffectiveSet.has(mod.id)) {
      severity = 'medium';
      reason = sup?.isActiveInSelection
        ? `Полностью перекрыт: ${sup.reason}.`
        : mod.coveredBy
          ? `Избыточен: функции уже встроены в ${mod.coveredBy}.`
          : SINYTRA_BRIDGE_IDS.has(mod.id)
            ? 'Прослойка Sinytra подключена впустую (нет ни одного Fabric-мода в сборке).'
            : 'Библиотека или узкий аддон без активного потребителя (0% пользы).';
    } else if (tierInfo.tier === 'yellow' || warnings.length > 0) {
      severity = 'medium';
      reason =
        warnings[0]?.message ||
        mod.warning ||
        mod.bestAlternative ||
        'Условный, устаревший или требующий точной настройки мод.';
    } else if (mod.id === 'embeddium-extras' && selectedSet.has('sodium-chloride')) {
      severity = 'medium';
      reason = 'Частично дублирует функции (Sodium) Chloride — лучше оставить один аддон меню.';
    } else if (mod.platform.includes('Sinytra')) {
      severity = 'low';
      reason = 'Запускается через мост Sinytra Connector (Fabric → Forge): повышает поверхность миксинов и риск артефактов.';
    } else if (
      mod.id === 'accelerated-rendering' ||
      mod.id === 'accelerated-rendering-turned' ||
      mod.id === 'revidium-accedium' ||
      mod.id === 'ksyxis' ||
      mod.id === 'more-culling-reforged' ||
      (tierInfo.tier === 'lime' && (mod.status === 'outdated' || mod.status === 'redundant' || artifactContributionPct >= 3))
    ) {
      severity = 'low';
      reason =
        mod.id === 'ksyxis'
          ? 'Отключает spawn-чанки (автофермы на спавне останавливаются без игрока рядом).'
          : mod.id === 'more-culling-reforged'
            ? 'Агрессивный куллинг граней — при наложении с другими куллерами возможны просветы текстур.'
            : mod.warning || mod.bestAlternative || 'Экспериментальный или требовательный к видеопамяти/миксинам мод.';
    } else if (NETWORK_MULTIPLAYER_IDS.has(mod.id) && prefs?.mode === 'singleplayer' && mod.id !== 'krypton-reno') {
      severity = 'low';
      reason = 'Серверный/сетевой оптимизатор: в одиночной игре почти не даёт прироста.';
    }

    if (!severity) continue;

    const analog = getPreferredBetterAnalog(mod, selectedSet, prefs);
    const hasBetterReplacement = Boolean(
      analog &&
        analog.id !== mod.id &&
        !selectedSet.has(analog.id) &&
        (severity === 'high' || severity === 'medium' || getModEffectivenessScore(analog) > getModEffectivenessScore(mod))
    );

    entries.push({
      modId: mod.id,
      mod,
      severity,
      reason,
      artifactContributionPct,
      replacementId: hasBetterReplacement ? analog!.id : undefined,
      replacementName: hasBetterReplacement ? analog!.name : undefined,
      canRemoveSafely: severity === 'high' || !isCoreProtected,
    });
  }

  const sevRank: Record<DubiousModEntry['severity'], number> = { high: 0, medium: 1, low: 2 };
  return entries.sort(
    (a, b) =>
      sevRank[a.severity] - sevRank[b.severity] ||
      b.artifactContributionPct - a.artifactContributionPct ||
      a.mod.name.localeCompare(b.mod.name, 'ru')
  );
}

const HEAVY_SCALE_BOOSTER_IDS = new Set([
  'modernfix',
  'ferritecore',
  'alltheleaks-memory-leak-fix',
  'jasione',
  'duplicate-nbt-flattener',
  'capability-fix-revived',
  'structure-dfu-cache',
  'put-a-plug-in-it-papi',
  'smooth-boot-reloaded',
  'lightspeedre',
  'fastsuite',
  'fast-recipe-search',
  'jeioptimizer',
  'packet-fixer',
]);

const LIGHT_SCALE_MICRO_FIX_IDS = new Set([
  'duplicate-nbt-flattener',
  'capability-fix-revived',
  'structure-dfu-cache',
  'broken-tag-fixer',
  'mcreatormemfix',
  'put-a-plug-in-it-papi',
]);

const SHADER_SUPPORT_MOD_IDS = new Set([
  'oculus',
  'emberlens',
  'faster-iris-shadow-mapper',
  'shadowlod',
  'unofficial-luxium-compatibility-luxium-oculus',
  'bons-dlss-diet-complementary-unbound',
]);

const CREATE_PRIORITY_MOD_IDS = new Set([
  'flywheel',
  'vanillin',
  'starlight-with-create-fix',
  'radium-re-reforged',
  'immersive-optimization',
  'entity-culling',
]);

function computePackScoreInternal(
  ids: string[],
  analysis: ReturnType<typeof analyzeSelection>,
  prefs?: AssemblyPreferences
): {
  totalScore: number;
  rawEffectiveScore: number;
  subsystemScores: AssemblySubsystemScore[];
  coveredSubsystems: string[];
  missingSubsystems: string[];
  artifactRisk: ArtifactRiskProfile;
  scoreBreakdown: AssemblyScoreBreakdown;
} {
  const selectedSet = new Set(ids);
  const redModIds = new Set<string>(analysis.conflictingIdSet);
  for (const w of analysis.warnings) {
    if (w.severity === 'red') redModIds.add(w.modId);
  }
  for (const m of analysis.selectedMods) {
    if (m.status === 'danger' || isUnsupportedOnForge(m)) redModIds.add(m.id);
  }

  const zeroEffectiveSet = computeZeroEffectiveSet(ids, analysis, prefs);
  const { profile: artifactRisk } = computeArtifactRiskInternal(ids, analysis, prefs);
  const hasShaderMod = selectedSet.has('oculus') || selectedSet.has('emberlens');

  const subsystemScores: AssemblySubsystemScore[] = [];
  const coveredSubsystems: string[] = [];
  const missingSubsystems: string[] = [];
  let sumSubsystems = 0;

  for (const sub of SUBSYSTEM_DEFINITIONS) {
    let raw = 0;
    let covered = false;
    for (const m of analysis.selectedMods) {
      if (redModIds.has(m.id) || zeroEffectiveSet.has(m.id)) continue;
      let w = sub.weights[m.id] ?? 0;

      // Context scaling for hardware / game mode / shaders / Create / packScale
      if (prefs) {
        if (NVIDIUM_FAMILY_IDS.has(m.id) && (prefs.gpu === 'amd-intel' || prefs.gpu === 'integrated' || prefs.useShaders)) {
          w = 0;
        }
        if (m.id === 'alloyium' && prefs.gpu === 'integrated') {
          w *= 0.55;
        }
        if ((m.id === 'accelerated-rendering' || m.id === 'accelerated-rendering-turned') && (prefs.gpu === 'integrated' || prefs.goal === 'potato')) {
          w = 0.2;
        }
        if (ARTIFACT_UPSCALER_IDS.has(m.id)) {
          if (prefs.gpu === 'integrated' || prefs.goal === 'potato' || (prefs.useShaders && prefs.gpu === 'amd-intel')) {
            w *= 1.8;
          } else if (prefs.gpu === 'nvidia' && !prefs.useShaders && prefs.goal === 'max-safe') {
            w *= 0.45;
          }
        }
        if ((m.id === 'oculus' || m.id === 'emberlens') && !prefs.useShaders) {
          w = 0.2;
        }
        if (SHADER_SUPPORT_MOD_IDS.has(m.id) && m.id !== 'oculus' && m.id !== 'emberlens') {
          w = prefs.useShaders || hasShaderMod ? w * 1.45 : 0;
        }
        if (prefs.useCreate && CREATE_PRIORITY_MOD_IDS.has(m.id)) {
          w *= 1.3;
        }
        if (NETWORK_MULTIPLAYER_IDS.has(m.id)) {
          if (prefs.mode === 'singleplayer') {
            w = Math.min(w, 0.4);
          } else if (prefs.mode === 'server' || prefs.mode === 'hybrid-server') {
            w *= m.id === 'krypton-hybrid' && prefs.mode === 'hybrid-server' ? 1.65 : 1.4;
          }
        }
        if (m.id === 'servercore' || m.id === 'let-me-despawn') {
          if (prefs.mode === 'server' || prefs.mode === 'hybrid-server') {
            w *= 1.35;
          } else if (prefs.mode === 'singleplayer') {
            w *= 0.65;
          }
        }
        if (prefs.packScale === 'heavy' && HEAVY_SCALE_BOOSTER_IDS.has(m.id)) {
          w *= 1.3;
        } else if (prefs.packScale === 'light' && LIGHT_SCALE_MICRO_FIX_IDS.has(m.id)) {
          w *= 0.45;
        }
      } else if (NETWORK_MULTIPLAYER_IDS.has(m.id)) {
        w = Math.min(w, 1.5);
      }

      if (sub.key === 'render' && (m.id === 'nvidium' || m.id === 'alloyium') && !selectedSet.has('embeddium') && !selectedSet.has('emberbium')) {
        w = 0;
      }

      if (w > 0) {
        raw += w;
        covered = true;
      } else if (
        sub.groupIds.includes(m.groupId || '') &&
        !PURE_LIBRARY_MOD_IDS.has(m.id) &&
        !SINYTRA_BRIDGE_IDS.has(m.id) &&
        m.status !== 'diagnostic' &&
        !CONTENT_FIX_IDS.has(m.id)
      ) {
        const tier = getCheckerTier(m, analysis.conflictingIdSet).tier;
        if (tier === 'green' || tier === 'lime') {
          raw += m.isGroupLeader ? 2.5 : 1.0;
          covered = true;
        } else if (tier === 'yellow') {
          raw += 0.4;
        }
      }

      const grpCovered = sub.groupIds.some(gid => {
        const grp = MOD_GROUPS.find(g => g.id === gid);
        return grp ? grp.memberIds.includes(m.id) && !redModIds.has(m.id) : false;
      });
      if (grpCovered) covered = true;
    }

    // Smooth diminishing-returns curve up to sub.maxScore
    const score = raw <= 0 ? 0 : Math.min(sub.maxScore, Number((sub.maxScore * (1 - Math.exp(-raw / (sub.maxScore * 0.52)))).toFixed(2)));
    const scorePct = sub.maxScore > 0 ? Math.min(100, Math.round((score / sub.maxScore) * 100)) : 0;
    sumSubsystems += score;
    subsystemScores.push({
      id: sub.key,
      title: sub.title,
      covered,
      score: Math.round(score),
      maxScore: sub.maxScore,
      scorePct,
    });
    if (covered) coveredSubsystems.push(sub.title);
    else missingSubsystems.push(sub.title);
  }

  // Co-usage synergy bonuses (+up to 7 pts)
  let bonus = 0;
  if (selectedSet.has('modernfix') && selectedSet.has('ferritecore')) bonus += 1.5;
  if (selectedSet.has('modernfix') && (selectedSet.has('alltheleaks-memory-leak-fix') || selectedSet.has('jasione'))) bonus += 1.0;
  if ((selectedSet.has('emberbium') || selectedSet.has('embeddium')) && (selectedSet.has('flerovium') || selectedSet.has('immediatelyfast'))) bonus += 1.5;
  if (selectedSet.has('emberbium') && selectedSet.has('nvidium') && (!prefs || (prefs.gpu === 'nvidia' && !prefs.useShaders))) bonus += 2.0;
  if (selectedSet.has('entity-culling') && selectedSet.has('culllessleaves-reforged')) bonus += 1.0;
  if (selectedSet.has('radium-re-reforged') && (selectedSet.has('immersive-optimization') || selectedSet.has('badoptimizations'))) bonus += 1.0;
  if (selectedSet.has('noisiumed') && (selectedSet.has('solix') || selectedSet.has('structure-layout-optimizer'))) bonus += 1.0;
  if (selectedSet.has('emi') && selectedSet.has('tmrv-updated')) bonus += 1.0;
  if (selectedSet.has('flywheel') && selectedSet.has('vanillin')) bonus += 1.5;
  if (selectedSet.has('fastload') && selectedSet.has('ksyxis')) bonus += 0.8;
  if (selectedSet.has('packet-fixer') && (selectedSet.has('connectivity') || selectedSet.has('krypton-reno'))) bonus += 0.8;
  if (selectedSet.has('threadtweak-reforged') && selectedSet.has('stutterfix-reforged')) bonus += 0.6;
  bonus = Math.min(7.5, bonus);

  // Calibrated stability, bloat, hardware fit & artifact penalties
  let penalty = 0;
  penalty += analysis.conflicts.length * 18;
  for (const w of analysis.warnings) {
    penalty += w.severity === 'red' ? 14 : 3.5;
  }
  for (const m of analysis.selectedMods) {
    if (m.status === 'danger') penalty += 16;
    if (isUnsupportedOnForge(m)) penalty += 16;
  }
  if (selectedSet.has('embeddium-extras') && selectedSet.has('sodium-chloride')) penalty += 2;
  if (selectedSet.has('more-culling-reforged') && selectedSet.has('culllessleaves-reforged')) penalty += 1;
  if (selectedSet.has('dynamic-fps') && (selectedSet.has('restmode') || selectedSet.has('idle-boost'))) penalty += 1.5;
  if (selectedSet.has('particle-core') && selectedSet.has('particull')) penalty += 1.5;

  const bloatPenalty =
    zeroEffectiveSet.size * 2 +
    (ids.length > 36 ? Math.min(10, Math.round((ids.length - 36) * 0.45)) : 0);

  let hardwareFitDelta = 0;
  if (prefs) {
    if (selectedSet.has('nvidium') && (prefs.gpu !== 'nvidia' || prefs.useShaders)) {
      hardwareFitDelta -= 12;
    }
    if (prefs.gpu === 'integrated' || prefs.goal === 'potato') {
      let heavyCount = 0;
      for (const hid of ['accelerated-rendering', 'accelerated-rendering-turned', 'oculus', 'emberlens', 'distant-horizons', 'voxy']) {
        if (selectedSet.has(hid)) heavyCount++;
      }
      if (selectedSet.has('alloyium')) hardwareFitDelta -= 2;
      hardwareFitDelta -= Math.min(12, heavyCount * 4);
      if (Array.from(ARTIFACT_UPSCALER_IDS).some(uid => selectedSet.has(uid))) {
        hardwareFitDelta += 2;
      }
    }
    if (prefs.useShaders) {
      if (hasShaderMod) {
        hardwareFitDelta += selectedSet.has('faster-iris-shadow-mapper') || selectedSet.has('shadowlod') ? 2 : 1;
      } else if (ids.length >= 4) {
        hardwareFitDelta -= 5;
      }
    } else if (hasShaderMod) {
      hardwareFitDelta -= 3;
    }
    if (prefs.useCreate && selectedSet.has('flywheel') && selectedSet.has('vanillin')) {
      hardwareFitDelta += 2;
    }
    if (prefs.mode === 'singleplayer') {
      const netCount = ids.filter(id => NETWORK_MULTIPLAYER_IDS.has(id)).length;
      if (netCount > 1) hardwareFitDelta -= Math.min(5, Math.round((netCount - 1) * 1.5));
    } else if (prefs.mode === 'server' || prefs.mode === 'hybrid-server') {
      if (selectedSet.has('krypton-reno') || selectedSet.has('krypton-hybrid') || selectedSet.has('servercore') || selectedSet.has('connectivity')) {
        hardwareFitDelta += 2;
      }
    }
    if (prefs.packScale === 'heavy' && selectedSet.has('modernfix') && selectedSet.has('alltheleaks-memory-leak-fix')) {
      hardwareFitDelta += 2;
    }
  }

  const artifactPenalty =
    artifactRisk.chancePct > 22
      ? Math.min(16, Math.round((artifactRisk.chancePct - 22) * 0.28))
      : 0;

  const rawEffectiveScore = ids.length === 0 ? 0 : sumSubsystems + bonus + Math.max(0, hardwareFitDelta);
  const rawTotal =
    ids.length === 0
      ? 0
      : sumSubsystems + bonus + hardwareFitDelta - penalty - bloatPenalty - artifactPenalty;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  const efficiencyScore = ids.length === 0 ? 0 : Math.min(100, Math.round(sumSubsystems + bonus));
  const stabilityScore =
    ids.length === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round(100 - (penalty + bloatPenalty + artifactPenalty + Math.max(0, -hardwareFitDelta)) * 1.35)));

  return {
    totalScore,
    rawEffectiveScore,
    subsystemScores,
    coveredSubsystems,
    missingSubsystems,
    artifactRisk,
    scoreBreakdown: {
      efficiencyScore,
      stabilityScore,
      coverageScore: Math.round(sumSubsystems),
      synergyBonus: Math.round(bonus * 10) / 10,
      penaltyPoints: Math.round(penalty),
      hardwareFitDelta: Math.round(hardwareFitDelta),
      bloatPenalty: Math.round(bloatPenalty),
      artifactPenalty,
    },
  };
}

function getPreferredBetterAnalog(mod: ModItem, selectedSet: Set<string>, prefs?: AssemblyPreferences): ModItem | null {
  const candidates: ModItem[] = [];
  if (mod.supersededBy) {
    for (const id of mod.supersededBy) {
      const m = MOD_BY_ID.get(id);
      if (m && !isUnsupportedOnForge(m)) candidates.push(m);
    }
  }
  if (mod.supersededWhenAll) {
    for (const id of mod.supersededWhenAll) {
      const m = MOD_BY_ID.get(id);
      if (m && !isUnsupportedOnForge(m)) candidates.push(m);
    }
  }
  if (isUnsupportedOnForge(mod) && FABRIC_TO_FORGE_SWAP[mod.id]) {
    const swap = MOD_BY_ID.get(FABRIC_TO_FORGE_SWAP[mod.id]);
    if (swap) candidates.push(swap);
  }
  const dual = getDualPortPairForMod(mod.id);
  if (dual && dual.forgeModId !== mod.id) {
    const forgeCounterpart = MOD_BY_ID.get(dual.forgeModId);
    if (forgeCounterpart && !isUnsupportedOnForge(forgeCounterpart)) candidates.push(forgeCounterpart);
  }
  if (mod.groupId) {
    const grp = MOD_GROUPS.find(g => g.id === mod.groupId);
    if (grp && grp.leaderId !== mod.id && !grp.addonIds.includes(mod.id)) {
      const leader = MOD_BY_ID.get(grp.leaderId);
      if (leader && leader.id !== mod.id) candidates.push(leader);
    }
  }
  if (mod.id === 'geckolib-animation-optimizer') {
    const better = MOD_BY_ID.get('geckolibbetterfps');
    if (better) candidates.push(better);
  }

  const valid = candidates.filter(c => {
    if (c.id === mod.id) return false;
    if (prefs && !getRecipeBridgeStatus(c, selectedSet, prefs).compatible) return false;
    return true;
  });
  if (valid.length === 0) return null;
  valid.sort((a, b) => getModEffectivenessScore(b) - getModEffectivenessScore(a));
  return valid[0];
}

export function evaluateModImpactInPack(
  mod: ModItem,
  selectedSet: Set<string>,
  analysisInput?: ReturnType<typeof analyzeSelection>,
  prefs?: AssemblyPreferences
): ContextualModImpact {
  const inPack = selectedSet.has(mod.id);
  const withoutIds = Array.from(selectedSet).filter(id => id !== mod.id);
  const withIds = inPack ? Array.from(selectedSet) : [...withoutIds, mod.id];

  const analysis =
    inPack && analysisInput
      ? analysisInput
      : analyzeSelection(withIds);
  const withoutAnalysis =
    !inPack && analysisInput
      ? analysisInput
      : analyzeSelection(withoutIds);

  const withoutSet = new Set(withoutIds);
  const withSet = new Set(withIds);

  const interactions: ModInteractionNote[] = [];
  let delta = 0;

  const hasRenderCore = withSet.has('embeddium') || withSet.has('emberbium');
  const activeConsumersOfSinytra = withIds
    .map(id => MOD_BY_ID.get(id))
    .filter((m): m is ModItem => Boolean(m && m.platform.includes('Sinytra')));

  // 1. Negative: active conflict, danger, unsupported, missing critical dep
  const modConflicts = analysis.conflicts.filter(c => c.matchedIds.includes(mod.id));
  for (const c of modConflicts) {
    const others = c.matchedNames.filter(n => n !== mod.name);
    interactions.push({
      kind: 'conflict',
      targetIds: c.matchedIds.filter(id => id !== mod.id),
      targetNames: others,
      summary: c.rule.explanation,
      impactDelta: -800,
    });
    delta -= 800;
  }

  const modWarnings = analysis.warnings.filter(w => w.modId === mod.id);
  for (const w of modWarnings) {
    const isRed = w.severity === 'red';
    interactions.push({
      kind: isRed ? 'conflict' : 'overlap',
      targetIds: w.fixModIds || [],
      targetNames: (w.fixModIds || []).map(id => MOD_BY_ID.get(id)?.name || id),
      summary: w.message,
      impactDelta: isRed ? -600 : -220,
    });
    delta += isRed ? -600 : -220;
  }

  // 2. Context synergies & pairwise overlaps (using withoutSet as peers!)
  const addSynergy = (targetIds: string[], summary: string, impactDelta: number) => {
    const active = targetIds.filter(id => id !== mod.id && withoutSet.has(id));
    if (active.length === 0) return;
    interactions.push({
      kind: 'synergy',
      targetIds: active,
      targetNames: active.map(id => MOD_BY_ID.get(id)?.name || id),
      summary,
      impactDelta,
    });
    delta += impactDelta;
  };

  const addOverlap = (targetIds: string[], summary: string, impactDelta = -120) => {
    const active = targetIds.filter(id => id !== mod.id && withoutSet.has(id));
    if (active.length === 0) return;
    interactions.push({
      kind: 'overlap',
      targetIds: active,
      targetNames: active.map(id => MOD_BY_ID.get(id)?.name || id),
      summary,
      impactDelta,
    });
    delta += impactDelta;
  };

  // Memory stack synergy
  if (mod.id === 'modernfix') {
    addSynergy(['ferritecore', 'alltheleaks-memory-leak-fix', 'jasione'], 'В связке с FerriteCore / AllTheLeaks снижает RAM на 35–50% и закрывает утечки памяти', 180);
  } else if (mod.id === 'ferritecore') {
    addSynergy(['modernfix', 'alltheleaks-memory-leak-fix'], 'Вместе с ModernFix даёт максимальную экономию ОЗУ на моделях и блоках', 150);
  } else if (mod.id === 'alltheleaks-memory-leak-fix' || mod.id === 'jasione' || mod.id === 'duplicate-nbt-flattener') {
    addSynergy(['modernfix', 'ferritecore'], 'Закрывает утечки и Enum/NBT-аллокации поверх ядра ModernFix', 120);
  } else if (mod.id === 'calm-the-leaks') {
    addSynergy(['alltheleaks-memory-leak-fix', 'spark'], 'Фильтрует отчёты утечек AllTheLeaks и связывает тренды со spark', 90);
  }

  // Render pipeline synergies
  if (mod.id === 'embeddium' || mod.id === 'emberbium') {
    addSynergy(['flerovium', 'immediatelyfast', 'sodium-chloride'], 'Аддоны дополняют рендер чанков: предметы +50%, частицы +50%, HUD и GUI', 160);
    if (mod.id === 'emberbium' && withoutSet.has('nvidium')) {
      addSynergy(['nvidium'], 'Radix-сортировка Emberbium + NVIDIA Mesh Shaders Nvidium дают потолок FPS без шейдеров', 220);
    }
  } else if (mod.id === 'flerovium') {
    addSynergy(['embeddium', 'emberbium'], 'Ускоряет рендер предметов (+50%), частиц (+50%) и сущностей (+30%), не дублируя рендерер чанков', 160);
  } else if (mod.id === 'immediatelyfast') {
    addSynergy(['embeddium', 'emberbium'], 'Закрывает Immediate-Mode (текст, HUD, 2D-частицы, GUI) поверх Sodium/Embeddium', 140);
  } else if (mod.id === 'nvidium') {
    addSynergy(['embeddium', 'emberbium'], 'Разгружает геометрию далёких чанков в Mesh Shaders NVIDIA GTX 16xx/RTX (+3×–10× FPS без шейдеров)', 240);
  } else if (mod.id === 'alloyium') {
    addSynergy(['embeddium'], 'Ускоряет видимость чанков на GPU через OpenGL Compute; полностью совместим с Oculus', 130);
  } else if (mod.id === 'accelerated-rendering') {
    if (hasRenderCore) {
      interactions.push({
        kind: 'context',
        targetIds: [],
        targetNames: [],
        summary: 'Сильный буст FPS только на GPU 8+ ГБ VRAM (OpenGL 4.6) при сотнях анимированных мобов; на 4–6 ГБ VRAM риск переполнения',
        impactDelta: 40,
      });
      delta += 40;
    }
  }

  // Embeddium Extras vs Chloride partial overlap (without failing Test 4 warnings)
  if (mod.id === 'embeddium-extras' && withoutSet.has('sodium-chloride')) {
    addOverlap(['sodium-chloride'], 'Частичное пересечение с (Sodium) Chloride: отключите дублирующий зум, FPS-HUD и безрамочный режим в одном из модов', -140);
  } else if (mod.id === 'sodium-chloride' && withoutSet.has('embeddium-extras')) {
    addOverlap(['embeddium-extras'], 'Частичное пересечение с Embeddium Extras: оставьте общий зум/FPS-HUD только в одном моде', -90);
  } else if (mod.id === 'sodium-chloride' && withoutSet.has('sodium-embeddium-dynamic-lights')) {
    addOverlap(['sodium-embeddium-dynamic-lights'], 'Динамический свет дублируется отдельным модом Sodium/Embeddium Dynamic Lights', -40);
  }

  // Culling 3-layer synergy
  if (mod.id === 'entity-culling') {
    addSynergy(['culllessleaves-reforged', 'enhanced-block-entities-reloaded', 'more-culling-reforged'], 'Трёхслойный куллинг: сущности за стенами + кроны листвы + запечённые сундуки', 140);
  } else if (mod.id === 'more-culling-reforged') {
    addSynergy(['entity-culling'], 'Дополняет Entity Culling отсечением невидимых граней блоков и рамок', 90);
    addOverlap(['culllessleaves-reforged'], 'При наличии CullLessLeaves Reforged оставьте куллинг листвы за ним (в More Culling отключите листву)', -60);
  } else if (mod.id === 'fast-item-frames') {
    addSynergy(['enhanced-block-entities-reloaded'], 'Дополняет EBER оптимизацией настенных рамок на складах', 80);
  }

  // TPS / Farm / Create / GeckoLib synergy
  if (mod.id === 'radium-re-reforged') {
    addSynergy(['immersive-optimization', 'clumps', 'badoptimizations'], 'Связка для TPS: физика Lithium + умный троттлинг тиков мобов + объединение опыта', 160);
  } else if (mod.id === 'immersive-optimization') {
    addSynergy(['radium-re-reforged'], 'Сильно усиливает Radium в фермах мобов и с Create без поломки спавнеров', 150);
  } else if (mod.id === 'flywheel' && withoutSet.has('vanillin')) {
    addSynergy(['vanillin'], 'В паре с Vanillin переносит инстансинг сундуков и кинетики Create на GPU', 140);
  } else if (mod.id === 'vanillin') {
    addSynergy(['flywheel'], 'Использует GPU-бэкенд Flywheel для инстансинга сундуков и сущностей', 130);
  } else if (mod.id === 'geckolibbetterfps') {
    addSynergy(['geckolib'], 'Ускоряет математику и рендеринг скелетных анимаций мобов и боссов GeckoLib', 140);
  } else if (mod.id === 'geckolib-animation-optimizer') {
    addSynergy(['geckolib'], 'Отсекает анимации моделей GeckoLib вне поля зрения камеры', 100);
    addOverlap(['geckolibbetterfps'], 'Пересекается с GeckolibBetterFPS (оба ускоряют GeckoLib — обычно хватает GeckolibBetterFPS)', -80);
  }

  // Worldgen & lighting & boot synergy
  if (mod.id === 'noisiumed') {
    addSynergy(['solix', 'structure-layout-optimizer', 'concurrent-chunk-management-engine-forge-c2me'], 'Независимая связка: Noisiumed (биомы), Solix (свет), Structure Layout (данжи)', 130);
  } else if (mod.id === 'structure-layout-optimizer') {
    addSynergy(['noisiumed', 'concurrent-chunk-management-engine-forge-c2me'], 'В паре с Noisiumed/C2ME ускоряет поиск и размещение Jigsaw-структур без дублей', 120);
  } else if (mod.id === 'solix') {
    addSynergy(['noisiumed', 'lightstar'], 'Многопоточный свет Solix + Noisiumed ускоряют генерацию и прогрузку чанков', 120);
  } else if (mod.id === 'lightstar') {
    addSynergy(['embeddium', 'emberbium'], 'Клиентский кэш света в Embeddium/Emberbium; безопасен даже в паре с Solix', 90);
  } else if (mod.id === 'fastload') {
    addSynergy(['ksyxis', 'modernfix'], 'Ускоряет загрузку первых чанков мира в паре с Ksyxis и ModernFix', 100);
  } else if (mod.id === 'ksyxis') {
    addSynergy(['fastload', 'modernfix'], 'Убирает прогрев спавна (в паре с Fastload даёт мгновенный вход; осторожно с автофермами на спавне)', 70);
  }

  // CPU input & audio & LOD & recipes
  if (mod.id === 'ixeris' && (withoutSet.has('stutterfix-reforged') || withoutSet.has('threadtweak-reforged'))) {
    addSynergy(['stutterfix-reforged', 'threadtweak-reforged'], 'Убирает статтеры ввода мыши и выравнивает фреймтайм потоков CPU', 110);
  }
  if (mod.id === 'threadtweak-reforged' && withoutSet.has('stutterfix-reforged')) {
    addSynergy(['stutterfix-reforged'], 'Приоритезация потоков дополняет контроль кадров StutterFix', 85);
  } else if (mod.id === 'stutterfix-reforged' && withoutSet.has('threadtweak-reforged')) {
    addSynergy(['threadtweak-reforged'], 'Согласует кадр с распределением потоков ThreadTweak', 85);
  }
  if (mod.id === 'packet-fixer' && (withoutSet.has('connectivity') || withoutSet.has('krypton-reno'))) {
    addSynergy(['connectivity', 'krypton-reno'], 'Укрепляет сетевой стек и лимиты пакетов/NBT в тяжёлых Forge-сборках', 90);
  }
  if (mod.id === 'dynamic-fps' && (withoutSet.has('restmode') || withoutSet.has('idle-boost'))) {
    addOverlap(['restmode', 'idle-boost'], 'Оба ограничивают FPS в фоне/простое — оставьте один Dynamic FPS', -70);
  } else if ((mod.id === 'restmode' || mod.id === 'idle-boost') && withoutSet.has('dynamic-fps')) {
    addOverlap(['dynamic-fps'], 'Перекрывается Dynamic FPS — достаточно одного мода для фонового режима', -90);
  }
  if (mod.id === 'particle-core' && withoutSet.has('particull')) {
    addOverlap(['particull'], 'Particle Core уже покрывает отсечение и батчинг частиц — Particull лишний', -50);
  } else if (mod.id === 'particull' && withoutSet.has('particle-core')) {
    addOverlap(['particle-core'], 'Частично перекрыт более комплексным Particle Core', -80);
  }
  if (mod.id === 'accelerated-rendering' && withoutSet.has('flerovium')) {
    addSynergy(['flerovium'], 'Совместно ускоряют толпы мобов (Compute) и предметы/частицы (Flerovium), если хватает VRAM', 60);
  }
  if (mod.id === 'fast-sounds') {
    addSynergy(['soundgc', 'reload-looping-sound-fix', 'thulium'], 'Кэш OpenAL + очистка буферов (SoundGC / Reload Looping Sound Fix / Thulium) без дублирования', 100);
  } else if (mod.id === 'soundgc' || mod.id === 'reload-looping-sound-fix' || mod.id === 'thulium') {
    addSynergy(['fast-sounds'], 'Дополняет Fast Sounds очисткой/оптимизацией буферов OpenAL и GC аудио-потока', 80);
  }
  if (mod.id === 'advanced-loot-info-ali' && withoutSet.has('fastali')) {
    addSynergy(['fastali'], 'FastALI полностью убирает 10–20 сек. зависание ALI при входе в мир', 120);
  } else if (mod.id === 'fastali' && withoutSet.has('advanced-loot-info-ali')) {
    addSynergy(['advanced-loot-info-ali'], 'Критически ускоряет кэш таблиц лута Advanced Loot Info', 180);
  }
  if (mod.id === 'emi' && withoutSet.has('tmrv-updated')) {
    addSynergy(['tmrv-updated'], 'TMRV Updated запускает плагины JEI внутри быстрого интерфейса EMI без дубля ядра JEI', 130);
  } else if (mod.id === 'tmrv-updated' && withoutSet.has('emi')) {
    addSynergy(['emi'], 'Мост совместимости JEI-плагинов внутри чистого EMI', 130);
  }
  if ((mod.id === 'fastsuite' || mod.id === 'fastworkbench' || mod.id === 'fastfurnace') && withoutSet.has('optimized-recipe-book-orb')) {
    addSynergy(['optimized-recipe-book-orb'], 'Не дублирует клиентский ORB: ускоряет серверный крафт/печи, пока ORB ускоряет книгу рецептов', 110);
  } else if (mod.id === 'optimized-recipe-book-orb' && (withoutSet.has('fastsuite') || withoutSet.has('fastworkbench'))) {
    addSynergy(['fastsuite', 'fastworkbench'], 'Клиентская книга рецептов гармонично дополняет серверный кэш крафта FastSuite / FastWorkbench', 100);
  }
  if (mod.id === 'distant-horizons' && (withoutSet.has('oculus') || withoutSet.has('emberlens')) && withoutSet.has('distant-horizons-memory-fix-dh')) {
    addSynergy(['distant-horizons-memory-fix-dh'], 'DH Memory Fix страхует утечки памяти при работе LOD вместе с шейдерами', 100);
  }

  // Hardware / scenario caveats
  if (NETWORK_MULTIPLAYER_IDS.has(mod.id)) {
    interactions.push({
      kind: 'context',
      targetIds: [],
      targetNames: [],
      summary: 'Импакт раскрывается на сервере / в онлайне; в лёгкой одиночной игре влияние околонулевое',
      impactDelta: mod.id === 'krypton-reno' ? 0 : -40,
    });
  } else if (CONTENT_FIX_IDS.has(mod.id)) {
    interactions.push({
      kind: 'context',
      targetIds: [],
      targetNames: [],
      summary: 'Узкопрофильный фикс: даёт эффект только при наличии целевого контент-мода в пачке, иначе 0%',
      impactDelta: -120,
    });
    delta -= 120;
  } else if (WORLDGEN_THREAD_IDS.has(mod.id)) {
    interactions.push({
      kind: 'context',
      targetIds: [],
      targetNames: [],
      summary: 'Заметен при быстрой разведке карты / элитрах и 8+ ядрах CPU; на 4–6 потоках или слабой ОЗУ риск фризов',
      impactDelta: 0,
    });
  } else if ((mod.id === 'geckolib-animation-optimizer' || mod.id === 'geckolibbetterfps') && !withoutSet.has('geckolib')) {
    interactions.push({
      kind: 'context',
      targetIds: [],
      targetNames: [],
      summary: 'Оптимизирует только моды с GeckoLib; при отсутствии GeckoLib и мобов на нём эффект 0%',
      impactDelta: -140,
    });
    delta -= 140;
  }

  // Classify final level & label
  const baseScore = getModEffectivenessScore(mod);
  const contextualScore = baseScore + delta;
  const isRed =
    mod.status === 'danger' ||
    analysis.conflictingIdSet.has(mod.id) ||
    isUnsupportedOnForge(mod) ||
    modWarnings.some(w => w.severity === 'red') ||
    (prefs ? !getRecipeBridgeStatus(mod, withoutSet, prefs).compatible : false);

  const activeSup = getModSuperseder(mod, withoutSet, prefs, false);
  const isCoveredOrSuperseded = Boolean(mod.coveredBy || activeSup?.isActiveInSelection);

  // Check pure library / Sinytra consumer presence
  let isLibrary = PURE_LIBRARY_MOD_IDS.has(mod.id) || SINYTRA_BRIDGE_IDS.has(mod.id);
  let activeLibConsumers: string[] = [];
  if (SINYTRA_BRIDGE_IDS.has(mod.id)) {
    activeLibConsumers = activeConsumersOfSinytra.map(m => m.name);
  } else if (mod.id in LIBRARY_CONSUMER_MAP) {
    activeLibConsumers = LIBRARY_CONSUMER_MAP[mod.id]
      .filter(cid => withoutSet.has(cid))
      .map(cid => MOD_BY_ID.get(cid)?.name || cid);
  }

  let level: ModImpactLevel;
  let label: string;
  let summary: string;

  if (isRed) {
    level = 'negative';
    label = 'Вред / конфликт';
    summary = interactions.find(i => i.kind === 'conflict')?.summary || mod.warning || 'Конфликт или несовместимость с Forge 1.20.1';
  } else if (isCoveredOrSuperseded) {
    level = 'zero';
    label = 'Перекрыт (0%)';
    summary = activeSup?.reason ? `Лишний: ${activeSup.reason}` : `Уже встроен в ${mod.coveredBy}`;
  } else if (isLibrary) {
    if (activeLibConsumers.length > 0) {
      level = 'support';
      label = 'Опора для модов';
      summary = `Сам FPS не повышает, но нужен для работы: ${activeLibConsumers.join(', ')}`;
      interactions.unshift({
        kind: 'dependency',
        targetIds: [],
        targetNames: activeLibConsumers,
        summary,
        impactDelta: 0,
      });
    } else if (SINYTRA_BRIDGE_IDS.has(mod.id)) {
      level = 'zero';
      label = 'Без Fabric-модов (0%)';
      summary = 'В сборке нет Fabric-модов — прослойка только замедляет запуск';
    } else if (mod.id === 'matlib' || mod.id === 'cupboard' || mod.id === 'sodium-embeddium-options-api' || mod.id === 'fzzy-config') {
      level = 'zero';
      label = 'Нет потребителя (0%)';
      summary = 'В текущем списке нет оптимизатора, которому нужна эта библиотека';
    } else {
      level = 'support';
      label = 'Библиотека конфигов';
      summary = 'Сама FPS не даёт; нужна только если её требуют контент-моды сборки';
    }
  } else if (mod.status === 'diagnostic') {
    level = 'diagnostic';
    label = 'Диагностика (0% FPS)';
    summary = 'Находит источник лагов (TPS/FPS/GC), прямой производительности не добавляет';
  } else if (modWarnings.some(w => w.severity === 'yellow') || interactions.some(i => i.kind === 'overlap')) {
    level = 'conditional';
    label = 'Снижен / пересечение';
    summary = interactions.find(i => i.kind === 'overlap')?.summary || modWarnings[0]?.message || mod.warning || mod.description;
  } else if (
    CONTENT_FIX_IDS.has(mod.id) ||
    ((mod.id === 'geckolib-animation-optimizer' || mod.id === 'geckolibbetterfps') && !withoutSet.has('geckolib'))
  ) {
    level = 'conditional';
    label = 'Узкий фикс';
    summary = interactions.find(i => i.kind === 'context')?.summary || mod.description;
  } else if (CORE_PILLAR_IDS.has(mod.id) && ((mod.id !== 'nvidium' && mod.id !== 'alloyium') || hasRenderCore)) {
    level = 'core';
    label = NETWORK_MULTIPLAYER_IDS.has(mod.id) ? 'Ядро (сеть)' : 'Ядро сборки';
    summary = interactions.find(i => i.kind === 'synergy')?.summary || mod.description;
  } else if (HIGH_SYNERGY_IDS.has(mod.id) || (mod.id === 'vanillin' && withoutSet.has('flywheel')) || (mod.id === 'flywheel' && withoutSet.has('vanillin')) || (mod.id === 'geckolibbetterfps' && withoutSet.has('geckolib'))) {
    level = 'high';
    label = NETWORK_MULTIPLAYER_IDS.has(mod.id) ? 'Сильный (сервер)' : 'Сильный в связке';
    summary = interactions.find(i => i.kind === 'synergy')?.summary || mod.bestAlternative || mod.description;
  } else if (NETWORK_MULTIPLAYER_IDS.has(mod.id) || WORLDGEN_THREAD_IDS.has(mod.id) || mod.id === 'accelerated-rendering' || mod.id === 'flywheel') {
    level = 'conditional';
    label = NETWORK_MULTIPLAYER_IDS.has(mod.id) ? 'Только онлайн/сервер' : 'Зависит от ПК/сборки';
    summary = interactions.find(i => i.kind === 'context')?.summary || mod.bestAlternative || mod.description;
  } else if (mod.status === 'useful' && mod.healthTier !== 'red') {
    level = 'medium';
    label = 'Умеренный буст';
    summary = interactions[0]?.summary || mod.bestAlternative || mod.description;
  } else {
    level = 'conditional';
    label = 'Слабый / условный';
    summary = mod.bestAlternative || mod.warning || mod.description;
  }

  // Marginal relative % & normalized 0..100 points from floating-point pack delta
  const metricsWithout = computePackScoreInternal(withoutIds, withoutAnalysis, prefs);
  const metricsWith = computePackScoreInternal(withIds, analysis, prefs);
  const rawGain = metricsWith.rawEffectiveScore - metricsWithout.rawEffectiveScore;
  const totalDelta = metricsWith.totalScore - metricsWithout.totalScore;
  let relativeImpactPct =
    rawGain > 0
      ? Math.max(totalDelta, Math.round(rawGain * 1.15))
      : Math.min(totalDelta, Math.round(rawGain));

  // Calibrate edge cases cleanly for crisp user intuition:
  if (level === 'zero' || level === 'diagnostic') {
    relativeImpactPct = 0;
  } else if (level === 'negative') {
    relativeImpactPct = Math.min(-5, totalDelta);
  } else if (level === 'support') {
    relativeImpactPct = Math.max(0, totalDelta);
  } else if (relativeImpactPct <= 0 && (level === 'core' || level === 'high' || level === 'medium')) {
    relativeImpactPct = Math.max(1, Math.round(rawGain));
  }

  let impactPoints: number;
  if (level === 'negative') {
    impactPoints = -Math.min(100, Math.max(25, Math.abs(relativeImpactPct) * 3));
  } else if (level === 'zero' || level === 'diagnostic') {
    impactPoints = 0;
  } else if (level === 'support') {
    impactPoints = activeLibConsumers.length > 0 ? 55 : 20;
  } else {
    const basePts = Math.round(((Math.max(0, Math.min(2000, contextualScore)) / 2000) * 76) + Math.min(24, Math.max(0, rawGain) * 1.65));
    impactPoints = Math.max(5, Math.min(99, basePts));
    if (level === 'conditional' && (mod.id === 'geckolib-animation-optimizer' || mod.id === 'geckolibbetterfps') && !withoutSet.has('geckolib')) {
      impactPoints = 10;
      relativeImpactPct = 0;
    } else if (level === 'conditional' && CONTENT_FIX_IDS.has(mod.id)) {
      impactPoints = 15;
      relativeImpactPct = 0;
    } else if (level === 'conditional' && NETWORK_MULTIPLAYER_IDS.has(mod.id) && prefs?.mode === 'singleplayer') {
      impactPoints = Math.min(impactPoints, 22);
      relativeImpactPct = Math.min(relativeImpactPct, 1);
    }
  }

  const coUsageVerdict: CoUsageVerdict = isRed
    ? 'conflict'
    : level === 'zero'
      ? 'redundant'
      : modWarnings.some(w => w.severity === 'yellow') || interactions.some(i => i.kind === 'overlap')
        ? 'overlap'
        : activeLibConsumers.length > 0 && isLibrary
          ? 'dependency'
          : interactions.some(i => i.kind === 'synergy')
            ? 'synergy'
            : 'solo';

  let betterAnalogId: string | undefined;
  let betterAnalogName: string | undefined;
  let betterAnalogDeltaPoints: number | undefined;
  const candidateAnalog = getPreferredBetterAnalog(mod, withoutSet, prefs);
  if (candidateAnalog && (level === 'negative' || level === 'zero' || level === 'conditional' || mod.status === 'outdated' || mod.status === 'redundant')) {
    const analogImpact =
      candidateAnalog.id === mod.id
        ? null
        : computeQuickModPoints(candidateAnalog, withoutSet, withoutAnalysis, prefs);
    if (analogImpact !== null && analogImpact > impactPoints + 5) {
      betterAnalogId = candidateAnalog.id;
      betterAnalogName = candidateAnalog.name;
      betterAnalogDeltaPoints = analogImpact - impactPoints;
    }
  }

  const resourceProfile = getModResourceProfile(mod);

  return {
    modId: mod.id,
    level,
    label,
    contextualScore,
    impactPoints,
    relativeImpactPct,
    inPack,
    coUsageVerdict,
    summary,
    interactions,
    resourceProfile,
    betterAnalogId,
    betterAnalogName,
    betterAnalogDeltaPoints,
  };
}

function computeQuickModPoints(
  mod: ModItem,
  baseSet: Set<string>,
  baseAnalysis: ReturnType<typeof analyzeSelection>,
  prefs?: AssemblyPreferences
): number {
  const res = evaluateModImpactInPack(mod, baseSet, baseSet.has(mod.id) ? baseAnalysis : undefined, prefs);
  return res.impactPoints;
}

export function getModAnalogsComparison(
  mod: ModItem,
  selectedSet: Set<string>,
  prefs?: AssemblyPreferences
): AnalogComparisonEntry[] {
  const withoutSet = new Set(Array.from(selectedSet).filter(id => id !== mod.id));
  const withoutAnalysis = analyzeSelection(Array.from(withoutSet));
  const currentImpact = evaluateModImpactInPack(mod, selectedSet, undefined, prefs);

  const peerIds = new Set<string>();
  if (mod.supersededBy) mod.supersededBy.forEach(id => peerIds.add(id));
  if (mod.supersededWhenAll) mod.supersededWhenAll.forEach(id => peerIds.add(id));
  const dual = getDualPortPairForMod(mod.id);
  if (dual) {
    peerIds.add(dual.forgeModId);
    peerIds.add(dual.fabricModId);
    dual.altForgeIds?.forEach(id => peerIds.add(id));
    dual.altFabricIds?.forEach(id => peerIds.add(id));
  }
  const swapId = FABRIC_TO_FORGE_SWAP[mod.id];
  if (swapId) peerIds.add(swapId);
  for (const [k, v] of Object.entries(FABRIC_TO_FORGE_SWAP)) {
    if (v === mod.id) peerIds.add(k);
  }
  if (mod.groupId) {
    const grp = MOD_GROUPS.find(g => g.id === mod.groupId);
    if (grp) {
      peerIds.add(grp.leaderId);
      grp.addonIds.forEach(id => peerIds.add(id));
      for (const mid of grp.memberIds) {
        const m = MOD_BY_ID.get(mid);
        if (!m) continue;
        if (m.status !== 'danger' || m.id === mod.supersededBy?.[0]) {
          peerIds.add(mid);
        }
      }
    }
  }
  for (const cid of getRuleConflictingIds(mod.id)) {
    const cm = MOD_BY_ID.get(cid);
    if (cm && cm.status !== 'danger') {
      peerIds.add(cid);
    }
  }
  for (const m of MODS_DATABASE) {
    if (m.supersededBy?.includes(mod.id) || matchesCoveredByName(m.coveredBy, mod.name) || matchesCoveredByName(mod.coveredBy, m.name)) {
      peerIds.add(m.id);
    }
  }
  peerIds.delete(mod.id);

  const conflictingWithMod = new Set(getRuleConflictingIds(mod.id));
  const grp = mod.groupId ? MOD_GROUPS.find(g => g.id === mod.groupId) : undefined;
  const withModSet = new Set([...withoutSet, mod.id]);
  const withModAnalysis = selectedSet.has(mod.id) ? undefined : analyzeSelection(Array.from(withModSet));
  const soloModWarningKeys = new Set(analyzeSelection([mod.id]).warnings.map(w => `${w.modId}:${w.message}`));

  const entries: AnalogComparisonEntry[] = [];
  for (const pid of peerIds) {
    const alt = MOD_BY_ID.get(pid);
    if (!alt) continue;

    const isRuleConflict = conflictingWithMod.has(alt.id);
    const isCoveredInAlt = matchesCoveredByName(mod.coveredBy, alt.name);
    const isAltCoveredInMod = matchesCoveredByName(alt.coveredBy, mod.name);
    const altSupersedesMod = Boolean(mod.supersededBy?.includes(alt.id) || mod.supersededWhenAll?.includes(alt.id));
    const modSupersedesAlt = Boolean(alt.supersededBy?.includes(mod.id) || alt.supersededWhenAll?.includes(mod.id));
    const isDualPair = Boolean(dual && (dual.forgeModId === alt.id || dual.fabricModId === alt.id || dual.altForgeIds?.includes(alt.id) || dual.altFabricIds?.includes(alt.id)));
    const isSwap = FABRIC_TO_FORGE_SWAP[mod.id] === alt.id || FABRIC_TO_FORGE_SWAP[alt.id] === mod.id;

    // Pairwise simulation to check joint compatibility cleanly (ignoring pre-existing solo missing-dep warnings on mod/alt individually)
    const soloAltWarningKeys = new Set(analyzeSelection([alt.id]).warnings.map(w => `${w.modId}:${w.message}`));
    const pairAnalysis = analyzeSelection([mod.id, alt.id]);
    const pairwiseWarnings = pairAnalysis.warnings.filter(
      w => !soloModWarningKeys.has(`${w.modId}:${w.message}`) && !soloAltWarningKeys.has(`${w.modId}:${w.message}`)
    );
    const hasPairWarning = pairwiseWarnings.length > 0;
    const pairClash = pairAnalysis.conflicts.length > 0;

    let relation: AnalogRelationKind;
    let relationLabel: string;
    let canUseTogether: boolean;
    let coUsageNote: string;

    if (isCoveredInAlt) {
      relation = 'builtin-covered';
      relationLabel = 'Встроено внутрь';
      canUseTogether = false;
      coUsageNote = `Функционал ${mod.name} уже встроен в ${alt.name} — вместе бессмысленно (0%).`;
    } else if (isAltCoveredInMod) {
      relation = 'overlap-duplicate';
      relationLabel = 'Уже в текущем моде';
      canUseTogether = false;
      coUsageNote = `${alt.name} уже перекрывается встроенными модулями ${mod.name}.`;
    } else if (altSupersedesMod) {
      relation = 'better-replacement';
      relationLabel = 'Лучшая замена';
      canUseTogether = false;
      coUsageNote = `Полностью заменяет ${mod.name}: ${alt.bestAlternative || 'быстрее, новее и стабильнее'}.`;
    } else if (modSupersedesAlt) {
      relation = 'overlap-duplicate';
      relationLabel = 'Слабее / перекрыт';
      canUseTogether = false;
      coUsageNote = `${mod.name} полностью заменяет ${alt.name} — ставить вторым не нужно.`;
    } else if (isDualPair || isSwap) {
      relation = 'dual-port';
      relationLabel = isUnsupportedOnForge(alt) ? 'Fabric-оригинал (справка)' : 'Нативный порт ↔ Sinytra';
      canUseTogether = false;
      coUsageNote = isUnsupportedOnForge(alt)
        ? `Несовместимый Fabric-оригинал; на Forge используйте нативный порт.`
        : `Две реализации одного модуля (${dual?.title || 'одна ниша'}) — несовместимы, оставьте один вариант.`;
    } else if (isRuleConflict || pairClash) {
      relation = 'conflict';
      relationLabel = 'Взаимоисключающие';
      canUseTogether = false;
      coUsageNote = pairAnalysis.conflicts[0]?.rule.explanation || grp?.conflictReason || 'Нельзя ставить вместе в одну сборку (конфликт движков).';
    } else if (grp?.leaderId === alt.id) {
      relation = 'leader';
      canUseTogether = !isUnsupportedOnForge(alt) && !hasPairWarning;
      relationLabel = canUseTogether ? 'Лидер группы (можно вместе)' : 'Лидер слота (замена)';
      coUsageNote = canUseTogether
        ? `Базовый лидер ниши «${grp.title}» — хорошо работает совместно.`
        : alt.bestAlternative || alt.description;
    } else if (!hasPairWarning && !isUnsupportedOnForge(alt) && alt.status !== 'outdated' && alt.status !== 'redundant') {
      relation = 'addon-synergy';
      relationLabel = 'Можно совместно';
      canUseTogether = true;
      coUsageNote = alt.bestAlternative || alt.description;
    } else {
      relation = 'alternative';
      canUseTogether = !isUnsupportedOnForge(alt) && !pairClash && !hasPairWarning;
      relationLabel = hasPairWarning ? 'Частичное пересечение' : isUnsupportedOnForge(alt) ? 'Не для Forge' : 'Альтернатива';
      coUsageNote = pairwiseWarnings[0]?.message || alt.bestAlternative || alt.warning || alt.description;
    }

    // Evaluate compatible joint peers WITH current mod present (so dependent addons don't trigger false missing-parent penalties),
    // and evaluate mutually-exclusive replacements WITHOUT current mod (what happens if you swap mod -> alt).
    const evalSet = canUseTogether ? withModSet : withoutSet;
    const evalAnalysis = canUseTogether ? withModAnalysis : withoutAnalysis;
    const altImpact = evaluateModImpactInPack(alt, evalSet, evalAnalysis, prefs);
    const points = altImpact.impactPoints;
    const relativeDeltaPoints = points - currentImpact.impactPoints;
    const marginalPct = altImpact.relativeImpactPct;

    entries.push({
      mod: alt,
      relation,
      relationLabel,
      canUseTogether,
      coUsageNote,
      points,
      relativeDeltaPoints,
      marginalPct,
      isSelectedInContext: selectedSet.has(alt.id),
    });
  }

  const addonSet = new Set(grp?.addonIds ?? []);
  const getRank = (e: AnalogComparisonEntry): number => {
    if (e.relation === 'better-replacement') return 0;
    if (e.relation === 'leader') return 1;
    if (e.relation === 'builtin-covered') return 2;
    if (e.relation === 'dual-port') return 3;
    if (
      e.relation === 'addon-synergy' &&
      (addonSet.has(e.mod.id) || CORE_PILLAR_IDS.has(e.mod.id) || HIGH_SYNERGY_IDS.has(e.mod.id) || e.points >= 40)
    ) {
      return 4;
    }
    if (e.relation === 'conflict') return 5;
    if (e.relation === 'addon-synergy') return 6;
    if (e.relation === 'alternative') return 7;
    return 8;
  };

  return entries
    .sort((a, b) => {
      if (a.isSelectedInContext !== b.isSelectedInContext) return a.isSelectedInContext ? -1 : 1;
      const prioDiff = getRank(a) - getRank(b);
      if (prioDiff !== 0) return prioDiff;
      const effDiff = getModEffectivenessScore(b.mod) - getModEffectivenessScore(a.mod);
      if (b.points !== a.points) return b.points - a.points;
      if (effDiff !== 0) return effDiff;
      return a.mod.name.localeCompare(b.mod.name, 'ru');
    })
    .slice(0, 28);
}

export function summarizeAssemblyImpact(
  selectedIds: string[],
  analysisInput?: ReturnType<typeof analyzeSelection>,
  prefs?: AssemblyPreferences
): AssemblyImpactSummary {
  const selectedSet = new Set(selectedIds);
  const analysis = analysisInput ?? analyzeSelection(selectedIds);
  const packMetrics = computePackScoreInternal(selectedIds, analysis, prefs);

  const coveragePct =
    selectedIds.length === 0
      ? 0
      : Math.round((packMetrics.coveredSubsystems.length / SUBSYSTEM_DEFINITIONS.length) * 100);

  const synergies: ModInteractionNote[] = [];
  const overlaps: ModInteractionNote[] = [];
  const seenSyn = new Set<string>();
  const seenOv = new Set<string>();
  const zeroOrLowImpactIds: string[] = [];
  const networkOnlyIds: string[] = [];
  const highVramIds: string[] = [];
  const highGpuIds: string[] = [];
  const highCpuIds: string[] = [];
  const ramSaverIds: string[] = [];

  let effectiveCount = 0;
  let conditionalCount = 0;
  let redundantCount = 0;
  let conflictCount = 0;
  let netGpuLoad = 0;
  let netVramLoad = 0;
  let netCpuLoad = 0;
  let netRamLoad = 0;

  for (const mod of analysis.selectedMods) {
    const impact = evaluateModImpactInPack(mod, selectedSet, analysis, prefs);
    const rp = impact.resourceProfile;
    if (impact.level === 'negative') {
      conflictCount++;
      zeroOrLowImpactIds.push(mod.id);
    } else if (impact.level === 'zero') {
      redundantCount++;
      zeroOrLowImpactIds.push(mod.id);
    } else if (impact.level === 'conditional' || impact.level === 'diagnostic' || impact.level === 'support') {
      conditionalCount++;
    } else {
      effectiveCount++;
    }

    if (impact.level !== 'zero') {
      netGpuLoad += rp.gpuLoad;
      netVramLoad += rp.vramLoad;
      netCpuLoad += rp.cpuLoad;
      netRamLoad += rp.ramLoad;
    }

    if (NETWORK_MULTIPLAYER_IDS.has(mod.id)) {
      networkOnlyIds.push(mod.id);
    }
    if (HIGH_VRAM_IDS.has(mod.id) || rp.vramLoad > 0) {
      highVramIds.push(mod.id);
    }
    if (rp.gpuLoad > 0) {
      highGpuIds.push(mod.id);
    }
    if (rp.cpuLoad > 0) {
      highCpuIds.push(mod.id);
    }
    if (rp.ramLoad <= -1) {
      ramSaverIds.push(mod.id);
    }
    for (const inter of impact.interactions) {
      if (inter.kind === 'synergy') {
        const key = [mod.id, ...inter.targetIds].sort().join('+');
        if (!seenSyn.has(key)) {
          seenSyn.add(key);
          synergies.push({
            ...inter,
            targetIds: [mod.id, ...inter.targetIds],
            targetNames: [mod.name, ...inter.targetNames],
          });
        }
      } else if (inter.kind === 'overlap') {
        const key = `${mod.id}:${inter.summary}`;
        if (!seenOv.has(key)) {
          seenOv.add(key);
          overlaps.push(inter);
        }
      }
    }
  }

  const dubiousMods = evaluateDubiousMods(selectedIds, analysis, prefs);

  const subMap = new Map(packMetrics.subsystemScores.map(s => [s.id, s.scorePct]));
  const renderPct = subMap.get('render') ?? 0;
  const cullingPct = subMap.get('culling') ?? 0;
  const memoryPct = subMap.get('memory') ?? 0;
  const tpsPct = subMap.get('tps') ?? 0;
  const worldgenPct = subMap.get('worldgen') ?? 0;

  const hasShadersActive = selectedSet.has('oculus') || selectedSet.has('emberlens') || Boolean(prefs?.useShaders);
  const fpsScore = selectedIds.length === 0
    ? 0
    : Math.max(
        0,
        Math.min(
          100,
          Math.round(renderPct * 0.65 + cullingPct * 0.35 - (hasShadersActive ? 16 : 0) - conflictCount * 10)
        )
      );
  const tpsScore = selectedIds.length === 0
    ? 0
    : Math.max(0, Math.min(100, Math.round(tpsPct * 0.72 + worldgenPct * 0.28 - conflictCount * 6)));
  const memoryScore = selectedIds.length === 0
    ? 0
    : Math.max(0, Math.min(100, Math.round(memoryPct - Math.max(0, netRamLoad) * 8)));

  const toPressure = (val: number, highThr: number, modThr: number): 'low' | 'moderate' | 'high' =>
    val >= highThr ? 'high' : val >= modThr ? 'moderate' : 'low';

  const gpuPressure = toPressure(netGpuLoad + (prefs?.gpu === 'integrated' ? 1 : 0), 3, 1);
  const vramPressure = toPressure(netVramLoad, 3, 1);
  const cpuPressure = toPressure(netCpuLoad, 3, 1);

  const ramDeltaLabel =
    selectedIds.length === 0
      ? '0 МБ'
      : netRamLoad <= -5
        ? '−1.5…3.0 ГБ ОЗУ'
        : netRamLoad <= -2
          ? '−0.7…1.5 ГБ ОЗУ'
          : netRamLoad <= 0
            ? '−0.2…0.6 ГБ ОЗУ'
            : '+0.4…1.4 ГБ ОЗУ';

  const fpsDeltaLabel =
    selectedIds.length === 0
      ? '0%'
      : conflictCount > 0
        ? 'Снижен (конфликты)'
        : hasShadersActive
          ? `Шейдеры (${fpsScore}/100)`
          : fpsScore >= 85
            ? '+180–350% FPS'
            : fpsScore >= 60
              ? '+90–180% FPS'
              : fpsScore >= 30
                ? '+30–80% FPS'
                : 'Минимальный буст';

  const resourceBalance: AssemblyResourceBalance = {
    fpsScore,
    tpsScore,
    memoryScore,
    gpuPressure,
    vramPressure,
    cpuPressure,
    ramDeltaLabel,
    fpsDeltaLabel,
    effectiveCount,
    conditionalCount,
    redundantCount,
    conflictCount,
  };

  return {
    assemblyScore: packMetrics.totalScore,
    coveragePct,
    coveredSubsystems: packMetrics.coveredSubsystems,
    missingSubsystems: packMetrics.missingSubsystems,
    subsystemScores: packMetrics.subsystemScores,
    synergies,
    overlaps,
    zeroOrLowImpactIds,
    networkOnlyIds,
    highVramIds,
    hardwareSummary: {
      highGpuIds,
      highVramIds,
      highCpuIds,
      ramSaverIds,
    },
    resourceBalance,
    artifactRisk: packMetrics.artifactRisk,
    dubiousMods,
    scoreBreakdown: packMetrics.scoreBreakdown,
  };
}

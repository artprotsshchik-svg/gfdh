import { MODS_DATABASE, MOD_GROUPS, type ModItem } from '../data/modsData.ts';
import type { AssemblyPreferences } from './modTypes.ts';
import {
  EXCLUSIVE_ENGINE_POOLS,
  MOD_ALTERNATIVE_DEPENDENCIES,
  MOD_BY_ID,
  analyzeSelection,
  getDirectDependencies,
  getRuleConflictingIds,
  summarizeAssemblyImpact,
} from './modAnalyzer.ts';
import { toggleModSmart } from './modBuilder.ts';
import { estimateFpsRange } from './fpsEstimator.ts';

export interface ModDependencyIssue {
  missingIds: string[];
  missingNames: string[];
  /** True when the mod itself is currently selected and lacks at least one dependency */
  hasMissingForSelected: boolean;
}

export interface ModConflictIssue {
  conflictingIds: string[];
  conflictingNames: string[];
  /** Can be resolved in 1 click by replacing conflicting selected mods with this mod */
  canReplace: boolean;
}

export interface ModHoverDeltaPreview {
  modId: string;
  modName: string;
  action: 'add' | 'remove';
  currentScore: number;
  nextScore: number;
  scoreDelta: number;
  currentFpsLabel: string;
  nextFpsLabel: string;
  addedDepNames: string[];
  removedConflictNames: string[];
}

export function getMissingDependenciesForMod(
  modId: string,
  selectedSet: Set<string>,
  warnings?: ReturnType<typeof analyzeSelection>['warnings']
): ModDependencyIssue {
  const missingSet = new Set<string>();

  if (selectedSet.has(modId)) {
    for (const depId of getDirectDependencies(modId)) {
      if (!selectedSet.has(depId) && MOD_BY_ID.has(depId)) {
        missingSet.add(depId);
      }
    }
    const altGroups = MOD_ALTERNATIVE_DEPENDENCIES[modId] || [];
    for (const group of altGroups) {
      if (group.length > 0 && !group.some((id: string) => selectedSet.has(id))) {
        const firstValid = group.find((id: string) => MOD_BY_ID.has(id));
        if (firstValid) missingSet.add(firstValid);
      }
    }

    const mod = MOD_BY_ID.get(modId);
    if (mod && mod.platform.includes('Sinytra')) {
      if (!selectedSet.has('sinytra-connector')) missingSet.add('sinytra-connector');
      if (!selectedSet.has('forgified-fabric-api')) missingSet.add('forgified-fabric-api');
    }

    if (warnings) {
      for (const w of warnings) {
        if (w.modId === modId && w.fixModIds) {
          for (const fid of w.fixModIds) {
            if (!selectedSet.has(fid) && MOD_BY_ID.has(fid)) {
              missingSet.add(fid);
            }
          }
        }
      }
    }
  }

  const missingIds = Array.from(missingSet);
  const missingNames = missingIds.map(id => MOD_BY_ID.get(id)?.name || id);
  return {
    missingIds,
    missingNames,
    hasMissingForSelected: missingIds.length > 0,
  };
}

export function getConflictsForMod(
  modId: string,
  selectedSet: Set<string>,
  groupId?: string
): ModConflictIssue {
  const conflictingSet = new Set<string>();

  for (const cid of getRuleConflictingIds(modId)) {
    if (cid !== modId && selectedSet.has(cid)) {
      conflictingSet.add(cid);
    }
  }

  if (groupId) {
    const pool = EXCLUSIVE_ENGINE_POOLS[groupId] || [];
    if (pool.includes(modId)) {
      for (const pid of pool) {
        if (pid !== modId && selectedSet.has(pid)) {
          conflictingSet.add(pid);
        }
      }
    }
  } else {
    const mod = MOD_BY_ID.get(modId);
    if (mod?.groupId) {
      const pool = EXCLUSIVE_ENGINE_POOLS[mod.groupId] || [];
      if (pool.includes(modId)) {
        for (const pid of pool) {
          if (pid !== modId && selectedSet.has(pid)) {
            conflictingSet.add(pid);
          }
        }
      }
    }
  }

  const conflictingIds = Array.from(conflictingSet);
  const conflictingNames = conflictingIds.map(id => MOD_BY_ID.get(id)?.name || id);
  const targetMod = MOD_BY_ID.get(modId);
  const canReplace =
    conflictingIds.length > 0 &&
    Boolean(targetMod && targetMod.status !== 'danger');

  return {
    conflictingIds,
    conflictingNames,
    canReplace,
  };
}

export function addMissingDependenciesForMod(
  selectedIds: string[],
  modId: string,
  prefs?: AssemblyPreferences
): { nextIds: string[]; addedNames: string[] } {
  const analysis = analyzeSelection(selectedIds);
  const { missingIds } = getMissingDependenciesForMod(modId, new Set(selectedIds), analysis.warnings);
  if (missingIds.length === 0) {
    return { nextIds: selectedIds, addedNames: [] };
  }
  let nextIds = [...selectedIds];
  const addedNames: string[] = [];
  for (const depId of missingIds) {
    if (!nextIds.includes(depId)) {
      const res = toggleModSmart(nextIds, depId, { strict: true, prefs });
      nextIds = res.nextIds;
      const depName = MOD_BY_ID.get(depId)?.name;
      if (depName) addedNames.push(depName);
    }
  }
  return { nextIds, addedNames };
}

export function replaceConflictingWithMod(
  selectedIds: string[],
  targetModId: string,
  prefs?: AssemblyPreferences
): { nextIds: string[]; replacedNames: string[]; notice: string | null } {
  const targetMod = MOD_BY_ID.get(targetModId);
  if (!targetMod) {
    return { nextIds: selectedIds, replacedNames: [], notice: null };
  }
  const { conflictingIds, conflictingNames } = getConflictsForMod(
    targetModId,
    new Set(selectedIds),
    targetMod.groupId
  );
  const withoutConflicts = selectedIds.filter(id => !conflictingIds.includes(id));
  if (withoutConflicts.includes(targetModId)) {
    return {
      nextIds: withoutConflicts,
      replacedNames: conflictingNames,
      notice:
        conflictingNames.length > 0
          ? `Убраны конфликтующие с ${targetMod.name}: ${conflictingNames.join(', ')}.`
          : null,
    };
  }
  const toggled = toggleModSmart(withoutConflicts, targetModId, { strict: true, prefs });
  return {
    nextIds: toggled.nextIds,
    replacedNames: conflictingNames,
    notice:
      conflictingNames.length > 0
        ? `Заменено (${conflictingNames.join(', ')}) → ${targetMod.name}.`
        : toggled.notice,
  };
}

export function previewModToggleDelta(
  mod: ModItem,
  selectedIds: string[],
  currentScore: number,
  currentFpsLabel: string,
  prefs?: AssemblyPreferences
): ModHoverDeltaPreview {
  const isSelected = selectedIds.includes(mod.id);
  const res = toggleModSmart(selectedIds, mod.id, { strict: true, prefs });
  const prevSet = new Set(selectedIds);
  const nextSet = new Set(res.nextIds);

  const nextAnalysis = analyzeSelection(res.nextIds);
  const nextSummary = summarizeAssemblyImpact(res.nextIds, nextAnalysis, prefs);
  const nextFps = estimateFpsRange(res.nextIds, nextSummary, prefs);

  const addedDepNames: string[] = [];
  for (const id of res.nextIds) {
    if (id !== mod.id && !prevSet.has(id)) {
      const m = MOD_BY_ID.get(id);
      if (m) addedDepNames.push(m.name);
    }
  }

  const removedConflictNames: string[] = [];
  for (const id of selectedIds) {
    if (id !== mod.id && !nextSet.has(id)) {
      const m = MOD_BY_ID.get(id);
      if (m) removedConflictNames.push(m.name);
    }
  }

  return {
    modId: mod.id,
    modName: mod.name,
    action: isSelected ? 'remove' : 'add',
    currentScore,
    nextScore: nextSummary.assemblyScore,
    scoreDelta: nextSummary.assemblyScore - currentScore,
    currentFpsLabel,
    nextFpsLabel: nextFps.label,
    addedDepNames,
    removedConflictNames,
  };
}

export function getModGroupTitle(groupId?: string): string {
  if (!groupId) return '';
  return MOD_GROUPS.find(g => g.id === groupId)?.title || '';
}

export function getAllCatalogModIds(): string[] {
  return MODS_DATABASE.map(m => m.id);
}

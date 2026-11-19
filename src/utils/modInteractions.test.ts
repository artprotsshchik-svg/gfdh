import test from 'node:test';
import assert from 'node:assert/strict';
import { MODS_DATABASE } from '../data/modsData.ts';
import { INITIAL_BUILDER_PREFS } from './modTypes.ts';
import { analyzeSelection, summarizeAssemblyImpact } from './modAnalyzer.ts';
import {
  addMissingDependenciesForMod,
  getConflictsForMod,
  getMissingDependenciesForMod,
  previewModToggleDelta,
  replaceConflictingWithMod,
} from './modInteractions.ts';

const BY_ID = new Map(MODS_DATABASE.map(m => [m.id, m]));

test('getMissingDependenciesForMod and addMissingDependenciesForMod resolve Sinytra/Forge dependencies', () => {
  const selected = new Set(['nvidium']);
  const issue = getMissingDependenciesForMod('nvidium', selected);
  assert.equal(issue.hasMissingForSelected, true);
  assert.ok(issue.missingIds.includes('embeddium') || issue.missingIds.includes('sinytra-connector'));

  const applied = addMissingDependenciesForMod(['nvidium'], 'nvidium', INITIAL_BUILDER_PREFS);
  assert.ok(applied.nextIds.length > 1);
  assert.ok(applied.addedNames.length > 0);
});

test('getConflictsForMod and replaceConflictingWithMod swap mutually exclusive mods in one action', () => {
  const conflicts = getConflictsForMod('xenon', new Set(['embeddium']), 'core-renderer');
  assert.equal(conflicts.canReplace, true);
  assert.ok(conflicts.conflictingIds.includes('embeddium'));

  const replaced = replaceConflictingWithMod(['embeddium', 'modernfix'], 'xenon', INITIAL_BUILDER_PREFS);
  assert.ok(replaced.nextIds.includes('xenon'));
  assert.ok(!replaced.nextIds.includes('embeddium'));
  assert.ok(replaced.nextIds.includes('modernfix'));
  assert.ok(replaced.replacedNames.includes('Embeddium'));
});

test('previewModToggleDelta forecasts score delta and FPS range change', () => {
  const modernfix = BY_ID.get('modernfix')!;
  const baseIds = ['embeddium'];
  const baseSummary = summarizeAssemblyImpact(baseIds, analyzeSelection(baseIds), INITIAL_BUILDER_PREFS);
  const preview = previewModToggleDelta(
    modernfix,
    baseIds,
    baseSummary.assemblyScore,
    '+20–35% FPS (оценка)',
    INITIAL_BUILDER_PREFS
  );
  assert.equal(preview.action, 'add');
  assert.equal(preview.scoreDelta, preview.nextScore - baseSummary.assemblyScore);
  assert.ok(preview.scoreDelta > 0, `expected positive scoreDelta adding modernfix, got ${preview.scoreDelta}`);
  assert.match(preview.nextFpsLabel, /оценка/);
});

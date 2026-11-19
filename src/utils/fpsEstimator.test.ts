import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateFpsRange } from './fpsEstimator.ts';
import { INITIAL_BUILDER_PREFS } from './modTypes.ts';
import { buildSmartAssembly, summarizeAssemblyImpact } from './modLogic.ts';

test('estimateFpsRange returns 0% (оценка) for empty list', () => {
  const est = estimateFpsRange([]);
  assert.equal(est.minPct, 0);
  assert.equal(est.maxPct, 0);
  assert.match(est.label, /оценка/);
});

test('estimateFpsRange applies diminishing returns instead of summing mod percentages linearly', () => {
  const smartIds = buildSmartAssembly({
    ...INITIAL_BUILDER_PREFS,
    gpu: 'nvidia',
    mode: 'singleplayer',
    goal: 'balanced',
    useCreate: false,
    useShaders: false,
  }).modIds;
  const summary = summarizeAssemblyImpact(smartIds);
  const est = estimateFpsRange(smartIds, summary, { ...INITIAL_BUILDER_PREFS, useShaders: false });

  assert.match(est.label, /оценка/);
  assert.ok(est.minPct >= 20 && est.minPct < est.maxPct, `expected valid range, got ${est.minPct}-${est.maxPct}`);
  assert.ok(est.maxPct <= 95, `expected realistic diminishing-returns cap <=95%, got ${est.maxPct}`);

  // Shaders mode must noticeably lower the expected relative gain range
  const estShaders = estimateFpsRange(smartIds, summary, { ...INITIAL_BUILDER_PREFS, useShaders: true });
  assert.ok(estShaders.maxPct < est.maxPct, `expected shader ceiling ${estShaders.maxPct} < non-shader ${est.maxPct}`);
});

test('estimateFpsRange reports instability when active conflicts exist', () => {
  const est = estimateFpsRange(['embeddium', 'xenon']);
  assert.equal(est.hasConflicts, true);
  assert.match(est.label, /конфликт/i);
  assert.match(est.label, /оценка/);
});

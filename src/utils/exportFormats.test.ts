import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MRPACK_UNAVAILABLE_REASON,
  exportAssemblyAsCsv,
  exportAssemblyAsJson,
  exportAssemblyAsTxt,
} from './exportFormats.ts';
import { estimateFpsRange } from './fpsEstimator.ts';
import { INITIAL_BUILDER_PREFS, summarizeAssemblyImpact } from './modLogic.ts';
import { decodeShareHash, encodeShareHash } from './persistence.ts';

test('export formats (.txt, .csv, .json) include valid assembly data and .mrpack unavailability reason is documented', () => {
  const ids = ['embeddium', 'modernfix', 'ferritecore'];
  const summary = summarizeAssemblyImpact(ids, undefined, INITIAL_BUILDER_PREFS);
  const fps = estimateFpsRange(ids, summary, INITIAL_BUILDER_PREFS);

  const txt = exportAssemblyAsTxt(ids, summary, fps);
  assert.match(txt, /Embeddium/);
  assert.match(txt, /ModernFix/);
  assert.match(txt, /оценка/);

  const csv = exportAssemblyAsCsv(ids, INITIAL_BUILDER_PREFS);
  assert.match(csv, /id,name,category,group,platform,status,impact_points,curseforge_url/);
  assert.match(csv, /embeddium/);

  const json = JSON.parse(exportAssemblyAsJson(ids, summary, fps, INITIAL_BUILDER_PREFS));
  assert.equal(json.minecraftVersion, '1.20.1');
  assert.equal(json.loader, 'forge');
  assert.equal(json.mods.length, 3);
  assert.match(MRPACK_UNAVAILABLE_REASON, /Modrinth/);
});

test('encodeShareHash and decodeShareHash round-trip state cleanly and sanitize invalid mod IDs', () => {
  const hash = encodeShareHash({
    activeTab: 'configs',
    builderModIds: ['embeddium', 'modernfix'],
    checkedModIds: ['ferritecore'],
    builderPrefs: { ...INITIAL_BUILDER_PREFS, useShaders: true, packScale: 'heavy' },
  });
  assert.ok(hash.startsWith('#b='));

  const decoded = decodeShareHash(hash);
  assert.ok(decoded);
  assert.equal(decoded?.activeTab, 'configs');
  assert.deepEqual(decoded?.builderModIds, ['embeddium', 'modernfix']);
  assert.deepEqual(decoded?.checkedModIds, ['ferritecore']);
  assert.equal(decoded?.builderPrefs?.useShaders, true);
  assert.equal(decoded?.builderPrefs?.packScale, 'heavy');
  assert.equal(decodeShareHash('#b=invalid_base64'), null);
});

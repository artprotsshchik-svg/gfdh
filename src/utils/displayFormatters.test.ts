import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanModDescription,
  cleanStatusLabel,
  formatShortOneLineDescription,
  getModEnvBadge,
  getModLoaderBadge,
  getRecommendedConfigForMod,
} from './displayFormatters.ts';
import { MODS_DATABASE } from '../data/modsData.ts';

describe('displayFormatters', () => {
  it('strips download counts, CF/MR tags, and dates without breaking Forge 1.20.1', () => {
    assert.equal(cleanStatusLabel('Стабильно (84M+ CF)'), 'Стабильно');
    const cleaned = cleanModDescription('Быстрый рендер для Forge 1.20.1 (20M+ MR, обновлен 10.2026). Вторая фраза.');
    assert.equal(cleaned, 'Быстрый рендер для Forge 1.20.1. Вторая фраза.');
    assert.equal(
      formatShortOneLineDescription('Быстрый рендер для Forge 1.20.1. Вторая длинная фраза про детали.'),
      'Быстрый рендер для Forge 1.20.1.'
    );
  });

  it('derives clean loader badges for Forge, Sinytra, NeoForge, and Fabric', () => {
    assert.equal(getModLoaderBadge({ platform: 'Forge 1.20.1' }), 'Forge');
    assert.equal(getModLoaderBadge({ platform: 'Fabric (через Sinytra Connector)' }), 'Sinytra');
    assert.equal(getModLoaderBadge({ platform: 'NeoForge 1.21+' }), 'NeoForge');
    assert.equal(getModLoaderBadge({ platform: 'Fabric (Справка)' }), 'Fabric');
  });

  it('derives client / server badges across catalog mods', () => {
    const embeddium = MODS_DATABASE.find(m => m.id === 'embeddium')!;
    const nvidium = MODS_DATABASE.find(m => m.id === 'nvidium')!;
    const spark = MODS_DATABASE.find(m => m.id === 'spark')!;
    const servercore = MODS_DATABASE.find(m => m.id === 'servercore')!;

    assert.equal(getModEnvBadge(embeddium), 'Клиент');
    assert.equal(getModEnvBadge(nvidium), 'Клиент');
    assert.equal(getModLoaderBadge(nvidium), 'Sinytra');
    assert.equal(getModEnvBadge(spark), 'Клиент / Сервер');
    assert.equal(getModEnvBadge(servercore), 'Сервер');
  });

  it('returns Nvidium config entry and ensures no Nvidium Forged exists', () => {
    const nvidiumMods = MODS_DATABASE.filter(m => m.name.toLowerCase().includes('nvidium'));
    assert.equal(nvidiumMods.length, 1);
    assert.equal(nvidiumMods[0].id, 'nvidium');
    const cfg = getRecommendedConfigForMod('nvidium');
    assert.ok(cfg);
    assert.equal(cfg.content, '[ВСТАВЬ СВОЙ JSON СЮДА]');
  });
});

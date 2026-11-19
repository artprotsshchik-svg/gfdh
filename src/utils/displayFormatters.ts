import type { ModItem } from '../data/modsData.ts';
import { MOD_RECOMMENDED_CONFIGS, type ModConfigEntry } from '../data/modConfigs.ts';

/**
 * UI display formatters:
 * Strips download counts, CF/MR tags, and update dates from user-facing strings
 * and derives clean loader/environment badges without modifying MODS_DATABASE.
 */

export function cleanStatusLabel(label: string): string {
  if (!label) return '';
  const out = label
    .replace(/\s*\([^)]*(?:\b(?:CF|MR|CurseForge|Modrinth)\b|\d+(?:\.\d+)?[kKmM]\+|\b\d{2}\.\d{4}\b|\b202\d\b|скач)[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return out || label;
}

export function cleanModDescription(description: string): string {
  if (!description) return '';
  const out = description
    .replace(/\s*\([^)]*(?:\b(?:CF|MR|CurseForge|Modrinth)\b|\d+(?:\.\d+)?[kKmM]\+|скачиван|обновлен|\b\d{2}\.\d{4}\b|\b202\d\b)[^)]*\)/gi, '')
    .replace(/\bна\s+(?:CurseForge|Modrinth|CF|MR)\b/gi, '')
    .replace(/\s*\(\s*\)/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return out;
}

export function formatShortOneLineDescription(description: string, maxLength = 120): string {
  const cleaned = cleanModDescription(description);
  const firstSentenceMatch = cleaned.match(/^(?:[^.!?]|[.!?](?!\s|$))+[.!?](?=\s|$)/);
  const candidate = firstSentenceMatch && firstSentenceMatch[0].length >= 24 ? firstSentenceMatch[0] : cleaned;
  if (candidate.length <= maxLength) return candidate;
  return candidate.slice(0, maxLength - 1).trimEnd() + '…';
}

export type ModLoaderBadge = 'Forge' | 'Sinytra' | 'NeoForge' | 'Fabric';

export function getModLoaderBadge(mod: Pick<ModItem, 'platform'>): ModLoaderBadge {
  const p = mod.platform || '';
  if (p.includes('Sinytra')) return 'Sinytra';
  if (p.includes('NeoForge') && !/\bForge\b/.test(p)) return 'NeoForge';
  if (p.includes('Fabric') && !/\bForge\b/.test(p) && !p.includes('Universal')) return 'Fabric';
  return 'Forge';
}

export type ModEnvBadge = 'Клиент' | 'Сервер' | 'Клиент / Сервер';

const CLIENT_ONLY_GROUPS = new Set([
  'core-renderer',
  'shaders-pipeline',
  'lod-nvidium',
  'block-culling',
  'leaves-culling',
  'block-entities',
  'particles-audio',
  'upscaling-bg',
  'potato-tweaks',
]);

const BOTH_SIDE_GROUPS = new Set([
  'memory-core',
  'lighting-engine',
  'tick-physics-engine',
  'worldgen-chunks',
  'networking',
  'recipes-jei',
  'items-clearlag',
  'boot-loading',
  'cpu-threads',
  'animations-compat',
  'profilers',
  'sinytra-bridge',
]);

export function getModEnvBadge(
  mod: Pick<ModItem, 'id' | 'groupId' | 'category' | 'description' | 'tags'>
): ModEnvBadge {
  const desc = (mod.description || '').toLowerCase();
  const tags = (mod.tags || []).map(t => t.toLowerCase());

  if (
    tags.includes('server-only') ||
    desc.includes('только для сервера') ||
    desc.includes('серверный мод') ||
    mod.id === 'servercore' ||
    mod.id === 'very-many-players-vmp' ||
    mod.id === 'vmp-forge' ||
    mod.id === 'chunky' ||
    mod.id === 'chunkyborder'
  ) {
    return 'Сервер';
  }

  if (
    tags.includes('client') ||
    tags.includes('client-only') ||
    desc.includes('клиентский мод') ||
    desc.includes('только на клиенте') ||
    mod.id === 'ixeris' ||
    mod.id === 'dynamic-fps' ||
    mod.id === 'restmode' ||
    mod.id === 'just-enough-items-jei' ||
    mod.id === 'emi'
  ) {
    return 'Клиент';
  }

  if (mod.groupId && CLIENT_ONLY_GROUPS.has(mod.groupId)) {
    return 'Клиент';
  }

  if (mod.groupId && BOTH_SIDE_GROUPS.has(mod.groupId)) {
    return 'Клиент / Сервер';
  }

  const cat = (mod.category || '').toLowerCase();
  if (cat.includes('рендер') || cat.includes('частиц') || cat.includes('апскейл')) {
    return 'Клиент';
  }

  return 'Клиент / Сервер';
}

export function getRecommendedConfigForMod(modId: string): ModConfigEntry | null {
  return MOD_RECOMMENDED_CONFIGS.find(entry => entry.modId === modId) ?? null;
}

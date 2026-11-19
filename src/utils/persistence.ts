import { MODS_DATABASE } from '../data/modsData.ts';
import { INITIAL_BUILDER_PREFS, type AssemblyPreferences } from './modLogic.ts';

export type PersistedTabKey = 'catalog' | 'assembler' | 'presets' | 'checker' | 'configs';

export interface PersistedAppState {
  schemaVersion: 2;
  dbUpdatedAt: string;
  lastSavedDate: string;
  activeTab: PersistedTabKey;
  checkedModIds: string[];
  builderModIds: string[];
  builderPrefs: AssemblyPreferences;
  focusModId: string | null;
}

const STORAGE_KEY = 'mod_optimizer_app_state_v2';
const VALID_MOD_IDS = new Set(MODS_DATABASE.map(m => m.id));
const VALID_TABS = new Set<PersistedTabKey>(['catalog', 'assembler', 'presets', 'checker', 'configs']);

export function formatRuDate(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function sanitizeModIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids)) return null;
  const filtered = ids.filter((id): id is string => typeof id === 'string' && VALID_MOD_IDS.has(id));
  return Array.from(new Set(filtered));
}

export function sanitizeBuilderPrefs(raw: unknown): AssemblyPreferences | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AssemblyPreferences>;
  const gpu = r.gpu === 'nvidia' || r.gpu === 'amd-intel' || r.gpu === 'integrated' ? r.gpu : INITIAL_BUILDER_PREFS.gpu;
  const mode = r.mode === 'singleplayer' || r.mode === 'server' || r.mode === 'hybrid-server' ? r.mode : INITIAL_BUILDER_PREFS.mode;
  const goal = r.goal === 'balanced' || r.goal === 'max-safe' || r.goal === 'potato' ? r.goal : INITIAL_BUILDER_PREFS.goal;
  const portStrategy =
    r.portStrategy === 'native-forge' || r.portStrategy === 'hybrid' || r.portStrategy === 'fabric-sinytra'
      ? r.portStrategy
      : INITIAL_BUILDER_PREFS.portStrategy;
  const recipeViewer =
    r.recipeViewer === 'none' || r.recipeViewer === 'jei' || r.recipeViewer === 'emi' || r.recipeViewer === 'emi-jei'
      ? r.recipeViewer
      : INITIAL_BUILDER_PREFS.recipeViewer;
  const packScale =
    r.packScale === 'light' || r.packScale === 'medium' || r.packScale === 'heavy'
      ? r.packScale
      : INITIAL_BUILDER_PREFS.packScale;
  const focusModId = typeof r.focusModId === 'string' && VALID_MOD_IDS.has(r.focusModId) ? r.focusModId : null;

  return {
    gpu,
    mode,
    goal,
    useShaders: typeof r.useShaders === 'boolean' ? r.useShaders : INITIAL_BUILDER_PREFS.useShaders,
    useCreate: typeof r.useCreate === 'boolean' ? r.useCreate : INITIAL_BUILDER_PREFS.useCreate,
    allowSinytra: typeof r.allowSinytra === 'boolean' ? r.allowSinytra : INITIAL_BUILDER_PREFS.allowSinytra,
    portStrategy,
    recipeViewer,
    packScale,
    focusModId,
  };
}

export function parsePersistedState(raw: unknown): Partial<PersistedAppState> | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const out: Partial<PersistedAppState> = {};

  if (typeof obj.dbUpdatedAt === 'string' && obj.dbUpdatedAt.trim()) {
    out.dbUpdatedAt = obj.dbUpdatedAt.trim();
  }
  if (typeof obj.lastSavedDate === 'string' && obj.lastSavedDate.trim()) {
    out.lastSavedDate = obj.lastSavedDate.trim();
  }
  if (typeof obj.activeTab === 'string' && VALID_TABS.has(obj.activeTab as PersistedTabKey)) {
    out.activeTab = obj.activeTab as PersistedTabKey;
  }

  const checked = sanitizeModIds(obj.checkedModIds);
  if (checked) out.checkedModIds = checked;

  const builder = sanitizeModIds(obj.builderModIds);
  if (builder) out.builderModIds = builder;

  const prefs = sanitizeBuilderPrefs(obj.builderPrefs);
  if (prefs) out.builderPrefs = prefs;

  if (obj.focusModId === null || (typeof obj.focusModId === 'string' && VALID_MOD_IDS.has(obj.focusModId))) {
    out.focusModId = obj.focusModId as string | null;
  }

  return out;
}

function encodeBase64UrlUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64UrlUtf8(token: string): string {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (token.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeShareHash(state: {
  activeTab: PersistedTabKey;
  builderModIds: string[];
  checkedModIds: string[];
  builderPrefs: AssemblyPreferences;
}): string {
  const compact = {
    t: state.activeTab,
    b: state.builderModIds,
    c: state.checkedModIds,
    p: {
      sh: state.builderPrefs.useShaders,
      ps: state.builderPrefs.portStrategy,
      rv: state.builderPrefs.recipeViewer,
      sc: state.builderPrefs.packScale,
      al: state.builderPrefs.allowSinytra,
      fc: state.builderPrefs.focusModId ?? null,
    },
  };
  return `#b=${encodeBase64UrlUtf8(JSON.stringify(compact))}`;
}

export function decodeShareHash(hash: string): Partial<PersistedAppState> | null {
  try {
    if (!hash || typeof hash !== 'string') return null;
    const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
    const match = trimmed.match(/(?:^|&)b=([^&]+)/);
    if (!match) return null;
    const raw = JSON.parse(decodeBase64UrlUtf8(match[1])) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') return null;
    const p = (raw.p && typeof raw.p === 'object' ? raw.p : {}) as Record<string, unknown>;
    return parsePersistedState({
      activeTab: raw.t,
      builderModIds: raw.b,
      checkedModIds: raw.c,
      builderPrefs: {
        ...INITIAL_BUILDER_PREFS,
        gpu: 'nvidia',
        mode: 'singleplayer',
        goal: 'balanced',
        useCreate: false,
        useShaders: typeof p.sh === 'boolean' ? p.sh : INITIAL_BUILDER_PREFS.useShaders,
        portStrategy: p.ps,
        recipeViewer: p.rv,
        packScale: p.sc,
        allowSinytra: typeof p.al === 'boolean' ? p.al : INITIAL_BUILDER_PREFS.allowSinytra,
        focusModId: p.fc ?? null,
      },
    });
  } catch {
    return null;
  }
}

export function loadLocalAppState(): Partial<PersistedAppState> | null {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.hash) {
      const fromHash = decodeShareHash(window.location.hash);
      if (fromHash && (fromHash.builderModIds || fromHash.checkedModIds || fromHash.activeTab)) {
        return fromHash;
      }
    }
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePersistedState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalAppState(state: PersistedAppState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota errors
  }
}

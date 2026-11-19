import type { DesktopAPI, ScanModsFolderResult } from '../types/desktop.d.ts';

async function postJSON<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<T>;
}

export function initDesktopBridge(): void {
  if (typeof window === 'undefined' || !window.__GO_DESKTOP_API__) return;

  const api: DesktopAPI = {
    isDesktop: true,
    getAppMeta: async () => {
      const res = await fetch('/api/desktop/meta', { cache: 'no-store' });
      return res.json();
    },
    checkHotDbUpdate: () => postJSON('/api/desktop/check-hot-db'),
    checkAppUpdate: async () => ({ ok: false, message: 'Используйте релизы GitHub' }),
    installAppUpdate: async () => {},
    scanModsFolder: () => postJSON<ScanModsFolderResult>('/api/desktop/scan-mods'),
    loadAppState: async () => {
      const res = await fetch('/api/desktop/state', { cache: 'no-store' });
      return res.json();
    },
    saveAppState: async state => {
      const data = await postJSON<{ ok?: boolean }>('/api/desktop/state', state);
      return Boolean(data.ok);
    },
    onAppUpdateStatus: () => () => {},
  };

  window.desktopAPI = api;

  // Route target="_blank" external links to Windows default browser instead of spawning WebView popups.
  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a[target="_blank"]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (href && (href.startsWith('https://') || href.startsWith('http://'))) {
      event.preventDefault();
      void postJSON('/api/desktop/open-external', { url: href });
    }
  });
}

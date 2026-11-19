export interface ScanModsFolderResult {
  canceled: boolean;
  folderPath: string;
  jarFiles: string[];
  hasConnectorFolder: boolean;
  hasEmbeddiumSodiumAlias: boolean;
}

export interface DesktopUpdateStatus {
  state: 'checking' | 'available' | 'none' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  message?: string;
}

export interface DesktopAPI {
  isDesktop: boolean;
  getAppMeta: () => Promise<{
    appVersion: string;
    hotManifest: { updatedAt: string; sha256: string } | null;
  }>;
  checkHotDbUpdate: () => Promise<{ status: string; updatedAt?: string; message?: string }>;
  checkAppUpdate: () => Promise<{ ok: boolean; version?: string; message?: string }>;
  installAppUpdate: () => Promise<void>;
  scanModsFolder: () => Promise<ScanModsFolderResult>;
  loadAppState?: () => Promise<Record<string, unknown> | null>;
  saveAppState?: (state: Record<string, unknown>) => Promise<boolean>;
  onAppUpdateStatus: (callback: (payload: DesktopUpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    __GO_DESKTOP_API__?: boolean;
    desktopAPI?: DesktopAPI;
  }
}

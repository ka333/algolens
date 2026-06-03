// Secure Chrome storage utility with fallback to localStorage for dev server testing

export interface AppSettings {
  autoSync: boolean;
  optOutTelemetry: boolean;
  commitTemplate: string;
}

export const STORAGE_KEYS = {
  GITHUB_TOKEN: 'github_token',
  GITHUB_USERNAME: 'github_username',
  GITHUB_REPO: 'github_repo',
  GITHUB_FOLDER: 'github_folder',
  SETTINGS: 'settings',
  LOCAL_STATS: 'local_stats',
};

const defaultSettings: AppSettings = {
  autoSync: true,
  optOutTelemetry: false,
  commitTemplate: 'solve: [{difficulty}] {title} ({language})',
};

// Safe wrapper for chrome.storage.local
export const getStorageData = <T>(keys: string | string[]): Promise<Record<string, any>> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    } else {
      // Fallback to localStorage for browser preview mode
      const result: Record<string, any> = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((k) => {
        const val = localStorage.getItem(k);
        try {
          result[k] = val ? JSON.parse(val) : null;
        } catch {
          result[k] = val;
        }
      });
      resolve(result);
    }
  });
};

export const setStorageData = (data: Record<string, any>): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(data, () => {
        resolve();
      });
    } else {
      // Fallback to localStorage for browser preview mode
      Object.entries(data).forEach(([key, val]) => {
        localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
      });
      resolve();
    }
  });
};

export const removeStorageData = (keys: string | string[]): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(keys, () => {
        resolve();
      });
    } else {
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((k) => localStorage.removeItem(k));
      resolve();
    }
  });
};

export const getAppSettings = async (): Promise<AppSettings> => {
  const result = await getStorageData(STORAGE_KEYS.SETTINGS);
  return { ...defaultSettings, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
};

export const saveAppSettings = async (settings: Partial<AppSettings>): Promise<AppSettings> => {
  const current = await getAppSettings();
  const updated = { ...current, ...settings };
  await setStorageData({ [STORAGE_KEYS.SETTINGS]: updated });
  return updated;
};

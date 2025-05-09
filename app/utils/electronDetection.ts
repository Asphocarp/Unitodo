/**
 * Utilities for Electron environment detection and integration
 */

import { getVersion } from '@tauri-apps/api/app';

/**
 * Checks if the current environment is Tauri.
 */
export const isTauri = (): boolean => {
  // @ts-ignore // Accessing __TAURI__ which might not be in global Window type by default
  return typeof window !== 'undefined' && !!window.__TAURI__;
};

/**
 * Gets the application version from Tauri.
 * Returns 'Unknown' if not in a Tauri environment or if an error occurs.
 */
export const getAppVersion = async (): Promise<string> => {
  if (isTauri()) {
    try {
      return await getVersion();
    } catch (error) {
      console.error("Error getting Tauri app version:", error);
      return 'Unknown';
    }
  }
  return 'Unknown'; // Not in a Tauri environment
};

// Helper function to determine if we're running on macOS
export const isMacOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

// Export an object with Electron-related information
export const electronInfo = {
  isElectron: false,
  isMacOS: isMacOS(),
  getAppVersion: getAppVersion
};

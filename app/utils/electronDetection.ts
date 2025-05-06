/**
 * Utilities for Electron environment detection and integration
 */

// Check if we're running in Electron
export const isElectronEnvironment = (): boolean => {
  // @ts-ignore - window.electron is injected by Electron preload script
  return typeof window !== 'undefined' && !!window.electron;
};

// Helper to get the version of the app when running in Electron
export const getAppVersion = (): string | null => {
  if (!isElectronEnvironment()) {
    return null;
  }
  
  // @ts-ignore - accessing electron properties
  return window.electron.appVersion || 'Unknown';
};

// Helper function to determine if we're running on macOS
export const isMacOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

// Export an object with Electron-related information
export const electronInfo = {
  isElectron: isElectronEnvironment(),
  isMacOS: isMacOS(),
  getAppVersion: getAppVersion
};

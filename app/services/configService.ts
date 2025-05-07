import { Config as AppConfig } from '../types';

// @ts-ignore: electronApi is exposed on window via preload.js
const electronApi = typeof window !== 'undefined' ? window.electronApi : undefined;

// Helper functions appConfigToGrpcConfigMessage and grpcConfigMessageToAppConfig are removed 
// as this logic is now handled in the main process.

export async function fetchConfig(): Promise<AppConfig> {
  if (!electronApi) {
    console.warn('[configService] Electron API not available during fetchConfig. Build-time or preload issue?');
    // Return a default/empty-like config to allow build to pass
    // Actual config will be fetched client-side in Electron.
    return Promise.resolve({
        rg: { paths: [] }, 
        projects: {}, 
        refresh_interval: 5000, 
        editor_uri_scheme: 'vscode://file/',
        todo_done_pairs: [],
        default_append_basename: 'unitodo.append.md'
    } as AppConfig);
  }
  try {
    // The main process handler for 'get-config' returns the AppConfig structure directly.
    return await electronApi.getConfig();
  } catch (error) {
    console.error('Error invoking getConfig via IPC:', error);
    throw error;
  }
}

export async function updateConfig(newConfig: AppConfig): Promise<{ status: string; message: string }> {
  if (!electronApi) {
    console.warn('[configService] Electron API not available during updateConfig.');
    return Promise.reject(new Error('Electron API not available'));
  }
  try {
    // The main process handler for 'update-config' returns { status, message } directly.
    return await electronApi.updateConfig(newConfig);
  } catch (error) {
    console.error('Error invoking updateConfig via IPC:', error);
    throw error;
  }
} 
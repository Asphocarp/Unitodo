import { Config } from '../types';
import { fetchApi, postApi } from '../utils/apiUtils';

export async function fetchConfig(): Promise<Config> {
  try {
    return await fetchApi<Config>('/api/config');
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error; // Re-throw for component handling
  }
}

export async function updateConfig(newConfig: Config): Promise<any> {
  try {
    return await postApi<any>('/api/config', newConfig);
  } catch (error) {
    console.error('Error updating config:', error);
    throw error; // Re-throw for component handling
  }
} 
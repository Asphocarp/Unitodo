// API utility functions to handle API calls in both browser and Electron environments

// Base URL for the Rust backend
const BACKEND_BASE_URL = 'http://localhost:8080';

// Check if we're running in Electron
const isElectron = (): boolean => {
  // @ts-ignore - window.electron is injected by Electron preload script
  return typeof window !== 'undefined' && !!window.electron;
};

/**
 * Creates the appropriate API URL based on the environment
 * In the browser, use Next.js API routes
 * In Electron, connect directly to the Rust backend
 */
export const getApiUrl = (endpoint: string): string => {
  // If we're in Electron, connect directly to the Rust backend
  if (isElectron()) {
    // Remove leading /api/ if present
    const cleanEndpoint = endpoint.startsWith('/api/') 
      ? endpoint.substring(5) 
      : endpoint.startsWith('/') 
        ? endpoint.substring(1)
        : endpoint;
    
    return `${BACKEND_BASE_URL}/${cleanEndpoint}`;
  }
  
  // In browser, use Next.js API routes
  return endpoint;
};

/**
 * Wrapper for fetch that handles the appropriate API URL based on environment
 */
export const apiFetch = async (
  endpoint: string, 
  options?: RequestInit
): Promise<Response> => {
  const url = getApiUrl(endpoint);
  return fetch(url, options);
};

// Re-export common fetch methods with environment awareness
export const fetchApi = async <T>(endpoint: string): Promise<T> => {
  try {
    const response = await apiFetch(endpoint);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Could not parse error response',
        code: response.status 
      }));
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error || 'No details'}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
};

export const postApi = async <T>(
  endpoint: string, 
  data: any
): Promise<T> => {
  try {
    const response = await apiFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Could not parse error response',
        code: response.status 
      }));
      
      // Special handling for 409 Conflict status
      if (response.status === 409) {
        throw new Error('CONFLICT_ERROR: Content was modified by someone else. Please refresh and try again.');
      }
      
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error || 'No details'}`);
    }

    return await response.json() as T;
  } catch (error) {
    console.error(`Error posting to ${endpoint}:`, error);
    throw error;
  }
};

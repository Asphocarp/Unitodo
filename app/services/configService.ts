import { Config } from '../types'; // Assuming Config type will be defined in types.ts

// Revert to using Next.js API routes to avoid CORS

export async function fetchConfig(): Promise<Config> {
  try {
    const response = await fetch('/api/config', { cache: 'no-store' }); // Use Next.js API route
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Could not parse error response from API route',
        code: response.status 
      }));
      throw new Error(`API route error fetching config: ${response.status} ${response.statusText} - ${errorData.error || 'No details'}`);
    }
    const config: Config = await response.json();
    return config;
  } catch (error) {
    console.error('Error fetching config via API route:', error);
    throw error; // Re-throw for component handling
  }
}

export async function updateConfig(newConfig: Config): Promise<any> { // Return type can be more specific if backend sends data
  try {
    const response = await fetch('/api/config', { // Use Next.js API route
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newConfig),
      cache: 'no-store' // Ensure request is always sent
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Could not parse error response from API route',
        code: response.status 
      }));
      throw new Error(`API route error updating config: ${response.status} ${response.statusText} - ${errorData.error || 'No details'}`);
    }

    // Assuming the API route forwards the backend's success status
    return await response.json(); 
  } catch (error) {
    console.error('Error updating config via API route:', error);
    throw error; // Re-throw for component handling
  }
} 
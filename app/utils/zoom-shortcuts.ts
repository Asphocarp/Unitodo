import { invoke } from '@tauri-apps/api/core';
import { zoomIndicatorStore } from '../store/zoomIndicatorStore';

export function setupZoomShortcuts() {
  const handleKeyDown = async (event: KeyboardEvent) => {
    // Check for Cmd (Mac) or Ctrl (Windows/Linux)
    const isModifierPressed = event.metaKey || event.ctrlKey;
    
    if (!isModifierPressed) return;

    try {
      switch (event.key) {
        case '=':
        case '+':
          event.preventDefault();
          const [zoomInFactor, zoomInPercent] = await invoke('zoom_in') as [number, number];
          console.log(`🔍+ Zoomed in to ${zoomInPercent}%`);
          zoomIndicatorStore.showZoomIndicator(zoomInPercent);
          break;
          
        case '-':
          event.preventDefault();
          const [zoomOutFactor, zoomOutPercent] = await invoke('zoom_out') as [number, number];
          console.log(`🔍- Zoomed out to ${zoomOutPercent}%`);
          zoomIndicatorStore.showZoomIndicator(zoomOutPercent);
          break;
          
        case '0':
          event.preventDefault();
          const [resetFactor, resetPercent] = await invoke('zoom_reset') as [number, number];
          console.log(`🔍↻ Zoom reset to ${resetPercent}%`);
          zoomIndicatorStore.showZoomIndicator(resetPercent);
          break;
      }
    } catch (error) {
      console.error('Failed to execute zoom command:', error);
    }
  };

  // Add event listener to document
  document.addEventListener('keydown', handleKeyDown);
  
  console.log('✅ Local zoom shortcuts registered (Cmd/Ctrl + =, -, 0)');
  console.log('📊 Available zoom levels: 25%, 33%, 50%, 67%, 75%, 80%, 90%, 100%, 110%, 125%, 150%, 175%, 200%, 250%, 300%, 400%, 500%');
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}

export async function getCurrentZoom(): Promise<{ factor: number; percentage: number }> {
  try {
    const [factor, percentage] = await invoke('get_zoom_level') as [number, number];
    return { factor, percentage };
  } catch (error) {
    console.error('Failed to get zoom level:', error);
    return { factor: 1.0, percentage: 100 };
  }
} 
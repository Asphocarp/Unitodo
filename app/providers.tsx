'use client';

import React, { useEffect } from 'react';
import { darkModeStore, applyDarkModeClass } from './utils/darkMode';
import { setupZoomShortcuts } from './utils/zoom-shortcuts';
import { observer } from 'mobx-react-lite';

// Make Providers an observer to react to changes in darkModeStore
export const Providers = observer(({ children }: { children: React.ReactNode }) => {
  // isDarkMode is now accessed directly from the MobX store instance
  const isDarkMode = darkModeStore.isDarkMode;
  
  // Apply dark mode class on mount and when it changes
  // This useEffect handles the initial application and updates when isDarkMode changes.
  useEffect(() => {
    applyDarkModeClass(isDarkMode);
  }, [isDarkMode]);
  
  // Initialize zoom shortcuts when the app loads
  useEffect(() => {
    const cleanup = setupZoomShortcuts();
    return cleanup; // Cleanup on unmount
  }, []);
  
  // The system preference listener is already handled within the darkModeStore's _initialize method.
  // So, no need for the second useEffect here that was previously in Zustand version.
  
  return <>{children}</>;
}); 
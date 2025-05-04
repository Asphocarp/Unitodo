'use client';

import React, { useEffect } from 'react';
import { useDarkModeStore, applyDarkMode } from './utils/darkMode';

export function Providers({ children }: { children: React.ReactNode }) {
  // Get dark mode state from the store
  const isDarkMode = useDarkModeStore(state => state.isDarkMode);
  
  // Apply dark mode class on mount and when it changes
  useEffect(() => {
    applyDarkMode(isDarkMode);
  }, [isDarkMode]);
  
  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Handler to update state when system preference changes
    const handleChange = (e: MediaQueryListEvent) => {
      const setDarkMode = useDarkModeStore.getState().setDarkMode;
      setDarkMode(e.matches);
    };
    
    // Add listener
    mediaQuery.addEventListener('change', handleChange);
    
    // Remove listener on cleanup
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return <>{children}</>;
} 
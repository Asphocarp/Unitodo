// Dark mode utility functions
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DarkModeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

// Create a Zustand store with persistence
export const useDarkModeStore = create<DarkModeState>()(
  persist(
    (set) => ({
      isDarkMode: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (value: boolean) => set({ isDarkMode: value }),
    }),
    {
      name: 'unitodo-dark-mode',
    }
  )
);

// Function to apply dark mode class to HTML element
export function applyDarkMode(isDark: boolean) {
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

// Hook to initialize dark mode
export function useDarkMode() {
  const { isDarkMode, toggleDarkMode, setDarkMode } = useDarkModeStore();
  
  // Apply dark mode class when store changes
  if (typeof window !== 'undefined') {
    applyDarkMode(isDarkMode);
  }
  
  return { isDarkMode, toggleDarkMode, setDarkMode };
} 
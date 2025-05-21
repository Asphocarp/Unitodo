// Dark mode utility functions
'use client';

import { makeObservable, observable, action, reaction, runInAction } from 'mobx';
import { useEffect } from 'react'; // Keep for useDarkMode hook if it needs client-side effects

// MobX Store for Dark Mode
class DarkModeStoreImpl {
  isDarkMode: boolean = false;

  constructor() {
    makeObservable(this, {
      isDarkMode: observable,
      toggleDarkMode: action,
      setDarkMode: action,
      _initialize: action, // Ensure all methods changing observables are actions
      _systemPrefListener: action,
    });
    this._initialize();
  }

  _initialize() {
    if (typeof window !== 'undefined') {
      let initialDarkMode: boolean;
      const storedValue = localStorage.getItem('unitodo-dark-mode');

      if (storedValue !== null) {
        try {
          initialDarkMode = JSON.parse(storedValue).isDarkMode;
        } catch (e) {
          console.error("Failed to parse dark mode from localStorage", e);
          initialDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      } else {
        initialDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      // Use runInAction for assignments outside of constructor/actions
      runInAction(() => {
        this.isDarkMode = initialDarkMode;
      });

      reaction(
        () => this.isDarkMode,
        (isDark: boolean) => {
          localStorage.setItem('unitodo-dark-mode', JSON.stringify({ isDarkMode: isDark }));
          applyDarkModeClass(isDark);
        },
        { fireImmediately: true } // Apply class immediately with initial state
      );

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', this._systemPrefListener);
      
      // It's good practice to provide a way to clean up listeners,
      // but for a singleton store, it lives as long as the app.
      // If this store were to be re-instantiated, cleanup would be crucial.
    }
  }

  _systemPrefListener = (e: MediaQueryListEvent) => {
    // Update store only if no user preference is stored in localStorage,
    // or implement a more sophisticated strategy (e.g., always follow system).
    if (localStorage.getItem('unitodo-dark-mode') === null) {
      this.setDarkMode(e.matches);
    }
  };

  toggleDarkMode = () => {
    this.isDarkMode = !this.isDarkMode;
  };

  setDarkMode = (value: boolean) => {
    this.isDarkMode = value;
  };
}

export const darkModeStore = new DarkModeStoreImpl();

// Renamed to avoid conflict if there's another applyDarkMode, and to be specific
export function applyDarkModeClass(isDark: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark);
  }
}

// Hook to use dark mode. Components using this will need to be MobX observers.
export function useDarkMode() {
  // The store is a singleton, so we can access its properties directly.
  // Components using this hook and reacting to isDarkMode changes should be wrapped with observer().
  
  // useEffect here is for any additional hook-specific logic if needed,
  // but the core dark mode logic is in the store.
  // The system preference listener is now in the store's _initialize method.

  return {
    isDarkMode: darkModeStore.isDarkMode,
    toggleDarkMode: darkModeStore.toggleDarkMode,
    setDarkMode: darkModeStore.setDarkMode,
  };
} 
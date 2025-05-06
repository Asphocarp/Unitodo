import { create } from 'zustand';
import { Config } from '../types';
import { fetchConfig, updateConfig } from '../services/configService';

interface ConfigState {
  config: Config | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  saveMessage: string | null;
  initialConfigLoaded: boolean; // Track if initial load has happened

  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  setConfig: (newConfig: Config) => void; // Allow direct setting
  updateConfigField: <K extends keyof Config>(field: K, value: Config[K]) => void;
  updateRgField: <K extends keyof Config['rg']>(field: K, value: Config['rg'][K]) => void;
  updateProjectField: (projectName: string, patterns: string[]) => void;
  addProject: (projectName: string) => void;
  removeProject: (projectName: string) => void;
}

const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  isSaving: false,
  saveMessage: null,
  initialConfigLoaded: false,

  loadConfig: async () => {
    if (get().loading || get().initialConfigLoaded) return; // Prevent multiple initial loads
    set({ loading: true, error: null });
    try {
      const config = await fetchConfig();
      set({ config, loading: false, initialConfigLoaded: true });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load configuration.', loading: false });
    }
  },

  saveConfig: async () => {
    const currentConfig = get().config;
    if (!currentConfig || get().isSaving) return;

    set({ isSaving: true, error: null, saveMessage: null });
    try {
      const response = await updateConfig(currentConfig);
      set({ 
        isSaving: false, 
        saveMessage: response.message || 'Configuration saved successfully. Restart backend required.',
        config: currentConfig // Keep the current state
      });
      // Clear message after a delay
      setTimeout(() => set({ saveMessage: null }), 5000);
    } catch (err: any) {
      set({ error: err.message || 'Failed to save configuration.', isSaving: false });
    }
  },
  
  setConfig: (newConfig) => {
      set({ config: newConfig });
  },

  updateConfigField: (field, value) => {
    set((state) => {
      if (!state.config) return {};
      return {
        config: { ...state.config, [field]: value },
      };
    });
  },

  updateRgField: (field, value) => {
    set((state) => {
      if (!state.config) return {};
      return {
        config: {
          ...state.config,
          rg: { ...state.config.rg, [field]: value },
        },
      };
    });
  },
  
  updateProjectField: (projectName, patterns) => {
      set((state) => {
          if (!state.config) return {};
          const newProjects = { ...state.config.projects, [projectName]: patterns };
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  },

  addProject: (projectName) => {
      set((state) => {
          if (!state.config || state.config.projects[projectName]) return {}; // Avoid duplicates
          const newProjects = { ...state.config.projects, [projectName]: [] }; // Add with empty patterns
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  },

  removeProject: (projectName) => {
      set((state) => {
          if (!state.config) return {};
          const newProjects = { ...state.config.projects };
          delete newProjects[projectName];
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  }
}));

export default useConfigStore; 
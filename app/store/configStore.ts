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
  updateRgField: <K extends keyof Omit<Config['rg'], 'pattern'>>(field: K, value: Config['rg'][K]) => void; // Exclude 'pattern'
  updateProjectField: (projectName: string, patterns: string[]) => void;
  updateProjectAppendPath: (projectName: string, path: string) => void;
  addProject: (projectName: string) => void;
  removeProject: (projectName: string) => void;
  // Actions for todo_done_pairs
  addTodoDonePair: (pair: [string, string]) => void;
  updateTodoDonePair: (index: number, pair: [string, string]) => void;
  removeTodoDonePair: (index: number) => void;
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
      // Ensure todo_done_pairs exists, default to empty array if backend doesn't send it (should not happen with defaults)
      const validatedConfig = {
        ...config,
        todo_done_pairs: config.todo_done_pairs || [],
      };
      set({ config: validatedConfig, loading: false, initialConfigLoaded: true });
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
      set((state) => ({
        isSaving: false,
        saveMessage: response.message || 'Configuration saved successfully.',
        config: state.config, 
      }));
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
          const currentProjects = state.config.projects || {};
          const updatedProject = { 
              ...(currentProjects[projectName] || {}),
              patterns: patterns 
          };
          const newProjects = { ...currentProjects, [projectName]: updatedProject };
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  },

  updateProjectAppendPath: (projectName, path) => {
      set((state) => {
          if (!state.config) return {};
          const currentProjects = state.config.projects || {};
          const updatedProject = { 
              ...(currentProjects[projectName] || { patterns: [] }),
              append_file_path: path 
          };
          const newProjects = { ...currentProjects, [projectName]: updatedProject };
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  },

  addProject: (projectName) => {
      set((state) => {
          if (!state.config) return {};
          const currentProjects = state.config.projects || {};
          if (currentProjects[projectName]) return {}; 
          const newProjects = { ...currentProjects, [projectName]: { patterns: [], append_file_path: undefined } };
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  },

  removeProject: (projectName) => {
      set((state) => {
          if (!state.config) return {};
          const currentProjects = state.config.projects || {};
          const newProjects = { ...currentProjects };
          delete newProjects[projectName];
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  },

  // --- TodoDonePairs Actions ---
  addTodoDonePair: (pair) => {
    set((state) => {
      if (!state.config) return {};
      const currentPairs = state.config.todo_done_pairs || [];
      return {
        config: {
          ...state.config,
          todo_done_pairs: [...currentPairs, pair],
        },
      };
    });
  },

  updateTodoDonePair: (index, pair) => {
    set((state) => {
      if (!state.config) return {};
      const currentPairs = state.config.todo_done_pairs || [];
      if (index < 0 || index >= currentPairs.length) return {}; // Invalid index
      const newPairs = [...currentPairs];
      newPairs[index] = pair;
      return {
        config: {
          ...state.config,
          todo_done_pairs: newPairs,
        },
      };
    });
  },

  removeTodoDonePair: (index) => {
    set((state) => {
      if (!state.config) return {};
      const currentPairs = state.config.todo_done_pairs || [];
      if (index < 0 || index >= currentPairs.length) return {}; // Invalid index
      return {
        config: {
          ...state.config,
          todo_done_pairs: currentPairs.filter((_, i) => i !== index),
        },
      };
    });
  }
}));

export default useConfigStore; 
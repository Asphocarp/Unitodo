import { create } from 'zustand';
import { Config } from '../types';
import { fetchConfig, updateConfig, fetchActiveProfile, setActiveProfile, fetchProfiles, addProfile, deleteProfile } from '../services/configService';

interface ConfigState {
  config: Config | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  saveMessage: string | null;
  initialConfigLoaded: boolean;

  activeProfileName: string | null;
  availableProfiles: string[];
  profilesLoading: boolean;
  profileError: string | null;

  loadActiveProfileAndConfig: () => Promise<void>;
  switchActiveProfile: (profileName: string) => Promise<void>;
  loadAvailableProfiles: () => Promise<void>;
  addNewProfile: (newProfileName: string, copyFromProfileName?: string) => Promise<void>;
  deleteCurrentProfile: (profileName: string) => Promise<void>;

  saveCurrentProfileConfig: () => Promise<void>;
  setConfigForCurrentProfile: (newConfig: Config) => void;
  updateConfigFieldForCurrentProfile: <K extends keyof Config>(field: K, value: Config[K]) => void;
  updateRgFieldForCurrentProfile: <K extends keyof Omit<Config['rg'], 'pattern'>>(field: K, value: Config['rg'][K]) => void;
  updateProjectFieldForCurrentProfile: (projectName: string, patterns: string[]) => void;
  updateProjectAppendPathForCurrentProfile: (projectName: string, path: string) => void;
  addProjectToCurrentProfile: (projectName: string) => void;
  removeProjectFromCurrentProfile: (projectName: string) => void;
  addTodoStateSetToCurrentProfile: (set: string[]) => void;
  updateTodoStateSetInCurrentProfile: (index: number, set: string[]) => void;
  removeTodoStateSetFromCurrentProfile: (index: number) => void;
}

const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  isSaving: false,
  saveMessage: null,
  initialConfigLoaded: false,

  activeProfileName: null,
  availableProfiles: [],
  profilesLoading: false,
  profileError: null,

  loadActiveProfileAndConfig: async () => {
    if (get().loading || get().initialConfigLoaded) return;
    set({ loading: true, error: null, profileError: null });
    try {
      const { config, activeProfileName } = await fetchConfig(); 
      const validatedConfig = {
        ...config,
        todo_states: config.todo_states || [],
      };
      set({
        config: validatedConfig,
        activeProfileName: activeProfileName,
        loading: false,
        initialConfigLoaded: true,
      });
      get().loadAvailableProfiles(); 
    } catch (err: any) {
      set({ error: err.message || 'Failed to load configuration.', loading: false });
    }
  },

  loadAvailableProfiles: async () => {
    set({ profilesLoading: true, profileError: null });
    try {
      const plainResponse = await fetchProfiles(); // Now returns PlainListProfilesResponse
      const profileNames = plainResponse.profiles.map(p => p.name);
      const activeName = plainResponse.activeProfileName;
      set({
        availableProfiles: profileNames,
        activeProfileName: activeName,
        profilesLoading: false,
      });
    } catch (err: any) {
      set({ profileError: err.message || 'Failed to load profiles.', profilesLoading: false });
    }
  },

  switchActiveProfile: async (profileName: string) => {
    if (get().isSaving) return;
    set({ profilesLoading: true, profileError: null, error: null });
    try {
      await setActiveProfile(profileName);
      const { config, activeProfileName: newActiveProfileName } = await fetchConfig(); 
      const validatedConfig = {
        ...config,
        todo_states: config.todo_states || [],
      };
      set({
        config: validatedConfig,
        activeProfileName: newActiveProfileName,
        profilesLoading: false,
      });
      get().loadAvailableProfiles();
    } catch (err: any) {
      set({ profileError: err.message || `Failed to switch to profile ${profileName}.`, profilesLoading: false });
    }
  },

  addNewProfile: async (newProfileName: string, copyFromProfileName?: string) => {
    if (get().isSaving) return;
    set({ profilesLoading: true, profileError: null });
    try {
      await addProfile(newProfileName, copyFromProfileName);
      await get().loadAvailableProfiles();
      await get().switchActiveProfile(newProfileName);
      set({ profilesLoading: false });
    } catch (err: any) {
      set({ profileError: err.message || `Failed to add profile ${newProfileName}.`, profilesLoading: false });
    }
  },

  deleteCurrentProfile: async (profileName: string) => {
    if (profileName === 'default') {
      set({ profileError: "Cannot delete the default profile." });
      return;
    }
    if (get().isSaving) return;
    set({ profilesLoading: true, profileError: null });
    try {
      await deleteProfile(profileName);
      await get().loadAvailableProfiles();
      await get().loadActiveProfileAndConfig();
      set({ profilesLoading: false });
    } catch (err: any) {
      set({ profileError: err.message || `Failed to delete profile ${profileName}.`, profilesLoading: false });
    }
  },

  saveCurrentProfileConfig: async () => {
    const currentConfig = get().config;
    const activeProfile = get().activeProfileName;
    if (!currentConfig || !activeProfile || get().isSaving) return;

    set({ isSaving: true, error: null, saveMessage: null });
    try {
      const response = await updateConfig(currentConfig);
      set((state: ConfigState) => ({
        isSaving: false,
        saveMessage: response.message || 'Configuration saved successfully.',
        config: state.config,
      }));
      setTimeout(() => set({ saveMessage: null }), 5000);
    } catch (err: any) {
      set({ error: err.message || 'Failed to save configuration.', isSaving: false });
    }
  },
  
  setConfigForCurrentProfile: (newConfig) => {
      set({ config: newConfig });
  },

  updateConfigFieldForCurrentProfile: (field, value) => {
    set((state: ConfigState) => {
      if (!state.config) return {};
      return {
        config: { ...state.config, [field]: value },
      };
    });
  },

  updateRgFieldForCurrentProfile: (field, value) => {
    set((state: ConfigState) => {
      if (!state.config || !state.config.rg) return {};
      return {
        config: {
          ...state.config,
          rg: { ...state.config.rg, [field]: value },
        },
      };
    });
  },
  
  updateProjectFieldForCurrentProfile: (projectName, patterns) => {
      set((state: ConfigState) => {
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

  updateProjectAppendPathForCurrentProfile: (projectName, path) => {
      set((state: ConfigState) => {
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

  addProjectToCurrentProfile: (projectName) => {
      set((state: ConfigState) => {
          if (!state.config) return {};
          const currentProjects = state.config.projects || {};
          if (currentProjects[projectName]) return {}; 
          const newProjects = { ...currentProjects, [projectName]: { patterns: [], append_file_path: undefined } };
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  },

  removeProjectFromCurrentProfile: (projectName) => {
      set((state: ConfigState) => {
          if (!state.config) return {};
          const currentProjects = state.config.projects || {};
          const newProjects = { ...currentProjects };
          delete newProjects[projectName];
          return {
              config: { ...state.config, projects: newProjects },
          };
      });
  },

  addTodoStateSetToCurrentProfile: (setToAdd: string[]) => { 
    set((state: ConfigState) => {
      if (!state.config) return { config: null };
      const currentSets = state.config.todo_states || []; 
      return {
        config: {
          ...state.config,
          todo_states: [...currentSets, setToAdd], 
        },
      };
    });
  },

  updateTodoStateSetInCurrentProfile: (index: number, setToUpdate: string[]) => { 
    set((state: ConfigState) => {
      if (!state.config) return { config: null };
      const currentSets = state.config.todo_states || []; 
      if (index < 0 || index >= currentSets.length) return { config: state.config };
      const newSets = [...currentSets];
      newSets[index] = setToUpdate;
      return {
        config: {
          ...state.config,
          todo_states: newSets, 
        },
      };
    });
  },

  removeTodoStateSetFromCurrentProfile: (index: number) => { 
    set((state: ConfigState) => {
      if (!state.config) return { config: null };
      const currentSets = state.config.todo_states || []; 
      if (index < 0 || index >= currentSets.length) return { config: state.config };
      return {
        config: {
          ...state.config,
          todo_states: currentSets.filter((_, i) => i !== index), 
        },
      };
    });
  }
}));

export default useConfigStore; 
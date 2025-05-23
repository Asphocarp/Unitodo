import { makeObservable, observable, action, runInAction } from 'mobx';
import { Config, ProjectConfig } from '../types'; // Assuming types are correctly defined
import {
  fetchConfig as apiFetchConfig,
  updateConfig as apiUpdateConfig,
  fetchActiveProfile as apiFetchActiveProfile,
  setActiveProfile as apiSetActiveProfile,
  fetchProfiles as apiFetchProfiles,
  addProfile as apiAddProfile,
  deleteProfile as apiDeleteProfile,
} from '../services/configService';

class ConfigStoreImpl {
  config: Config | null = null;
  loading: boolean = false;
  error: string | null = null;
  isSaving: boolean = false;
  saveMessage: string | null = null;
  initialConfigLoaded: boolean = false;

  activeProfileName: string | null = null;
  availableProfiles: string[] = [];
  profilesLoading: boolean = false;
  profileError: string | null = null;

  constructor() {
    makeObservable(this, {
      config: observable,
      loading: observable,
      error: observable,
      isSaving: observable,
      saveMessage: observable,
      initialConfigLoaded: observable,
      activeProfileName: observable,
      availableProfiles: observable,
      profilesLoading: observable,
      profileError: observable,
      loadActiveProfileAndConfig: action,
      switchActiveProfile: action,
      loadAvailableProfiles: action,
      addNewProfile: action,
      deleteCurrentProfile: action,
      saveCurrentProfileConfig: action,
      setConfigForCurrentProfile: action,
      updateConfigFieldForCurrentProfile: action,
      updateRgFieldForCurrentProfile: action,
      updateProjectFieldForCurrentProfile: action,
      updateProjectAppendPathForCurrentProfile: action,
      addProjectToCurrentProfile: action,
      removeProjectFromCurrentProfile: action,
      addTodoStateSetToCurrentProfile: action,
      updateTodoStateSetInCurrentProfile: action,
      removeTodoStateSetFromCurrentProfile: action,
      switchToPreviousProfile: action,
      switchToNextProfile: action,
    });
  }

  loadActiveProfileAndConfig = async () => {
    if (this.loading || this.initialConfigLoaded) return;
    runInAction(() => {
      this.loading = true;
      this.error = null;
      this.profileError = null;
    });
    try {
      const { config, activeProfileName } = await apiFetchConfig();
      const validatedConfig = {
        ...config,
        todo_states: config.todo_states || [],
      };
      runInAction(() => {
        this.config = validatedConfig;
        this.activeProfileName = activeProfileName;
        this.loading = false;
        this.initialConfigLoaded = true;
      });
      await this.loadAvailableProfiles();
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Failed to load configuration.';
        this.loading = false;
      });
    }
  }

  loadAvailableProfiles = async () => {
    runInAction(() => {
      this.profilesLoading = true;
      this.profileError = null;
    });
    try {
      const plainResponse = await apiFetchProfiles();
      runInAction(() => {
        this.availableProfiles = plainResponse.profiles.map(p => p.name);
        this.activeProfileName = plainResponse.activeProfileName; 
        this.profilesLoading = false;
      });
    } catch (err: any) {
      runInAction(() => {
        this.profileError = err.message || 'Failed to load profiles.';
        this.profilesLoading = false;
      });
    }
  }

  switchActiveProfile = async (profileName: string) => {
    if (this.isSaving) return;
    runInAction(() => {
      this.profilesLoading = true;
      this.profileError = null;
      this.error = null; 
    });
    try {
      await apiSetActiveProfile(profileName);
      const { config, activeProfileName: newActiveProfileName } = await apiFetchConfig();
      const validatedConfig = {
        ...config,
        todo_states: config.todo_states || [],
      };
      runInAction(() => {
        this.config = validatedConfig;
        this.activeProfileName = newActiveProfileName;
        this.profilesLoading = false;
      });
      await this.loadAvailableProfiles(); 
    } catch (err: any) {
      runInAction(() => {
        this.profileError = err.message || `Failed to switch to profile ${profileName}.`;
        this.profilesLoading = false;
      });
    }
  }

  addNewProfile = async (newProfileName: string, copyFromProfileName?: string) => {
    if (this.isSaving) return;
    runInAction(() => {
      this.profilesLoading = true;
      this.profileError = null;
    });
    try {
      await apiAddProfile(newProfileName, copyFromProfileName);
      await this.loadAvailableProfiles(); 
      await this.switchActiveProfile(newProfileName); 
    } catch (err: any) {
      runInAction(() => {
        this.profileError = err.message || `Failed to add profile ${newProfileName}.`;
        this.profilesLoading = false;
      });
    }
  }

  deleteCurrentProfile = async (profileName: string) => {
    if (profileName === 'default') {
      runInAction(() => {
        this.profileError = "Cannot delete the default profile.";
      });
      return;
    }
    if (this.isSaving) return;
    runInAction(() => {
      this.profilesLoading = true;
      this.profileError = null;
    });
    try {
      await apiDeleteProfile(profileName);
      runInAction(() => {
        this.initialConfigLoaded = false; 
      });
      await this.loadActiveProfileAndConfig(); 
    } catch (err: any) {
      runInAction(() => {
        this.profileError = err.message || `Failed to delete profile ${profileName}.`;
        this.profilesLoading = false; 
      });
    }
  }

  saveCurrentProfileConfig = async () => {
    if (!this.config || !this.activeProfileName || this.isSaving) return;

    runInAction(() => {
      this.isSaving = true;
      this.error = null;
      this.saveMessage = null;
    });
    try {
      const response = await apiUpdateConfig(this.config);
      runInAction(() => {
        this.isSaving = false;
        this.saveMessage = response.message || 'Configuration saved successfully.';
      });
      setTimeout(() => runInAction(() => { this.saveMessage = null; }), 5000);
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Failed to save configuration.';
        this.isSaving = false;
      });
    }
  }
  
  setConfigForCurrentProfile = (newConfig: Config) => {
    this.config = newConfig;
  }

  updateConfigFieldForCurrentProfile = <K extends keyof Config>(field: K, value: Config[K]) => {
    if (!this.config) return;
    this.config = { ...this.config, [field]: value };
  }

  updateRgFieldForCurrentProfile = <K extends keyof Config['rg']>(field: K, value: Config['rg'][K]) => {
    if (!this.config || !this.config.rg) return;
    this.config = {
      ...this.config,
      rg: { ...this.config.rg, [field]: value },
    };
  }
  
  updateProjectFieldForCurrentProfile = (projectName: string, patterns: string[]) => {
    if (!this.config) return;
    const currentProjects = this.config.projects || {};
    const updatedProject: ProjectConfig = { 
        ...(currentProjects[projectName] || { patterns: [] }), 
        patterns: patterns 
    };
    this.config = {
        ...this.config,
        projects: { ...currentProjects, [projectName]: updatedProject },
    };
  }

  updateProjectAppendPathForCurrentProfile = (projectName: string, path: string) => {
    if (!this.config) return;
    const currentProjects = this.config.projects || {};
    const updatedProject: ProjectConfig = { 
        ...(currentProjects[projectName] || { patterns: [] }), 
        append_file_path: path 
    };
    this.config = {
        ...this.config,
        projects: { ...currentProjects, [projectName]: updatedProject },
    };
  }

  addProjectToCurrentProfile = (projectName: string) => {
    if (!this.config) return;
    const currentProjects = this.config.projects || {};
    if (currentProjects[projectName]) return; 
    const newProjects = { ...currentProjects, [projectName]: { patterns: [], append_file_path: undefined } };
    this.config = { ...this.config, projects: newProjects };
  }

  removeProjectFromCurrentProfile = (projectName: string) => {
    if (!this.config || !this.config.projects) return;
    const newProjects = { ...this.config.projects };
    delete newProjects[projectName];
    this.config = { ...this.config, projects: newProjects };
  }

  addTodoStateSetToCurrentProfile = (setToAdd: string[]) => {
    if (!this.config) return;
    const currentSets = this.config.todo_states || [];
    this.config = {
      ...this.config,
      todo_states: [...currentSets, setToAdd],
    };
  }

  updateTodoStateSetInCurrentProfile = (index: number, setToUpdate: string[]) => {
    if (!this.config || !this.config.todo_states) return;
    const currentSets = this.config.todo_states;
    if (index < 0 || index >= currentSets.length) return; 
    const newSets = [...currentSets];
    newSets[index] = setToUpdate;
    this.config = {
      ...this.config,
      todo_states: newSets,
    };
  }

  removeTodoStateSetFromCurrentProfile = (index: number) => {
    if (!this.config || !this.config.todo_states) return;
    const currentSets = this.config.todo_states;
    if (index < 0 || index >= currentSets.length) return; 
    this.config = {
      ...this.config,
      todo_states: currentSets.filter((_, i) => i !== index),
    };
  }

  switchToPreviousProfile = async () => {
    if (this.isSaving || this.profilesLoading || this.availableProfiles.length < 2 || !this.activeProfileName) return;
    const currentIndex = this.availableProfiles.indexOf(this.activeProfileName);
    if (currentIndex === -1) return; // Should not happen if data is consistent

    const newIndex = (currentIndex - 1 + this.availableProfiles.length) % this.availableProfiles.length;
    await this.switchActiveProfile(this.availableProfiles[newIndex]);
  }

  switchToNextProfile = async () => {
    if (this.isSaving || this.profilesLoading || this.availableProfiles.length < 2 || !this.activeProfileName) return;
    const currentIndex = this.availableProfiles.indexOf(this.activeProfileName);
    if (currentIndex === -1) return; 

    const newIndex = (currentIndex + 1) % this.availableProfiles.length;
    await this.switchActiveProfile(this.availableProfiles[newIndex]);
  }
}

const configStore = new ConfigStoreImpl();
export default configStore;
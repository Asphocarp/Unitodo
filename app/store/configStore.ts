import { makeObservable, observable, action, flow } from 'mobx';
import { Config } from '../types';
import { fetchConfig, updateConfig, setActiveProfile, fetchProfiles, addProfile, deleteProfile } from '../services/configService';

class ConfigStore {
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
      loadActiveProfileAndConfig: flow,
      loadAvailableProfiles: flow,
      switchActiveProfile: flow,
      addNewProfile: flow,
      deleteCurrentProfile: flow,
      saveCurrentProfileConfig: flow,
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
    });
  }

  *loadActiveProfileAndConfig(this: ConfigStore) {
    if (this.loading || this.initialConfigLoaded) return;
    this.loading = true;
    this.error = null;
    this.profileError = null;
    try {
      const result: { config: Config, activeProfileName: string } = yield fetchConfig();
      const validatedConfig = {
        ...result.config,
        todo_states: result.config.todo_states || [],
      };
      this.config = validatedConfig;
      this.activeProfileName = result.activeProfileName;
      this.loading = false;
      this.initialConfigLoaded = true;
      yield this.loadAvailableProfiles();
    } catch (err: any) {
      this.error = err.message || 'Failed to load configuration.';
      this.loading = false;
    }
  }

  *loadAvailableProfiles(this: ConfigStore) {
    this.profilesLoading = true;
    this.profileError = null;
    try {
      const plainResponse: { profiles: { name: string }[], activeProfileName: string } = yield fetchProfiles();
      this.availableProfiles = plainResponse.profiles.map((p: any) => p.name);
      if (this.activeProfileName !== plainResponse.activeProfileName) {
        this.activeProfileName = plainResponse.activeProfileName;
      }
      this.profilesLoading = false;
    } catch (err: any) {
      this.profileError = err.message || 'Failed to load profiles.';
      this.profilesLoading = false;
    }
  }

  *switchActiveProfile(this: ConfigStore, profileName: string) {
    if (this.isSaving) return;
    this.profilesLoading = true;
    this.profileError = null;
    this.error = null;
    try {
      yield setActiveProfile(profileName);
      const result: { config: Config, activeProfileName: string } = yield fetchConfig();
      const validatedConfig = {
        ...result.config,
        todo_states: result.config.todo_states || [],
      };
      this.config = validatedConfig;
      this.activeProfileName = result.activeProfileName;
      this.profilesLoading = false;
      yield this.loadAvailableProfiles();
    } catch (err: any) {
      this.profileError = err.message || `Failed to switch to profile ${profileName}.`;
      this.profilesLoading = false;
    }
  }

  *addNewProfile(this: ConfigStore, newProfileName: string, copyFromProfileName?: string) {
    if (this.isSaving) return;
    this.profilesLoading = true;
    this.profileError = null;
    try {
      yield addProfile(newProfileName, copyFromProfileName);
      yield this.loadAvailableProfiles();
      yield this.switchActiveProfile(newProfileName);
    } catch (err: any) {
      this.profileError = err.message || `Failed to add profile ${newProfileName}.`;
      this.profilesLoading = false;
    }
  }

  *deleteCurrentProfile(this: ConfigStore, profileName: string) {
    if (profileName === 'default') {
      this.profileError = "Cannot delete the default profile.";
      return;
    }
    if (this.isSaving) return;
    this.profilesLoading = true;
    this.profileError = null;
    try {
      yield deleteProfile(profileName);
      yield this.loadAvailableProfiles();
      yield this.loadActiveProfileAndConfig();
    } catch (err: any) {
      this.profileError = err.message || `Failed to delete profile ${profileName}.`;
      this.profilesLoading = false;
    }
  }

  *saveCurrentProfileConfig(this: ConfigStore) {
    if (!this.config || !this.activeProfileName || this.isSaving) return;

    this.isSaving = true;
    this.error = null;
    this.saveMessage = null;
    try {
      const response: { message: string } = yield updateConfig(this.config);
      this.isSaving = false;
      this.saveMessage = response.message || 'Configuration saved successfully.';
      setTimeout(() => { this.saveMessage = null; }, 5000);
    } catch (err: any) {
      this.error = err.message || 'Failed to save configuration.';
      this.isSaving = false;
    }
  }

  setConfigForCurrentProfile(newConfig: Config) {
    this.config = newConfig;
  }

  updateConfigFieldForCurrentProfile<K extends keyof Config>(field: K, value: Config[K]) {
    if (!this.config) return;
    this.config = { ...this.config, [field]: value };
  }

  updateRgFieldForCurrentProfile<K extends keyof Omit<Config['rg'], 'pattern'>>(field: K, value: Config['rg'][K]) {
    if (!this.config || !this.config.rg) return;
    this.config = {
      ...this.config,
      rg: { ...this.config.rg, [field]: value },
    };
  }

  updateProjectFieldForCurrentProfile(projectName: string, patterns: string[]) {
    if (!this.config || !this.config.projects) return;
    const currentProjects = this.config.projects;
    const updatedProject = {
      ...(currentProjects[projectName] || {}),
      patterns: patterns
    };
    this.config = {
      ...this.config,
      projects: { ...currentProjects, [projectName]: updatedProject },
    };
  }

  updateProjectAppendPathForCurrentProfile(projectName: string, path: string) {
    if (!this.config || !this.config.projects) return;
    const currentProjects = this.config.projects;
    const updatedProject = {
      ...(currentProjects[projectName] || { patterns: [] }),
      append_file_path: path
    };
    this.config = {
      ...this.config,
      projects: { ...currentProjects, [projectName]: updatedProject },
    };
  }

  addProjectToCurrentProfile(projectName: string) {
    if (!this.config) return;
    const currentProjects = this.config.projects || {};
    if (currentProjects[projectName]) return;
    const newProjects = { ...currentProjects, [projectName]: { patterns: [], append_file_path: undefined } };
    this.config = { ...this.config, projects: newProjects };
  }

  removeProjectFromCurrentProfile(projectName: string) {
    if (!this.config || !this.config.projects) return;
    const newProjects = { ...this.config.projects };
    delete newProjects[projectName];
    this.config = { ...this.config, projects: newProjects };
  }

  addTodoStateSetToCurrentProfile(setToAdd: string[]) {
    if (!this.config) return;
    const currentSets = this.config.todo_states || [];
    this.config = {
      ...this.config,
      todo_states: [...currentSets, setToAdd],
    };
  }

  updateTodoStateSetInCurrentProfile(index: number, setToUpdate: string[]) {
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

  removeTodoStateSetFromCurrentProfile(index: number) {
    if (!this.config || !this.config.todo_states) return;
    const currentSets = this.config.todo_states;
    if (index < 0 || index >= currentSets.length) return;
    this.config = {
      ...this.config,
      todo_states: currentSets.filter((_, i) => i !== index),
    };
  }
}

const configStore = new ConfigStore();
export default configStore;
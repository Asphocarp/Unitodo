'use client';

import React, { useEffect, useState } from 'react';
import useConfigStore from '../store/configStore';
import { useDarkMode } from '../utils/darkMode';
import { Config, ProjectConfig } from '../types';
import Link from 'next/link';

// Reusable Input Component with more compact, stylish design
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

const InputField: React.FC<InputProps> = ({ label, description, ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium mb-1.5 text-neutral-700 dark:text-neutral-300" htmlFor={props.id || props.name}>{label}</label>
    <input 
      className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm 
                focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color 
                dark:bg-neutral-800 dark:text-neutral-200 transition-all duration-150" 
      {...props} 
    />
    {description && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
  </div>
);

// Reusable Textarea Component with more compact, stylish design
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
}

const TextareaField: React.FC<TextareaProps> = ({ label, description, ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium mb-1.5 text-neutral-700 dark:text-neutral-300" htmlFor={props.id || props.name}>{label}</label>
    <textarea 
      className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm 
                focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color
                dark:bg-neutral-800 dark:text-neutral-200 transition-all duration-150" 
      rows={3}
      {...props} 
    />
    {description && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
  </div>
);

// Select Component for Profiles
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  description?: string;
}
const SelectField: React.FC<SelectProps> = ({ label, description, children, ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium mb-1.5 text-neutral-700 dark:text-neutral-300" htmlFor={props.id || props.name}>{label}</label>
    <select
      className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm 
                 focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color 
                 dark:bg-neutral-800 dark:text-neutral-200 transition-all duration-150 appearance-none bg-white dark:bg-neutral-800 pr-8 bg-no-repeat"
      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
      {...props}
    >
      {children}
    </select>
    {description && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
  </div>
);

export default function ConfigPage() {
  const {
    config,
    loading,
    error,
    isSaving,
    saveMessage,
    initialConfigLoaded,
    activeProfileName,
    availableProfiles,
    profilesLoading,
    profileError,
    loadActiveProfileAndConfig,
    switchActiveProfile,
    addNewProfile,
    deleteCurrentProfile,
    saveCurrentProfileConfig,
    updateConfigFieldForCurrentProfile,
    updateRgFieldForCurrentProfile,
    updateProjectFieldForCurrentProfile,
    updateProjectAppendPathForCurrentProfile,
    addProjectToCurrentProfile,
    removeProjectFromCurrentProfile,
    addTodoDonePairToCurrentProfile,
    removeTodoDonePairFromCurrentProfile,
  } = useConfigStore();
  
  const { isDarkMode } = useDarkMode();
  const [newProjectName, setNewProjectName] = useState('');
  const [newTodoPattern, setNewTodoPattern] = useState('');
  const [newDonePattern, setNewDonePattern] = useState('');
  const [newProfileNameField, setNewProfileNameField] = useState('');
  const [copyFromProfile, setCopyFromProfile] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!initialConfigLoaded && !loading) {
      loadActiveProfileAndConfig();
    }
  }, [loadActiveProfileAndConfig, initialConfigLoaded, loading]);

  const handleProjectPatternChange = (projectName: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const patterns = e.target.value.split('\n').map(p => p.trim()).filter(Boolean);
    updateProjectFieldForCurrentProfile(projectName, patterns);
  };
  
  const handleAddProject = () => {
      if (newProjectName.trim()) {
          addProjectToCurrentProfile(newProjectName.trim());
          setNewProjectName('');
      }
  };

  const handleAddTodoDonePair = () => {
    if (newTodoPattern.trim() && newDonePattern.trim()) {
        addTodoDonePairToCurrentProfile([newTodoPattern.trim(), newDonePattern.trim()]);
        setNewTodoPattern('');
        setNewDonePattern('');
    }
  };

  const handleAddProfile = async () => {
    if (newProfileNameField.trim()) {
      await addNewProfile(newProfileNameField.trim(), copyFromProfile || undefined);
      setNewProfileNameField('');
      setCopyFromProfile(undefined);
    }
  };

  const handleDeleteProfile = async () => {
    if (activeProfileName && activeProfileName !== 'default') {
      if (window.confirm(`Are you sure you want to delete profile "${activeProfileName}"?`)) {
        await deleteCurrentProfile(activeProfileName);
      }
    }
  };

  if (loading && !config) {
    return <div className="flex items-center justify-center h-screen text-xs">Loading configuration...</div>;
  }

  if (error && !config) {
    return <div className="text-red-600 dark:text-red-400 text-xs flex items-center justify-center h-screen">Error loading config: {error}</div>;
  }

  if (!config || !activeProfileName) {
    return <div className="text-xs flex items-center justify-center h-screen">Configuration not available. Attempting to load...</div>;
  }

  const projects: Record<string, ProjectConfig> = config.projects as Record<string, ProjectConfig>;

  return (
    <div className={`max-w-4xl mx-auto p-4 ${isDarkMode ? 'dark' : ''}`}>
      <div className="hn-header dark:border-neutral-700 flex items-center justify-between mb-4 rounded-md shadow-sm" data-tauri-drag-region="">
        <div className="flex items-center">
          <Link href="/" className="hn-meta text-neutral-600 dark:text-neutral-300 hover:text-accent-color dark:hover:text-accent-color transition-colors mr-3 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700" prefetch={false}>
            &larr; Back
          </Link>
          <h1 className="hn-title text-base">Unitodo Configuration</h1>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Profile: <strong className="text-neutral-700 dark:text-neutral-200">{activeProfileName}</strong></span>
      </div>

      {/* Notifications for general errors and save messages */}
      {error && (
         <div className="mb-3 py-2 px-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs border border-red-200 dark:border-red-800/50">
            Error: {error}
         </div>
      )}
      {saveMessage && (
        <div className="mb-3 py-2 px-3 rounded-md bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs border border-green-200 dark:border-green-800/50">
          {saveMessage}
        </div>
      )}
      {/* Notifications for profile-specific errors */}
      {profileError && (
         <div className="mb-3 py-2 px-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs border border-red-200 dark:border-red-800/50">
            Profile Error: {profileError}
         </div>
      )}

      {/* Profile Management Section */}
      <section className="mb-6 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm bg-white dark:bg-neutral-800/50">
        <h2 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300 pb-2 border-b border-neutral-200 dark:border-neutral-700">Profiles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <SelectField
            label="Active Profile"
            value={activeProfileName || ''}
            onChange={(e) => switchActiveProfile(e.target.value)}
            disabled={profilesLoading || isSaving}
          >
            {availableProfiles.map(name => <option key={name} value={name}>{name}</option>)}
          </SelectField>
          <div className="flex items-end">
            <button 
                type="button"
                onClick={handleDeleteProfile}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs border border-red-600 transition-all flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed h-[34.5px]"
                disabled={profilesLoading || isSaving || activeProfileName === 'default' || availableProfiles.length <= 1}
                title={activeProfileName === 'default' ? "Cannot delete default profile" : "Delete current profile"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
            </button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <InputField 
            label="New Profile Name"
            value={newProfileNameField}
            onChange={e => setNewProfileNameField(e.target.value)}
            placeholder="Enter new profile name"
            disabled={profilesLoading || isSaving}
          />
          <SelectField
            label="Copy Settings From (Optional)"
            value={copyFromProfile || ''}
            onChange={e => setCopyFromProfile(e.target.value || undefined)}
            disabled={profilesLoading || isSaving}
          >
            <option value="">Start with defaults</option>
            {availableProfiles.map(name => <option key={name} value={name}>{name}</option>)}
          </SelectField>
          <button 
            type="button"
            onClick={handleAddProfile}
            className="px-3 py-1.5 bg-accent-color hover:bg-accent-color/90 text-white rounded-md text-xs border border-accent-color transition-all flex items-center justify-center shadow-sm disabled:opacity-50 h-[34.5px]"
            disabled={profilesLoading || isSaving || !newProfileNameField.trim()}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Profile
          </button>
        </div>
      </section>

      {/* Form for the active profile's settings */}
      <form onSubmit={(e) => { e.preventDefault(); saveCurrentProfileConfig(); }} className="text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frontend Settings */}
          <section className="mb-5 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm bg-white dark:bg-neutral-800/50">
            <h2 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300 pb-2 border-b border-neutral-200 dark:border-neutral-700">Display & Behavior (Profile: {activeProfileName})</h2>
            <InputField
              label="Auto-Refresh Interval (ms)"
              description="Refresh frequency for TODO list"
              type="number"
              id="refresh_interval"
              value={config.refresh_interval}
              onChange={(e) => updateConfigFieldForCurrentProfile('refresh_interval', parseInt(e.target.value, 10) || 0)}
              disabled={isSaving || profilesLoading}
            />
            <InputField
              label="Editor URI Scheme"
              description="URI to open files (e.g., vscode://file/, cursor://file/)"
              type="text"
              id="editor_uri_scheme"
              value={config.editor_uri_scheme}
              onChange={(e) => updateConfigFieldForCurrentProfile('editor_uri_scheme', e.target.value)}
              disabled={isSaving || profilesLoading}
            />
            <InputField
              label="Default Append File Basename (for Git)"
              description="Default filename for new TODOs in git repos (e.g., unitodo.append.md)"
              type="text"
              id="default_append_basename"
              value={config.default_append_basename}
              onChange={(e) => updateConfigFieldForCurrentProfile('default_append_basename', e.target.value)}
              disabled={isSaving || profilesLoading}
            />
          </section>
          
          {/* Backend Settings (rg) */}
          <section className="mb-5 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm bg-white dark:bg-neutral-800/50">
              <h2 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300 pb-2 border-b border-neutral-200 dark:border-neutral-700">Search Settings (Profile: {activeProfileName})</h2>
              <TextareaField
                  label="Search Paths"
                  description="Locations to scan (one per line)"
                  id="rg_paths"
                  value={(config.rg && config.rg.paths) ? config.rg.paths.join('\n') : ''}
                  onChange={(e) => updateRgFieldForCurrentProfile('paths', e.target.value.split('\n').map(p => p.trim()).filter(Boolean))}
                  disabled={isSaving || profilesLoading}
              />
              <TextareaField
                  label="Ignore Patterns (Globs)"
                  description="Files/dirs to ignore (one per line)"
                  id="rg_ignore"
                  value={(config.rg && config.rg.ignore) ? config.rg.ignore.join('\n') : ''}
                  onChange={(e) => updateRgFieldForCurrentProfile('ignore', e.target.value.split('\n').map(p => p.trim()).filter(Boolean))}
                  disabled={isSaving || profilesLoading}
              />
               {/* File types input - if you re-add support later */}
              {/* <TextareaField
                  label="Include File Types (Globs)"
                  description="Only search these file types (e.g., *.rs, *.md). Leave empty to search all non-ignored/binary files."
                  id="rg_file_types"
                  value={(config.rg && config.rg.file_types) ? config.rg.file_types.join('\n') : ''}
                  onChange={(e) => updateRgFieldForCurrentProfile('file_types', e.target.value.split('\n').map(p => p.trim()).filter(Boolean))}
                  disabled={isSaving || profilesLoading}
              /> */}
          </section>
        </div>

        {/* Backend Settings (Projects) */}
        <section className="mb-5 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm bg-white dark:bg-neutral-800/50">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Project Definitions (Profile: {activeProfileName})</h2>
              <div className="flex items-center">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="New project name"
                  className="mr-2 px-3 py-1 text-xs border border-neutral-300 dark:border-neutral-700 rounded-md 
                           dark:bg-neutral-800 dark:text-neutral-200 w-36 focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color transition-all duration-150"
                  disabled={isSaving || profilesLoading}
                />
                <button 
                  type="button"
                  onClick={handleAddProject}
                  className="px-3 py-1 bg-accent-color hover:bg-accent-color/90 text-white rounded-md text-xs border border-accent-color transition-all flex items-center shadow-sm disabled:opacity-50"
                  disabled={isSaving || profilesLoading || !newProjectName.trim()}
                >
                  <span className="mr-1">+</span> Add
                </button>
              </div>
            </div>
            
            {Object.entries(projects).length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 italic bg-neutral-50 dark:bg-neutral-800 p-3 rounded-md border border-neutral-200 dark:border-neutral-700">No projects defined for this profile.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(projects).map(([projectName, projectConfig]) => (
                    <div key={projectName} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-md relative hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors bg-white dark:bg-neutral-800 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{projectName}</h3>
                          <button 
                            type="button"
                            onClick={() => removeProjectFromCurrentProfile(projectName)}
                            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            aria-label={`Remove ${projectName} project`}
                            disabled={isSaving || profilesLoading}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            <span>Remove</span>
                          </button>
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium mb-1.5 text-neutral-600 dark:text-neutral-400">Path Patterns</label>
                          <textarea
                              className="w-full px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 rounded-md
                                        dark:bg-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-accent-color transition-all duration-150"
                              rows={2}
                              placeholder="Path glob patterns (one per line, e.g., src/**/*.js)"
                              value={projectConfig.patterns.join('\n')}
                              onChange={(e) => handleProjectPatternChange(projectName, e)}
                              disabled={isSaving || profilesLoading}
                          />
                        </div>
                        <InputField
                          label="Append TODO File Path"
                          description="Path where new TODOs for this project will be added"
                          type="text"
                          id={`project_append_path_${projectName}`}
                          name={`project_append_path_${projectName}`}
                          value={projectConfig.append_file_path || ''}
                          onChange={(e) => updateProjectAppendPathForCurrentProfile(projectName, e.target.value)}
                          placeholder="Optional: /path/to/todo.md"
                          disabled={isSaving || profilesLoading}
                        />
                    </div>
                ))}
              </div>
            )}
        </section>

        <section className="mb-5 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm bg-white dark:bg-neutral-800/50">
          <h2 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300 pb-2 border-b border-neutral-200 dark:border-neutral-700">TODO/DONE Pattern Pairs (Profile: {activeProfileName})</h2>
          <div className="mb-4 p-3 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <InputField
                label="New TODO Pattern"
                type="text"
                value={newTodoPattern}
                onChange={(e) => setNewTodoPattern(e.target.value)}
                placeholder="e.g., - [ ] or TODO:"
                className="focus:z-10 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-1.5"
                disabled={isSaving || profilesLoading}
              />
              <InputField
                label="New DONE Pattern"
                type="text"
                value={newDonePattern}
                onChange={(e) => setNewDonePattern(e.target.value)}
                placeholder="e.g., - [x] or DONE:"
                className="focus:z-10 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-1.5"
                disabled={isSaving || profilesLoading}
              />
            </div>
            <button 
              type="button"
              onClick={handleAddTodoDonePair}
              className="px-3 py-1.5 bg-accent-color hover:bg-accent-color/90 text-white rounded-md text-xs border border-accent-color transition-all flex items-center shadow-sm disabled:opacity-50"
              disabled={isSaving || profilesLoading || !newTodoPattern.trim() || !newDonePattern.trim()}
            >
              <span className="mr-1">+</span> Add Pattern Pair
            </button>
          </div>

          {config.todo_done_pairs && config.todo_done_pairs.length > 0 ? (
            <div className="space-y-2">
              {config.todo_done_pairs.map((pair, index) => (
                <div key={index} className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-md flex justify-between items-center bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors shadow-sm">
                  <div className="flex-grow grid grid-cols-2 gap-4">
                    <div className="text-xs dark:text-neutral-300">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">TODO:</span>
                      <code className="ml-1 px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded-md">{pair[0].replace(/ /g, '\u00A0')}</code>
                    </div>
                    <div className="text-xs dark:text-neutral-300">
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">DONE:</span> 
                      <code className="ml-1 px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded-md">{pair[1].replace(/ /g, '\u00A0')}</code>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeTodoDonePairFromCurrentProfile(index)}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-4 flex items-center bg-red-50 dark:bg-red-900/20 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    aria-label="Remove pattern pair"
                    disabled={isSaving || profilesLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 italic bg-neutral-50 dark:bg-neutral-800 p-3 rounded-md border border-neutral-200 dark:border-neutral-700">No TODO/DONE pattern pairs defined for this profile. Defaults will be used by the backend if not specified.</p>
          )}
        </section>

        {/* Save Button for the active profile's config */}
        <div className="flex justify-end mt-6">
          <button 
            type="submit" 
            className="px-5 py-2 bg-accent-color text-white rounded-md hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent-color disabled:opacity-50 text-sm font-medium border border-accent-color transition-all shadow-sm flex items-center"
            disabled={isSaving || profilesLoading}
          >
            {isSaving || profilesLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {isSaving ? 'Saving...' : 'Loading Profile...'}
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Save Profile Settings ({activeProfileName})
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 
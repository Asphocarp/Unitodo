'use client';

import React, { useEffect, useState } from 'react';
import useConfigStore from '../store/configStore';
import { useDarkMode } from '../utils/darkMode';
import { Config, RgConfig } from '../types';

// Reusable Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

const InputField: React.FC<InputProps> = ({ label, description, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1" htmlFor={props.id || props.name}>{label}</label>
    <input 
      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200" 
      {...props} 
    />
    {description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
  </div>
);

// Reusable Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
}

const TextareaField: React.FC<TextareaProps> = ({ label, description, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1" htmlFor={props.id || props.name}>{label}</label>
    <textarea 
      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-gray-200" 
      rows={3}
      {...props} 
    />
    {description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
  </div>
);

export default function ConfigPage() {
  const { 
    config, 
    loading, 
    error, 
    loadConfig, 
    setConfig, 
    saveConfig, 
    isSaving, 
    saveMessage, 
    updateConfigField, 
    updateRgField,
    updateProjectField,
    addProject,
    removeProject
  } = useConfigStore();
  
  const { isDarkMode } = useDarkMode();
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (!config && !loading) {
        loadConfig();
    }
  }, [loadConfig, config, loading]);

  const handleProjectPatternChange = (projectName: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const patterns = e.target.value.split('\n').map(p => p.trim()).filter(Boolean);
    updateProjectField(projectName, patterns);
  };
  
  const handleAddProject = () => {
      if (newProjectName.trim()) {
          addProject(newProjectName.trim());
          setNewProjectName('');
      }
  };

  if (loading && !config) {
    return <div>Loading configuration...</div>;
  }

  if (error && !config) {
    return <div className="text-red-600 dark:text-red-400">Error loading configuration: {error}</div>;
  }

  if (!config) {
    return <div>Configuration not available. Attempting to load or create default...</div>;
  }

  // Type guard for config.projects
  const projects = config.projects as Record<string, string[]>;

  return (
    <div className={`container mx-auto p-4 ${isDarkMode ? 'dark' : ''}`}>
      <h1 className="text-2xl font-bold mb-4 dark:text-gray-100">Configuration</h1>

      {error && (
         <div className="mb-4 p-3 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
            Error: {error}
         </div>
      )}
      {saveMessage && (
        <div className="mb-4 p-3 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm">
          {saveMessage}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); saveConfig(); }}>
        {/* Frontend Settings */}
        <section className="mb-6 p-4 border rounded dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-3 dark:text-gray-200">Frontend Settings</h2>
          <InputField
            label="Auto-Refresh Interval (ms)"
            description="How often the TODO list refreshes automatically (in milliseconds). Requires UI refresh to take effect."
            type="number"
            id="refresh_interval"
            value={config.refresh_interval}
            onChange={(e) => updateConfigField('refresh_interval', parseInt(e.target.value, 10) || 0)}
          />
          <InputField
            label="Editor URI Scheme"
            description="The URI scheme used to open files in your editor (e.g., vscode://file/, cursor://file/). Requires UI refresh to take effect."
            type="text"
            id="editor_uri_scheme"
            value={config.editor_uri_scheme}
            onChange={(e) => updateConfigField('editor_uri_scheme', e.target.value)}
          />
        </section>
        
        {/* Backend Settings (rg) */}
        <section className="mb-6 p-4 border rounded dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-3 dark:text-gray-200">Backend: Search Settings (rg)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Changes here require restarting the backend service.</p>
            <InputField
              label="Search Pattern (Regex)"
              description="The regular expression used by the backend (ripgrep) to find TODO lines."
              type="text"
              id="rg_pattern"
              value={config.rg.pattern}
              onChange={(e) => updateRgField('pattern', e.target.value)}
            />
            <TextareaField
                label="Search Paths"
                description="List of directories or files for the backend to search (one per line)."
                id="rg_paths"
                value={config.rg.paths.join('\n')}
                onChange={(e) => updateRgField('paths', e.target.value.split('\n').map(p => p.trim()).filter(Boolean))}
            />
            <TextareaField
                label="Ignore Patterns (Globs)"
                description="Files/directories to ignore during the backend search (one glob pattern per line). Standard .gitignore/.ignore rules also apply."
                id="rg_ignore"
                value={config.rg.ignore?.join('\n') || ''}
                onChange={(e) => updateRgField('ignore', e.target.value.split('\n').map(p => p.trim()).filter(Boolean))}
            />
             {/* file_types is not supported by backend searcher, maybe hide or show warning */}
             <TextareaField
                label="File Types (Glob - Currently Informational)"
                description="Specific file types to include (e.g., *.ts, *.rs). Note: This setting is not currently used by the internal backend searcher but is saved."
                id="rg_file_types"
                value={config.rg.file_types?.join('\n') || ''}
                onChange={(e) => updateRgField('file_types', e.target.value.split('\n').map(p => p.trim()).filter(Boolean))}
                className="opacity-60" // Indicate it's not fully used
            />
        </section>

        {/* Backend Settings (Projects) */}
        <section className="mb-6 p-4 border rounded dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-3 dark:text-gray-200">Backend: Project Definitions</h2>
             <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Define project categories based on file paths (globs). Changes require restarting the backend service.</p>
            
            {Object.entries(projects).map(([projectName, patterns]) => (
                <div key={projectName} className="mb-4 p-3 border rounded dark:border-gray-600 relative">
                    <h3 className="text-lg font-medium mb-2 dark:text-gray-300">{projectName}</h3>
                    <TextareaField
                        label="Path Globs (one per line)"
                        description={`Glob patterns that define files belonging to the '${projectName}' project.`}
                        id={`project_${projectName}`}
                        value={patterns.join('\n')}
                        onChange={(e) => handleProjectPatternChange(projectName, e)}
                    />
                     <button 
                        type="button"
                        onClick={() => removeProject(projectName)}
                        className="absolute top-2 right-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Remove project"
                    >
                        Remove
                    </button>
                </div>
            ))}

            <div className="mt-4 flex items-end gap-2">
                <InputField
                    label="New Project Name"
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter new project name"
                    className="flex-grow mb-0" // Adjust styling for inline
                />
                <button 
                    type="button"
                    onClick={handleAddProject}
                    className="px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm h-[37px]" // Match height approx
                >
                    Add Project
                </button>
            </div>
        </section>


        <div className="mt-6 flex justify-end space-x-3">
            {/* Maybe add a reset button later */}
          <button 
            type="submit" 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
} 
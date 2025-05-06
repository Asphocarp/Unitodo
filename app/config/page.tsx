'use client';

import React, { useEffect, useState } from 'react';
import useConfigStore from '../store/configStore';
import { useDarkMode } from '../utils/darkMode';
import { Config, ProjectConfig, RgConfig } from '../types';
import Link from 'next/link';

// Reusable Input Component with more compact, stylish design
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

const InputField: React.FC<InputProps> = ({ label, description, ...props }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor={props.id || props.name}>{label}</label>
    <input 
      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-sm shadow-sm 
                focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color 
                dark:bg-gray-800 dark:text-gray-200" 
      {...props} 
    />
    {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
  </div>
);

// Reusable Textarea Component with more compact, stylish design
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
}

const TextareaField: React.FC<TextareaProps> = ({ label, description, ...props }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor={props.id || props.name}>{label}</label>
    <textarea 
      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-sm shadow-sm 
                focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color
                dark:bg-gray-800 dark:text-gray-200" 
      rows={3}
      {...props} 
    />
    {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
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
    updateProjectAppendPath,
    addProject,
    removeProject,
    addTodoDonePair,
    updateTodoDonePair,
    removeTodoDonePair
  } = useConfigStore();
  
  const { isDarkMode } = useDarkMode();
  const [newProjectName, setNewProjectName] = useState('');
  const [newTodoPattern, setNewTodoPattern] = useState('');
  const [newDonePattern, setNewDonePattern] = useState('');

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

  const handleAddTodoDonePair = () => {
    if (newTodoPattern.trim() && newDonePattern.trim()) {
        addTodoDonePair([newTodoPattern.trim(), newDonePattern.trim()]);
        setNewTodoPattern('');
        setNewDonePattern('');
    }
  };

  if (loading && !config) {
    return <div className="flex items-center justify-center h-screen text-xs">Loading configuration...</div>;
  }

  if (error && !config) {
    return <div className="text-red-600 dark:text-red-400 text-xs flex items-center justify-center h-screen">Error: {error}</div>;
  }

  if (!config) {
    return <div className="text-xs flex items-center justify-center h-screen">Configuration not available. Attempting to load or create default...</div>;
  }

  const projects: Record<string, ProjectConfig> = config.projects as Record<string, ProjectConfig>;

  return (
    <div className={`max-w-4xl mx-auto p-2 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header with back button */}
      <div className="hn-header dark:border-gray-700 flex items-center mb-3">
        <Link href="/" className="hn-meta text-gray-200 mr-2">
          &larr;
        </Link>
        <h1 className="hn-title">Unitodo Configuration</h1>
      </div>

      {/* Notifications */}
      {error && (
         <div className="mb-2 py-1 px-2 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs">
            Error: {error}
         </div>
      )}
      {saveMessage && (
        <div className="mb-2 py-1 px-2 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
          {saveMessage}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); saveConfig(); }} className="text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Frontend Settings */}
          <section className="mb-4 p-2 border-t border-l border-r border-b border-border-color dark:border-gray-700 rounded-sm">
            <h2 className="text-sm font-semibold mb-2 text-subtle-color dark:text-gray-400">Frontend Settings</h2>
            <InputField
              label="Auto-Refresh Interval (ms)"
              description="Refresh frequency for TODO list"
              type="number"
              id="refresh_interval"
              value={config.refresh_interval}
              onChange={(e) => updateConfigField('refresh_interval', parseInt(e.target.value, 10) || 0)}
            />
            <InputField
              label="Editor URI Scheme"
              description="URI to open files (e.g., vscode://file/, cursor://file/)"
              type="text"
              id="editor_uri_scheme"
              value={config.editor_uri_scheme}
              onChange={(e) => updateConfigField('editor_uri_scheme', e.target.value)}
            />
          </section>
          
          {/* Backend Settings (rg) */}
          <section className="mb-4 p-2 border-t border-l border-r border-b border-border-color dark:border-gray-700 rounded-sm">
              <h2 className="text-sm font-semibold mb-2 text-subtle-color dark:text-gray-400">Search Settings</h2>
              <TextareaField
                  label="Search Paths"
                  description="Locations to scan (one per line)"
                  id="rg_paths"
                  value={config.rg.paths.join('\n')}
                  onChange={(e) => updateRgField('paths', e.target.value.split('\n').map(p => p.trim()).filter(Boolean))}
              />
              <TextareaField
                  label="Ignore Patterns (Globs)"
                  description="Files/dirs to ignore (one per line)"
                  id="rg_ignore"
                  value={config.rg.ignore?.join('\n') || ''}
                  onChange={(e) => updateRgField('ignore', e.target.value.split('\n').map(p => p.trim()).filter(Boolean))}
              />
          </section>
        </div>

        {/* Backend Settings (Projects) */}
        <section className="mb-4 p-2 border-t border-l border-r border-b border-border-color dark:border-gray-700 rounded-sm">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-subtle-color dark:text-gray-400">Project Definitions</h2>
              <div className="flex items-center">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="New project name"
                  className="mr-1 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-700 rounded-sm 
                           dark:bg-gray-800 dark:text-gray-200 w-32"
                />
                <button 
                  type="button"
                  onClick={handleAddProject}
                  className="px-2 py-0.5 bg-accent-color hover:opacity-90 rounded-sm text-xs border border-accent-color"
                >
                  Add
                </button>
              </div>
            </div>
            
            {Object.entries(projects).length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">No projects defined yet. Add a project to categorize TODOs.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(projects).map(([projectName, projectConfig]) => (
                    <div key={projectName} className="p-2 border border-gray-200 dark:border-gray-700 rounded-sm relative">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="text-xs font-medium dark:text-gray-300">{projectName}</h3>
                          <button 
                            type="button"
                            onClick={() => removeProject(projectName)}
                            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                            className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-sm
                                      dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-color"
                            rows={2}
                            placeholder="Path glob patterns (one per line)"
                            value={projectConfig.patterns.join('\n')}
                            onChange={(e) => handleProjectPatternChange(projectName, e)}
                        />
                        <InputField
                          label="Append TODO File Path (Optional)"
                          description="Path to the file where new TODOs for this project will be appended."
                          type="text"
                          id={`project_append_path_${projectName}`}
                          name={`project_append_path_${projectName}`}
                          value={projectConfig.append_file_path || ''}
                          onChange={(e) => updateProjectAppendPath(projectName, e.target.value)}
                          className="mt-2"
                        />
                    </div>
                ))}
              </div>
            )}
        </section>

        {/* TODO/DONE Pattern Pairs Settings */}
        <section className="mb-4 p-2 border-t border-l border-r border-b border-border-color dark:border-gray-700 rounded-sm">
          <h2 className="text-sm font-semibold mb-2 text-subtle-color dark:text-gray-400">TODO/DONE Pattern Pairs</h2>
          <div className="mb-3 p-2 border border-gray-200 dark:border-gray-700 rounded-sm">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <InputField
                label="New TODO Pattern"
                type="text"
                value={newTodoPattern}
                onChange={(e) => setNewTodoPattern(e.target.value)}
                placeholder="e.g., - [ ] or TODO:"
              />
              <InputField
                label="New DONE Pattern"
                type="text"
                value={newDonePattern}
                onChange={(e) => setNewDonePattern(e.target.value)}
                placeholder="e.g., - [x] or DONE:"
              />
            </div>
            <button 
              type="button"
              onClick={handleAddTodoDonePair}
              className="px-2 py-0.5 bg-accent-color hover:opacity-90 rounded-sm text-xs border border-accent-color"
            >
              Add Pair
            </button>
          </div>

          {config.todo_done_pairs && config.todo_done_pairs.length > 0 ? (
            <div className="space-y-2">
              {config.todo_done_pairs.map((pair, index) => (
                <div key={index} className="p-2 border border-gray-200 dark:border-gray-700 rounded-sm flex justify-between items-center">
                  <div className="flex-grow">
                    <p className="text-xs dark:text-gray-300">
                      <span className="font-medium">From:</span> {pair[0]}
                    </p>
                    <p className="text-xs dark:text-gray-300">
                      <span className="font-medium">To:</span> {pair[1]}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeTodoDonePair(index)}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">No TODO/DONE pattern pairs defined. Defaults will be used.</p>
          )}
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="px-3 py-1 bg-accent-color rounded-sm hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-accent-color disabled:opacity-50 text-xs border border-accent-color"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
} 
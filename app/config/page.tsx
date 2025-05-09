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
  <div className="mb-4">
    <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300" htmlFor={props.id || props.name}>{label}</label>
    <input 
      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md shadow-sm 
                focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color 
                dark:bg-gray-800 dark:text-gray-200 transition-all duration-150" 
      {...props} 
    />
    {description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
  </div>
);

// Reusable Textarea Component with more compact, stylish design
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  description?: string;
}

const TextareaField: React.FC<TextareaProps> = ({ label, description, ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300" htmlFor={props.id || props.name}>{label}</label>
    <textarea 
      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md shadow-sm 
                focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color
                dark:bg-gray-800 dark:text-gray-200 transition-all duration-150" 
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
    <div className={`max-w-4xl mx-auto p-4 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header with back button */}
      <div className="hn-header dark:border-gray-700 flex items-center mb-4 rounded-md shadow-sm">
        <Link href="/" className="hn-meta text-gray-200 hover:text-white transition-colors mr-2" prefetch={false}>
          &larr;
        </Link>
        <h1 className="hn-title">Unitodo Configuration</h1>
      </div>

      {/* Notifications */}
      {error && (
         <div className="mb-3 py-2 px-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs border border-red-200 dark:border-red-800/50">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Error: {error}</span>
            </div>
         </div>
      )}
      {saveMessage && (
        <div className="mb-3 py-2 px-3 rounded-md bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs border border-green-200 dark:border-green-800/50">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{saveMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); saveConfig(); }} className="text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frontend Settings */}
          <section className="mb-5 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800/50">
            <h2 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-700">Frontend Settings</h2>
            <InputField
              label="Auto-Refresh Interval (ms)"
              description="Refresh frequency for TODO list" // UNITODO_IGNORE_LINE
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
            <InputField
              label="Default Append File Basename"
              description="Default filename for appending TODOs in git repos (e.g., unitodo.append.md)" // UNITODO_IGNORE_LINE
              type="text"
              id="default_append_basename"
              value={config.default_append_basename}
              onChange={(e) => updateConfigField('default_append_basename', e.target.value)}
            />
          </section>
          
          {/* Backend Settings (rg) */}
          <section className="mb-5 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800/50">
              <h2 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-700">Search Settings</h2>
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
        <section className="mb-5 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800/50">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project Definitions</h2>
              <div className="flex items-center">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="New project name"
                  className="mr-2 px-3 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-md 
                           dark:bg-gray-800 dark:text-gray-200 w-36 focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color transition-all duration-150"
                />
                <button 
                  type="button"
                  onClick={handleAddProject}
                  className="px-3 py-1 bg-accent-color hover:bg-accent-color/90 rounded-md text-xs border border-accent-color transition-all flex items-center shadow-sm"
                  disabled={!newProjectName.trim()}
                >
                  <span className="mr-1">+</span> Add
                </button>
              </div>
            </div>
            
            {Object.entries(projects).length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">No projects defined yet. Add a project to categorize TODOs.</p>// UNITODO_IGNORE_LINE
            ) : (
              <div className="space-y-4">
                {Object.entries(projects).map(([projectName, projectConfig]) => (
                    <div key={projectName} className="p-4 border border-gray-200 dark:border-gray-700 rounded-md relative hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-white dark:bg-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{projectName}</h3>
                          <button 
                            type="button"
                            onClick={() => removeProject(projectName)}
                            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            aria-label={`Remove ${projectName} project`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Remove</span>
                          </button>
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">Path Patterns</label>
                          <textarea
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md
                                        dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-color transition-all duration-150"
                              rows={2}
                              placeholder="Path glob patterns (one per line, e.g., src/**/*.js)"
                              value={projectConfig.patterns.join('\n')}
                              onChange={(e) => handleProjectPatternChange(projectName, e)}
                          />
                        </div>
                        <InputField
                          label="Append TODO File Path" // UNITODO_IGNORE_LINE
                          description="Path where new TODOs for this project will be added" // UNITODO_IGNORE_LINE
                          type="text"
                          id={`project_append_path_${projectName}`}
                          name={`project_append_path_${projectName}`}
                          value={projectConfig.append_file_path || ''}
                          onChange={(e) => updateProjectAppendPath(projectName, e.target.value)}
                          placeholder="Optional: /path/to/todo.md"
                        />
                    </div>
                ))}
              </div>
            )}
        </section>

        <section className="mb-5 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800/50">
          <h2 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-700">TODO/DONE Pattern Pairs</h2> {/* UNITODO_IGNORE_LINE */}
          <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <InputField
                label="New TODO Pattern" // UNITODO_IGNORE_LINE
                type="text"
                value={newTodoPattern}
                onChange={(e) => setNewTodoPattern(e.target.value)}
                placeholder="e.g., - [ ] or TODO:" // UNITODO_IGNORE_LINE
                className="focus:z-10 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5"
              />
              <InputField
                label="New DONE Pattern"
                type="text"
                value={newDonePattern}
                onChange={(e) => setNewDonePattern(e.target.value)}
                placeholder="e.g., - [x] or DONE:"
                className="focus:z-10 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5"
              />
            </div>
            <button 
              type="button"
              onClick={handleAddTodoDonePair}
              className="px-3 py-1.5 bg-accent-color hover:bg-accent-color/90 rounded-md text-xs border border-accent-color transition-all flex items-center shadow-sm"
              disabled={!newTodoPattern.trim() || !newDonePattern.trim()}
            >
              <span className="mr-1">+</span> Add Pattern Pair
            </button>
          </div>

          {config.todo_done_pairs && config.todo_done_pairs.length > 0 ? (
            <div className="space-y-2">
              {config.todo_done_pairs.map((pair, index) => (
                <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-md flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm">
                  <div className="flex-grow grid grid-cols-2 gap-4">
                    <div className="text-xs dark:text-gray-300">
                      <span className="font-medium text-gray-600 dark:text-gray-400">TODO:</span> {/* UNITODO_IGNORE_LINE */}
                      {/* making sure blank chars are shown via .replace(/ /g, '\u00A0') */}
                      <code className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md">{pair[0].replace(/ /g, '\u00A0')}</code>
                    </div>
                    <div className="text-xs dark:text-gray-300">
                      <span className="font-medium text-gray-600 dark:text-gray-400">DONE:</span> 
                      <code className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md">{pair[1].replace(/ /g, '\u00A0')}</code>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeTodoDonePair(index)}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-4 flex items-center bg-red-50 dark:bg-red-900/20 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    aria-label="Remove pattern pair"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">No TODO/DONE pattern pairs defined. Defaults will be used.</p> // UNITODO_IGNORE_LINE
          )}
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="px-5 py-2 bg-accent-color rounded-md hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent-color disabled:opacity-50 text-sm font-medium border border-accent-color transition-all shadow-sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Configuration
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 
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
                           dark:bg-gray-800 dark:text-gray-200 w-32 focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color"
                />
                <button 
                  type="button"
                  onClick={handleAddProject}
                  className="px-3 py-0.5 bg-accent-color hover:opacity-90 rounded-sm text-xs border border-accent-color transition-opacity flex items-center"
                  disabled={!newProjectName.trim()}
                >
                  <span className="mr-1">+</span> Add
                </button>
              </div>
            </div>
            
            {Object.entries(projects).length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">No projects defined yet. Add a project to categorize TODOs.</p>// UNITODO_IGNORE_LINE
            ) : (
              <div className="space-y-3">
                {Object.entries(projects).map(([projectName, projectConfig]) => (
                    <div key={projectName} className="p-3 border border-gray-200 dark:border-gray-700 rounded-sm relative hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">{projectName}</h3>
                          <button 
                            type="button"
                            onClick={() => removeProject(projectName)}
                            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center"
                            aria-label={`Remove ${projectName} project`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Remove</span>
                          </button>
                        </div>
                        <div className="mb-2">
                          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Path Patterns</label>
                          <textarea
                              className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-sm
                                        dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-color"
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

        <section className="mb-4 p-2 border border-gray-200 dark:border-gray-700 rounded-sm">
          <h2 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">TODO/DONE Pattern Pairs</h2> {/* UNITODO_IGNORE_LINE */}
          <div className="mb-3 p-2 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <InputField
                label="New TODO Pattern" // UNITODO_IGNORE_LINE
                type="text"
                value={newTodoPattern}
                onChange={(e) => setNewTodoPattern(e.target.value)}
                placeholder="e.g., - [ ] or TODO:"
                className="focus:z-10 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-sm px-2 py-1"
              />
              <InputField
                label="New DONE Pattern"
                type="text"
                value={newDonePattern}
                onChange={(e) => setNewDonePattern(e.target.value)}
                placeholder="e.g., - [x] or DONE:"
                className="focus:z-10 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-sm px-2 py-1"
              />
            </div>
            <button 
              type="button"
              onClick={handleAddTodoDonePair}
              className="px-3 py-1 bg-accent-color hover:opacity-90 rounded-sm text-xs border border-accent-color transition-opacity flex items-center"
            >
              <span className="mr-1">+</span> Add Pattern Pair
            </button>
          </div>

          {config.todo_done_pairs && config.todo_done_pairs.length > 0 ? (
            <div className="space-y-2">
              {config.todo_done_pairs.map((pair, index) => (
                <div key={index} className="p-2 border border-gray-200 dark:border-gray-700 rounded-sm flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div className="flex-grow grid grid-cols-2 gap-2">
                    <div className="text-xs dark:text-gray-300">
                      <span className="font-medium text-gray-600 dark:text-gray-400">TODO:</span> {/* UNITODO_IGNORE_LINE */}
                      {/* making sure blank chars are shown via .replace(/ /g, '\u00A0') */}
                      <code className="ml-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{pair[0].replace(/ /g, '\u00A0')}</code>
                    </div>
                    <div className="text-xs dark:text-gray-300">
                      <span className="font-medium text-gray-600 dark:text-gray-400">DONE:</span> 
                      <code className="ml-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{pair[1].replace(/ /g, '\u00A0')}</code>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeTodoDonePair(index)}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-4 flex items-center"
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
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">No TODO/DONE pattern pairs defined. Defaults will be used.</p> // UNITODO_IGNORE_LINE
          )}
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="px-4 py-1.5 bg-accent-color rounded-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent-color disabled:opacity-50 text-xs font-medium border border-accent-color transition-all shadow-sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
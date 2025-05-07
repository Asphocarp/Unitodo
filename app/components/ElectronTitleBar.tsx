'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ElectronTitleBar() {
  const pathname = usePathname();
  const [isElectron, setIsElectron] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    // Check if we're running in Electron
    // @ts-ignore - window.electron is injected by Electron preload script
    setIsElectron(typeof window !== 'undefined' && !!window.electron);
  }, []);
  
  // Don't render anything if not in Electron
  if (!isElectron) return null;

  // Get title based on current route
  const getTitle = () => {
    if (pathname === '/') return 'Unitodo';
    if (pathname === '/config') return 'Unitodo - Settings';
    return 'Unitodo';
  };

  const handleClose = () => {
    if (window.electron) {
      window.electron.closeWindow();
    }
  };

  const handleMinimize = () => {
    if (window.electron) {
      window.electron.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electron) {
      window.electron.maximizeWindow();
    }
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-8 bg-white dark:bg-gray-900 flex items-center z-50 border-b border-gray-200 dark:border-gray-800 app-drag-region"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* macOS window controls */}
      <div className="app-no-drag flex space-x-2 ml-3">
        <button 
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center focus:outline-none"
          aria-label="Close window"
        >
          {isHovered && (
            <svg className="w-2 h-2 text-red-800" fill="currentColor" viewBox="0 0 10 10">
              <path d="M6.46 5L9.53 1.93a1.03 1.03 0 0 0-1.46-1.46L5 3.54 1.93.47A1.03 1.03 0 0 0 .47 1.93L3.54 5 .47 8.07a1.03 1.03 0 0 0 1.46 1.46L5 6.46l3.07 3.07a1.03 1.03 0 0 0 1.46-1.46L6.46 5z" />
            </svg>
          )}
        </button>
        <button 
          onClick={handleMinimize}
          className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center focus:outline-none"
          aria-label="Minimize window"
        >
          {isHovered && (
            <svg className="w-2 h-2 text-yellow-800" fill="currentColor" viewBox="0 0 10 10">
              <rect x="2" y="4.5" width="6" height="1" />
            </svg>
          )}
        </button>
        <button 
          onClick={handleMaximize}
          className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center focus:outline-none"
          aria-label="Maximize window"
        >
          {isHovered && (
            <svg className="w-2 h-2 text-green-800" fill="currentColor" viewBox="0 0 10 10">
              <path d="M1.5 1.5h7v7h-7z M1.5 1.5 M8.5 8.5" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Center title */}
      <div className="flex-1 text-center text-sm font-medium select-none text-gray-700 dark:text-gray-300">
        {getTitle()}
      </div>
      
      {/* Navigation buttons */}
      <div className="app-no-drag px-4 flex items-center space-x-4">
        {pathname !== '/' && (
          <Link 
            href="/"
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-3.5 w-3.5 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
        )}
        
        {pathname !== '/config' && (
          <Link 
            href="/config"
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-3.5 w-3.5 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
            Settings
          </Link>
        )}
      </div>
    </div>
  );
}

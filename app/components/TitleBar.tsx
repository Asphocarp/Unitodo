'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getCurrentWindow } from '@tauri-apps/api/window';

const TitleBar: React.FC<{ title?: string }> = ({ title = 'Unitodo' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const currentWindow = getCurrentWindow();

  const handleClose = () => {
    currentWindow.close();
  };

  const handleMinimize = () => {
    currentWindow.minimize();
  };

  const handleMaximize = () => {
    currentWindow.toggleMaximize();
  };

  return (
    <div 
      className="hn-title-bar flex items-center h-8 px-2 drag select-none bg-white dark:bg-gray-900 border-b dark:border-gray-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* macOS window controls - only shown in Electron */}
      {/* {isElectron && (
        <div className={`flex space-x-2 mr-4 ${isHovered ? 'opacity-100' : 'opacity-30'}`}>
          <button 
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
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
            className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center"
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
            className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 flex items-center justify-center"
            aria-label="Maximize window"
          >
            {isHovered && (
              <svg className="w-2 h-2 text-green-800" fill="currentColor" viewBox="0 0 10 10">
                <path d="M1.5 1.5h7v7h-7z M1.5 1.5 M8.5 8.5" stroke="currentColor" strokeWidth="1" fill="none" />
              </svg>
            )}
          </button>
        </div>
      )} */}

      {/* App title */}
      <div className="flex-1 text-center text-sm font-medium dark:text-gray-200">
        {title}
      </div>

      {/* Navigation links */}
      <div className="flex space-x-4">
        <Link href="./" className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
          Home
        </Link>
        <Link href="./config" className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
          Config
        </Link>
      </div>
    </div>
  );
};

export default TitleBar; 
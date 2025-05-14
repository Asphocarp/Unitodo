'use client';

import React from 'react';
import Link from 'next/link';
import { getCurrentWindow } from '@tauri-apps/api/window';

const TitleBar: React.FC<{ title?: string }> = ({ title = 'Unitodo' }) => {
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
      className="hn-title-bar flex items-center h-8 px-2 drag select-none bg-white dark:bg-neutral-900 border-b dark:border-neutral-800"
    >

      {/* App title */}
      <div className="flex-1 text-center text-sm font-medium dark:text-neutral-200">
        {title}
      </div>

      {/* Navigation links */}
      <div className="flex space-x-4">
        <Link href="./" className="text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200">
          Home
        </Link>
        <Link href="./config" className="text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200">
          Config
        </Link>
      </div>
    </div>
  );
};

export default TitleBar; 
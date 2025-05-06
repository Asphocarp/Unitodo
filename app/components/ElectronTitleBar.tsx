'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ElectronTitleBar() {
  const pathname = usePathname();
  const [isElectron, setIsElectron] = useState(false);
  
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

  return (
    <div className="fixed top-0 left-0 right-0 h-8 bg-gray-100 dark:bg-gray-900 flex items-center justify-center z-50 app-drag-region">
      <div className="text-sm font-medium select-none text-gray-700 dark:text-gray-300">
        {getTitle()}
      </div>
      
      {/* Navigation buttons */}
      <div className="absolute left-0 top-0 h-full px-4 flex items-center space-x-2">
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

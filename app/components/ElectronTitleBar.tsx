'use client';

import { useEffect, useState } from 'react';

export default function ElectronTitleBar() {
  // const pathname = usePathname(); // No longer needed
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
    // Simplified title, or you can bring back pathname logic if needed elsewhere
    return 'Unitodo'; 
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-8 bg-white dark:bg-gray-900 flex items-center z-50 border-b border-gray-200 dark:border-gray-800 app-drag-region"
    >
      {/* Center title */}
      <div className="flex-1 text-center text-sm font-medium select-none text-gray-700 dark:text-gray-300 app-drag-region">
        {getTitle()}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';

interface ZoomIndicatorProps {
  percentage: number;
  isVisible: boolean;
  onHide: () => void;
}

export const ZoomIndicator: React.FC<ZoomIndicatorProps> = ({ 
  percentage, 
  isVisible, 
  onHide 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 2000); // Hide after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed top-6 right-6 z-[9999]
        bg-slate-600/95 dark:bg-slate-700/95
        text-white text-xl font-bold
        px-5 py-3 rounded-2xl
        backdrop-blur-md border border-slate-400/30
        shadow-2xl shadow-black/40
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 -translate-y-2'}
        min-w-[100px]
      `}
    >
      <div className="flex items-center justify-center gap-2">
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" 
          />
        </svg>
        <span>{percentage}%</span>
      </div>
    </div>
  );
}; 
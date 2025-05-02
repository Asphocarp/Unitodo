'use client';

import React, { useState, useEffect } from 'react';

interface NerdFontIconProps {
  icon: string;
  category: string;
  className?: string;
}

export default function NerdFontIcon({ icon, category, className = '' }: NerdFontIconProps) {
  const [fontLoaded, setFontLoaded] = useState(false);
  
  useEffect(() => {
    // Check if the Nerd Font is loaded
    document.fonts.ready.then(() => {
      setFontLoaded(true);
    });
  }, []);
  
  // Map category names to appropriate fallback icons
  const getFallbackIcon = () => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('git')) return ''; 
    if (lowerCategory === 'other') return '📋';
    return '📁';
  };
  
  // Get icon class for Font Awesome fallback
  const getIconClass = () => {
    const name = category.toLowerCase();
    if (name.includes('git')) return 'fa-brands fa-git-alt';
    if (name === 'other') return 'fa-regular fa-file';
    return 'fa-solid fa-folder';
  };
  
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {/* Try to display the original Nerd Font icon */}
      <span className="nerd-font-icon">{icon}</span>
      
      {/* Font Awesome fallback (displays if added in className) */}
      <i className={`${getIconClass()} ml-1 opacity-0`} aria-hidden="true"></i>
      
      {/* Text fallback (only visible if first option fails) */}
      <span className="sr-only">{getFallbackIcon()}</span>
    </span>
  );
} 
'use client';

import React from 'react';

interface NerdFontIconProps {
  icon: string;
  category: string;
  className?: string;
}

const categoryFallbackIconMap: Record<string, string> = {
  other: '📋',
  // Add other specific fallbacks if needed, default is handled below
};

export default function NerdFontIcon({ icon, category, className = '' }: NerdFontIconProps) {
  const getNerdIconFallback = () => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('git')) return ''; // No fallback for git, rely on Nerd Font icon
    return categoryFallbackIconMap[lowerCategory] || '📁'; // Default to folder icon
  };
  
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {/* Try to display the original Nerd Font icon */}
      <span className="nerd-font-icon">{icon}</span>
      {/* Text fallback (only visible if first option fails or for screen readers) */}
      <span className="sr-only">{getNerdIconFallback()}</span>
    </span>
  );
} 
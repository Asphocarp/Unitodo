'use client';

import React, { useState, useEffect } from 'react';

interface NerdFontIconProps {
  icon: string;
  category: string;
  className?: string;
}

export default function NerdFontIcon({ icon, category, className = '' }: NerdFontIconProps) {
  // Map category names to appropriate fallback icons
  const getNerdIcon = () => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('git')) return ''; 
    if (lowerCategory === 'other') return '📋';
    return '📁';
  };
  
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {/* Try to display the original Nerd Font icon */}
      <span className="nerd-font-icon">{icon}</span>
      {/* Text fallback (only visible if first option fails) */}
      <span className="sr-only">{getNerdIcon()}</span>
    </span>
  );
} 
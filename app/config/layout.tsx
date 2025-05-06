import React from 'react';

export default function ConfigRouteLayout({ children }: { children: React.ReactNode }) {
  // You could add specific layout elements for the config section here if needed
  return <div className="p-4">{children}</div>;
} 
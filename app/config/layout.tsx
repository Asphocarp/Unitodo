import React from 'react';

export default function ConfigRouteLayout({ children }: { children: React.ReactNode }) {
  // You could add specific layout elements for the config section here if needed
  return (
    <div className="h-[calc(100vh-2rem)] overflow-y-auto p-4">
      {/* The 2rem (h-8) for the title bar is already accounted for by pt-8 on electron-content in the root layout. 
          So this div needs to fill the remaining viewport height effectively. 
          100vh - height of title bar (2rem or 32px) ensures it takes the correct space.
          The parent div electron-content has pt-8, so this child starts below the titlebar.
          h-full might also work depending on parent flex context, but calc(100vh - 2rem) is more explicit for viewport height minus titlebar.
          Given electron-content likely does not have a fixed height itself but relies on children, 
          making this div manage its own height relative to viewport (minus titlebar) and scroll is key.
      */}
      {children}
    </div>
  );
} 
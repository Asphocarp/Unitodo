"use client";

import dynamic from 'next/dynamic';

const WinTitleBar = dynamic(() => import('./WinTitleBar'), {
  ssr: false,
});

export default function WinTitleBarClient() {
  return <WinTitleBar />;
} 
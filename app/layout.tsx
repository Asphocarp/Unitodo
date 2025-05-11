import type { Metadata } from 'next';
import './globals.css';
import './styles/fonts.css';
import { Providers } from './providers';
import dynamic from 'next/dynamic';

// Dynamically import WinTitleBar to prevent SSR issues
const WinTitleBar = dynamic(() => import('./components/WinTitleBar'), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'Unitodo',
  description: 'Unifying Distributed TODOs', // UNITODO_IGNORE_LINE
  icons: {
    icon: '/images/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          {/* Transparent overlay drag region for Tauri */}
          <div data-tauri-drag-region className="fixed top-0 left-0 w-full h-8 z-50" />
          <WinTitleBar />
          <div className="electron-content">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
} 
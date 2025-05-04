import type { Metadata } from 'next';
import './globals.css';
import './styles/fonts.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Unitodo - Todo Tracker',
  description: 'A unified todo tracker for your projects',
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
          {children}
        </Providers>
      </body>
    </html>
  );
} 
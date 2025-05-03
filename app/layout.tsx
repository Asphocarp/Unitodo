import type { Metadata } from 'next';
import './globals.css';
import './styles/fonts.css';

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
        {children}
      </body>
    </html>
  );
} 
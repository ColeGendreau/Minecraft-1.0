'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/lib/theme-context';
import { Header } from './Header';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <Header />
      {children}
    </ThemeProvider>
  );
}


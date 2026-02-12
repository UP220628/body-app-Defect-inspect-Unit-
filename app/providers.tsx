'use client';

import React, { useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from '@/lib/auth';

export default function Providers({ children }: { children: React.ReactNode }) {
  const theme = useMemo(
    () =>
      createTheme({
        typography: {
          fontFamily: ['Roboto', 'Inter', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial'].join(','),
        },
      }),
    []
  );

  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}

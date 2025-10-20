'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { initializeApiClient } from '@/lib/api';
import { useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize API client with auth token
    initializeApiClient();
  }, []);

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
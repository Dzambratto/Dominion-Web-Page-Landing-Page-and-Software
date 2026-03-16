import { AppProvider } from '@/lib/store';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LandingPage } from '@/components/LandingPage';
import { DashboardShell } from '@/components/DashboardShell';
import { AuthScreen } from '@/components/AuthScreen';
import { useState } from 'react';

/** Inner component that reads auth state after AuthProvider is mounted */
function AppInner() {
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<'landing' | 'auth'>('landing');

  // While restoring session from localStorage, show nothing (avoids flash)
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0A0F1E',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '-1px', marginBottom: '12px' }}>
            DOMINION
          </div>
          <div style={{ color: '#3B82F6', fontSize: '13px' }}>Loading…</div>
        </div>
      </div>
    );
  }

  // If user is logged in, always show the dashboard
  if (user) {
    return (
      <AppProvider>
        <DashboardShell />
      </AppProvider>
    );
  }

  // Auth screen (sign in / sign up)
  if (mode === 'auth') {
    return (
      <AuthScreen
        onSuccess={() => { /* auth state update triggers re-render automatically */ }}
        onBack={() => setMode('landing')}
      />
    );
  }

  // Landing page
  return (
    <LandingPage
      onEnterApp={() => setMode('auth')}
      onSignIn={() => setMode('auth')}
    />
  );
}

export function AppRoot() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

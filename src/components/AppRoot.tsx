import { AppProvider } from '@/lib/store';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LandingPage } from '@/components/LandingPage';
import { DashboardShell } from '@/components/DashboardShell';
import { AuthScreen } from '@/components/AuthScreen';
import { useState, useEffect, useRef } from 'react';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_denied: 'Google sign-in was cancelled.',
  microsoft_denied: 'Microsoft sign-in was cancelled.',
  token_exchange_failed: 'Authentication failed. Please try again.',
  not_configured: 'OAuth is not yet configured. Please try again later.',
  server_error: 'Something went wrong. Please try again.',
  no_email: 'Could not retrieve your email address. Please try again.',
};

function OAuthNotice({ notice }: { notice: { type: 'success' | 'error'; message: string } }) {
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, padding: '12px 20px', borderRadius: '10px', fontSize: '14px',
      fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      background: notice.type === 'success' ? '#F0FDF4' : '#FEF2F2',
      color: notice.type === 'success' ? '#15803D' : '#DC2626',
      border: `1px solid ${notice.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
      maxWidth: '480px', textAlign: 'center', whiteSpace: 'pre-wrap',
    }}>
      {notice.message}
    </div>
  );
}

/** Inner component that reads auth state after AuthProvider is mounted */
function AppInner() {
  const { user, isLoading, addEmailConnection } = useAuth();
  const [mode, setMode] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [oauthNotice, setOauthNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Track pending OAuth connection — we may need to apply it once user is loaded
  const pendingOAuthRef = useRef<{ provider: 'gmail' | 'outlook'; email: string; label: string } | null>(null);
  const oauthProcessedRef = useRef(false);

  // Parse OAuth params on mount — store them for processing once auth state is ready
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('oauth_error');
    const email = params.get('email');

    if (oauthSuccess && email) {
      const provider = oauthSuccess === 'google' ? 'gmail' : 'outlook';
      const label = oauthSuccess === 'google' ? 'Gmail' : 'Outlook';
      pendingOAuthRef.current = { provider, email, label };
      // Clean up URL params immediately so they don't persist on refresh
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthError) {
      setOauthNotice({
        type: 'error',
        message: OAUTH_ERROR_MESSAGES[oauthError] || 'Authentication failed. Please try again.',
      });
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setOauthNotice(null), 6000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply pending OAuth connection once user is available and loading is done
  useEffect(() => {
    if (isLoading) return;
    if (!pendingOAuthRef.current) return;
    if (oauthProcessedRef.current) return;

    const { provider, email, label } = pendingOAuthRef.current;
    oauthProcessedRef.current = true;
    pendingOAuthRef.current = null;

    if (user) {
      // User is logged in — save the connection
      addEmailConnection({
        provider,
        email,
        connectedAt: new Date().toISOString(),
        status: 'active',
      });
      setOauthNotice({
        type: 'success',
        message: `✓ ${label} connected — ${email}\nWe're scanning your inbox for financial documents now.`,
      });
      setTimeout(() => setOauthNotice(null), 7000);
    } else {
      // User is not logged in — show sign-in screen with a notice
      setOauthNotice({
        type: 'success',
        message: `✓ ${label} (${email}) authorized — please sign in to complete the connection.`,
      });
      setAuthMode('signin');
      setMode('auth');
      setTimeout(() => setOauthNotice(null), 10000);
    }
  }, [isLoading, user, addEmailConnection]);

  // While restoring session from Supabase, show loading screen
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

  // If user is logged in, show the dashboard
  if (user) {
    return (
      <AppProvider userId={user.id}>
        {oauthNotice && <OAuthNotice notice={oauthNotice} />}
        <DashboardShell />
      </AppProvider>
    );
  }

  // Auth screen (sign in / sign up)
  if (mode === 'auth') {
    return (
      <>
        {oauthNotice && <OAuthNotice notice={oauthNotice} />}
        <AuthScreen
          initialMode={authMode}
          onSuccess={() => { /* auth state update triggers re-render automatically */ }}
          onBack={() => setMode('landing')}
        />
      </>
    );
  }

  // Landing page
  return (
    <>
      {oauthNotice && <OAuthNotice notice={oauthNotice} />}
      <LandingPage
        onEnterApp={() => { setAuthMode('signup'); setMode('auth'); }}
        onSignIn={() => { setAuthMode('signin'); setMode('auth'); }}
      />
    </>
  );
}

export function AppRoot() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

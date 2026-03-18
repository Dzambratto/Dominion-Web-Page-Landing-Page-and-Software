import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

interface AuthScreenProps {
  onSuccess: () => void;
  onBack?: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthScreen({ onSuccess, onBack, initialMode = 'signup' }: AuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Detect password reset callback: Supabase appends #type=recovery to the URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setMode('reset');
      // Clean up the hash so it doesn't persist on refresh
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // ── Forgot password ──────────────────────────────────────────────────
      if (mode === 'forgot') {
        if (!email.trim()) { setError('Please enter your email address.'); return; }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.toLowerCase().trim(),
          { redirectTo: `${window.location.origin}${window.location.pathname}` }
        );
        if (resetError) {
          setError(resetError.message || 'Could not send reset email. Please try again.');
        } else {
          setSuccess(`Reset link sent to ${email}. Check your inbox (and spam folder).`);
        }
        return;
      }

      // ── Set new password (after clicking reset link) ──────────────────────
      if (mode === 'reset') {
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message || 'Could not update password. Please try again.');
        } else {
          setSuccess('Password updated! Signing you in…');
          setTimeout(() => onSuccess(), 1500);
        }
        return;
      }

      // ── Sign up / Sign in ─────────────────────────────────────────────────
      let result: { error?: string };
      if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your name.'); return; }
        if (!company.trim()) { setError('Please enter your company name.'); return; }
        result = await signUp(email, password, name, company);
      } else {
        result = await signIn(email, password);
      }
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Derived UI strings ───────────────────────────────────────────────────
  const title = {
    signup: 'Create your account',
    signin: 'Welcome back',
    forgot: 'Reset your password',
    reset: 'Set a new password',
  }[mode];

  const subtitle = {
    signup: 'Start your free beta — no credit card required',
    signin: 'Sign in to your Dominion dashboard',
    forgot: "Enter your email and we'll send you a reset link",
    reset: 'Choose a new password for your account',
  }[mode];

  const submitLabel = {
    signup: loading ? 'Creating account…' : 'Create Account',
    signin: loading ? 'Signing in…' : 'Sign In',
    forgot: loading ? 'Sending…' : 'Send Reset Link',
    reset: loading ? 'Updating…' : 'Set New Password',
  }[mode];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
    }}>
      {/* Back button */}
      {(onBack || mode === 'forgot') && (
        <button
          onClick={() => {
            if (mode === 'forgot') { setMode('signin'); setError(''); setSuccess(''); }
            else onBack?.();
          }}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'none', border: 'none', color: '#64748B',
            fontSize: '14px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '6px',
          }}
        >
          ← Back
        </button>
      )}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <img src="/dominion-logo-transparent.png" alt="Dominion" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
        <span style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>Dominion</span>
      </div>

      {/* Card */}
      <div style={{
        background: '#111827',
        border: '1px solid #1E293B',
        borderRadius: '16px',
        padding: '36px',
        width: '100%',
        maxWidth: '420px',
      }}>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>
          {title}
        </h1>
        <p style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', marginBottom: '28px' }}>
          {subtitle}
        </p>

        {/* Success banner */}
        {success && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '12px 14px',
            color: '#15803D',
            fontSize: '13px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Sign up extra fields */}
          {mode === 'signup' && (
            <>
              <Field label="Full Name" type="text" value={name} onChange={setName} placeholder="Jane Smith" autoComplete="name" />
              <Field label="Company Name" type="text" value={company} onChange={setCompany} placeholder="Acme Corp" autoComplete="organization" />
            </>
          )}

          {/* Email — shown for all modes except reset */}
          {mode !== 'reset' && (
            <Field
              label="Work Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="jane@company.com"
              autoComplete="email"
            />
          )}

          {/* Password — shown for signin, signup, reset */}
          {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
            <Field
              label={mode === 'reset' ? 'New Password' : 'Password'}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={mode === 'signup' || mode === 'reset' ? 'At least 8 characters' : '••••••••'}
              autoComplete={mode === 'signup' || mode === 'reset' ? 'new-password' : 'current-password'}
            />
          )}

          {/* Confirm password — only for reset */}
          {mode === 'reset' && (
            <Field
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat your new password"
              autoComplete="new-password"
            />
          )}

          {/* Forgot password link — only on signin, below password field */}
          {mode === 'signin' && (
            <div style={{ textAlign: 'right', marginTop: '-6px' }}>
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                style={{
                  background: 'none', border: 'none',
                  color: '#64748B', fontSize: '12px',
                  cursor: 'pointer', padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#DC2626',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {/* Submit — hide after successful forgot-password send */}
          {!(mode === 'forgot' && success) && (
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#1D4ED8' : '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '13px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
                opacity: loading ? 0.8 : 1,
                transition: 'background 0.15s',
              }}
            >
              {submitLabel}
            </button>
          )}
        </form>

        {/* Toggle sign in / sign up */}
        {(mode === 'signin' || mode === 'signup') && (
          <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
            {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setSuccess(''); }}
              style={{
                background: 'none', border: 'none',
                color: '#3B82F6', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, padding: 0,
              }}
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up free'}
            </button>
          </p>
        )}
      </div>

      <p style={{ color: '#334155', fontSize: '12px', marginTop: '24px', textAlign: 'center' }}>
        Free during beta · No credit card · Cancel anytime
      </p>
    </div>
  );
}

function Field({
  label, type, value, onChange, placeholder, autoComplete
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: 'block', color: '#94A3B8', fontSize: '12px',
        fontWeight: 500, marginBottom: '6px',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        style={{
          width: '100%',
          background: '#0F172A',
          border: `1px solid ${focused ? '#3B82F6' : '#1E293B'}`,
          borderRadius: '8px',
          padding: '11px 14px',
          color: '#F1F5F9',
          fontSize: '14px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      />
    </div>
  );
}

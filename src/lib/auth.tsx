import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  createdAt: string;
  emailConnections: EmailConnection[];
}

export interface EmailConnection {
  provider: 'gmail' | 'outlook';
  email: string;
  connectedAt: string;
  status: 'active' | 'error';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, name: string, company: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
  addEmailConnection: (connection: EmailConnection) => void;
  removeEmailConnection: (provider: 'gmail' | 'outlook') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Local-only fallback keys
const USERS_KEY = 'dominion_users';
const SESSION_KEY = 'dominion_session';

function getStoredUsers(): Record<string, { passwordHash: string; user: User }> {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
}

function hashPassword(password: string): string {
  let hash = 0;
  const str = password + 'dominion_salt_2026';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function fetchProfile(userId: string): Promise<{ name: string; company: string } | null> {
  try {
    const { data } = await supabase.from('profiles').select('name, company').eq('id', userId).single();
    return data;
  } catch {
    return null;
  }
}

async function fetchEmailConnections(userId: string): Promise<EmailConnection[]> {
  try {
    const { data } = await supabase.from('email_connections').select('provider, email, connected_at, status').eq('user_id', userId);
    if (!data) return [];
    return data.map((row) => ({
      provider: row.provider as 'gmail' | 'outlook',
      email: row.email,
      connectedAt: row.connected_at,
      status: row.status as 'active' | 'error',
    }));
  } catch {
    return [];
  }
}

async function buildUser(supabaseUser: { id: string; email?: string; created_at: string }): Promise<User> {
  // Race against a 5-second timeout so we never hang forever
  const timeout = new Promise<{ profile: null; connections: EmailConnection[] }>((resolve) =>
    setTimeout(() => resolve({ profile: null, connections: [] }), 5000)
  );
  const fetches = Promise.all([fetchProfile(supabaseUser.id), fetchEmailConnections(supabaseUser.id)])
    .then(([profile, connections]) => ({ profile, connections }));

  const result = await Promise.race([fetches, timeout]);
  const profile = 'profile' in result ? result.profile : null;
  const connections = result.connections;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.name || '',
    company: profile?.company || '',
    createdAt: supabaseUser.created_at,
    emailConnections: connections,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  useEffect(() => {
    // Safety net: never stay in loading state longer than 8 seconds
    const loadingTimeout = setTimeout(() => {
      setState(prev => prev.isLoading ? { ...prev, isLoading: false } : prev);
    }, 8000);

    if (!isSupabaseConfigured) {
      clearTimeout(loadingTimeout);
      try {
        const sessionUserId = localStorage.getItem(SESSION_KEY);
        if (sessionUserId) {
          const users = getStoredUsers();
          const record = users[sessionUserId];
          if (record) { setState({ user: record.user, isLoading: false }); return; }
        }
      } catch { /* ignore */ }
      setState({ user: null, isLoading: false });
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(loadingTimeout);
      if (session?.user) {
        const user = await buildUser(session.user);
        setState({ user, isLoading: false });
      } else {
        setState({ user: null, isLoading: false });
      }
    }).catch(() => {
      clearTimeout(loadingTimeout);
      setState({ user: null, isLoading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Don't sign the user into the dashboard — AppRoot will show the reset form
        setState({ user: null, isLoading: false });
      } else if (event === 'SIGNED_IN' && session?.user) {
        const user = await buildUser(session.user);
        setState({ user, isLoading: false });
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, isLoading: false });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Don't rebuild user on token refresh — just ensure loading is cleared
        setState(prev => prev.isLoading ? { ...prev, isLoading: false } : prev);
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, company: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      const users = getStoredUsers();
      const existingId = Object.keys(users).find(id => users[id].user.email.toLowerCase() === email.toLowerCase());
      if (existingId) return { error: 'An account with this email already exists.' };
      if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
      const user: User = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        email: email.toLowerCase().trim(), name: name.trim(), company: company.trim(),
        createdAt: new Date().toISOString(), emailConnections: [],
      };
      users[user.id] = { passwordHash: hashPassword(password), user };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      localStorage.setItem(SESSION_KEY, user.id);
      setState({ user, isLoading: false });
      return {};
    }
    // Use server-side signup to auto-confirm users (bypasses email confirmation rate limits)
    try {
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password, name: name.trim(), company: company.trim() }),
      });
      const data = await resp.json();
      if (data.fallback) {
        // Server key not configured — fall back to standard Supabase signup
        const { error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(), password,
          options: { data: { name: name.trim(), company: company.trim() } },
        });
        if (error) return { error: error.message };
        return {};
      }
      if (!resp.ok) return { error: data.error || 'Sign up failed.' };
      // If server returned a session, set it directly
      if (data.session?.access_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } else {
        // Created but no session returned — sign in now
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(), password,
        });
        if (signInErr) return { error: signInErr.message };
      }
      return {};
    } catch {
      // Network error — fall back to standard signup
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(), password,
        options: { data: { name: name.trim(), company: company.trim() } },
      });
      if (error) return { error: error.message };
      return {};
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      const users = getStoredUsers();
      const userId = Object.keys(users).find(id => users[id].user.email.toLowerCase() === email.toLowerCase().trim());
      if (!userId) return { error: 'No account found with this email.' };
      if (users[userId].passwordHash !== hashPassword(password)) return { error: 'Incorrect password.' };
      localStorage.setItem(SESSION_KEY, userId);
      setState({ user: users[userId].user, isLoading: false });
      return {};
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(() => {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(SESSION_KEY);
      setState({ user: null, isLoading: false });
      return;
    }
    supabase.auth.signOut();
  }, []);

  const addEmailConnection = useCallback((connection: EmailConnection) => {
    setState(prev => {
      if (!prev.user) return prev;
      const updated: User = {
        ...prev.user,
        emailConnections: [
          ...prev.user.emailConnections.filter(c => c.provider !== connection.provider),
          connection,
        ],
      };
      if (isSupabaseConfigured) {
        supabase.from('email_connections').upsert({
          user_id: prev.user.id, provider: connection.provider,
          email: connection.email, connected_at: connection.connectedAt, status: connection.status,
        }, { onConflict: 'user_id,provider' }).then(({ error }) => {
          if (error) console.error('Failed to save email connection:', error);
        });
      } else {
        const users = getStoredUsers();
        if (users[prev.user.id]) { users[prev.user.id].user = updated; localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
      }
      return { ...prev, user: updated };
    });
  }, []);

  const removeEmailConnection = useCallback((provider: 'gmail' | 'outlook') => {
    setState(prev => {
      if (!prev.user) return prev;
      const updated: User = {
        ...prev.user,
        emailConnections: prev.user.emailConnections.filter(c => c.provider !== provider),
      };
      if (isSupabaseConfigured) {
        supabase.from('email_connections').delete().eq('user_id', prev.user.id).eq('provider', provider)
          .then(({ error }) => { if (error) console.error('Failed to remove email connection:', error); });
      } else {
        const users = getStoredUsers();
        if (users[prev.user.id]) { users[prev.user.id].user = updated; localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
      }
      return { ...prev, user: updated };
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, addEmailConnection, removeEmailConnection }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

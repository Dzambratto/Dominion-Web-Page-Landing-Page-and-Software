import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

const USERS_KEY = 'dominion_users';
const SESSION_KEY = 'dominion_session';

function getStoredUsers(): Record<string, { passwordHash: string; user: User }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function hashPassword(password: string): string {
  // Simple deterministic hash for demo purposes (not cryptographically secure)
  let hash = 0;
  const str = password + 'dominion_salt_2026';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  // Restore session on mount
  useEffect(() => {
    try {
      const sessionUserId = localStorage.getItem(SESSION_KEY);
      if (sessionUserId) {
        const users = getStoredUsers();
        const record = users[sessionUserId];
        if (record) {
          setState({ user: record.user, isLoading: false });
          return;
        }
      }
    } catch {
      // ignore
    }
    setState({ user: null, isLoading: false });
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, company: string): Promise<{ error?: string }> => {
    const users = getStoredUsers();
    const existingId = Object.keys(users).find(id => users[id].user.email.toLowerCase() === email.toLowerCase());
    if (existingId) {
      return { error: 'An account with this email already exists.' };
    }
    if (password.length < 8) {
      return { error: 'Password must be at least 8 characters.' };
    }
    const user: User = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      email: email.toLowerCase().trim(),
      name: name.trim(),
      company: company.trim(),
      createdAt: new Date().toISOString(),
      emailConnections: [],
    };
    users[user.id] = { passwordHash: hashPassword(password), user };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, user.id);
    setState({ user, isLoading: false });
    return {};
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    const users = getStoredUsers();
    const userId = Object.keys(users).find(id => users[id].user.email.toLowerCase() === email.toLowerCase().trim());
    if (!userId) {
      return { error: 'No account found with this email.' };
    }
    if (users[userId].passwordHash !== hashPassword(password)) {
      return { error: 'Incorrect password.' };
    }
    localStorage.setItem(SESSION_KEY, userId);
    setState({ user: users[userId].user, isLoading: false });
    return {};
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setState({ user: null, isLoading: false });
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
      // Persist
      const users = getStoredUsers();
      if (users[updated.id]) {
        users[updated.id].user = updated;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
      const users = getStoredUsers();
      if (users[updated.id]) {
        users[updated.id].user = updated;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
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

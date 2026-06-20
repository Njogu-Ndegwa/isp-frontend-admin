'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { LoginRequest, AuthUser, SubscriptionAlert } from '../lib/types';

const DEMO_USER: AuthUser = {
  id: 0,
  email: 'demo@bitwave.co.ke',
  role: 'reseller',
  organization_name: 'Demo ISP Network',
  subscription_status: 'trial',
};

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemo: boolean;
  user: AuthUser | null;
  subscriptionAlert: SubscriptionAlert | null;
  login: (credentials: LoginRequest) => Promise<SubscriptionAlert | undefined>;
  loginAsDemo: () => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  setSubscriptionAlert: (alert: SubscriptionAlert | null) => void;
  token: string | null;
}

interface AuthProviderProps {
  children: ReactNode;
  initialToken?: string | null;
  initialUser?: AuthUser | null;
  initialIsDemo?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function setAuthCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`;
}

function clearAuthCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function persistAuthCookies(token: string, user: AuthUser, demoMode: boolean) {
  setAuthCookie('auth_token', token);
  setAuthCookie('auth_user', JSON.stringify(user));
  setAuthCookie('demo_mode', demoMode ? 'true' : 'false');
}

function clearAuthCookies() {
  clearAuthCookie('auth_token');
  clearAuthCookie('auth_user');
  clearAuthCookie('demo_mode');
}

export function AuthProvider({
  children,
  initialToken = null,
  initialUser = null,
  initialIsDemo = false,
}: AuthProviderProps) {
  const hasInitialAuth = Boolean(initialToken || initialUser || initialIsDemo);
  const [token, setToken] = useState<string | null>(initialToken);
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isDemo, setIsDemo] = useState(initialIsDemo);
  const [isLoading, setIsLoading] = useState(!hasInitialAuth);
  const [subscriptionAlert, setSubscriptionAlert] = useState<SubscriptionAlert | null>(null);

  useEffect(() => {
    if (hasInitialAuth) {
      setIsLoading(false);
      return;
    }
    const demoMode = localStorage.getItem('demo_mode') === 'true';
    if (demoMode) {
      setToken('demo-token');
      setUser(DEMO_USER);
      setIsDemo(true);
      setIsLoading(false);
      return;
    }
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, [hasInitialAuth]);

  const login = async (credentials: LoginRequest): Promise<SubscriptionAlert | undefined> => {
    const { api } = await import('../lib/api');
    const response = await api.login(credentials);
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('onboarding_dismissed');
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_checklist_dismissed');
    localStorage.setItem('auth_token', response.access_token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    persistAuthCookies(response.access_token, response.user, false);
    setIsDemo(false);
    setToken(response.access_token);
    setUser(response.user);

    if (response.subscription_alert) {
      setSubscriptionAlert(response.subscription_alert);
    }

    return response.subscription_alert;
  };

  const loginAsDemo = () => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('auth_token', 'demo-token');
    localStorage.setItem('auth_user', JSON.stringify(DEMO_USER));
    persistAuthCookies('demo-token', DEMO_USER, true);
    setToken('demo-token');
    setUser(DEMO_USER);
    setIsDemo(true);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('onboarding_dismissed');
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_checklist_dismissed');
    clearAuthCookies();
    setToken(null);
    setUser(null);
    setIsDemo(false);
    setSubscriptionAlert(null);
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      if (token) persistAuthCookies(token, updated, isDemo);
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        isLoading,
        isDemo,
        user,
        subscriptionAlert,
        login,
        loginAsDemo,
        logout,
        updateUser,
        setSubscriptionAlert,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { LoginRequest, AuthUser, SubscriptionAlert } from '../lib/types';
import { setDisplayCurrency } from '../lib/format';
import { resolveLanguage, translate, type TFunction } from '../lib/i18n';
import { subscriptionAlertMessage } from '../lib/subscriptionAlert';
import { getImpersonation, clearImpersonation } from '../lib/impersonation';

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
  /** Swap in a token the backend reissued (password change) without logging out. */
  setSessionToken: (token: string) => void;
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

  // Money everywhere in the reseller's screens renders in their market's
  // currency. Set during render so the first paint already uses it.
  setDisplayCurrency(user?.market?.currency);

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
    clearImpersonation();
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

    // The backend's alert text is English with the amount pre-formatted; say
    // it in the reseller's language and the invoice's currency instead.
    let alert = response.subscription_alert;
    if (alert) {
      const lang = resolveLanguage(response.user);
      const t: TFunction = (text, vars) => translate(lang, text, vars);
      const message = subscriptionAlertMessage(
        alert.status, alert.current_invoice, response.user.subscription_expires_at, t,
      );
      alert = { ...alert, message: message ?? alert.message };
      setSubscriptionAlert(alert);
    }

    return alert;
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
    // Logging out while viewing as a reseller ends the View-as session too and
    // drops the parked admin token, so nothing of either session is left.
    const viewAs = getImpersonation();
    if (viewAs) {
      const viewAsToken = localStorage.getItem('auth_token');
      clearImpersonation();
      if (viewAsToken) {
        import('../lib/api')
          .then(({ api }) => api.endImpersonation(viewAsToken))
          .catch(() => { /* best effort: the session expires on its own */ });
      }
    }
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

  // Once per load: refresh staff permissions (the owner may have changed
  // them), and for owners refresh the market from the profile (sessions stored
  // before markets existed, or before a market change, lack it).
  useEffect(() => {
    if (!token || isDemo) return;
    let cancelled = false;
    (async () => {
      let api: typeof import('../lib/api').api;
      try {
        ({ api } = await import('../lib/api'));
      } catch {
        return;
      }
      let stored: AuthUser | null = null;
      try {
        const raw = localStorage.getItem('auth_user');
        stored = raw ? (JSON.parse(raw) as AuthUser) : null;
      } catch {
        stored = null;
      }
      if (stored?.role === 'admin') return;
      let isStaff = !!stored?.staff;
      try {
        const me = await api.getStaffMe();
        if (cancelled) return;
        isStaff = !!me?.is_staff;
        const staff = me?.is_staff && me.staff
          ? { ...me.staff, permissions: Array.isArray(me.permissions) ? me.permissions : me.staff.permissions ?? [] }
          : null;
        const flags = (me as { feature_flags?: { ap_control?: boolean } } | null)?.feature_flags ?? null;
        setUser((prev) => {
          if (!prev) return prev;
          if (JSON.stringify(prev.staff ?? null) === JSON.stringify(staff)
              && JSON.stringify(prev.feature_flags ?? null) === JSON.stringify(flags)) return prev;
          const updated = { ...prev, staff, feature_flags: flags };
          localStorage.setItem('auth_user', JSON.stringify(updated));
          persistAuthCookies(token, updated, false);
          return updated;
        });
      } catch {
        // Older backend (404) or offline: keep the permissions from login.
      }
      // Staff sessions describe the owner's business from the login payload;
      // the profile endpoint is the owner's own account.
      if (isStaff || cancelled) return;
      try {
        const profile = await api.getProfile();
        if (cancelled || !profile) return;
        const flags = (profile as { feature_flags?: { ap_control?: boolean } }).feature_flags ?? null;
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            ...(profile.market ? { market: profile.market, preferred_language: profile.preferred_language ?? null } : {}),
            feature_flags: flags,
          };
          if (JSON.stringify(updated) === JSON.stringify(prev)) return prev;
          localStorage.setItem('auth_user', JSON.stringify(updated));
          persistAuthCookies(token, updated, false);
          return updated;
        });
      } catch {
        // Keep the stored user; the market refreshes on the next load.
      }
    })();
    return () => { cancelled = true; };
  }, [token, isDemo]);

  const setSessionToken = (next: string) => {
    localStorage.setItem('auth_token', next);
    if (user) persistAuthCookies(next, user, isDemo);
    else setAuthCookie('auth_token', next);
    setToken(next);
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
        setSessionToken,
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

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import { LoginRequest, AuthUser, SubscriptionAlert } from '../lib/types';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionAlert, setSubscriptionAlert] = useState<SubscriptionAlert | null>(null);

  useEffect(() => {
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
  }, []);

  const login = async (credentials: LoginRequest): Promise<SubscriptionAlert | undefined> => {
    const response = await api.login(credentials);
    localStorage.removeItem('demo_mode');
    localStorage.setItem('auth_token', response.access_token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
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
    setToken('demo-token');
    setUser(DEMO_USER);
    setIsDemo(true);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('demo_mode');
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

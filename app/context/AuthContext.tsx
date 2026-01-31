'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import { LoginRequest } from '../lib/types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await api.login(credentials);
    localStorage.setItem('auth_token', response.access_token);
    setToken(response.access_token);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
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








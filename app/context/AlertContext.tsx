'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  duration?: number;
}

interface AlertContextType {
  alerts: Alert[];
  showAlert: (type: AlertType, message: string, duration?: number) => void;
  dismissAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const showAlert = useCallback(
    (type: AlertType, message: string, duration = 5000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setAlerts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => dismissAlert(id), duration);
      }
    },
    [dismissAlert]
  );

  return (
    <AlertContext.Provider value={{ alerts, showAlert, dismissAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

'use client';

import React, { useEffect, useState } from 'react';
import { useAlert, Alert, AlertType } from '../context/AlertContext';

const icons: Record<AlertType, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const styles: Record<AlertType, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

function AlertItem({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!alert.duration || alert.duration <= 0) return;
    const timeout = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, alert.duration - 300);
    return () => clearTimeout(timeout);
  }, [alert.duration, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg
        transition-all duration-300 ease-out
        ${styles[alert.type]}
        ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}
      `}
      role="alert"
    >
      <span className="flex-shrink-0 mt-0.5">{icons[alert.type]}</span>
      <p className="text-sm font-medium leading-relaxed flex-1">{alert.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function AlertContainer() {
  const { alerts, dismissAlert } = useAlert();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-md px-4 flex flex-col gap-2 pointer-events-none">
      {alerts.map((alert) => (
        <div key={alert.id} className="pointer-events-auto">
          <AlertItem alert={alert} onDismiss={() => dismissAlert(alert.id)} />
        </div>
      ))}
    </div>
  );
}

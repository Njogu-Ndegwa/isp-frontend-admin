'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { InboxMessage } from '../lib/types';

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface Props {
  collapsed?: boolean;
}

export default function InboxBell({ collapsed = false }: Props) {
  const { user, isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isReseller = isAuthenticated && user?.role === 'reseller';

  const fetchInbox = useCallback(async () => {
    if (!isReseller) return;
    try {
      const data = await api.getInbox();
      setUnread(data.unread);
      setMessages(data.messages);
    } catch {
      // fail silently — bell is non-critical chrome
    }
  }, [isReseller]);

  // Initial fetch + 60-second poll
  useEffect(() => {
    if (!isReseller) return;
    fetchInbox();
    const interval = setInterval(fetchInbox, 60_000);
    return () => clearInterval(interval);
  }, [isReseller, fetchInbox]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!isReseller) return null;

  const handleMarkRead = async (msg: InboxMessage) => {
    if (msg.is_read) return;
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
    );
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      await api.markInboxRead(msg.id);
    } catch {
      // Roll back optimistic update on failure
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: false } : m))
      );
      setUnread((prev) => prev + 1);
    }
  };

  const bellButton = (
    <button
      onClick={() => setOpen((v) => !v)}
      aria-label={`Inbox${unread > 0 ? ` — ${unread} unread` : ''}`}
      title={collapsed ? `Inbox${unread > 0 ? ` (${unread})` : ''}` : ''}
      className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-all ${collapsed ? 'justify-center' : ''}`}
    >
      {/* Bell icon — same style as sidebar icons */}
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>

      {/* Unread badge */}
      {unread > 0 && (
        <span className="absolute top-1.5 left-6 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold leading-none px-1 pointer-events-none">
          {unread > 99 ? '99+' : unread}
        </span>
      )}

      {!collapsed && (
        <span className="font-medium text-sm truncate">Inbox</span>
      )}
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {bellButton}

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-background-secondary border border-border shadow-xl z-[200] flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-semibold text-foreground">Inbox</h3>
            {unread > 0 && (
              <span className="text-xs text-foreground-muted">{unread} unread</span>
            )}
          </div>

          {messages.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-foreground-muted">
              No messages
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-background-tertiary ${
                    !msg.is_read ? 'bg-accent-primary/5' : ''
                  }`}
                  onClick={() => handleMarkRead(msg)}
                >
                  <div className="flex items-start gap-2">
                    {!msg.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-accent-primary flex-shrink-0" />
                    )}
                    <div className={`min-w-0 flex-1 ${msg.is_read ? 'pl-4' : ''}`}>
                      {msg.subject && (
                        <p className={`text-sm truncate ${!msg.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground-muted'}`}>
                          {msg.subject}
                        </p>
                      )}
                      <p className={`text-sm mt-0.5 line-clamp-2 ${!msg.is_read ? 'text-foreground' : 'text-foreground-muted'}`}>
                        {msg.body}
                      </p>
                      {msg.created_at && (
                        <p className="text-xs text-foreground-muted mt-1">
                          {formatRelativeDate(msg.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

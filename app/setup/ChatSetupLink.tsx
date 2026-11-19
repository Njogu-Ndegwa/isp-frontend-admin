'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { assistantApi } from '../lib/assistant';
import { useT } from '../lib/i18n';

/** "Set up by chat instead" — only when the assistant is switched on for this server. */
export default function ChatSetupLink() {
  const t = useT();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    assistantApi.status().then((s) => setEnabled(s.enabled && !s.read_only)).catch(() => setEnabled(false));
  }, []);
  if (!enabled) return null;
  return (
    <Link
      href="/assistant?start=setup"
      className="text-xs font-semibold text-amber-500 hover:text-amber-400 px-2 py-1.5 rounded-lg border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
    >
      {t('Set up by chat instead')}
    </Link>
  );
}

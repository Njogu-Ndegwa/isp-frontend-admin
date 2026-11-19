'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { parseMarkdown, type Inline } from '../lib/assistantView';
import { copyText } from '../lib/clipboard';
import { useT } from '../lib/i18n';

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'bold':
            return <strong key={i} className="font-semibold text-foreground">{n.v}</strong>;
          case 'italic':
            return <em key={i}>{n.v}</em>;
          case 'code':
            return <code key={i} className="px-1 py-0.5 rounded bg-background-tertiary text-[0.85em] font-mono break-all">{n.v}</code>;
          case 'link':
            return n.href.startsWith('/') ? (
              <Link key={i} href={n.href} className="text-accent-primary underline underline-offset-2">{n.v}</Link>
            ) : (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className="text-accent-primary underline underline-offset-2">{n.v}</a>
            );
          default:
            return <Fragment key={i}>{n.v}</Fragment>;
        }
      })}
    </>
  );
}

export function CodeBox({ code, label }: { code: string; label?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background-tertiary overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border">
        <span className="text-[11px] font-medium text-foreground-muted truncate">{label || t('Command')}</span>
        <button
          type="button"
          className="text-xs font-semibold text-accent-primary px-2 py-1 rounded-md hover:bg-background-secondary min-h-[32px]"
          onClick={async () => {
            const ok = await copyText(code);
            if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
          }}
        >
          {copied ? t('Copied') : t('Copy')}
        </button>
      </div>
      <pre className="px-3 py-2 text-xs font-mono text-foreground whitespace-pre-wrap break-all max-h-72 overflow-auto">{code}</pre>
    </div>
  );
}

export default function Markdown({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground break-words">
      {blocks.map((b, i) => {
        if (b.t === 'code') return <CodeBox key={i} code={b.v} />;
        if (b.t === 'heading') return <p key={i} className="font-semibold"><InlineNodes nodes={b.inline} /></p>;
        if (b.t === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul';
          return (
            <Tag key={i} className={`${b.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
              {b.items.map((item, j) => <li key={j}><InlineNodes nodes={item} /></li>)}
            </Tag>
          );
        }
        return <p key={i} className="whitespace-pre-wrap"><InlineNodes nodes={b.inline} /></p>;
      })}
    </div>
  );
}

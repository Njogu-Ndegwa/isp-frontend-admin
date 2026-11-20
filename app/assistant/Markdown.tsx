'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { parseMarkdown, type Inline } from '../lib/assistantView';
import { copyText } from '../lib/clipboard';
import { useT } from '../lib/i18n';
import { CheckIcon, CopyIcon } from './icons';

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'bold':
            return <strong key={i}>{n.v}</strong>;
          case 'italic':
            return <em key={i}>{n.v}</em>;
          case 'code':
            return <code key={i}>{n.v}</code>;
          case 'link':
            return n.href.startsWith('/') ? (
              <Link key={i} href={n.href}>{n.v}</Link>
            ) : (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer">{n.v}</a>
            );
          default:
            return <Fragment key={i}>{n.v}</Fragment>;
        }
      })}
    </>
  );
}

/** A command or script to paste into a router terminal, with a Copy button. */
export function CodeBox({ code, label }: { code: string; label?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface-2">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1">
        <span className="truncate text-[12px] font-medium text-ink-3">{label || t('Command')}</span>
        <button type="button" className="ai-btn ai-btn-quiet -mr-1.5 text-accent"
          onClick={async () => {
            const ok = await copyText(code);
            if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
          }}>
          {copied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
          <span className="text-[12.5px] font-semibold">{copied ? t('Copied') : t('Copy')}</span>
        </button>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-[12.5px] text-ink-1">{code}</pre>
    </div>
  );
}

/** The assistant's words. Only safe tokens are rendered: never HTML from the model. */
export default function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = parseMarkdown(text);
  return (
    <div className={`ai-prose ${streaming ? 'ai-caret' : ''}`}>
      {blocks.map((b, i) => {
        if (b.t === 'code') return <CodeBox key={i} code={b.v} />;
        if (b.t === 'heading') return <p key={i} className="font-bold"><InlineNodes nodes={b.inline} /></p>;
        if (b.t === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul';
          return <Tag key={i}>{b.items.map((item, j) => <li key={j}><InlineNodes nodes={item} /></li>)}</Tag>;
        }
        return <p key={i} className="whitespace-pre-wrap"><InlineNodes nodes={b.inline} /></p>;
      })}
    </div>
  );
}

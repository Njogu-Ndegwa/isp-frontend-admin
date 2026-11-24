import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The assistant is every reseller's start page, and the classic dashboard stays one menu item
// away (Dennis, 2026-11-24). Answers still never send a reseller off to a dashboard page.

vi.mock('../../lib/i18n', () => ({
  useT: () => (text: string, vars?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m)),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ logout: () => {}, user: null }) }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/assistant', useRouter: () => ({ replace: () => {}, push: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const { Header } = await import('../AssistantClient');
const { default: Markdown, PageLinks } = await import('../Markdown');
const assistantLib = await import('../../lib/assistant');

const noop = () => {};
const header = (standalone: boolean) => renderToStaticMarkup(
  <Header status={{ enabled: true, read_only: false, action_ttl_minutes: 15, retention_days: 90, home: true, home_choice: null }}
    live canReset={false} busy={false} classicHref="/dashboard" standalone={standalone}
    onHome={noop} onHistory={noop} onStatus={noop} onRate={noop} />,
);

describe('the way back to the classic dashboard', () => {
  it('is in the assistant header for a reseller who starts on the assistant', () => {
    const html = header(false);
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('Classic dashboard');
  });

  it('is left out only on the assistant\'s own address, where there is no dashboard', () => {
    expect(header(true)).not.toContain('Classic dashboard');
  });

  it('is never closed: nothing on the device remembers a closed dashboard any more', () => {
    expect(Object.keys(assistantLib)).not.toContain('rememberedClassicClosed');
    expect(Object.keys(assistantLib)).not.toContain('refreshClassicClosed');
  });
});

describe('links in answers', () => {
  const text = 'Open [Jane](/customers/12) or [the assistant](/assistant?start=setup).';

  it('are plain words for a reseller, except the assistant itself', () => {
    const html = renderToStaticMarkup(<PageLinks.Provider value={false}><Markdown text={text} /></PageLinks.Provider>);
    expect(html).not.toContain('href="/customers/12"');
    expect(html).toContain('Jane');
    expect(html).toContain('href="/assistant?start=setup"');
  });

  it('stay links for a platform admin', () => {
    expect(renderToStaticMarkup(<Markdown text={text} />)).toContain('href="/customers/12"');
  });
});

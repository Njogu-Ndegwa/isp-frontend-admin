import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FormField } from '../../lib/assistant';

// Same lookup as app/lib/i18n.ts translate(), without pulling in AuthContext.
vi.mock('../../lib/i18n', () => ({
  useT: () => (text: string, vars?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m)),
}));

const { default: ActionCard } = await import('../ActionCard');

const THUMB = 'data:image/jpeg;base64,AAAA';
const REF = 'chat-image:abcdefgh1234';

const logo = (over: Partial<FormField> = {}): FormField => ({
  name: 'company_logo_url', label: 'Company logo url', kind: 'text', required: false,
  upload: { accept: 'image/*', ticket: '/api/ads/media/upload-url' }, ...over,
});

const render = (field: FormField) => renderToStaticMarkup(
  <ActionCard busy={false} onDecide={() => {}} action={{
    action_id: 'a1', title: 'Update Portal Settings', summary: 'New logo', method: 'PUT',
    path: '/api/portal/settings', status: 'pending', form: [field],
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  }} />,
);

describe('a photo field on an assistant card', () => {
  it('offers the picture sent in the chat, with its thumbnail', () => {
    const html = render(logo({ chat_images: [{ ref: REF, thumbnail: THUMB }] }));
    expect(html).toContain('Use the picture you sent');
    expect(html).toContain(`src="${THUMB}"`);
    expect(html).toContain('Or upload your own photo');
    expect(html).toMatch(/role="radio" aria-checked="false"/);
  });

  it('has it picked already when the assistant was told to use it', () => {
    const html = render(logo({ value: REF, chat_images: [{ ref: REF, thumbnail: THUMB }] }));
    expect(html).toMatch(/role="radio" aria-checked="true"/);
    expect(html).not.toContain(`src="${REF}"`);   // the reference is never drawn as an address
  });

  it('shows only the phone upload when no picture was sent', () => {
    const html = render(logo());
    expect(html).not.toContain('Use the picture you sent');
    expect(html).toContain('Choose a photo');
  });
});

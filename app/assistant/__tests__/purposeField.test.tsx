import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FormField } from '../../lib/assistant';
import { initialValues, purposeReady, valuesToSend } from '../../lib/assistantForm';

// Same lookup as app/lib/i18n.ts translate(), without pulling in AuthContext.
vi.mock('../../lib/i18n', () => ({
  useT: () => (text: string, vars?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m)),
}));

const { default: ActionCard } = await import('../ActionCard');

// The Edit Customer card from CR-1123-B9: the phone opened blank (and, unmarked, sat under More options)
const editCustomer = (purpose: boolean): FormField[] => [
  { kind: 'text', name: 'phone', label: 'Phone', value: '', format: 'phone', required: false, ...(purpose ? { purpose: true, original: '' } : {}) },
  { kind: 'text', name: 'name', label: 'Name', value: 'irene home net', required: false },
  { kind: 'text', name: 'static_ip', label: 'Static ip', value: '192.168.2.43', format: 'ip', required: false },
  { kind: 'text', name: 'email', label: 'Email', required: false },
  { kind: 'text', name: 'alt_phone', label: 'Alt phone', required: false },
  { kind: 'text', name: 'address_line', label: 'Address line', required: false },
  { kind: 'text', name: 'building', label: 'Building', required: false },
];

describe('what a form card sends on Confirm', () => {
  it('keeps a value typed into a field that opened blank, phone format and all', () => {
    const form = editCustomer(false);
    const opened = initialValues(form);
    const typed = { ...opened, phone: '0712 345 678', email: 'irene@example.com' };
    const body = valuesToSend(form, typed, opened);
    expect(body.phone).toBe('0712 345 678');
    expect(body.email).toBe('irene@example.com');  // a field with no value at all, typed into
    expect(body.name).toBe('irene home net');
    expect(body).not.toHaveProperty('building');   // untouched and never filled: not sent
  });
});

describe('a card opened for one field', () => {
  it('waits for the purpose field to be filled in', () => {
    const form = editCustomer(true);
    const values = initialValues(form);
    expect(purposeReady(form, values)).toBe(false);
    expect(purposeReady(form, { ...values, phone: '   ' })).toBe(false);
    expect(purposeReady(form, { ...values, phone: '0712 345 678' })).toBe(true);
  });

  it('waits for a rename to differ from the old name', () => {
    const form: FormField[] = [{ kind: 'text', name: 'name', label: 'Name', value: 'Guest 0352', original: 'Guest 0352', purpose: true, required: false }];
    const values = initialValues(form);
    expect(purposeReady(form, values)).toBe(false);
    expect(purposeReady(form, { name: ' Guest 0352 ' })).toBe(false);
    expect(purposeReady(form, { name: 'Mama Njeri' })).toBe(true);
  });

  it('is ready at once when the assistant already filled in a new value', () => {
    const form: FormField[] = [{ kind: 'text', name: 'speed', label: 'Speed', value: '5M/2M', original: '', purpose: true, required: false }];
    expect(purposeReady(form, initialValues(form))).toBe(true);
  });

  it('shows the purpose field first and highlighted, and Confirm disabled until it is filled', () => {
    const html = renderToStaticMarkup(
      <ActionCard busy={false} onDecide={() => {}} action={{
        action_id: 'a1', title: 'Edit Customer', summary: 'Add her phone number', method: 'PUT',
        path: '/api/customers/44274', status: 'pending', form: editCustomer(true),
      }} />,
    );
    const firstInput = /<input[^>]*id="ff-([a-z_]+)"/.exec(html)?.[1];
    expect(firstInput).toBe('phone');
    expect(html).toMatch(/data-purpose="true"[^>]*>[\s\S]*?id="ff-phone"/);
    expect(html).toContain('fill this in');
    expect(html).toContain('Fill in Phone to confirm.');
    const confirm = /<button[^>]*data-testid="assistant-confirm"[^>]*>/.exec(html)?.[0] ?? '';
    expect(confirm).toContain('disabled');
  });

  it('leaves Confirm enabled on a card with no purpose field', () => {
    const html = renderToStaticMarkup(
      <ActionCard busy={false} onDecide={() => {}} action={{
        action_id: 'a2', title: 'Edit Customer', summary: 'Edit', method: 'PUT',
        path: '/api/customers/44274', status: 'pending', form: editCustomer(false),
      }} />,
    );
    const confirm = /<button[^>]*data-testid="assistant-confirm"[^>]*>/.exec(html)?.[0] ?? '';
    expect(confirm).not.toContain('disabled');
    expect(html).not.toContain('id="ff-phone"');  // the blank phone sat under More options: the bug's setting
  });
});

'use client';

import { useT } from '../../lib/i18n';
import {
  MAX_TOTAL,
  MAX_WEEKS,
  MIN_PRICE_PER_WEEK,
  kes,
  saleSplit,
  type SaleTermsErrors,
  type SaleTermsForm,
} from '../adSale';

/** "Shop pays KES X · Bitwave fee 20% = Y · You get Z". */
export function SaleSplitSummary({ weeks, pricePerWeek }: { weeks: number; pricePerWeek: number }) {
  const t = useT();
  const s = saleSplit(weeks, pricePerWeek);
  return (
    <div>
    <dl className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-background-tertiary/60 p-3 text-center" data-testid="sale-split">
      <div>
        <dt className="text-[11px] text-foreground-muted">{t('Shop pays')}</dt>
        <dd className="text-base font-bold tabular-nums text-foreground">{kes(s.amount)}</dd>
      </div>
      <div>
        <dt className="text-[11px] text-foreground-muted">{t('Bitwave fee 20%')}</dt>
        <dd className="text-base font-semibold tabular-nums text-foreground-muted">{kes(s.fee)}</dd>
      </div>
      <div>
        <dt className="text-[11px] text-foreground-muted">{t('You get')}</dt>
        <dd className="text-base font-bold tabular-nums text-success">{kes(s.share)}</dd>
      </div>
    </dl>
    <p className="mt-1.5 text-xs text-foreground-muted" data-testid="transfer-fee-note">{t('M-Pesa’s transfer fee applies when this is paid out to you.')}</p>
    </div>
  );
}

/** The business's name and M-Pesa number, weeks and weekly price. */
export default function SaleTermsFields({
  value,
  errors,
  onChange,
  showName = true,
}: {
  value: SaleTermsForm;
  errors: SaleTermsErrors;
  onChange: (next: SaleTermsForm) => void;
  showName?: boolean;
}) {
  const t = useT();
  const set = (key: keyof SaleTermsForm, v: string) => onChange({ ...value, [key]: v });
  const field = (key: keyof SaleTermsForm) => ({
    id: `sale-${key}`,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `sale-${key}-error` : undefined,
    className: `input ${errors[key] ? '!border-danger' : ''}`,
  });
  const err = (key: keyof SaleTermsForm) =>
    errors[key] ? <p id={`sale-${key}-error`} className="mt-1 text-xs text-danger" role="alert">{t(errors[key] as string)}</p> : null;

  return (
    <div className="space-y-4">
      {showName && (
        <div data-field="sale-business_name">
          <label htmlFor="sale-business_name" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('Business that pays for the ad')} <span className="text-danger" aria-hidden="true">*</span>
          </label>
          <input {...field('business_name')} maxLength={150} value={value.business_name}
            onChange={(e) => set('business_name', e.target.value)} placeholder={t("e.g. Mama Njeri's Kitchen")} />
          {err('business_name')}
        </div>
      )}
      <div data-field="sale-business_phone">
        <label htmlFor="sale-business_phone" className="mb-1.5 block text-sm font-medium text-foreground">
          {t('Their M-Pesa number')} <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <input {...field('business_phone')} type="tel" inputMode="tel" maxLength={16} value={value.business_phone}
          onChange={(e) => set('business_phone', e.target.value)} placeholder={t('e.g. 0712 345 678')} />
        <p className="mt-1.5 text-xs text-foreground-muted">{t('This phone gets the M-Pesa prompt from Bitwave. They enter their PIN and the ad is paid.')}</p>
        {err('business_phone')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div data-field="sale-weeks">
          <label htmlFor="sale-weeks" className="mb-1.5 block text-sm font-medium text-foreground">{t('Weeks')}</label>
          <select {...field('weeks')} value={value.weeks} onChange={(e) => set('weeks', e.target.value)}>
            {Array.from({ length: MAX_WEEKS }, (_, i) => i + 1).map((w) => (
              <option key={w} value={String(w)}>{w === 1 ? t('1 week') : t('{n} weeks', { n: w })}</option>
            ))}
          </select>
          {err('weeks')}
        </div>
        <div data-field="sale-price_per_week">
          <label htmlFor="sale-price_per_week" className="mb-1.5 block text-sm font-medium text-foreground">{t('Price per week (KES)')}</label>
          <input {...field('price_per_week')} type="number" inputMode="numeric" min={MIN_PRICE_PER_WEEK} step={1}
            value={value.price_per_week} onChange={(e) => set('price_per_week', e.target.value)} />
          <p className="mt-1.5 text-xs text-foreground-muted">{t('Charge what you want, from KES {min}. One M-Pesa payment can be up to KES {max}.', { min: MIN_PRICE_PER_WEEK, max: MAX_TOTAL.toLocaleString('en-US') })}</p>
          {err('price_per_week')}
        </div>
      </div>
      <SaleSplitSummary weeks={Number(value.weeks) || 0} pricePerWeek={Number(value.price_per_week) || 0} />
      <p className="text-xs leading-relaxed text-foreground-muted">
        {t('The shop pays Bitwave by M-Pesa. The ad goes live as soon as they pay and the weeks start then. Your 80% is on the full amount and joins your normal payout. Bitwave pays the M-Pesa collection fee out of its 20%.')}
      </p>
    </div>
  );
}

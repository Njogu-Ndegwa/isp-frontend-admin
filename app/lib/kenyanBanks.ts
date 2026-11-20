/**
 * Kenyan banks and the M-Pesa paybill each one publishes for "pay to my bank
 * account". Resellers kept typing these by hand on the Bank Account payment
 * method; now they pick the bank and only type their own account number.
 *
 * Only well-known, stable paybills belong here. A bank missing from the list
 * (or one that changes its paybill) still works through "Other", where the
 * reseller types the paybill themselves. The stored data is unchanged: the
 * payment method still saves just `bank_paybill_number`.
 */

export interface KenyanBank {
  code: string;
  name: string;
  paybill: string;
}

export const KENYAN_BANKS: KenyanBank[] = [
  { code: 'absa', name: 'Absa Bank Kenya', paybill: '303030' },
  { code: 'coop', name: 'Co-operative Bank', paybill: '400200' },
  { code: 'dtb', name: 'Diamond Trust Bank (DTB)', paybill: '516600' },
  { code: 'equity', name: 'Equity Bank', paybill: '247247' },
  { code: 'family', name: 'Family Bank', paybill: '222111' },
  { code: 'gulf', name: 'Gulf African Bank', paybill: '985050' },
  { code: 'hfc', name: 'HFC (HF Group)', paybill: '100400' },
  { code: 'im', name: 'I&M Bank', paybill: '542542' },
  { code: 'kcb', name: 'KCB Bank', paybill: '522522' },
  { code: 'national', name: 'National Bank of Kenya', paybill: '547700' },
  { code: 'ncba', name: 'NCBA Bank', paybill: '880100' },
  { code: 'stanbic', name: 'Stanbic Bank', paybill: '600100' },
  { code: 'stanchart', name: 'Standard Chartered', paybill: '329329' },
];

/** Select value meaning "my bank isn't listed, I'll type the paybill". */
export const OTHER_BANK = 'other';

function normalisePaybill(value: string): string {
  return value.replace(/\s/g, '');
}

/** The listed bank whose paybill matches, or null. */
export function bankForPaybill(paybill: string | undefined | null): KenyanBank | null {
  if (!paybill) return null;
  const p = normalisePaybill(paybill);
  return KENYAN_BANKS.find((b) => b.paybill === p) ?? null;
}

/**
 * What the bank select should show for the current paybill field.
 * - paybill matches a listed bank -> that bank (also when editing a saved method)
 * - paybill typed but unmatched -> Other (a wrong mapping overridden by hand,
 *   or a bank we don't list)
 * - empty -> Other if the reseller chose it, else nothing selected yet
 */
export function bankSelectValue(paybill: string | undefined | null, otherChosen: boolean): string {
  const bank = bankForPaybill(paybill);
  if (bank) return bank.code;
  if (paybill && normalisePaybill(paybill)) return OTHER_BANK;
  return otherChosen ? OTHER_BANK : '';
}

/**
 * The paybill field value after the reseller picks `code` in the select.
 * Picking a bank fills its paybill; picking Other clears a paybill that came
 * from the list (so they type their own) but keeps one they already typed.
 */
export function paybillForSelection(code: string, currentPaybill: string): string {
  const bank = KENYAN_BANKS.find((b) => b.code === code);
  if (bank) return bank.paybill;
  return bankForPaybill(currentPaybill) ? '' : currentPaybill;
}

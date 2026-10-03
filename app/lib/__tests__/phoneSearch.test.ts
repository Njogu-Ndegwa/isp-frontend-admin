import { describe, it, expect } from 'vitest';
import { localPhoneDigits, phoneDigits, phoneMatches } from '../phoneSearch';

describe('phoneDigits', () => {
  it('keeps digits only', () => {
    expect(phoneDigits('+254 714-737687')).toBe('254714737687');
  });
  it('handles empty values', () => {
    expect(phoneDigits(null)).toBe('');
  });
});

describe('localPhoneDigits', () => {
  it('strips the Kenyan country code', () => {
    expect(localPhoneDigits('254714737687')).toBe('714737687');
  });
  it('strips a trunk zero', () => {
    expect(localPhoneDigits('0714737687')).toBe('714737687');
  });
  it('strips other market codes', () => {
    expect(localPhoneDigits('256772123456')).toBe('772123456');
    expect(localPhoneDigits('237671234567')).toBe('671234567');
  });
  it('leaves an already-local number alone', () => {
    expect(localPhoneDigits('714737687')).toBe('714737687');
  });
});

describe('phoneMatches', () => {
  const stored = '254714737687';

  it('matches the local 07 format against a 254 number', () => {
    expect(phoneMatches(stored, '0714737687')).toBe(true);
  });
  it('matches a query typed with spaces', () => {
    expect(phoneMatches(stored, '254 714 737687')).toBe(true);
    expect(phoneMatches(stored, '0714 737 687')).toBe(true);
  });
  it('matches the +254 format', () => {
    expect(phoneMatches(stored, '+254714737687')).toBe(true);
  });
  it('matches a 254 query against a number stored in 07 format', () => {
    expect(phoneMatches('0714737687', '254714737687')).toBe(true);
  });
  it('matches a partial number', () => {
    expect(phoneMatches(stored, '737687')).toBe(true);
    expect(phoneMatches(stored, '0714 73')).toBe(true);
  });
  it('does not match a different number', () => {
    expect(phoneMatches(stored, '0714737688')).toBe(false);
    expect(phoneMatches(stored, '0722779894')).toBe(false);
  });
  it('ignores very short numeric queries beyond a plain substring match', () => {
    expect(phoneMatches(stored, '07')).toBe(false);
    expect(phoneMatches(stored, '71')).toBe(true);
  });
  it('does not treat names as phone numbers', () => {
    expect(phoneMatches(stored, 'guest')).toBe(false);
  });
  it('is false for an empty phone or query', () => {
    expect(phoneMatches('', '0714737687')).toBe(false);
    expect(phoneMatches(stored, '   ')).toBe(false);
  });
});

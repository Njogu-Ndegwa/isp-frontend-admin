import { describe, expect, it } from 'vitest';
import {
  EMPTY_LOCATION,
  googleMapsUrl,
  locationChanges,
  locationError,
  locationForRegister,
  locationFromCustomer,
  parseLocationText,
  readLocationForm,
} from './customerLocation';
import { FR } from './locales/fr';

const HOME = { lat: -1.2195, lng: 36.8869 };

describe('parseLocationText', () => {
  it.each([
    ['-1.2195, 36.8869'],
    ['-1.2195,36.8869'],
    ['-1.2195 36.8869'],
    ['  -1.2195 ,  36.8869  '],
    ['https://www.google.com/maps/@-1.2195,36.8869,17z'],
    ['https://www.google.com/maps/@-1.2195,36.8869,17z?entry=ttu'],
    ['https://maps.google.com/?q=-1.2195,36.8869'],
    ['https://www.google.com/maps?q=-1.2195%2C36.8869'],
    ['https://www.google.com/maps/search/?api=1&query=-1.2195,36.8869'],
    ['https://www.google.com/maps/search/-1.2195,+36.8869?entry=ttu'],
    ['https://www.google.com/maps/place/-1.2195,36.8869'],
    ['https://maps.google.com/maps?ll=-1.2195,36.8869&z=16'],
    ['https://www.google.com/maps/dir/?api=1&destination=-1.2195,36.8869'],
  ])('reads %s', (text) => {
    expect(parseLocationText(text)).toEqual({ ok: true, value: HOME });
  });

  it('prefers the pin (!3d!4d) over the map centre (@) in a place link', () => {
    const link =
      'https://www.google.com/maps/place/Kahawa+Sukari/@-1.1900,36.9000,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-1.2195!4d36.8869';
    expect(parseLocationText(link)).toEqual({ ok: true, value: HOME });
  });

  it('rounds to 6 decimals', () => {
    expect(parseLocationText('-1.219512345678, 36.88691234567')).toEqual({
      ok: true,
      value: { lat: -1.219512, lng: 36.886912 },
    });
  });

  it('explains that short links cannot be read', () => {
    const out = parseLocationText('https://maps.app.goo.gl/AbCdEf123');
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/Short links/);
  });

  it.each([
    [''],
    ['Kahawa Sukari, Nairobi'],
    ['https://www.google.com/maps'],
    ['95.1, 36.8'],
    ['-1.2, 190'],
    ['0, 0'],
  ])('rejects %s', (text) => {
    expect(parseLocationText(text).ok).toBe(false);
  });
});

describe('readLocationForm / locationError', () => {
  it('empty, valid and half-filled', () => {
    expect(readLocationForm(EMPTY_LOCATION)).toEqual({ kind: 'empty' });
    expect(readLocationForm({ latitude: ' -1.2195 ', longitude: '36.8869' })).toEqual({ kind: 'valid', value: HOME });
    expect(readLocationForm({ latitude: '-1.2195', longitude: '' }).kind).toBe('invalid');
  });

  it.each([['abc'], ['1e3'], ['0x10'], ['-'], ['1.2.3']])('rejects a non-decimal latitude %s', (lat) => {
    expect(readLocationForm({ latitude: lat, longitude: '36.8' }).kind).toBe('invalid');
  });

  it('same ranges as the backend', () => {
    expect(locationError(90, 180)).toBeNull();
    expect(locationError(-90, -180)).toBeNull();
    expect(locationError(0, 36.8)).toBeNull();
    expect(locationError(90.1, 0)).not.toBeNull();
    expect(locationError(0, -180.1)).not.toBeNull();
    expect(locationError(0, 0)).not.toBeNull();
    expect(locationError(Number.NaN, 1)).not.toBeNull();
  });
});

describe('payloads', () => {
  it('register: nothing when empty, numbers when filled, throws when half-filled', () => {
    expect(locationForRegister(EMPTY_LOCATION)).toEqual({});
    expect(locationForRegister({ latitude: '-1.2195', longitude: '36.8869' })).toEqual({
      latitude: -1.2195,
      longitude: 36.8869,
    });
    expect(() => locationForRegister({ latitude: '', longitude: '36.8869' })).toThrow(/both/);
  });

  it('edit: unchanged, changed, cleared, set', () => {
    const stored = { latitude: '-1.2195', longitude: '36.8869' };
    expect(locationChanges(stored, stored)).toEqual({});
    expect(locationChanges({ latitude: '-1.21950', longitude: '36.8869' }, stored)).toEqual({});
    expect(locationChanges({ latitude: '-1.3', longitude: '36.9' }, stored)).toEqual({ latitude: -1.3, longitude: 36.9 });
    expect(locationChanges(EMPTY_LOCATION, stored)).toEqual({ clear_location: true });
    expect(locationChanges(EMPTY_LOCATION, EMPTY_LOCATION)).toEqual({});
    expect(locationChanges(stored, EMPTY_LOCATION)).toEqual({ latitude: -1.2195, longitude: 36.8869 });
    expect(() => locationChanges({ latitude: '200', longitude: '1' }, stored)).toThrow();
  });

  it('reads a customer', () => {
    expect(locationFromCustomer({ latitude: -1.2195, longitude: 36.8869 })).toEqual({
      latitude: '-1.2195',
      longitude: '36.8869',
    });
    expect(locationFromCustomer({ latitude: null, longitude: null })).toEqual(EMPTY_LOCATION);
    expect(locationFromCustomer(null)).toEqual(EMPTY_LOCATION);
  });

  it('Google Maps link drops a pin on the coordinates', () => {
    expect(googleMapsUrl(HOME)).toBe('https://www.google.com/maps/search/?api=1&query=-1.2195,36.8869');
    // What we produce we can also read back.
    expect(parseLocationText(googleMapsUrl(HOME))).toEqual({ ok: true, value: HOME });
  });
});

describe('French strings', () => {
  it('every message the helpers return is translated', () => {
    const messages = new Set<string>();
    for (const text of ['', 'nowhere', 'https://maps.app.goo.gl/x', '95, 1', '1, 190', '0, 0']) {
      const out = parseLocationText(text);
      if (!out.ok) messages.add(out.error);
    }
    for (const form of [
      { latitude: '1', longitude: '' },
      { latitude: 'x', longitude: '1' },
    ]) {
      const out = readLocationForm(form);
      if (out.kind === 'invalid') messages.add(out.error);
    }
    for (const msg of messages) expect(FR[msg], msg).toBeTruthy();
  });
});

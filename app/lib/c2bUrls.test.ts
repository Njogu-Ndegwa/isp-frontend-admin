import { describe, expect, it } from 'vitest';
import { API_ORIGIN } from './api';
import { c2bCallbackUrls } from './c2bUrls';

describe('c2bCallbackUrls', () => {
  it('defaults to the backend API origin', () => {
    expect(c2bCallbackUrls()).toEqual({
      confirmation_url: `${API_ORIGIN}/api/c2b/confirmation`,
      validation_url: `${API_ORIGIN}/api/c2b/validation`,
    });
  });

  it('never points at the dashboard (frontend) host', () => {
    const urls = c2bCallbackUrls();
    for (const url of Object.values(urls)) {
      const host = new URL(url).host;
      expect(host).not.toBe('bitwavetechnologies.com');
      expect(host).not.toBe('isp-admin.bitwavetechnologies.net');
    }
  });

  it('normalises a trailing slash or /api suffix on the origin', () => {
    for (const origin of [
      'https://isp.bitwavetechnologies.net',
      'https://isp.bitwavetechnologies.net/',
      'https://isp.bitwavetechnologies.net/api',
    ]) {
      expect(c2bCallbackUrls(origin)).toEqual({
        confirmation_url: 'https://isp.bitwavetechnologies.net/api/c2b/confirmation',
        validation_url: 'https://isp.bitwavetechnologies.net/api/c2b/validation',
      });
    }
  });
});

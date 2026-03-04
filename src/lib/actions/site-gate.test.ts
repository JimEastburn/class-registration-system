import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/headers cookies
const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: mockCookieSet,
    get: mockCookieGet,
  })),
}));

// Mock next/navigation redirect — should NOT be called anymore
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { verifySitePassword, isSiteGatePassed } from '@/lib/actions/site-gate';
import { redirect } from 'next/navigation';

describe('verifySitePassword', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, SITE_PASSWORD: 'secret123' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns error for incorrect password', async () => {
    const formData = new FormData();
    formData.append('password', 'wrongpassword');

    const result = await verifySitePassword(formData);

    expect(result).toEqual({ error: 'Incorrect password' });
    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('sets cookie and returns success for correct password (no redirect)', async () => {
    const formData = new FormData();
    formData.append('password', 'secret123');

    const result = await verifySitePassword(formData);

    expect(mockCookieSet).toHaveBeenCalledWith(
      'site_gate_passed',
      'true',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    );
    // Should NOT redirect — the modal stays on the same page
    expect(redirect).not.toHaveBeenCalled();
    // Should return success
    expect(result).toEqual({ success: true });
  });

  it('returns error when SITE_PASSWORD env var is not set', async () => {
    delete process.env.SITE_PASSWORD;

    const formData = new FormData();
    formData.append('password', 'anything');

    const result = await verifySitePassword(formData);

    expect(result).toEqual({ error: 'Incorrect password' });
  });

  it('returns error when password field is empty', async () => {
    const formData = new FormData();

    const result = await verifySitePassword(formData);

    expect(result).toEqual({ error: 'Incorrect password' });
  });
});

describe('isSiteGatePassed', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, SITE_PASSWORD: 'secret123' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns true when the gate cookie is set to "true"', async () => {
    mockCookieGet.mockReturnValue({ value: 'true' });

    const result = await isSiteGatePassed();

    expect(result).toBe(true);
  });

  it('returns false when the gate cookie is not set', async () => {
    mockCookieGet.mockReturnValue(undefined);

    const result = await isSiteGatePassed();

    expect(result).toBe(false);
  });

  it('returns false when the gate cookie has wrong value', async () => {
    mockCookieGet.mockReturnValue({ value: 'false' });

    const result = await isSiteGatePassed();

    expect(result).toBe(false);
  });

  it('returns true when SITE_PASSWORD is not configured (gate disabled)', async () => {
    delete process.env.SITE_PASSWORD;
    mockCookieGet.mockReturnValue(undefined);

    const result = await isSiteGatePassed();

    expect(result).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/headers cookies
const mockCookieSet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: mockCookieSet,
    get: vi.fn(),
  })),
}));

// Mock next/navigation redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { verifySitePassword } from '@/lib/actions/site-gate';
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

  it('sets cookie and redirects for correct password', async () => {
    const formData = new FormData();
    formData.append('password', 'secret123');

    await verifySitePassword(formData);

    expect(mockCookieSet).toHaveBeenCalledWith(
      'site_gate_passed',
      'true',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    );
    expect(redirect).toHaveBeenCalledWith('/login');
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

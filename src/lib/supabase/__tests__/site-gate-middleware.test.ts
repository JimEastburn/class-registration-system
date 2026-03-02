import { describe, it, expect } from 'vitest';
import {
  isSiteGateBypassed,
  SITE_GATE_COOKIE_NAME,
} from '@/lib/supabase/site-gate';

describe('Site Gate Middleware Helpers', () => {
  describe('isSiteGateBypassed', () => {
    it('bypasses the home page /', () => {
      expect(isSiteGateBypassed('/')).toBe(true);
    });

    it('bypasses /register', () => {
      expect(isSiteGateBypassed('/register')).toBe(true);
    });

    it('bypasses /gate', () => {
      expect(isSiteGateBypassed('/gate')).toBe(true);
    });

    it('bypasses /auth/callback', () => {
      expect(isSiteGateBypassed('/auth/callback')).toBe(true);
    });

    it('bypasses /auth/confirm', () => {
      expect(isSiteGateBypassed('/auth/confirm')).toBe(true);
    });

    it('bypasses API routes', () => {
      expect(isSiteGateBypassed('/api/stripe/webhook')).toBe(true);
      expect(isSiteGateBypassed('/api/health')).toBe(true);
    });

    it('does NOT bypass /login', () => {
      expect(isSiteGateBypassed('/login')).toBe(false);
    });

    it('does NOT bypass /parent', () => {
      expect(isSiteGateBypassed('/parent')).toBe(false);
    });

    it('does NOT bypass /admin', () => {
      expect(isSiteGateBypassed('/admin')).toBe(false);
    });

    it('does NOT bypass /forgot-password', () => {
      expect(isSiteGateBypassed('/forgot-password')).toBe(false);
    });

    it('does NOT bypass /reset-password', () => {
      expect(isSiteGateBypassed('/reset-password')).toBe(false);
    });
  });

  it('exports the cookie name constant', () => {
    expect(SITE_GATE_COOKIE_NAME).toBe('site_gate_passed');
  });
});

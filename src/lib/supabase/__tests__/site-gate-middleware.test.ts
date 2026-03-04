import { describe, it, expect } from 'vitest';
import { SITE_GATE_COOKIE_NAME } from '@/lib/supabase/site-gate';

describe('Site Gate Helpers', () => {
  it('exports the cookie name constant', () => {
    expect(SITE_GATE_COOKIE_NAME).toBe('site_gate_passed');
  });
});

import { describe, expect, it } from 'vitest';
import { hasRouteAccess } from '@/lib/supabase/middleware';

describe('volunteer admin route access', () => {
  it('grants volunteer pages to an additive volunteer admin', () => {
    expect(hasRouteAccess('/volunteer', 'parent', true)).toBe(true);
    expect(hasRouteAccess('/admin/volunteers', 'parent', true)).toBe(true);
  });

  it('gates the alternate volunteer board exactly like the original', () => {
    expect(hasRouteAccess('/volunteer-version-2', 'parent', true)).toBe(true);
    expect(hasRouteAccess('/volunteer-version-2', 'teacher', false)).toBe(true);
    expect(hasRouteAccess('/volunteer-version-2', 'parent', false)).toBe(false);
    expect(hasRouteAccess('/volunteer-version-2', 'student', false)).toBe(
      false
    );
  });

  it('does not grant any other admin route', () => {
    expect(hasRouteAccess('/admin', 'parent', true)).toBe(false);
  });

  it('preserves existing admin and super admin access', () => {
    expect(hasRouteAccess('/admin/volunteers', 'admin', false)).toBe(true);
    expect(hasRouteAccess('/admin/volunteers', 'super_admin', false)).toBe(
      true
    );
  });
});

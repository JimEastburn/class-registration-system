import { describe, expect, it } from 'vitest';
import { hasRouteAccess } from '@/lib/supabase/middleware';

describe('volunteer admin route access', () => {
  it('grants volunteer pages to an additive volunteer admin', () => {
    expect(hasRouteAccess('/volunteer', 'parent', true)).toBe(true);
    expect(hasRouteAccess('/admin/volunteers', 'parent', true)).toBe(true);
  });

  it.each([
    '/volunteer-version-2',
    '/volunteer-version-3',
    '/volunteer-version-4',
    '/volunteer-version-5',
  ])('gates the alternate volunteer board %s like the original', (route) => {
    expect(hasRouteAccess(route, 'teacher', false)).toBe(true);
    expect(hasRouteAccess(route, 'admin', false)).toBe(true);
    expect(hasRouteAccess(route, 'super_admin', false)).toBe(true);
    expect(hasRouteAccess(route, 'parent', false)).toBe(false);
    expect(hasRouteAccess(route, 'student', false)).toBe(false);
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

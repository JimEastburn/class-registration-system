import { describe, expect, it } from 'vitest';
import { hasRouteAccess } from '@/lib/supabase/middleware';

describe('volunteer admin route access', () => {
  it('grants volunteer pages to an additive volunteer admin', () => {
    expect(hasRouteAccess('/volunteer', 'parent', true)).toBe(true);
    expect(hasRouteAccess('/admin/volunteers', 'parent', true)).toBe(true);
  });

  it.each(['parent', 'student', 'teacher', 'admin', 'super_admin'] as const)(
    'opens the volunteer board to %s',
    (role) => {
      expect(hasRouteAccess('/volunteer', role, false)).toBe(true);
    }
  );

  it('keeps class schedulers off the volunteer board', () => {
    expect(hasRouteAccess('/volunteer', 'class_scheduler', false)).toBe(false);
  });

  it('does not open the admin volunteer config to parents or students', () => {
    expect(hasRouteAccess('/admin/volunteers', 'parent', false)).toBe(false);
    expect(hasRouteAccess('/admin/volunteers', 'student', false)).toBe(false);
  });

  it.each([
    '/volunteer-version-2',
    '/volunteer-version-3',
    '/volunteer-version-4',
    '/volunteer-version-5',
  ])('keeps the alternate volunteer layout %s staff-only', (route) => {
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

describe('photo consent admin route access', () => {
  it('grants only the photo consent page to an additive administrator', () => {
    expect(hasRouteAccess('/admin/photo-consents', 'parent', false, true)).toBe(
      true
    );
    expect(hasRouteAccess('/admin', 'parent', false, true)).toBe(false);
    expect(hasRouteAccess('/admin/users', 'parent', false, true)).toBe(false);
  });

  it('denies the photo consent page without role or additive access', () => {
    expect(
      hasRouteAccess('/admin/photo-consents', 'parent', false, false)
    ).toBe(false);
  });

  it('preserves admin and super admin access', () => {
    expect(hasRouteAccess('/admin/photo-consents', 'admin', false, false)).toBe(
      true
    );
    expect(
      hasRouteAccess('/admin/photo-consents', 'super_admin', false, false)
    ).toBe(true);
  });
});

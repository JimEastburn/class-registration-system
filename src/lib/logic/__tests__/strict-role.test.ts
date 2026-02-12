import { describe, it, expect } from 'vitest';
import { getAllowedViews } from '../profile';

// Mock ALLOWED_VIEWS if necessary, but we are testing the function logic which imports it.
// Assuming ALLOWED_VIEWS is exported or used internally in profile.ts

describe('getAllowedViews Strict Role Separation', () => {
  it('should allow teacher to see parent view ONLY if isParent is true', () => {
    // Teacher, not parent
    const teacherOnly = getAllowedViews('teacher', false);
    expect(teacherOnly).toContain('teacher');
    expect(teacherOnly).not.toContain('parent');

    // Teacher AND parent
    const teacherParent = getAllowedViews('teacher', true);
    expect(teacherParent).toContain('teacher');
    expect(teacherParent).toContain('parent');
  });

  it('should allow admin to see parent view ONLY if isParent is true', () => {
      const adminOnly = getAllowedViews('admin', false);
      expect(adminOnly).toContain('admin');
      expect(adminOnly).not.toContain('parent');

      const adminParent = getAllowedViews('admin', true);
      expect(adminParent).toContain('admin');
      expect(adminParent).toContain('parent');
  });

  it('should always allow parent to see parent view', () => {
      // even if isParent is false (e.g. legacy data), checking role 'parent' should suffice
      const parent = getAllowedViews('parent', false); 
      expect(parent).toContain('parent');
      
      const parentTrue = getAllowedViews('parent', true);
      expect(parentTrue).toContain('parent');
  });

  it('super_admin should always see everything', () => {
      const superAdmin = getAllowedViews('super_admin', false);
      expect(superAdmin).toContain('parent');
      expect(superAdmin).toContain('teacher');
      expect(superAdmin).toContain('admin');
  });
});

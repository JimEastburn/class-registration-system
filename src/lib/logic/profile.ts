import type { UserRole } from '@/types';

/**
 * Valid portal views that users can switch to
 */
export type PortalView =
  | 'parent'
  | 'teacher'
  | 'student'
  | 'admin'
  | 'class_scheduler';

/**
 * Mapping of user roles to their allowed portal views
 * - parent: can only view parent portal
 * - teacher: can view teacher + parent portals (teachers can manage their own family)
 * - student: can only view student portal
 * - admin: can view admin + parent portals (admins can manage their own family)
 * - class_scheduler: can only view class_scheduler portal (cannot be teacher or student)
 * - super_admin: can view ALL portals (God Mode)
 */
export const ALLOWED_VIEWS: Record<UserRole, PortalView[]> = {
  parent: ['parent'],
  teacher: ['teacher', 'parent'],
  student: ['student'],
  admin: ['admin', 'parent'],
  class_scheduler: ['class_scheduler'],
  super_admin: ['admin', 'class_scheduler', 'teacher', 'parent', 'student'],
};

/**
 * Check if a user role is allowed to access a specific portal view
 */
export function isViewAllowed(role: UserRole, view: PortalView): boolean {
  return ALLOWED_VIEWS[role]?.includes(view) ?? false;
}

/**
 * Get the allowed portal views for a user role
 */
export function getAllowedViews(role: UserRole, isParent: boolean): PortalView[] {
  const views: PortalView[] = [];

  // Super Admin gets everything
  if (role === 'super_admin') {
    return ['admin', 'class_scheduler', 'teacher', 'parent', 'student'];
  }

  // Add primary role view
  if (ALLOWED_VIEWS[role]) {
    // For roles like 'teacher' or 'admin', we usually have their primary view first in the static list
    // But since the static list is now being superseded by this dynamic logic, we should be careful.
    // Let's rely on the base mapping for the PRIMARY view only.
    const baseViews = ALLOWED_VIEWS[role];
    if (baseViews && baseViews.length > 0) {
       // Always add the role's native view
       // e.g. teacher -> teacher, admin -> admin
       // The static definition currently has mixed views. Let's extract just the native one or filter.
       // actually, let's simpler logic:
       
       if (role === 'class_scheduler') views.push('class_scheduler');
       else if (role !== 'parent') views.push(role as PortalView); // admin, teacher, student
    }
  }

  // Parent view is allowed if role is 'parent' OR is_parent is true
  if (role === 'parent' || isParent) {
     if (!views.includes('parent')) {
         views.push('parent');
     }
  }

  return views;
}

/**
 * Get the default portal view for a user role
 */
export function getDefaultView(role: UserRole): PortalView {
  // Simplistic default logic
  if (role === 'parent') return 'parent';
  if (role === 'class_scheduler') return 'class_scheduler';
  if (role === 'super_admin') return 'admin';
  return role as PortalView;
}

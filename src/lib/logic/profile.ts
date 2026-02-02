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
export function getAllowedViews(role: UserRole): PortalView[] {
  return ALLOWED_VIEWS[role] ?? [];
}

/**
 * Get the default portal view for a user role
 */
export function getDefaultView(role: UserRole): PortalView {
  // Return the first (primary) allowed view for the role
  const views = ALLOWED_VIEWS[role];
  if (!views || views.length === 0) {
    return 'parent'; // Fallback
  }
  return views[0];
}

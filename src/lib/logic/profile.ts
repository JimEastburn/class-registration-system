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
 * - teacher: can view teacher portal (parent view allowed only if is_parent)
 * - student: can only view student portal
 * - admin: can view admin portal (parent view allowed only if is_parent)
 * - class_scheduler: can view class_scheduler portal (parent view allowed only if is_parent)
 * - super_admin: can view ALL portals (God Mode)
 */
export const ALLOWED_VIEWS: Record<UserRole, PortalView[]> = {
  parent: ['parent'],
  teacher: ['teacher'],
  student: ['student'],
  admin: ['admin'],
  class_scheduler: ['class_scheduler'],
  super_admin: ['admin', 'class_scheduler', 'teacher', 'parent'],
};

/**
 * Check if a user role is allowed to access a specific portal view
 */
export function isViewAllowed(
  role: UserRole,
  view: PortalView,
  isParent: boolean
): boolean {
  return getAllowedViews(role, isParent).includes(view);
}

/**
 * Get the allowed portal views for a user role
 */
export function getAllowedViews(role: UserRole, isParent: boolean): PortalView[] {
  if (role === 'super_admin') {
    return ['admin', 'class_scheduler', 'teacher', 'parent'];
  }

  const primaryView = ALLOWED_VIEWS[role]?.[0];
  const views: PortalView[] = primaryView ? [primaryView] : [];

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

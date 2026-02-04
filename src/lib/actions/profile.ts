'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult, UserRole } from '@/types';

/**
 * Cookie name for storing the active portal view preference
 */
import {
  getDefaultView,
  isViewAllowed,
  getAllowedViews,
  type PortalView,
} from '@/lib/logic/profile';

/**
 * Cookie name for storing the active portal view preference
 */
const ACTIVE_VIEW_COOKIE = 'active-portal-view';

// Constants and types moved to @/lib/logic/profile.ts

/**
 * Switch the user's active portal view
 * Sets a cookie to persist the view preference across requests
 *
 * @param view - The portal view to switch to
 * @returns ActionResult indicating success or failure
 */
export async function switchProfileView(
  view: PortalView
): Promise<ActionResult<{ view: PortalView }>> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's profile to check role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_parent')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Failed to fetch user profile' };
  }

  const userRole = profile.role as UserRole;
  const isParent = Boolean(profile.is_parent);

  // Validate the requested view is allowed for this role
  if (!isViewAllowed(userRole, view, isParent)) {
    return {
      success: false,
      error: `You do not have permission to access the ${view} portal`,
    };
  }

  // Set the view preference cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_VIEW_COOKIE, view, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  // Revalidate to update UI
  revalidatePath('/', 'layout');

  return { success: true, data: { view } };
}

/**
 * Get the user's current active portal view from cookie
 * Falls back to the default view for the user's role if no cookie is set
 *
 * @returns The active portal view
 */
export async function getActiveView(): Promise<PortalView> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 'parent'; // Fallback for unauthenticated
  }

  // Get user's profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_parent')
    .eq('id', user.id)
    .single();

  const userRole = (profile?.role as UserRole) || 'parent';
  const isParent = Boolean(profile?.is_parent);

  // Check for stored preference
  const cookieStore = await cookies();
  const storedView = cookieStore.get(ACTIVE_VIEW_COOKIE)?.value as
    | PortalView
    | undefined;

  // Validate the stored view is still allowed for the user's role
  // (role may have changed since cookie was set)
  if (storedView && isViewAllowed(userRole, storedView, isParent)) {
    return storedView;
  }

  // Return default view for the role
  return getDefaultView(userRole);
}

/**
 * Get the user's profile with their allowed views
 * Useful for rendering portal switcher UI
 */
export async function getProfileWithViews(): Promise<
  ActionResult<{
    role: UserRole;
    allowedViews: PortalView[];
    activeView: PortalView;
  }>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_parent')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return { success: false, error: 'Failed to fetch profile' };
  }

  const role = profile.role as UserRole;
  const isParent = profile.is_parent;
  const allowedViews = getAllowedViews(role, isParent);
  const activeView = await getActiveView();

  return {
    success: true,
    data: {
      role,
      allowedViews,
      activeView,
    },
  };
}

/**
 * Clear the active view cookie (reset to default)
 */
export async function clearActiveView(): Promise<ActionResult<void>> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_VIEW_COOKIE);

  revalidatePath('/', 'layout');

  return { success: true, data: undefined };
}

/**
 * Update the user's profile information
 */
export async function updateProfile(
  formData: FormData
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;
  const bio = formData.get('bio') as string;
  const specializations = formData.getAll('specializations') as string[];

  // Update public.profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      bio,
      specializations,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('Profile update error:', profileError);
    return { success: false, error: 'Failed to update profile' };
  }

  // Update auth.users metadata to keep it in sync
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      first_name: firstName,
      last_name: lastName,
      phone,
    },
  });

  if (authError) {
    console.warn('Auth metadata update failed:', authError);
    // We don't fail the request here as the profile update succeeded
  }

  revalidatePath('/', 'layout');
  return { success: true, data: undefined };
}

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';

/**
 * Route protection configuration
 * Maps route prefixes to allowed roles
 */
const ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
  // Open to everyone who volunteers. Class schedulers are the one role left
  // out; they reach the board through `is_volunteer_admin` if they need it.
  '/volunteer': ['parent', 'student', 'teacher', 'admin', 'super_admin'],
  // Alternate layouts of the same board, kept staff-only as design variants.
  // `/volunteer` is not a prefix of these, so each needs its own entry.
  '/volunteer-version-2': ['teacher', 'admin', 'super_admin'],
  '/volunteer-version-3': ['teacher', 'admin', 'super_admin'],
  '/volunteer-version-4': ['teacher', 'admin', 'super_admin'],
  '/volunteer-version-5': ['teacher', 'admin', 'super_admin'],
  '/parent': ['parent', 'teacher', 'admin', 'class_scheduler', 'super_admin'],
  '/teacher': ['teacher', 'super_admin'],
  '/student': ['student'],
  // Keep the narrow volunteer route before /admin so it can grant additive
  // volunteer-admin access without opening the rest of the admin portal.
  '/admin/volunteers': ['admin', 'super_admin'],
  // This route can also be unlocked by the additive photo-consent permission.
  '/admin/photo-consents': ['admin', 'super_admin'],
  '/admin': ['admin', 'super_admin'],
  '/class-scheduler': ['class_scheduler', 'super_admin'],
};

/**
 * Routes an additive `is_volunteer_admin` flag unlocks on its own, without
 * granting the rest of the portal those roles normally imply.
 */
const VOLUNTEER_ADMIN_ROUTES = [
  '/volunteer',
  '/volunteer-version-2',
  '/volunteer-version-3',
  '/volunteer-version-4',
  '/volunteer-version-5',
  '/admin/volunteers',
];

const PHOTO_CONSENT_ADMIN_ROUTES = ['/admin/photo-consents'];

/**
 * Default redirect paths based on user role
 */
const ROLE_DEFAULT_PATHS: Record<UserRole, string> = {
  parent: '/parent',
  teacher: '/teacher',
  student: '/student',
  admin: '/admin',
  class_scheduler: '/class-scheduler',
  super_admin: '/admin',
};

/**
 * List of public paths that don't require authentication
 */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/teachers',
];

/**
 * Check if a path matches a public route
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * Get the protected route prefix for a pathname
 */
function getProtectedRoutePrefix(pathname: string): string | null {
  for (const prefix of Object.keys(ROUTE_ROLE_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return prefix;
    }
  }
  return null;
}

/**
 * Check if a user role has access to a route
 */
export function hasRouteAccess(
  routePrefix: string,
  userRole: UserRole,
  isVolunteerAdmin = false,
  isPhotoConsentAdmin = false
): boolean {
  if (isVolunteerAdmin && VOLUNTEER_ADMIN_ROUTES.includes(routePrefix)) {
    return true;
  }

  if (isPhotoConsentAdmin && PHOTO_CONSENT_ADMIN_ROUTES.includes(routePrefix)) {
    return true;
  }

  const allowedRoles = ROUTE_ROLE_MAP[routePrefix];
  return allowedRoles ? allowedRoles.includes(userRole) : false;
}

/**
 * Get the default redirect path for a user role
 */
export function getDefaultPathForRole(role: UserRole): string {
  return ROLE_DEFAULT_PATHS[role] || '/';
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // API routes are handled separately (via their own auth checks)
  const isApiRoute = pathname.startsWith('/api/');

  // Public paths don't require authentication
  if (isPublicPath(pathname) || isApiRoute) {
    return supabaseResponse;
  }

  // Unauthenticated users trying to access protected routes
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Store the original path for post-login redirect
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Check role-based access for protected routes
  const routePrefix = getProtectedRoutePrefix(pathname);
  if (routePrefix) {
    // Fetch user profile to get role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_parent, is_volunteer_admin, is_photo_consent_admin')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // No profile found, redirect to login (this shouldn't happen normally)
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const userRole = profile.role as UserRole;
    const isParent = Boolean(profile.is_parent);
    const isVolunteerAdmin = Boolean(profile.is_volunteer_admin);
    const isPhotoConsentAdmin = Boolean(profile.is_photo_consent_admin);

    // Check if user has access to this route
    if (
      !hasRouteAccess(
        routePrefix,
        userRole,
        isVolunteerAdmin,
        isPhotoConsentAdmin
      )
    ) {
      // User doesn't have permission, redirect to their default dashboard
      const url = request.nextUrl.clone();
      url.pathname = getDefaultPathForRole(userRole);
      return NextResponse.redirect(url);
    }

    // Parent portal access requires is_parent unless they are super_admin
    if (
      routePrefix === '/parent' &&
      userRole !== 'parent' &&
      userRole !== 'super_admin' &&
      !isParent
    ) {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultPathForRole(userRole);
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as-is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

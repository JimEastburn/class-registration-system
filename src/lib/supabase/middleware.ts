import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';

/**
 * Route protection configuration
 * Maps route prefixes to allowed roles
 */
const ROUTE_ROLE_MAP: Record<string, UserRole[]> = {
  '/parent': ['parent', 'teacher', 'admin', 'super_admin'],
  '/teacher': ['teacher', 'admin', 'super_admin'],
  '/student': ['student', 'parent', 'admin', 'super_admin'],
  '/admin': ['admin', 'super_admin'],
  '/class-scheduler': ['class_scheduler', 'super_admin'],
};

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
function hasRouteAccess(routePrefix: string, userRole: UserRole): boolean {
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // No profile found, redirect to login (this shouldn't happen normally)
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const userRole = profile.role as UserRole;

    // Check if user has access to this route
    if (!hasRouteAccess(routePrefix, userRole)) {
      // User doesn't have permission, redirect to their default dashboard
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

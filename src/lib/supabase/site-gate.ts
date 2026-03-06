/**
 * Site Gate helpers for middleware
 *
 * Provides path-bypass logic and the cookie name constant
 * used by both middleware and the verifySitePassword server action.
 */

export const SITE_GATE_COOKIE_NAME = 'site_gate_passed';

/**
 * Paths that bypass the site-gate password check.
 * These are accessible to everyone, even without the gate cookie.
 */
const SITE_GATE_BYPASS_PATHS = ['/', '/register', '/gate', '/login', '/forgot-password'];

/**
 * Prefixes that bypass the site gate (e.g. /auth/callback, /api/*)
 */
const SITE_GATE_BYPASS_PREFIXES = ['/auth/', '/api/'];

/**
 * Check if a given pathname should bypass the site-gate check.
 */
export function isSiteGateBypassed(pathname: string): boolean {
  // Exact match bypass
  if (SITE_GATE_BYPASS_PATHS.includes(pathname)) {
    return true;
  }

  // Prefix match bypass
  for (const prefix of SITE_GATE_BYPASS_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

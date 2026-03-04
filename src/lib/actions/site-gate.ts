'use server';

import { cookies } from 'next/headers';
import { SITE_GATE_COOKIE_NAME } from '@/lib/supabase/site-gate';

/**
 * Server action to verify the site-wide password.
 * Sets a cookie on success and returns { success: true }.
 * Used by the SiteGateModal component on the enrollment page.
 */
export async function verifySitePassword(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const password = formData.get('password') as string | null;
  const sitePassword = process.env.SITE_PASSWORD;

  if (!password || !sitePassword || password !== sitePassword) {
    return { error: 'Incorrect password' };
  }

  const cookieStore = await cookies();
  cookieStore.set(SITE_GATE_COOKIE_NAME, 'true', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true };
}

/**
 * Server action to check if the site gate has been passed.
 * Returns true if the gate cookie is set, or if SITE_PASSWORD is not configured.
 */
export async function isSiteGatePassed(): Promise<boolean> {
  const sitePassword = process.env.SITE_PASSWORD;

  // If no site password is configured, the gate is effectively disabled
  if (!sitePassword) {
    return true;
  }

  const cookieStore = await cookies();
  const gateCookie = cookieStore.get(SITE_GATE_COOKIE_NAME);
  return gateCookie?.value === 'true';
}

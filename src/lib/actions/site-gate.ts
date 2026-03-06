'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SITE_GATE_COOKIE_NAME } from '@/lib/supabase/site-gate';

/**
 * Server action to verify the site-wide password.
 * Sets a cookie on success and redirects to /login.
 */
export async function verifySitePassword(
  formData: FormData
): Promise<{ error: string } | void> {
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

  redirect('/login');
}

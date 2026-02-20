'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Sign in with Google OAuth.
 * This is a client-side function (not a server action) because
 * signInWithOAuth performs a browser redirect to Google's consent screen.
 *
 * After consent, Google redirects back to /auth/callback which
 * exchanges the code for a session and redirects to the user's dashboard.
 */
export async function signInWithGoogle() {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }
}

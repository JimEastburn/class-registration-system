import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDefaultPathForRole } from '@/lib/supabase/middleware';
import type { UserRole } from '@/types';

/**
 * Auth callback handler for Supabase OAuth and magic link flows.
 * This route exchanges the auth code for a session.
 * 
 * Used for:
 * - OAuth callbacks (Google, GitHub, etc.)
 * - Magic link email confirmation
 * - Password reset confirmation
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? searchParams.get('redirectTo');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
        console.error('Auth callback error:', error, errorDescription);
        const errorUrl = new URL('/login', origin);
        errorUrl.searchParams.set('error', errorDescription || error);
        return NextResponse.redirect(errorUrl);
    }

    if (code) {
        const supabase = await createClient();

        // Exchange the code for a session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error('Code exchange error:', exchangeError.message);
            const errorUrl = new URL('/login', origin);
            errorUrl.searchParams.set('error', 'Failed to authenticate. Please try again.');
            return NextResponse.redirect(errorUrl);
        }

        // Get the authenticated user to determine role-based redirect
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Get user profile to determine role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            // Determine redirect destination
            let redirectTo = next;

            if (!redirectTo) {
                // Default redirect based on role
                const role = (profile?.role as UserRole) || 'parent';
                redirectTo = getDefaultPathForRole(role);
            }

            // Ensure redirectTo is properly formatted
            const redirectUrl = redirectTo.startsWith('/')
                ? new URL(redirectTo, origin)
                : new URL(`/${redirectTo}`, origin);

            return NextResponse.redirect(redirectUrl);
        }
    }

    // Fallback: redirect to login if no code or user
    return NextResponse.redirect(new URL('/login', origin));
}

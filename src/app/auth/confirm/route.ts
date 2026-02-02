import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDefaultPathForRole } from '@/lib/supabase/middleware';
import type { UserRole } from '@/types';

/**
 * Email confirmation handler for Supabase auth.
 * This route handles email verification tokens from confirmation emails.
 * 
 * Used for:
 * - Email verification after signup
 * - Email change confirmation
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | 'invite' | null;
    const next = searchParams.get('next') ?? searchParams.get('redirectTo');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle confirmation errors
    if (error) {
        console.error('Email confirm error:', error, errorDescription);
        const errorUrl = new URL('/login', origin);
        errorUrl.searchParams.set('error', errorDescription || error);
        return NextResponse.redirect(errorUrl);
    }

    if (tokenHash && type) {
        const supabase = await createClient();

        // Verify the OTP token
        const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type,
        });

        if (verifyError) {
            console.error('Token verification error:', verifyError.message);
            const errorUrl = new URL('/login', origin);
            errorUrl.searchParams.set('error', 'Email verification failed. Please request a new confirmation email.');
            return NextResponse.redirect(errorUrl);
        }

        // Get the authenticated user to determine role-based redirect
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // For recovery type, redirect to reset password page
            if (type === 'recovery') {
                return NextResponse.redirect(new URL('/reset-password', origin));
            }

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

    // Fallback: redirect to login if no token or user
    return NextResponse.redirect(new URL('/login', origin));
}

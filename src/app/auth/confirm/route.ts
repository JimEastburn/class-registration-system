import { createClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = searchParams.get('next') ?? '/';

    const redirectTo = request.nextUrl.clone();
    redirectTo.pathname = next;
    redirectTo.searchParams.delete('token_hash');
    redirectTo.searchParams.delete('type');

    if (token_hash && type) {
        const supabase = await createClient();

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });

        if (!error) {
            // Get user role to redirect to appropriate dashboard
            const { data: { user } } = await supabase.auth.getUser();
            const role = user?.user_metadata?.role || 'parent';

            redirectTo.pathname = `/${role}`;
            return NextResponse.redirect(redirectTo);
        }
    }

    // Return the user to an error page with instructions
    redirectTo.pathname = '/auth/auth-code-error';
    return NextResponse.redirect(redirectTo);
}

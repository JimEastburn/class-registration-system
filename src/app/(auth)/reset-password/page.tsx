import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
    title: 'Reset Password | Class Registration System',
    description: 'Set a new password for your account',
};

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
    const { code, error, error_description } = await searchParams;

    // If a code is present, exchange it for a session server-side
    if (code) {
        const supabase = await createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error('Reset password code exchange error:', exchangeError.message);
            redirect('/reset-password?error=access_denied&error_description=Password+reset+link+is+invalid+or+has+expired');
        }

        // Redirect to the same page without the code to avoid re-exchange on refresh
        redirect('/reset-password');
    }

    // Show error state if the link expired or was invalid
    if (error) {
        const errorMessage = error_description
            ? decodeURIComponent(error_description.replace(/\+/g, ' '))
            : 'Your password reset link is invalid or has expired.';

        return (
            <>
                <div className="w-full bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Link Expired
                        </h1>
                        <p className="text-slate-300 mb-6">
                            {errorMessage}
                        </p>
                        <p className="text-slate-400 text-sm mb-6">
                            No worries — you can request a new password reset link below.
                        </p>
                        <Link
                            href="/forgot-password"
                            className="inline-flex items-center justify-center w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                            data-testid="resend-reset-link"
                        >
                            Send New Reset Link
                        </Link>
                        <Link
                            href="/login"
                            className="block mt-4 text-sm text-slate-400 hover:text-white transition-colors"
                            data-testid="back-to-login-link"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Form Container */}
            <div className="w-full bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Reset Password
                    </h1>
                    <p className="text-slate-300">
                        Enter your new password below
                    </p>
                </div>
                <ResetPasswordForm />
            </div>
        </>
    );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Reset Password | Class Registration System',
  description: 'Set a new password for your account',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const { code, error, error_description } = await searchParams;

  // If a code is present, redirect to the auth callback route handler
  // which can properly exchange the code and set session cookies.
  // Server Components cannot set cookies, so we delegate to the route handler.
  if (code) {
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=/reset-password`
    );
  }

  // Show error state if the link expired or was invalid
  if (error) {
    const errorMessage = error_description
      ? decodeURIComponent(error_description.replace(/\+/g, ' '))
      : 'Your password reset link is invalid or has expired.';

    return (
      <>
        <div className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
              <svg
                className="h-8 w-8 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white">Link Expired</h1>
            <p className="mb-6 text-slate-300">{errorMessage}</p>
            <p className="mb-6 text-sm text-slate-400">
              No worries — you can request a new password reset link below.
            </p>
            <Link
              href="/forgot-password"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition-colors"
              data-testid="resend-reset-link"
            >
              Send New Reset Link
            </Link>
            <Link
              href="/login"
              className="mt-4 block text-sm text-slate-400 transition-colors hover:text-white"
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
      <div className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-slate-300">Enter your new password below</p>
        </div>
        <ResetPasswordForm />
      </div>
    </>
  );
}

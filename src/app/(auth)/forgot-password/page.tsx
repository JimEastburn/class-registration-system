import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDefaultPathForRole } from '@/lib/supabase/middleware';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata = {
  title: 'Forgot Password | Class Registration System',
  description: 'Reset your password',
};

export default async function ForgotPasswordPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = user.user_metadata?.role || 'parent';
    redirect(getDefaultPathForRole(role));
  }

  return (
    <>
      {/* Form Container */}
      <div className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">
            Forgot Password?
          </h1>
          <p className="text-slate-300">
            No worries, we&apos;ll send you reset instructions
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </>
  );
}

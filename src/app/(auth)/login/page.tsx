import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login | Class Registration System',
  description: 'Sign in to your account',
};

export default async function LoginPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const role = user.user_metadata?.role || 'parent';
    redirect(`/${role}`);
  }

  return (
    <>
      {/* Form Container */}
      <div className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 p-8 shadow-xl backdrop-blur-sm">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-300">Sign in to access your dashboard</p>
        </div>
        <LoginForm />
      </div>

      {/* Support Info Card */}
      <div className="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center shadow-lg backdrop-blur-md">
        <div className="flex flex-col items-center gap-0.5 text-sm text-slate-300">
          <span>For help, please text Jim Eastburn</span>
          <a
            href="sms:+15126896860"
            className="font-medium text-teal-400 transition-colors hover:text-teal-300"
          >
            (512) 689-6860
          </a>
        </div>
        <hr className="mx-auto my-3 w-16 border-slate-600" />
        <p className="text-sm text-slate-300">
          <a
            href="/AAC - 2025-26 Community Code of Conduct.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal-400 transition-colors hover:text-teal-300"
          >
            Community Code of Conduct
          </a>
        </p>
      </div>
    </>
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata = {
  title: 'Register | Class Registration System',
  description: 'Create a new account',
};

export default async function RegisterPage() {
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
          <h1 className="mb-2 text-3xl font-bold text-white">Create Account</h1>
          <p className="text-gray-300">Join our class registration system</p>
        </div>
        <RegisterForm />
      </div>
    </>
  );
}

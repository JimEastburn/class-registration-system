import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata = {
    title: 'Forgot Password | Class Registration System',
    description: 'Reset your password',
};

export default async function ForgotPasswordPage() {
    // Check if user is already logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const role = user.user_metadata?.role || 'parent';
        redirect(`/${role}`);
    }

    return (
        <>
            {/* Form Container */}
            <div className="w-full bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
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

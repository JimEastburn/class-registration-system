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
                        Welcome Back
                    </h1>
                    <p className="text-gray-300">
                        Sign in to access your dashboard
                    </p>
                </div>
                <LoginForm />
            </div>

            {/* Support Info Card */}
            <div className="w-full bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 shadow-lg text-center">
                <p className="text-slate-300 text-sm">
                    For help please email{' '}
                    <a
                        href="mailto:communitysupport@austinaac.org"
                        className="text-teal-400 font-medium hover:text-teal-300 transition-colors"
                    >
                        communitysupport@austinaac.org
                    </a>
                </p>
            </div>
        </>
    );
}

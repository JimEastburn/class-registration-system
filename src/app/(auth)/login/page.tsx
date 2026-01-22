import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
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
        <div className="min-h-screen relative flex items-center justify-center p-4">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-slate-900/80 z-10" />
                <Image
                    src="/AAC FINAL.avif"
                    alt="Background"
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            <div className="w-full max-w-md relative z-20">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-gray-200">
                        Sign in to access your dashboard
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}

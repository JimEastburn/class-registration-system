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
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const role = user.user_metadata?.role || 'parent';
        redirect(`/${role}`);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Create Account
                    </h1>
                    <p className="text-slate-300">
                        Join our class registration system
                    </p>
                </div>
                <RegisterForm />
            </div>
        </div>
    );
}

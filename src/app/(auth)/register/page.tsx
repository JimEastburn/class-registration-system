import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full max-w-7xl">
                {/* Left Image */}
                <div className="hidden lg:block flex-shrink-0">
                    <Image
                        src="/AAC FINAL.avif"
                        alt="Decoration Left"
                        width={300}
                        height={300}
                        className="rounded-xl shadow-2xl object-contain"
                        priority
                    />
                </div>

                {/* Form Container */}
                <div className="w-full max-w-md bg-slate-800/50 p-8 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Create Account
                        </h1>
                        <p className="text-gray-300">
                            Join our class registration system
                        </p>
                    </div>
                    <RegisterForm />
                </div>

                {/* Right Image */}
                <div className="hidden lg:block flex-shrink-0">
                    <Image
                        src="/AAC FINAL.avif"
                        alt="Decoration Right"
                        width={300}
                        height={300}
                        className="rounded-xl shadow-2xl object-contain"
                        priority
                    />
                </div>
            </div>
        </div>
    );
}

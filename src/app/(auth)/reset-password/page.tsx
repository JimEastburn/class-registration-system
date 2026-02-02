import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
    title: 'Reset Password | Class Registration System',
    description: 'Set a new password for your account',
};

export default function ResetPasswordPage() {
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

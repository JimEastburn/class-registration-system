import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
    title: 'Reset Password | Class Registration System',
    description: 'Set a new password for your account',
};

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="w-full max-w-md">
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
        </div>
    );
}

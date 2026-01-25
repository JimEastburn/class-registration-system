'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <CardTitle className="text-white text-xl">Password Updated!</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-slate-300">
                        Your password has been successfully reset. Redirecting to login...
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg">
            <CardHeader>
                <CardTitle className="text-white text-center">Set New Password</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-white">New Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            {...register('password')}
                        />
                        {errors.password && (
                            <p className="text-red-400 text-sm">{errors.password.message}</p>
                        )}
                        <p className="text-slate-400 text-xs">
                            Must be 8+ characters with uppercase, lowercase, and number
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && (
                            <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-[#4c7c92] to-[#9BBFD3] hover:from-[#3a6073] hover:to-[#7aa9c2]"
                    >
                        {isLoading ? 'Updating...' : 'Reset Password'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

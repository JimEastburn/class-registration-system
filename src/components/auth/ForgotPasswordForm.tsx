'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg" data-testid="forgot-success-message">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <CardTitle className="text-white text-xl">Check Your Email</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-slate-300 mb-6">
                        We&apos;ve sent a password reset link to your email address.
                        Click the link in the email to reset your password.
                    </p>
                    <p className="text-slate-400 text-sm">
                        Didn&apos;t receive the email? Check your spam folder or try again.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/login">
                        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                            Back to Login
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg">
            <CardHeader>
                <CardTitle className="text-white text-center">Reset Password</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)} data-testid="forgot-password-form">
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm" data-testid="forgot-error-message">
                            {error}
                        </div>
                    )}

                    <p className="text-slate-300 text-sm">
                        Enter your email address and we&apos;ll send you a link to reset your password.
                    </p>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            {...register('email')}
                            data-testid="forgot-email-input"
                        />
                        {errors.email && (
                            <p className="text-red-400 text-sm">{errors.email.message}</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-[#4c7c92] to-[#9BBFD3] hover:from-[#3a6073] hover:to-[#7aa9c2]"
                        data-testid="forgot-submit-button"
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                    <Link href="/login" className="text-slate-300 hover:text-white text-sm">
                        Back to Login
                    </Link>
                </CardFooter>
            </form>
        </Card>
    );
}

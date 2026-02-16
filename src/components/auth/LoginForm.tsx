'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { signIn } from '@/lib/actions/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export default function LoginForm() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = (data: LoginFormData) => {
        setError(null);

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append('email', data.email);
                formData.append('password', data.password);

                const result = await signIn(formData);

                if (result?.error) {
                    setError(result.error);
                }
            } catch (e) {
                if ((e as Error).message === 'NEXT_REDIRECT' || (e as any)?.digest === 'NEXT_REDIRECT') {
                    throw e;
                }
                console.error('Login error:', e);
                setError('An unexpected error occurred');
            }
        });
    };

    return (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="space-y-1 pb-4">
                <h2 className="text-xl font-semibold text-white text-center">
                    Sign In
                </h2>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="login-form">
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm" data-testid="login-error-message">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-200">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            {...register('email')}
                            data-testid="email-input"
                        />
                        {errors.email && (
                            <p className="text-red-400 text-sm">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-slate-200">
                                Password
                            </Label>
                            <Link
                                href="/forgot-password"
                                className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                                data-testid="forgot-password-link"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            {...register('password')}
                            data-testid="password-input"
                        />
                        {errors.password && (
                            <p className="text-red-400 text-sm">{errors.password.message}</p>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 pt-6">
                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        isLoading={isPending}
                        data-testid="login-submit-button"
                    >
                        Sign In
                    </Button>

                    <p className="text-sm text-slate-300 text-center">
                        Don&apos;t have an account?{' '}
                        <Link
                            href="/register"
                            className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
                            data-testid="signup-link"
                        >
                            Create account
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}

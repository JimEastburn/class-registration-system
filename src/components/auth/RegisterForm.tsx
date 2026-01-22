'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { signUp } from '@/lib/actions/auth';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function RegisterForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('password', data.password);
        formData.append('firstName', data.firstName);
        formData.append('lastName', data.lastName);
        formData.append('role', data.role);
        if (data.phone) {
            formData.append('phone', data.phone);
        }

        const result = await signUp(formData);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            setSuccess(true);
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                            <svg
                                className="w-8 h-8 text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-white">
                            Check Your Email
                        </h3>
                        <p className="text-slate-300">
                            We&apos;ve sent you a confirmation link. Please check your email to
                            verify your account.
                        </p>
                        <Link href="/login">
                            <Button className="bg-primary hover:bg-primary/90">
                                Back to Login
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="space-y-1 pb-4">
                <h2 className="text-xl font-semibold text-white text-center">
                    Create Account
                </h2>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-slate-200">
                                First Name
                            </Label>
                            <Input
                                id="firstName"
                                placeholder="John"
                                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                                {...register('firstName')}
                            />
                            {errors.firstName && (
                                <p className="text-red-400 text-sm">{errors.firstName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-slate-200">
                                Last Name
                            </Label>
                            <Input
                                id="lastName"
                                placeholder="Doe"
                                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                                {...register('lastName')}
                            />
                            {errors.lastName && (
                                <p className="text-red-400 text-sm">{errors.lastName.message}</p>
                            )}
                        </div>
                    </div>

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
                        />
                        {errors.email && (
                            <p className="text-red-400 text-sm">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-slate-200">
                            I am a...
                        </Label>
                        <Select onValueChange={(value) => setValue('role', value as 'parent' | 'teacher' | 'student')}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="parent">Parent / Guardian</SelectItem>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && (
                            <p className="text-red-400 text-sm">{errors.role.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-200">
                            Phone (optional)
                        </Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            {...register('phone')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-200">
                            Password
                        </Label>
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-slate-200">
                            Confirm Password
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && (
                            <p className="text-red-400 text-sm">
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>

                    <p className="text-sm text-slate-300 text-center">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
                        >
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/lib/validations';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
      <Card
        className="border-slate-600 bg-slate-700/90 shadow-2xl"
        data-testid="forgot-success-message"
      >
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <svg
              className="h-8 w-8 text-green-400"
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
          <CardTitle className="text-xl text-white">Check Your Email</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-slate-300">
            We&apos;ve sent a password reset link to your email address. Click
            the link in the email to reset your password.
          </p>
          <p className="text-sm text-slate-400">
            Didn&apos;t receive the email? Check your spam folder or try again.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Back to Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-slate-600 bg-slate-700/90 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-center text-white">Reset Password</CardTitle>
      </CardHeader>
      <form
        onSubmit={handleSubmit(onSubmit)}
        data-testid="forgot-password-form"
      >
        <CardContent className="space-y-4">
          {error && (
            <div
              className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-200"
              data-testid="forgot-error-message"
            >
              {error}
            </div>
          )}

          <p className="text-sm text-slate-300">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="border-white/20 bg-white/10 text-white placeholder:text-slate-400"
              {...register('email')}
              data-testid="forgot-email-input"
            />
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
            data-testid="forgot-submit-button"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <Link
            href="/login"
            className="text-sm text-slate-300 hover:text-white"
          >
            Back to Login
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

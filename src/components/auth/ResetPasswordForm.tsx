'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
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

export default function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      <Card
        className="border-slate-600 bg-slate-700/90 shadow-2xl"
        data-testid="reset-success-message"
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
          <CardTitle className="text-xl text-white">
            Password Updated!
          </CardTitle>
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
    <Card className="border-slate-600 bg-slate-700/90 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-center text-white">
          Set New Password
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} data-testid="reset-password-form">
        <CardContent className="space-y-4">
          {error && (
            <div
              className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-200"
              data-testid="reset-error-message"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="border-white/20 bg-white/10 pr-10 text-white placeholder:text-slate-400"
                {...register('password')}
                data-testid="reset-password-input"
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                data-testid="toggle-password-visibility"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
            <p className="text-xs text-slate-400">
              Must be 8+ characters with uppercase, lowercase, and number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="border-white/20 bg-white/10 pr-10 text-white placeholder:text-slate-400"
                {...register('confirmPassword')}
                data-testid="reset-confirm-input"
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? 'Hide password' : 'Show password'
                }
                data-testid="toggle-confirm-password-visibility"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-6">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
            data-testid="reset-submit-button"
          >
            {isLoading ? 'Updating...' : 'Reset Password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

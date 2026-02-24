'use client';

import { useState, useTransition } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { signIn } from '@/lib/actions/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';

export default function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
        if (
          (e as Error).message === 'NEXT_REDIRECT' ||
          (e as { digest?: string })?.digest === 'NEXT_REDIRECT'
        ) {
          throw e;
        }
        console.error('Login error:', e);
        setError('An unexpected error occurred');
      }
    });
  };

  return (
    <Card className="border-white/20 bg-white/10 backdrop-blur-lg">
      <CardHeader className="space-y-1 pb-4">
        <h2 className="text-center text-xl font-semibold text-white">
          Sign In
        </h2>
      </CardHeader>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        data-testid="login-form"
      >
        <CardContent className="space-y-4">
          {error && (
            <div
              className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-200"
              data-testid="login-error-message"
            >
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
              className="border-white/20 bg-white/10 text-white placeholder:text-slate-400"
              {...register('email')}
              data-testid="email-input"
            />
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-200">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-sm text-teal-400 transition-colors hover:text-teal-300"
                data-testid="forgot-password-link"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="border-white/20 bg-white/10 pr-10 text-white placeholder:text-slate-400"
                {...register('password')}
                data-testid="password-input"
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
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-6">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full font-semibold"
            isLoading={isPending}
            data-testid="login-submit-button"
          >
            Sign In
          </Button>

          <div className="flex flex-col items-center gap-1 text-sm text-slate-300">
            <span>Don&apos;t have an account?</span>
            <Link
              href="/register"
              className="font-medium text-teal-400 transition-colors hover:text-teal-300"
              data-testid="signup-link"
            >
              Create account
            </Link>
          </div>

          {process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' && (
            <a
              href="https://docs.google.com/document/d/1DlULw5rPL5WPoT7-s8JNKV_6489f6DxR/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-sm text-amber-400 transition-colors hover:text-amber-300"
              data-testid="test-accounts-link"
            >
              Test Accounts
            </a>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

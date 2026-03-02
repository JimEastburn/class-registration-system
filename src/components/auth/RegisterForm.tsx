'use client';

import { useState, useTransition, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { signUp } from '@/lib/actions/auth';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      codeOfConduct: false as unknown as true,
    },
  });

  useEffect(() => {
    register('role');
    register('codeOfConduct');
  }, [register]);

  const onSubmit = (data: RegisterFormData) => {
    setError(null);

    startTransition(async () => {
      try {
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

        if (!result.success) {
          setError(result.error);
        } else {
          setSuccess(true);
        }
      } catch (_e) {
        setError('An unexpected error occurred');
      }
    });
  };

  if (success) {
    return (
      <Card className="border-slate-600 bg-slate-700/90">
        <CardContent className="pt-6">
          <div
            className="space-y-4 text-center"
            data-testid="registration-success"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">
              Check your email
            </h3>
            <p className="text-slate-300">
              We sent a confirmation link to your email address. Please click it
              to verify your account before signing in.
            </p>
            <Button className="bg-primary hover:bg-primary/90" asChild>
              <Link href="/gate" data-testid="back-to-login-link">
                Back to Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-600 bg-slate-700/90">
      <CardHeader className="space-y-1 pb-4">
        <h2 className="text-center text-xl font-semibold text-white">
          Create Account
        </h2>
      </CardHeader>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        data-testid="register-form"
      >
        <CardContent className="space-y-4">
          {error && (
            <div
              className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-200"
              data-testid="register-error-message"
            >
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
                className="border-white/20 bg-white/10 text-white placeholder:text-slate-400"
                {...register('firstName')}
                data-testid="first-name-input"
              />
              {errors.firstName && (
                <p className="text-sm text-red-400">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-slate-200">
                Last Name
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                className="border-white/20 bg-white/10 text-white placeholder:text-slate-400"
                {...register('lastName')}
                data-testid="last-name-input"
              />
              {errors.lastName && (
                <p className="text-sm text-red-400">
                  {errors.lastName.message}
                </p>
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
              className="border-white/20 bg-white/10 text-white placeholder:text-slate-400"
              {...register('email')}
              data-testid="register-email-input"
            />
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-slate-200">
              I am a...
            </Label>
            <Select
              onValueChange={(value) =>
                setValue('role', value as 'parent' | 'teacher' | 'student', {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger
                className="border-white/20 bg-white/10 text-white"
                data-testid="role-select-trigger"
              >
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent" data-testid="role-option-parent">
                  Parent / Guardian
                </SelectItem>
                <SelectItem value="teacher" data-testid="role-option-teacher">
                  Teacher
                </SelectItem>
                <SelectItem value="student" data-testid="role-option-student">
                  Student
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-400">{errors.role.message}</p>
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
              className="border-white/20 bg-white/10 text-white placeholder:text-slate-400"
              {...register('phone')}
              data-testid="phone-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="border-white/20 bg-white/10 pr-10 text-white placeholder:text-slate-400"
                {...register('password')}
                data-testid="register-password-input"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-200">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="border-white/20 bg-white/10 pr-10 text-white placeholder:text-slate-400"
                {...register('confirmPassword')}
                data-testid="confirm-password-input"
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

          <div className="flex items-start space-x-2 pb-2">
            <Checkbox
              id="codeOfConduct"
              onCheckedChange={(checked) => {
                setValue(
                  'codeOfConduct',
                  checked === true ? true : (false as unknown as true),
                  { shouldValidate: true }
                );
              }}
              data-testid="coc-checkbox"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="codeOfConduct"
                className="text-sm leading-none font-medium text-slate-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{' '}
                <a
                  href="/AAC - 2026-27 Community Code of Conduct.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:text-teal-300 hover:underline"
                >
                  Code of Conduct
                </a>
              </Label>
              {errors.codeOfConduct && (
                <p className="text-sm text-red-400">
                  {errors.codeOfConduct.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full font-semibold"
            isLoading={isPending}
            data-testid="register-submit-button"
          >
            Create Account
          </Button>

          <p className="text-center text-sm text-slate-300">
            Already have an account?{' '}
            <Link
              href="/gate"
              className="font-medium text-teal-400 transition-colors hover:text-teal-300"
              data-testid="signin-link"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

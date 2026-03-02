'use client';

import { useState } from 'react';
import { verifySitePassword } from '@/lib/actions/site-gate';
import Image from 'next/image';

export default function GatePage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    const result = await verifySitePassword(formData);
    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="text-foreground relative flex min-h-screen items-center justify-center bg-slate-900">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/Together_FADE.webp"
          alt="Background"
          fill
          className="object-cover object-center opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-slate-900/70" />
      </div>

      {/* Gate Form */}
      <div className="relative z-10 mx-4 w-full max-w-md">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <div className="mb-6 flex justify-center">
            <Image
              src="/AAC_FINAL.webp"
              alt="Logo"
              width={120}
              height={110}
              className="h-auto w-24 object-contain"
            />
          </div>
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-white">
              Site Access
            </h1>
            <p className="text-sm text-gray-400">
              Enter the site password to continue.
            </p>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 pr-12 text-white placeholder-gray-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Enter site password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-teal-600 px-4 py-3 font-medium text-white transition-colors hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              For access, please text Jim Eastburn{' '}
              <a
                href="sms:+15126896860"
                className="font-medium text-teal-400 transition-colors hover:text-teal-300"
              >
                (512) 689-6860
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

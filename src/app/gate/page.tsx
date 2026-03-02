'use client';

import { useState } from 'react';
import { verifySitePassword } from '@/lib/actions/site-gate';
import Image from 'next/image';

export default function GatePage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 shadow-xl backdrop-blur-sm">
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
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder-gray-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Enter site password"
              />
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

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await (await supabase).auth.getUser();

  // Redirect authenticated users to their dashboard
  if (user) {
    const role = user.user_metadata?.role || 'parent';
    redirect(`/${role}`);
  }

  return (
    <div className="text-foreground relative min-h-screen bg-slate-900">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/Together_FADE.webp"
          alt="Class Registration Background"
          fill
          className="object-cover object-center opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-slate-900/60" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex min-h-screen flex-col pb-8">
        {/* Navigation */}
        <nav className="container mx-auto flex items-center justify-between px-4 py-6">
          <Image
            src="/AAC_FINAL.webp"
            alt="Logo"
            width={165}
            height={152}
            className="h-auto w-20 object-contain md:w-[165px]"
          />
          <div className="flex gap-2 md:gap-4">
            <Link href="/login">
              <Button
                variant="outline"
                className="hover:bg-accent hover:text-accent-foreground border-amber-300 bg-amber-200/80 text-slate-900"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="container mx-auto flex flex-grow flex-col justify-center px-4 py-8">
          <div className="mx-auto max-w-4xl text-center md:-mt-56 xl:mt-0">
            <h1 className="text-foreground mb-8 text-5xl leading-tight font-bold tracking-tight md:text-6xl lg:text-8xl">
              <span className="text-white">Class Registration</span>
              <span className="text-primary block">
                Austin Arts + Academic Collaborative
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-xl leading-relaxed md:text-2xl">
              Manage class registrations, schedules, and payments.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="hover:bg-accent hover:text-accent-foreground h-auto w-full border-amber-300 bg-amber-200/80 px-12 py-6 text-lg text-slate-900 sm:w-auto"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-muted-foreground border-border container mx-auto border-t px-4 py-8 text-center text-sm">
          © 2026 ClassReg. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

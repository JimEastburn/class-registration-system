import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await (await supabase).auth.getUser();

  // Redirect authenticated users to their dashboard
  if (user) {
    const role = user.user_metadata?.role || 'parent';
    redirect(`/${role}`);
  }

  return (
    <div className="min-h-screen relative bg-slate-900 text-foreground">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/Together_FADE.avif"
          alt="Class Registration Background"
          fill
          className="object-cover object-center opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-slate-900/60" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 min-h-screen flex flex-col pb-8">

        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Image
            src="/AAC_FINAL.avif"
            alt="Logo"
            width={165}
            height={152}
            className="object-contain w-20 md:w-[165px] h-auto"
          />
          <div className="flex gap-2 md:gap-4">
            <Link href="/login">
              <Button variant="outline" className="bg-amber-200/80 text-slate-900 border-amber-300 hover:bg-accent hover:text-accent-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button>
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-8 flex-grow flex flex-col justify-center">
          <div className="text-center max-w-4xl mx-auto md:-mt-56 xl:mt-0">
            <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold text-foreground mb-8 leading-tight tracking-tight">
              <span className="text-white">
                Class Registration
              </span>
              <span className="block text-primary">
                Austin Arts + Academic Collaborative
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Manage class registrations, schedules, and payments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-12 py-6 h-auto w-full sm:w-auto bg-amber-200/80 text-slate-900 border-amber-300 hover:bg-accent hover:text-accent-foreground">
                  Sign In
                </Button>
              </Link>
            </div>


          </div>


        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground text-sm border-t border-border">
          © 2026 ClassReg. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

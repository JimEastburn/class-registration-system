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
    <div className="min-h-screen relative text-white bg-slate-900">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-slate-900/80 z-10" /> {/* Dark overlay for readability */}
        <Image
          src="/Together_FADE.avif"
          alt="Class Registration Background"
          fill
          className="object-contain object-center"
          priority
        />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-20 min-h-screen flex flex-col pb-24 md:pb-0">

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
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white border-0">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-20 flex-grow flex flex-col justify-center">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-8 leading-tight tracking-tight">
              Class Registration
              <span className="block text-teal-400">
                Austin Arts + Academic Collaborative
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 mb-12 max-w-2xl mx-auto leading-relaxed">
              Manage class registrations, schedules, and payments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10 text-lg px-8 py-6 h-auto w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>


          </div>


        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 text-center text-slate-400 text-sm border-t border-white/10">
          © 2026 ClassReg. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

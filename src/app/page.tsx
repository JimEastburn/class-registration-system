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
          src="/Together FADE.avif"
          alt="Class Registration Background"
          fill
          className="object-contain object-center"
          priority
        />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-20 min-h-screen flex flex-col">

        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Image
            src="/AAC FINAL.avif"
            alt="Logo"
            width={165}
            height={152}
            className="object-contain"
          />
          <div className="flex gap-4">
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
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight tracking-tight">
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

            {/* Support Info Card */}
            <div className="mt-12 flex justify-center">
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 max-w-lg">
                <p className="text-slate-300 text-lg">
                  For help please email{' '}
                  <a
                    href="mailto:communitysupport@austinaac.org"
                    className="text-teal-400 font-medium hover:text-teal-300 transition-colors"
                  >
                    communitysupport@austinaac.org
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-24">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                <img src="/globe.svg" alt="Global Access" className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">For Parents</h3>
              <p className="text-slate-300 leading-relaxed">
                Easily manage your family members and enroll your children in classes with just a few clicks.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <div className="w-14 h-14 bg-teal-500/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">For Teachers</h3>
              <p className="text-slate-300 leading-relaxed">
                Create and manage your classes, track enrollments, and connect with students effortlessly.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
              <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">For Students</h3>
              <p className="text-slate-300 leading-relaxed">
                View your class schedule, access materials, and stay organized throughout the semester.
              </p>
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

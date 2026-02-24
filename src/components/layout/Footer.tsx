'use client';

import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  // Hide footer on login and register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <div className="text-muted-foreground fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-sm backdrop-blur-sm">
      For help, please text Jim Eastburn{' '}
      <a
        href="sms:+15126896860"
        className="font-medium text-blue-600 hover:underline"
      >
        (512) 689-6860
      </a>
      <span className="mx-6 text-gray-300">|</span>
      <a
        href="/AAC - 2025-26 Community Code of Conduct.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 hover:underline"
      >
        Code of Conduct
      </a>
    </div>
  );
}

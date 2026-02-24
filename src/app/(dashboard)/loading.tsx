'use client';

import { usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function DashboardLoading() {
  const pathname = usePathname();

  if (pathname === '/admin') {
    return null;
  }

  return (
    <div className="bg-background/50 flex h-full w-full items-center justify-center p-8">
      <LoadingSpinner className="text-primary h-10 w-10" />
    </div>
  );
}

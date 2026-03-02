'use client';

import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function GlobalSpinner() {
  const { isLoading } = useGlobalLoading();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted || !isLoading) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4 shadow-lg">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-sm font-medium text-gray-700">Loading...</p>
      </div>
    </div>,
    document.body
  );
}

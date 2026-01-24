'use client';

import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export function GlobalSpinner() {
    const { isLoading } = useGlobalLoading();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isLoading) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-gray-700">Loading...</p>
            </div>
        </div>,
        document.body
    );
}

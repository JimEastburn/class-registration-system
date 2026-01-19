'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
    children: React.ReactNode;
    className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
    return (
        <div className={cn('w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0', className)}>
            <div className="min-w-[640px] sm:min-w-0">
                {children}
            </div>
        </div>
    );
}

// Mobile-friendly card list alternative for tables
interface MobileCardListProps<T> {
    items: T[];
    renderCard: (item: T, index: number) => React.ReactNode;
    emptyMessage?: string;
}

export function MobileCardList<T>({
    items,
    renderCard,
    emptyMessage = 'No items found'
}: MobileCardListProps<T>) {
    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map((item, index) => renderCard(item, index))}
        </div>
    );
}

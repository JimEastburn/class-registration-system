import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { EnrollmentStatus } from '@/types';

interface EnrollmentStatusBadgeProps {
    status: EnrollmentStatus;
    waitlistPosition?: number | null;
}

const statusConfig: Record<
    EnrollmentStatus,
    { label: string; className: string }
> = {
    pending: {
        label: 'Pending Payment',
        className: 'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]',
    },
    confirmed: {
        label: 'Confirmed',
        className: 'border-[var(--status-confirmed-border)] bg-[var(--status-confirmed-bg)] text-[var(--status-confirmed-fg)]',
    },
    cancelled: {
        label: 'Cancelled',
        className: 'border-[var(--status-cancelled-border)] bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]',
    },
    waitlisted: {
        label: 'Waitlisted',
        className: 'border-[var(--status-waitlisted-border)] bg-[var(--status-waitlisted-bg)] text-[var(--status-waitlisted-fg)]',
    },
};

export function EnrollmentStatusBadge({
    status,
    waitlistPosition,
}: EnrollmentStatusBadgeProps) {
    const config = statusConfig[status] || { label: status, className: '' };

    if (status === 'waitlisted' && waitlistPosition) {
        return (
            <Badge variant="outline" className={config.className}>
                #{waitlistPosition} on Waitlist
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className={config.className}>
            {config.label}
        </Badge>
    );
}

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { EnrollmentStatus } from '@/types';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

interface EnrollmentStatusBadgeProps {
    status: EnrollmentStatus;
    waitlistPosition?: number | null;
}

const statusConfig: Record<
    EnrollmentStatus,
    { label: string; variant: BadgeVariant }
> = {
    pending: { label: 'Pending Payment', variant: 'outline' },
    confirmed: { label: 'Confirmed', variant: 'default' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
    waitlisted: { label: 'Waitlisted', variant: 'secondary' },
};

export function EnrollmentStatusBadge({
    status,
    waitlistPosition,
}: EnrollmentStatusBadgeProps) {
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };

    if (status === 'waitlisted' && waitlistPosition) {
        return (
            <Badge variant={config.variant}>
                #{waitlistPosition} on Waitlist
            </Badge>
        );
    }

    return <Badge variant={config.variant}>{config.label}</Badge>;
}

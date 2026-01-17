'use client';

import { useState } from 'react';
import { adminUpdatePayment } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminPaymentActionsProps {
    paymentId: string;
    currentStatus: string;
}

export default function AdminPaymentActions({
    paymentId,
    currentStatus,
}: AdminPaymentActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStatusChange = async (newStatus: 'pending' | 'completed' | 'failed' | 'refunded') => {
        setIsLoading(true);
        setError(null);
        const result = await adminUpdatePayment(paymentId, newStatus);
        if (result.error) {
            setError(result.error);
        }
        setIsLoading(false);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                    {isLoading ? '...' : 'Actions'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => handleStatusChange('pending')}
                    disabled={currentStatus === 'pending'}
                >
                    Set as Pending
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleStatusChange('completed')}
                    disabled={currentStatus === 'completed'}
                >
                    Set as Completed
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleStatusChange('failed')}
                    disabled={currentStatus === 'failed'}
                >
                    Set as Failed
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleStatusChange('refunded')}
                    disabled={currentStatus === 'refunded'}
                    className="text-purple-600"
                >
                    Mark as Refunded
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { RefundConfirmDialog } from './RefundConfirmDialog';

interface RefundButtonProps {
    paymentId: string;
    amount: number;
    currency: string;
    enrollmentId?: string;
}

export function RefundButton({ paymentId, amount, currency, enrollmentId }: RefundButtonProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
                <RotateCcw className="h-4 w-4 mr-1" />
                Refund
            </Button>

            <RefundConfirmDialog
                open={open}
                onOpenChange={setOpen}
                paymentId={paymentId}
                amount={amount}
                currency={currency}
                enrollmentId={enrollmentId}
            />
        </>
    );
}

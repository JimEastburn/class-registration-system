'use client';

import { useState } from 'react';
import { adminUpdatePayment } from '@/lib/actions/admin';
import { processRefund } from '@/lib/actions/refunds';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface AdminPaymentActionsProps {
    paymentId: string;
    currentStatus: string;
}

export default function AdminPaymentActions({
    paymentId,
    currentStatus,
}: AdminPaymentActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showRefundDialog, setShowRefundDialog] = useState(false);
    const [refundResult, setRefundResult] = useState<{ success?: boolean; error?: string } | null>(null);

    const handleStatusChange = async (newStatus: 'pending' | 'completed' | 'failed' | 'refunded') => {
        setIsLoading(true);
        await adminUpdatePayment(paymentId, newStatus);
        setIsLoading(false);
    };

    const handleRefund = async () => {
        setIsLoading(true);
        setRefundResult(null);

        const result = await processRefund(paymentId);
        setRefundResult(result);

        if (result.success) {
            setTimeout(() => {
                setShowRefundDialog(false);
                setRefundResult(null);
            }, 2000);
        }

        setIsLoading(false);
    };

    return (
        <>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowRefundDialog(true)}
                        disabled={currentStatus !== 'completed'}
                        className="text-purple-600 font-medium"
                    >
                        Process Refund via Stripe
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Refund</DialogTitle>
                        <DialogDescription>
                            This will issue a full refund through Stripe. The payment status will be updated to &quot;refunded&quot; and the enrollment will be set back to &quot;pending&quot;.
                        </DialogDescription>
                    </DialogHeader>

                    {refundResult?.success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg">
                            ✓ Refund processed successfully!
                        </div>
                    )}

                    {refundResult?.error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                            {refundResult.error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowRefundDialog(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRefund}
                            disabled={isLoading || refundResult?.success}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {isLoading ? 'Processing...' : 'Confirm Refund'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

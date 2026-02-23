'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { processRefund } from '@/lib/actions/refunds';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface RefundConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paymentId: string;
    amount: number; // in dollars (DB stores in dollars)
    currency: string;
}

export function RefundConfirmDialog({
    open,
    onOpenChange,
    paymentId,
    amount,
    currency
}: RefundConfirmDialogProps) {
    const [isPending, startTransition] = useTransition();
    // Default to full amount (already in dollars)
    const [refundAmount, setRefundAmount] = useState<string>(amount.toFixed(2));

    const handleRefund = () => {
        const refundDollars = parseFloat(refundAmount);
        const refundCents = Math.round(refundDollars * 100); // Stripe expects cents
        
        if (isNaN(refundDollars) || refundDollars <= 0 || refundDollars > amount) {
            toast.error('Invalid refund amount');
            return;
        }

        startTransition(async () => {
            const result = await processRefund({
                paymentId,
                amount: refundCents, // Stripe expects cents
                reason: 'requested_by_customer'
            });

            if (result.success) {
                toast.success('Refund processed successfully');
                onOpenChange(false);
            } else {
                toast.error(result.error || 'Failed to process refund');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Refund</DialogTitle>
                    <DialogDescription>
                        This will refund the payment via Stripe and cancel the enrollment if full refund.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount ({currency.toUpperCase()})
                        </Label>
                        <Input
                            id="amount"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className="col-span-3"
                            type="number"
                            step="0.01"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleRefund} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Refund
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

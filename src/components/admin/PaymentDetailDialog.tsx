'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PaymentWithDetails } from '@/lib/actions/payments';
import { Badge } from '@/components/ui/badge';

interface PaymentDetailDialogProps {
    payment: PaymentWithDetails | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PaymentDetailDialog({ payment, open, onOpenChange }: PaymentDetailDialogProps) {
    if (!payment) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Payment Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                            <p className="text-sm font-mono truncate" title={payment.stripe_payment_intent || ''}>
                                {payment.stripe_payment_intent || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                             <Badge variant={
                                payment.status === 'completed' ? 'default' :
                                payment.status === 'pending' ? 'secondary' :
                                'destructive'
                            }>
                                {payment.status}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Amount</p>
                            <p className="text-sm font-semibold">${(payment.amount / 100).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Date</p>
                            <p className="text-sm">{new Date(payment.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Enrollment Info</h4>
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="text-muted-foreground">Class:</span>
                                <span>{payment.enrollment?.class?.name}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="text-muted-foreground">Student:</span>
                                <span>{payment.enrollment?.student?.first_name} {payment.enrollment?.student?.last_name}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="text-muted-foreground">Parent:</span>
                                <span>{payment.enrollment?.student?.parent?.first_name} {payment.enrollment?.student?.parent?.last_name}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="text-muted-foreground">Email:</span>
                                <span>{payment.enrollment?.student?.parent?.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

'use client';

import { useState, useTransition } from 'react';
import { PaymentWithDetails, updatePaymentStatus } from '@/lib/actions/payments';
import { PaymentDetailDialog } from '@/components/admin/PaymentDetailDialog';
import { InvoiceButton } from '@/components/admin/payments/InvoiceButton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface PaymentTableProps {
    data: PaymentWithDetails[];
}

export function PaymentTable({ data }: PaymentTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleStatusUpdate = (id: string, status: 'pending' | 'completed' | 'failed' | 'refunded') => {
        startTransition(async () => {
             const result = await updatePaymentStatus(id, status);
             if (result.success) {
                 router.refresh();
             } else {
                 alert('Failed to update: ' + result.error);
             }
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount / 100);
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                                {payment.enrollment?.student?.parent?.first_name} {payment.enrollment?.student?.parent?.last_name}
                                <br />
                                <span className="text-xs text-muted-foreground">{payment.enrollment?.student?.parent?.email}</span>
                            </TableCell>
                            <TableCell>
                                {payment.enrollment?.student?.first_name} {payment.enrollment?.student?.last_name}
                            </TableCell>
                            <TableCell>
                                {payment.enrollment?.class?.name}
                            </TableCell>
                            <TableCell>
                                {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                                <Badge variant={
                                    payment.status === 'completed' ? 'default' :
                                    payment.status === 'pending' ? 'secondary' :
                                    'destructive'
                                }>
                                    {payment.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <InvoiceButton paymentId={payment.id} />
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            setSelectedPayment(payment);
                                            setDialogOpen(true);
                                        }}>
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(payment.id, 'completed')}>
                                            Mark Completed
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(payment.id, 'pending')}>
                                            Mark Pending
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(payment.id, 'refunded')}>
                                            Mark Refunded
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate(payment.id, 'failed')}>
                                            Mark Failed
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No payments found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <PaymentDetailDialog 
                payment={selectedPayment} 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
            />
        </div>
    );
}

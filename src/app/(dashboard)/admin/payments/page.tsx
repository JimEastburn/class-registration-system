import { Suspense } from 'react';
import { getAllPayments } from '@/lib/actions/payments';
import { PaymentTable } from '@/components/admin/PaymentTable';
import { Metadata } from 'next';
import { Payment } from '@/types';

export const metadata: Metadata = {
    title: 'Payment Management',
};

export default async function AdminPaymentsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    let status: Payment['status'] | undefined = undefined;
    
    if (typeof params.status === 'string' && ['pending', 'completed', 'failed', 'refunded'].includes(params.status)) {
        status = params.status as Payment['status'];
    }

    const { data: payments, count, error } = await getAllPayments({
        page,
        status,
        limit: 20, // Default limit per page
    });

    if (error) {
        return (
             <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                <h3 className="font-semibold">Error Loading Payments</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
                {/* Future: ExportButton, FilterControls */}
            </div>

            <Suspense fallback={<div className="text-center py-10 text-muted-foreground">Loading payments...</div>}>
                <PaymentTable data={payments} />
            </Suspense>
            
            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <div>
                     Showing {payments.length} record{payments.length !== 1 ? 's' : ''} (Total: {count})
                </div>
                {/* Future: Pagination Component */}
            </div>
        </div>
    );
}

'use client';

import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface InvoiceButtonProps {
    paymentId: string;
}

export function InvoiceButton({ paymentId }: InvoiceButtonProps) {
    const handleViewInvoice = () => {
        window.open(`/api/invoice?id=${paymentId}`, '_blank');
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleViewInvoice}
            className="w-full justify-start cursor-pointer"
        >
            <FileText className="h-4 w-4 mr-2" />
            View Invoice
        </Button>
    );
}

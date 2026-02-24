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
      className="w-full cursor-pointer justify-start"
    >
      <FileText className="mr-2 h-4 w-4" />
      View Invoice
    </Button>
  );
}

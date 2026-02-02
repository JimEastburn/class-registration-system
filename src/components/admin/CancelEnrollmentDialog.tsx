'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { adminCancelEnrollment } from '@/lib/actions/enrollments';
import { useRouter } from 'next/navigation';

interface CancelEnrollmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enrollmentId: string;
    studentName: string;
    className: string;
}

export function CancelEnrollmentDialog({ 
    open, 
    onOpenChange, 
    enrollmentId,
    studentName,
    className
}: CancelEnrollmentDialogProps) {
  const [refund, setRefund] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async () => {
      setLoading(true);
      setError(null);

      const result = await adminCancelEnrollment(enrollmentId, { refund });

      if (result.error) {
          setError(result.error);
      } else {
          onOpenChange(false);
          router.refresh();
      }
      setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Enrollment</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel {studentName}&apos;s enrollment in {className}?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="refund" checked={refund} onCheckedChange={(c) => setRefund(!!c)} />
            <Label htmlFor="refund" className="cursor-pointer">Process Refund via Stripe?</Label>
          </div>
          <p className="text-sm text-muted-foreground">
             Note: Refund processing depends on payment status. A full refund will be attempted if selected.
          </p>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Close</Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

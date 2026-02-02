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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { blockStudent } from '@/lib/actions/blocking';
// Use sonner for toast? `sonner.tsx` exists.
// Checking `package.json` earlier, user has `sonner`?
// `list_dir` showed `sonner.tsx`. This implies `sonner`.
import { toast } from 'sonner';

interface BlockStudentDialogProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  path?: string; // Optional path to revalidate
}

export function BlockStudentDialog({
  studentId,
  studentName,
  open,
  onOpenChange,
  onSuccess,
  path
}: BlockStudentDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      const result = await blockStudent(studentId, reason, path);
      
      if (result.success) {
        toast.success(`Blocked ${studentName}`);
        onOpenChange(false);
        setReason(''); // Reset
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || 'Failed to block student');
      }
    } catch (_err) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block Student</DialogTitle>
          <DialogDescription>
            Are you sure you want to block <strong>{studentName}</strong>? This will prevent them from enrolling in any of your future classes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Behavioral issues, non-payment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBlock} disabled={loading}>
            {loading ? 'Blocking...' : 'Block Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

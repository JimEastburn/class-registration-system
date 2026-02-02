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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminForceEnroll } from '@/lib/actions/enrollments';
import { useRouter } from 'next/navigation';

export function ForceEnrollDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleEnroll = async () => {
      setLoading(true);
      setError(null);

      const result = await adminForceEnroll({
          studentId,
          classId,
          bypassCapacity: true,
          bypassBlocks: true,
          adminId: 'current-user-inferred-on-server' // Action handles auth
      });

      if (result.error) {
          setError(result.error);
      } else {
          setOpen(false);
          setStudentId('');
          setClassId('');
          router.refresh();
      }
      setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Force Enroll</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Force Enroll Student</DialogTitle>
          <DialogDescription>
            Bypass capacity limits and blocks. Use with caution.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentId" className="text-right">
              Student ID
            </Label>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="classId" className="text-right">
              Class ID
            </Label>
            <Input
              id="classId"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="col-span-3"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleEnroll} disabled={loading}>
            {loading ? 'Enrolling...' : 'Force Enroll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

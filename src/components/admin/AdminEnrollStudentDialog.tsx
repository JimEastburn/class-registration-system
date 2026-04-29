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
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  adminEnrollStudent,
  getAdminEnrollmentStudentOptions,
  getAdminEnrollmentClassOptions,
  type AdminEnrollmentStudentOption,
  type AdminEnrollmentClassOption,
} from '@/lib/actions/enrollments';

interface AdminEnrollStudentDialogProps {
  trigger?: React.ReactNode;
}

export function AdminEnrollStudentDialog({
  trigger,
}: AdminEnrollStudentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<AdminEnrollmentStudentOption[]>([]);
  const [classes, setClasses] = useState<AdminEnrollmentClassOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadOptions() {
    setLoading(true);
    try {
      const [studentRes, classRes] = await Promise.all([
        getAdminEnrollmentStudentOptions(),
        getAdminEnrollmentClassOptions(),
      ]);

      if (studentRes.error || classRes.error) {
        toast.error('Failed to load options');
      }

      if (studentRes.data) setStudents(studentRes.data);
      if (classRes.data) setClasses(classRes.data);
    } catch {
      toast.error('Failed to load options');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!studentId || !classId) return;

    setSubmitting(true);
    const result = await adminEnrollStudent({ studentId, classId });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.status === 'waitlisted') {
      toast.success('Student has been added to the waitlist');
    } else if (result.status === 'reactivated') {
      toast.success('Enrollment reactivated');
    } else {
      toast.success('Enrollment created as pending');
    }

    setOpen(false);
    setStudentId('');
    setClassId('');
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) loadOptions();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Enroll Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enroll Student</DialogTitle>
          <DialogDescription>
            Select a student and a class to create an enrollment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="student-select">Student</Label>
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading students...
              </div>
            ) : (
              <select
                id="student-select"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="student-select"
              >
                <option value="">Select a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                    {s.parent_name ? ` (${s.parent_name})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-select">Class</Label>
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading classes...
              </div>
            ) : (
              <select
                id="class-select"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="class-select"
              >
                <option value="">Select a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.teacher_name ? ` - ${c.teacher_name}` : ''}
                    {c.day && c.block ? ` (${c.day} ${c.block})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || !studentId || !classId || loading}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

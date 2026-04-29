'use client';

import { useState, useEffect } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UserPlus, ChevronDown, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  adminEnrollStudent,
  getAdminEnrollmentStudentOptions,
  getAdminEnrollmentClassOptions,
  type AdminEnrollmentStudentOption,
  type AdminEnrollmentClassOption,
} from '@/lib/actions/enrollments';

interface SearchableSelectProps<T> {
  label: string;
  placeholder: string;
  value: string | null;
  onChange: (value: string) => void;
  options: T[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  renderOption: (option: T) => string;
  getOptionId: (option: T) => string;
  isLoading?: boolean;
}

function SearchableSelect<T>({
  label,
  placeholder,
  value,
  onChange,
  options,
  searchQuery,
  onSearchChange,
  renderOption,
  getOptionId,
  isLoading,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedLabel = value
    ? renderOption(options.find((o) => getOptionId(o) === value) as T)
    : placeholder;

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            className="w-full justify-between"
          >
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {selectedLabel}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              className="h-9 border-0 shadow-none focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <ScrollArea className="h-60">
            <div className="p-1">
              {isLoading ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  Loading...
                </div>
              ) : options.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  No {label.toLowerCase()} found.
                </div>
              ) : (
                options.map((option) => {
                  const id = getOptionId(option);
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        onChange(id);
                        setOpen(false);
                        onSearchChange('');
                      }}
                      className={cn(
                        'hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none',
                        value === id && 'bg-accent'
                      )}
                    >
                      {renderOption(option)}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface AdminEnrollStudentDialogProps {
  preselectedClassId?: string;
}

export function AdminEnrollStudentDialog({
  preselectedClassId,
}: AdminEnrollStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(
    preselectedClassId || null
  );
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<AdminEnrollmentStudentOption[]>([]);
  const [classes, setClasses] = useState<AdminEnrollmentClassOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function fetchOptions() {
      setIsLoadingStudents(true);
      setIsLoadingClasses(true);
      const [studentRes, classRes] = await Promise.all([
        getAdminEnrollmentStudentOptions(studentSearch || undefined),
        getAdminEnrollmentClassOptions(classSearch || undefined),
      ]);
      if (cancelled) return;
      setIsLoadingStudents(false);
      setIsLoadingClasses(false);
      if (studentRes.data) setStudents(studentRes.data);
      if (classRes.data) setClasses(classRes.data);
    }

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, [open, studentSearch, classSearch]);

  const handleEnroll = async () => {
    if (!studentId || !classId) return;

    setLoading(true);
    const result = await adminEnrollStudent({ studentId, classId });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const statusMessages: Record<string, string> = {
      pending: 'Enrollment created as pending.',
      waitlisted: 'Student added to the waitlist.',
      reactivated: 'Previous enrollment reactivated.',
    };

    toast.success(statusMessages[result.status || ''] || 'Enrollment created.');
    setOpen(false);
    setStudentId(null);
    setClassId(preselectedClassId || null);
    router.refresh();
  };

  const canSubmit = Boolean(studentId && classId && !loading);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Enroll Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enroll Student in Class</DialogTitle>
          <DialogDescription>
            Choose a student and a class to create an enrollment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <SearchableSelect
            label="Student"
            placeholder="Select a student..."
            value={studentId}
            onChange={setStudentId}
            options={students}
            searchQuery={studentSearch}
            onSearchChange={setStudentSearch}
            renderOption={(s) => `${s.first_name} ${s.last_name}`}
            getOptionId={(s) => s.id}
            isLoading={isLoadingStudents}
          />
          <SearchableSelect
            label="Class"
            placeholder="Select a class..."
            value={classId}
            onChange={setClassId}
            options={classes}
            searchQuery={classSearch}
            onSearchChange={setClassSearch}
            renderOption={(c) => c.name}
            getOptionId={(c) => c.id}
            isLoading={isLoadingClasses}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleEnroll} disabled={!canSubmit}>
            {loading ? 'Enrolling...' : 'Enroll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

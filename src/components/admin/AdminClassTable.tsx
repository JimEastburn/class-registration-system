'use client';

import { ClassWithTeacher } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition, useEffect } from 'react';
import { adminDeleteClass } from '@/lib/actions/classes';
import { toast } from 'sonner';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface AdminClassTableProps {
  initialClasses: ClassWithTeacher[];
  total: number;
  currentPage: number;
  limit: number;
  conflictClassIds?: string[];
}

export default function AdminClassTable({
  initialClasses,
  total,
  currentPage,
  limit,
  conflictClassIds = [],
}: AdminClassTableProps) {
  const conflictSet = new Set(conflictClassIds);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isSearchPending, startSearchTransition] = useTransition();
  // Resolve the search param to a plain string so effects can depend on it
  // by value (not object identity — useSearchParams returns a new instance
  // each render, which would otherwise re-fire effects every render).
  const urlSearchTerm = searchParams.get('search') || '';

  const [search, setSearch] = useState(urlSearchTerm);

  // Sync the input with the URL on browser back/forward navigation. Using the
  // "adjust state during render" pattern (React docs) rather than an effect
  // so we avoid a wasted commit. The early-return guard in the debounce effect
  // below prevents a feedback loop if the URL is what changed.
  const [prevUrlSearchTerm, setPrevUrlSearchTerm] = useState(urlSearchTerm);
  if (prevUrlSearchTerm !== urlSearchTerm) {
    setPrevUrlSearchTerm(urlSearchTerm);
    setSearch(urlSearchTerm);
  }

  // Debounced auto-search: update URL 300ms after user stops typing
  useEffect(() => {
    const term = search.trim();
    const currentTerm = urlSearchTerm;

    // Only trigger if the value actually changed
    if (term === currentTerm) return;

    const timeout = setTimeout(() => {
      startSearchTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
          params.set('search', term);
        } else {
          params.delete('search');
        }
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, urlSearchTerm, searchParams, pathname, router]);

  const handleClear = () => {
    setSearch('');
    startSearchTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('search');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const handleDelete = (classId: string) => {
    // In a real app, use a proper Dialog component instead of confirm
    if (!confirm('Are you sure you want to delete this class?')) return;

    startDeleteTransition(async () => {
      const res = await adminDeleteClass(classId);
      if (res.success) {
        toast.success('Class deleted successfully');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete class');
      }
    });
  };

  const totalPages = Math.ceil(total / limit);
  const showPagination = totalPages > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search classes..."
            className="pr-8 pl-8"
            data-testid="class-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isSearchPending && (
            <Loader2 className="text-muted-foreground absolute top-2.5 right-2.5 h-4 w-4 animate-spin" />
          )}
          {!isSearchPending && search && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5"
              data-testid="class-search-clear"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class Name</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Min Age</TableHead>
              <TableHead>Max Age</TableHead>
              <TableHead>Conflict</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialClasses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-24 text-center"
                >
                  No classes found.
                </TableCell>
              </TableRow>
            ) : (
              initialClasses.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>
                    {cls.teacher?.first_name} {cls.teacher?.last_name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        cls.status === 'published'
                          ? 'default'
                          : cls.status === 'draft'
                            ? 'secondary'
                            : cls.status === 'completed'
                              ? 'outline'
                              : 'destructive'
                      }
                    >
                      {cls.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{cls.capacity}</TableCell>
                  <TableCell>{cls.age_min ?? '—'}</TableCell>
                  <TableCell>{cls.age_max ?? '—'}</TableCell>
                  <TableCell>
                    {conflictSet.has(cls.id) ? (
                      <span className="text-destructive inline-flex items-center gap-1 text-xs font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-4 w-4 opacity-40" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/classes/${cls.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/classes/${cls.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cls.id)}
                        disabled={isDeletePending}
                      >
                        <Trash2 className="text-destructive h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {showPagination && (
          <div className="flex items-center justify-between border-t p-4">
            <div className="text-muted-foreground text-sm">
              Total Classes: {total}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.set('page', String(currentPage - 1));
                  router.push(`${pathname}?${p.toString()}`);
                }}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.set('page', String(currentPage + 1));
                  router.push(`${pathname}?${p.toString()}`);
                }}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {!showPagination && (
          <div className="text-muted-foreground p-4 text-center text-sm">
            Total Classes: {total}
          </div>
        )}
      </div>
    </div>
  );
}

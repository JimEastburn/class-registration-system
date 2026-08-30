'use client';

import type { ClassWithTeacherAndCount } from '@/lib/actions/classes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ClassCapacityBadge } from '@/components/classes/ClassCapacityBadge';
import { Button } from '@/components/ui/button';
import {
  Ban,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  CheckCircle2,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition, useEffect } from 'react';
import { adminDeleteClass, cancelClass } from '@/lib/actions/classes';
import { toast } from 'sonner';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination';
import {
  formatClassBlock,
  resolveClassSort,
  withClassListState,
  type ClassSortKey,
} from '@/lib/class-table';
import { ExportCsvButton } from '@/components/admin/ExportCsvButton';

/**
 * Columns that can be sorted, in the order they're shown. Conflict and Actions
 * are absent on purpose: a conflict comes from the scheduler's scan across the
 * whole catalog rather than from the class row, so the query can't order by it.
 */
const SORTABLE_COLUMNS: { key: ClassSortKey; label: string }[] = [
  { key: 'name', label: 'Class Name' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'block', label: 'Block' },
  { key: 'status', label: 'Status' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'waitlisted', label: 'Waitlisted' },
  { key: 'age_min', label: 'Min Age' },
  { key: 'age_max', label: 'Max Age' },
];

interface AdminClassTableProps {
  initialClasses: ClassWithTeacherAndCount[];
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

  // Changing page size invalidates the current offset, so go back to page 1.
  const handleLimitChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', value);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // The URL owns the sort so it survives refreshes and back/forward, and so the
  // server sorts every matching class rather than just this page's rows.
  const sort = resolveClassSort(
    searchParams.get('sort') ?? undefined,
    searchParams.get('dir') ?? undefined
  );

  // Re-sorting shuffles which rows land where, so the old offset is meaningless.
  const handleSort = (key: ClassSortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', key);
    params.set(
      'dir',
      sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc'
    );
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // Delete is offered for drafts only. deleteClass() hard-deletes a draft but
  // silently routes anything else into cancelClass(), so the old single
  // "Delete" button was really a cancel button wearing the wrong label and the
  // wrong warning ("cannot be undone" for an action that emails families).
  const handleDelete = (cls: ClassWithTeacherAndCount) => {
    // In a real app, use a proper Dialog component instead of confirm
    if (
      !confirm(
        `Permanently delete the draft "${cls.name}"? This cannot be undone.`
      )
    )
      return;

    startDeleteTransition(async () => {
      const res = await adminDeleteClass(cls.id);
      if (res.success) {
        toast.success('Class deleted successfully');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete class');
      }
    });
  };

  const handleCancel = (cls: ClassWithTeacherAndCount) => {
    const affected = cls.enrolled_count + cls.waitlisted_count;
    const consequence =
      affected > 0
        ? `This cancels ${affected} enrollment${affected === 1 ? '' : 's'} and emails the affected families.`
        : 'This class has no enrollments.';

    if (!confirm(`Cancel "${cls.name}"?\n\n${consequence}`)) return;

    startDeleteTransition(async () => {
      const res = await cancelClass(cls.id);
      if (res.success) {
        const count = res.data.affectedEnrollments;
        toast.success(
          count > 0
            ? `Class cancelled — ${count} enrollment${count === 1 ? '' : 's'} cancelled`
            : 'Class cancelled'
        );
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to cancel class');
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
        <div className="ml-auto">
          <ExportCsvButton
            type="classes"
            currentParams={searchParams.toString()}
            matchingCount={total}
            disabled={isSearchPending}
          />
        </div>
      </div>

      <div className="rounded-md border">
        {/* The header sticks to the top of this scroll area. It has to be its
            own scroll container: sticky positions against the nearest
            scrollport, and the table wrapper already scrolls horizontally. */}
        <Table containerClassName="max-h-[max(16rem,calc(100vh-20rem))] overflow-auto">
          {/* border-collapse (Tailwind preflight) drops a sticky cell's
              border-b as it detaches, so draw it with an inset shadow. */}
          <TableHeader className="[&_th]:bg-background [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:shadow-[inset_0_-1px_0_0_var(--border)]">
            <TableRow>
              {SORTABLE_COLUMNS.map((column) => {
                const isActive = sort?.key === column.key;
                const Icon =
                  isActive && sort.direction === 'desc'
                    ? ArrowDownAZ
                    : ArrowUpAZ;

                return (
                  <TableHead
                    key={column.key}
                    aria-sort={
                      isActive
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 px-2"
                      aria-label={`Sort by ${column.label} ${
                        isActive && sort.direction === 'asc'
                          ? 'descending'
                          : 'ascending'
                      }`}
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      <Icon
                        className={
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        }
                      />
                    </Button>
                  </TableHead>
                );
              })}
              <TableHead>Conflict</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialClasses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
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
                  <TableCell className="whitespace-nowrap">
                    {formatClassBlock(cls) ?? (
                      <span className="text-muted-foreground">TBD</span>
                    )}
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
                  <TableCell>
                    <ClassCapacityBadge
                      seatsTaken={cls.enrolled_count}
                      capacity={cls.capacity}
                      variant="compact"
                    />
                  </TableCell>
                  <TableCell>
                    {cls.waitlisted_count > 0 ? (
                      cls.waitlisted_count
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
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
                      {/* Both links carry the list state so the back link on
                          the page they open returns to this page of results. */}
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={withClassListState(
                            `/admin/classes/${cls.id}`,
                            searchParams
                          )}
                          aria-label={`View ${cls.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={withClassListState(
                            `/admin/classes/${cls.id}/edit`,
                            searchParams
                          )}
                          aria-label={`Edit ${cls.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      {cls.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cls)}
                          disabled={isDeletePending}
                          aria-label={`Delete ${cls.name}`}
                        >
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      )}
                      {(cls.status === 'published' ||
                        cls.status === 'completed') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(cls)}
                          disabled={isDeletePending}
                          aria-label={`Cancel ${cls.name}`}
                        >
                          <Ban className="text-destructive h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-muted-foreground text-sm">
              Total Classes: {total}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                Rows per page
              </span>
              <Select value={String(limit)} onValueChange={handleLimitChange}>
                <SelectTrigger
                  size="sm"
                  aria-label="Rows per page"
                  data-testid="rows-per-page"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {showPagination && (
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
          )}
        </div>
      </div>
    </div>
  );
}

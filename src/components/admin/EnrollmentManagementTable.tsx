'use client';

import { AdminEnrollmentView } from '@/lib/actions/enrollments';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MoreHorizontal, XCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ForceEnrollDialog } from './ForceEnrollDialog';
import { CancelEnrollmentDialog } from './CancelEnrollmentDialog';
import { adminRemoveEnrollment } from '@/lib/actions/enrollments';

interface EnrollmentManagementTableProps {
  enrollments: AdminEnrollmentView[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export function EnrollmentManagementTable({ enrollments, totalCount, currentPage, totalPages }: EnrollmentManagementTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [cancelData, setCancelData] = useState<{ id: string; name: string; className: string } | null>(null);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      if (name === 'search' || name === 'status') params.set('page', '1');
      return params.toString();
    },
    [searchParams]
  );
  
  const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to PERMANENTLY delete this enrollment? This action cannot be undone.')) return;
      const res = await adminRemoveEnrollment(id);
      if (res.error) alert(res.error);
      else router.refresh();
  };

  const handleSearch = (term: string) => {
      setSearch(term);
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
          params.set('search', term);
      } else {
          params.delete('search');
      }
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
  }

  const handleStatusChange = (status: string) => {
      setStatusFilter(status);
      router.replace(pathname + '?' + createQueryString('status', status));
  }

  const handlePageChange = (newPage: number) => {
      router.push(pathname + '?' + createQueryString('page', newPage.toString()));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search student name..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch(search);
                    }}
                />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleSearch(search)}>Search</Button>
          </div>
          <ForceEnrollDialog />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No enrollments found.
                    </TableCell>
                </TableRow>
            ) : (
                enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                        <TableCell>
                            <div className="font-medium">{enrollment.student.first_name} {enrollment.student.last_name}</div>
                        </TableCell>
                        <TableCell>
                            {enrollment.class?.name || 'Unknown Class'}
                        </TableCell>
                        <TableCell>
                             {enrollment.student.parent 
                                ? `${enrollment.student.parent.first_name} ${enrollment.student.parent.last_name}`
                                : 'N/A'
                             }
                        </TableCell>
                        <TableCell>
                            <StatusBadge status={enrollment.status} />
                        </TableCell>
                        <TableCell>{new Date(enrollment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(enrollment.id)}>
                                        Copy ID
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-yellow-600" onClick={() => setCancelData({
                                        id: enrollment.id,
                                        name: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
                                        className: enrollment.class?.name || 'Unknown Class'
                                    })}>
                                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(enrollment.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Hard Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {cancelData && (
          <CancelEnrollmentDialog 
            open={!!cancelData} 
            onOpenChange={(open) => !open && setCancelData(null)}
            enrollmentId={cancelData.id}
            studentName={cancelData.name}
            className={cancelData.className}
          />
      )}

      <div className="flex items-center justify-end space-x-2">
           <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
           >
            Previous
           </Button>
           <div className="text-sm font-medium">Page {currentPage} of {Math.max(1, totalPages)} (Total: {totalCount})</div>
           <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
           >
            Next
           </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        confirmed: "default",
        pending: "secondary",
        waitlisted: "outline",
        cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
}

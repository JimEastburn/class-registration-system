'use client';

import { AuditLog } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface AuditLogTableProps {
  data: AuditLog[];
  count: number;
  page: number;
  limit: number;
}

export function AuditLogTable({
  data,
  count,
  page,
  limit,
}: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for filters
  const [userId, setUserId] = useState(searchParams.get('userId') || '');
  const [action, setAction] = useState(searchParams.get('action') || '');
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') || ''
  );
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  const totalPages = Math.ceil(count / limit);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    // Reset to page 1 on filter change
    params.set('page', '1');

    if (userId) params.set('userId', userId);
    if (action) params.set('action', action);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    setUserId('');
    setAction('');
    setStartDate('');
    setEndDate('');
    router.push('?page=1');
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-muted/20 flex flex-wrap gap-4 rounded-md border p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="userId" className="text-sm font-medium">
            User ID
          </label>
          <Input
            id="userId"
            placeholder="Search User ID..."
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="bg-background w-[200px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="action" className="text-sm font-medium">
            Action
          </label>
          <Input
            id="action"
            placeholder="Search Action..."
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="bg-background w-[200px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-sm font-medium">
            Start Date
          </label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-background w-[160px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="text-sm font-medium">
            End Date
          </label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-background w-[160px]"
          />
        </div>
        <div className="ml-auto flex items-end gap-2">
          <Button variant="outline" onClick={clearFilters}>
            Clear
          </Button>
          <Button onClick={applyFilters}>Apply Filters</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Type</TableHead>
              <TableHead>Target ID</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="p-2 font-mono text-xs">
                    {log.user_id}
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.target_type}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.target_id}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground max-w-[200px] truncate text-xs"
                    title={JSON.stringify(log.details, null, 2)}
                  >
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="text-muted-foreground text-sm">
          Page {page} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PhotoConsentActivityLogPage } from '@/types';

export function PhotoConsentActivityLog({
  activityLog,
  activityLogError,
}: {
  activityLog: PhotoConsentActivityLogPage | null;
  activityLogError: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('photoConsentLogPage', String(page));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Photo Consent Activity Log</h2>
        <p className="text-muted-foreground text-sm">
          Consent and removal history submitted by parents and guardians.
        </p>
      </div>

      {activityLogError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          {activityLogError}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Date / Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!activityLog || activityLog.entries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No photo consent activity yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  activityLog.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge
                          variant={
                            entry.action === 'consent' ? 'default' : 'secondary'
                          }
                        >
                          {entry.action === 'consent'
                            ? 'Consent'
                            : 'Removed consent'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.parent_name}
                      </TableCell>
                      <TableCell>{entry.student_name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {activityLog && (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activityLog.currentPage <= 1 || isPending}
                onClick={() => handlePageChange(activityLog.currentPage - 1)}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {activityLog.currentPage} of{' '}
                {Math.max(1, activityLog.totalPages)} (Total:{' '}
                {activityLog.totalCount})
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  activityLog.currentPage >= activityLog.totalPages || isPending
                }
                onClick={() => handlePageChange(activityLog.currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

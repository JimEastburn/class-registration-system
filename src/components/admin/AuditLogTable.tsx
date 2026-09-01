'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { AuditLogWithUser } from '@/types';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExportCsvButton } from '@/components/admin/ExportCsvButton';

interface AuditLogTableProps {
  data: AuditLogWithUser[];
  count: number;
  page: number;
  limit: number;
}

interface ChangeSummary {
  label: string;
  before: unknown;
  after: unknown;
}

function humanize(value: string | null): string {
  if (!value) return 'Not recorded';

  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .trim()
    .toLowerCase();

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : value;
}

function formatDetailValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'Not recorded';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function formatChangeValue(value: unknown): string {
  if (typeof value === 'string' && /^[a-z][a-z0-9_-]*$/.test(value)) {
    return humanize(value);
  }
  return formatDetailValue(value);
}

function formatAuditDate(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
  });
}

function actorDetails(log: AuditLogWithUser): {
  name: string;
  email: string | null;
} {
  const name = [log.profiles?.first_name, log.profiles?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (name) return { name, email: log.profiles?.email || null };
  if (log.profiles?.email) {
    return { name: log.profiles.email, email: null };
  }
  if (log.user_id) return { name: 'Unknown user', email: null };
  return { name: 'System', email: null };
}

function getChangeSummaries(
  details: Record<string, unknown> | null
): ChangeSummary[] {
  if (!details) return [];

  const summaries: ChangeSummary[] = [];
  const knownPairs: Array<[string, string, string]> = [
    ['Status', 'old_status', 'new_status'],
    ['Role', 'old_role', 'new_role'],
    ['Status', 'oldStatus', 'newStatus'],
    ['Role', 'oldRole', 'newRole'],
  ];

  for (const [label, oldKey, newKey] of knownPairs) {
    if (oldKey in details && newKey in details) {
      summaries.push({
        label,
        before: details[oldKey],
        after: details[newKey],
      });
    }
  }

  for (const [key, value] of Object.entries(details)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'old' in value &&
      'new' in value
    ) {
      const change = value as { old: unknown; new: unknown };
      summaries.push({
        label: humanize(key),
        before: change.old,
        after: change.new,
      });
    }
  }

  return summaries;
}

function detailsSummary(log: AuditLogWithUser): string {
  const change = getChangeSummaries(log.details)[0];
  if (change) {
    return `${change.label}: ${formatChangeValue(change.before)} → ${formatChangeValue(change.after)}`;
  }

  if (!log.details || Object.keys(log.details).length === 0) {
    return 'No additional details';
  }

  return Object.entries(log.details)
    .slice(0, 2)
    .map(([key, value]) => `${humanize(key)}: ${formatDetailValue(value)}`)
    .join(' · ');
}

export function AuditLogTable({
  data,
  count,
  page,
  limit,
}: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [actor, setActor] = useState(searchParams.get('actor') || '');
  const [action, setAction] = useState(searchParams.get('action') || '');
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') || ''
  );
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [selectedLog, setSelectedLog] = useState<AuditLogWithUser | null>(null);

  const totalPages = Math.ceil(count / limit);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('page', '1');

    if (actor.trim()) params.set('actor', actor.trim());
    if (action.trim()) params.set('action', action.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    setActor('');
    setAction('');
    setStartDate('');
    setEndDate('');
    router.push('?page=1');
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/20 flex flex-wrap gap-4 rounded-md border p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="actor" className="text-sm font-medium">
            Person
          </label>
          <Input
            id="actor"
            placeholder="Search name or email..."
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            className="bg-background w-[240px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="action" className="text-sm font-medium">
            Action
          </label>
          <Input
            id="action"
            placeholder="Search action..."
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="bg-background w-[200px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-sm font-medium">
            Start date
          </label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="bg-background w-[160px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="text-sm font-medium">
            End date
          </label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="bg-background w-[160px]"
          />
        </div>
        <div className="ml-auto flex items-end gap-2">
          <Button variant="outline" onClick={clearFilters}>
            Clear
          </Button>
          <Button onClick={applyFilters}>Apply filters</Button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-sm">
          Select a row to see the complete audit record and recorded changes.
        </p>
        <ExportCsvButton
          type="audit"
          currentParams={searchParams.toString()}
          matchingCount={count}
          matchingLabel={`Export ${count} matching audit ${count === 1 ? 'log' : 'logs'}`}
          allLabel="Export all audit logs"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>
                <span className="sr-only">View details</span>
              </TableHead>
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
              data.map((log) => {
                const actorInfo = actorDetails(log);
                return (
                  <TableRow
                    key={log.id}
                    tabIndex={0}
                    aria-label={`View audit details for ${humanize(log.action)} by ${actorInfo.name}`}
                    aria-haspopup="dialog"
                    className="focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => setSelectedLog(log)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedLog(log);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap">
                      {formatAuditDate(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{actorInfo.name}</div>
                      {actorInfo.email && (
                        <div className="text-muted-foreground text-xs">
                          {actorInfo.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {humanize(log.action)}
                    </TableCell>
                    <TableCell>{humanize(log.target_type)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[360px] truncate">
                      {detailsSummary(log)}
                    </TableCell>
                    <TableCell className="w-8 text-right">
                      <ChevronRight
                        aria-hidden="true"
                        className="text-muted-foreground size-4"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
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

      <AuditLogDetailDialog
        log={selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      />
    </div>
  );
}

function AuditLogDetailDialog({
  log,
  onOpenChange,
}: {
  log: AuditLogWithUser | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!log) return null;

  const actor = actorDetails(log);
  const changes = getChangeSummaries(log.details);

  return (
    <Dialog open={!!log} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit log details</DialogTitle>
          <DialogDescription>
            Complete record of {humanize(log.action).toLowerCase()} by{' '}
            {actor.name}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <Detail label="Person" value={actor.name} />
              <Detail label="Email" value={actor.email || 'Not recorded'} />
              <Detail
                label="Date and time"
                value={formatAuditDate(log.created_at)}
              />
              <Detail label="Action" value={humanize(log.action)} />
              <Detail label="Target type" value={humanize(log.target_type)} />
              <Detail
                label="Target ID"
                value={log.target_id || 'Not recorded'}
                monospace
              />
              <Detail
                label="User ID"
                value={log.user_id || 'System action'}
                monospace
              />
              <Detail label="Audit log ID" value={log.id} monospace />
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">What changed</h3>
              {changes.length > 0 ? (
                <div className="space-y-2">
                  {changes.map((change, index) => (
                    <div
                      key={`${change.label}-${index}`}
                      className="bg-muted/40 grid gap-2 rounded-md border p-3 sm:grid-cols-[120px_1fr_auto_1fr] sm:items-center"
                    >
                      <span className="font-medium">{change.label}</span>
                      <code className="break-words whitespace-pre-wrap">
                        {formatChangeValue(change.before)}
                      </code>
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground"
                      >
                        →
                      </span>
                      <code className="break-words whitespace-pre-wrap">
                        {formatChangeValue(change.after)}
                      </code>
                    </div>
                  ))}
                </div>
              ) : log.details && Object.keys(log.details).length > 0 ? (
                <dl className="divide-y rounded-md border">
                  {Object.entries(log.details).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid gap-1 p-3 sm:grid-cols-[180px_1fr]"
                    >
                      <dt className="text-muted-foreground text-sm font-medium">
                        {humanize(key)}
                      </dt>
                      <dd className="font-mono text-xs break-words whitespace-pre-wrap">
                        {formatDetailValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No change details were recorded for this action.
                </p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Raw details</h3>
              {log.details && Object.keys(log.details).length > 0 ? (
                <pre className="bg-muted/40 overflow-x-auto rounded-md border p-4 text-xs whitespace-pre-wrap">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No additional details were recorded for this action.
                </p>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <div
        className={
          monospace
            ? 'font-mono text-xs break-all'
            : 'text-sm font-medium break-words'
        }
      >
        {value}
      </div>
    </div>
  );
}

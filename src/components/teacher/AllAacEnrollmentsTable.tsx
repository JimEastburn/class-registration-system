'use client';

import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AllAacEnrollmentReportRow } from '@/lib/actions/classes';

interface AllAacEnrollmentsTableProps {
  rows: AllAacEnrollmentReportRow[];
}

type SortKey = keyof Pick<
  AllAacEnrollmentReportRow,
  | 'className'
  | 'teacherName'
  | 'capacity'
  | 'enrolledCount'
  | 'waitlistedCount'
  | 'block'
  | 'daysOffered'
>;

type SortDirection = 'asc' | 'desc';

interface SortableColumn {
  key: SortKey;
  label: string;
  align?: 'left' | 'right';
}

const columns: SortableColumn[] = [
  { key: 'className', label: 'Class Name' },
  { key: 'teacherName', label: 'Teacher Name' },
  { key: 'capacity', label: 'Capacity', align: 'right' },
  { key: 'enrolledCount', label: 'Enrolled', align: 'right' },
  { key: 'waitlistedCount', label: 'Waitlisted', align: 'right' },
  { key: 'block', label: 'Block' },
  { key: 'daysOffered', label: 'Days Offered' },
];

function compareValues(
  a: AllAacEnrollmentReportRow,
  b: AllAacEnrollmentReportRow,
  key: SortKey,
  direction: SortDirection
) {
  const aValue = a[key];
  const bValue = b[key];
  const modifier = direction === 'asc' ? 1 : -1;

  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return (aValue - bValue) * modifier;
  }

  return (
    String(aValue).localeCompare(String(bValue), undefined, {
      numeric: true,
      sensitivity: 'base',
    }) * modifier
  );
}

export function AllAacEnrollmentsTable({ rows }: AllAacEnrollmentsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('className');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          capacity: acc.capacity + row.capacity,
          enrolledCount: acc.enrolledCount + row.enrolledCount,
          waitlistedCount: acc.waitlistedCount + row.waitlistedCount,
        }),
        { capacity: 0, enrolledCount: 0, waitlistedCount: 0 }
      ),
    [rows]
  );

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const result = compareValues(a, b, sortKey, sortDirection);
        return result === 0
          ? a.className.localeCompare(b.className, undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          : result;
      }),
    [rows, sortDirection, sortKey]
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center justify-center py-12 text-sm">
          No published classes found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table data-testid="all-aac-enrollments-table">
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const isActive = column.key === sortKey;
              const Icon =
                isActive && sortDirection === 'desc' ? ArrowDownAZ : ArrowUpAZ;

              return (
                <TableHead
                  key={column.key}
                  className={column.align === 'right' ? 'text-right' : ''}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={
                      column.align === 'right' ? 'ml-auto h-8 px-2' : 'h-8 px-2'
                    }
                    aria-label={`Sort by ${column.label} ${
                      isActive && sortDirection === 'asc'
                        ? 'descending'
                        : 'ascending'
                    }`}
                    aria-sort={
                      isActive
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.className}</TableCell>
              <TableCell>{row.teacherName}</TableCell>
              <TableCell className="text-right">{row.capacity}</TableCell>
              <TableCell className="text-right">{row.enrolledCount}</TableCell>
              <TableCell className="text-right">
                {row.waitlistedCount}
              </TableCell>
              <TableCell>{row.block}</TableCell>
              <TableCell>{row.daysOffered}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell>Total</TableCell>
            <TableCell />
            <TableCell className="text-right">{totals.capacity}</TableCell>
            <TableCell className="text-right">{totals.enrolledCount}</TableCell>
            <TableCell className="text-right">
              {totals.waitlistedCount}
            </TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}

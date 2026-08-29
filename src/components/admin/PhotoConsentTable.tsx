'use client';

import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
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
import type { PhotoConsentRosterMember } from '@/lib/actions/admin';

interface PhotoConsentTableProps {
  rows: PhotoConsentRosterMember[];
}

type SortKey = keyof Pick<
  PhotoConsentRosterMember,
  'studentName' | 'grade' | 'parentName' | 'parentEmail' | 'photoConsent'
>;

type SortDirection = 'asc' | 'desc';

interface SortableColumn {
  key: SortKey;
  label: string;
}

const columns: SortableColumn[] = [
  { key: 'studentName', label: 'Student' },
  { key: 'grade', label: 'Grade' },
  { key: 'parentName', label: 'Parent or Guardian' },
  { key: 'parentEmail', label: 'Email' },
  { key: 'photoConsent', label: 'Photo Consent' },
];

function compareValues(
  a: PhotoConsentRosterMember,
  b: PhotoConsentRosterMember,
  key: SortKey,
  direction: SortDirection
) {
  const modifier = direction === 'asc' ? 1 : -1;

  if (key === 'photoConsent') {
    return (Number(a.photoConsent) - Number(b.photoConsent)) * modifier;
  }

  return (
    String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    }) * modifier
  );
}

export function PhotoConsentTable({ rows }: PhotoConsentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('studentName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const result = compareValues(a, b, sortKey, sortDirection);
        return result === 0
          ? a.studentName.localeCompare(b.studentName, undefined, {
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

  return (
    <Table data-testid="photo-consent-table">
      <TableHeader>
        <TableRow>
          {columns.map((column) => {
            const isActive = column.key === sortKey;
            const Icon =
              isActive && sortDirection === 'desc' ? ArrowDownAZ : ArrowUpAZ;

            return (
              <TableHead key={column.key}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
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
        {sortedRows.map((student) => (
          <TableRow key={student.id} data-testid="photo-consent-row">
            <TableCell className="font-medium">{student.studentName}</TableCell>
            <TableCell>{student.grade || '—'}</TableCell>
            <TableCell>{student.parentName}</TableCell>
            <TableCell>{student.parentEmail}</TableCell>
            <TableCell>
              <Badge variant={student.photoConsent ? 'default' : 'secondary'}>
                {student.photoConsent ? 'Granted' : 'Not granted'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

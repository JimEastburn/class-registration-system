'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ExportScope, ExportType } from '@/lib/exports/export-data';
import { buildExportUrl, hasExportFilters } from '@/lib/exports/export-url';

interface ExportCsvButtonProps {
  type: ExportType;
  currentParams: string;
  matchingCount?: number;
  fixedParams?: Record<string, string>;
  buttonLabel?: string;
  matchingLabel?: string;
  allLabel?: string;
  disabled?: boolean;
}

function downloadFilename(response: Response, type: ExportType): string {
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || `${type}_export.csv`;
}

export function ExportCsvButton({
  type,
  currentParams,
  matchingCount,
  fixedParams,
  buttonLabel = 'Export CSV',
  matchingLabel,
  allLabel,
  disabled = false,
}: ExportCsvButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const hasFilters = hasExportFilters(type, currentParams, fixedParams);

  const download = async (scope: ExportScope) => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        buildExportUrl({ type, scope, currentParams, fixedParams }),
        { cache: 'no-store' }
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || 'Export failed');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = downloadFilename(response, type);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const icon = isDownloading ? (
    <Loader2 className="animate-spin" />
  ) : (
    <Download />
  );

  if (!hasFilters) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => void download('all')}
        disabled={disabled || isDownloading}
      >
        {icon}
        {allLabel || `Export all ${type}`}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isDownloading}
        >
          {icon}
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={matchingCount === 0}
          onClick={() => void download('matching')}
        >
          {matchingLabel ||
            `Export${matchingCount === undefined ? '' : ` ${matchingCount}`} matching ${type}`}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void download('all')}>
          {allLabel || `Export all ${type}`}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

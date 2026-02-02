'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportData } from '@/lib/actions/export';

export function ExportButton() {
  const [isPending, startTransition] = useTransition();

  const handleExport = (type: 'classes' | 'enrollments' | 'users') => {
    startTransition(async () => {
      try {
        const result = await exportData(type);
        if (!result.success) {
          toast.error(result.error || 'Failed to export data');
          return;
        }

        const { csv, filename } = result.data;
        
        // Trigger download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`Exported ${type} successfully`);
      } catch (error) {
        console.error('Export error:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending} className="gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('classes')}>
          Export Classes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('enrollments')}>
          Export Enrollments
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('users')}>
          Export Users
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

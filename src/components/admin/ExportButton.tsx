'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function ExportButton() {
  const handleExport = (type: string) => {
    window.location.href = `/api/export?type=${type}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('users')}>
          Export Users
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('classes')}>
          Export Classes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('enrollments')}>
          Export Enrollments
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('payments')}>
          Export Payments
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

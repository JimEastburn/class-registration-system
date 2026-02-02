'use client';

import { useState } from 'react';
import { MoreHorizontal, Ban, UserMinus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StudentActionMenuProps {
  classId: string;
  studentId: string;
  studentName: string;
  isBlocked?: boolean;
  parentEmail?: string;
  onBlock?: (studentId: string) => void;
  onRemove?: (studentId: string) => void;
}

export function StudentActionMenu({
  classId,
  studentId,
  studentName,
  isBlocked = false,
  parentEmail,
  onBlock,
  onRemove,
}: StudentActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmailParent = () => {
    if (parentEmail) {
      window.location.href = `mailto:${parentEmail}`;
    }
  };

  const handleBlock = () => {
    if (onBlock) {
      onBlock(studentId);
    }
    setIsOpen(false);
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(studentId);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label={`Actions for ${studentName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {parentEmail && (
          <DropdownMenuItem onClick={handleEmailParent}>
            <Mail className="mr-2 h-4 w-4" />
            Email Parent
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleBlock} className="text-yellow-600">
          <Ban className="mr-2 h-4 w-4" />
          Block Student
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRemove} className="text-red-600">
          <UserMinus className="mr-2 h-4 w-4" />
          Remove from Class
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Users,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import type { Class } from '@/types';
import { deleteClass, publishClass, cancelClass, completeClass } from '@/lib/actions/classes';
import { formatCurrency } from '@/lib/utils';

interface ClassWithTeacher extends Class {
  teacher: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface ClassManagementTableProps {
  classes: ClassWithTeacher[];
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  active: { label: 'Active', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'outline' },
};

export function ClassManagementTable({ classes }: ClassManagementTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithTeacher | null>(null);
  const [actionType, setActionType] = useState<'delete' | 'publish' | 'cancel' | 'complete' | null>(null);

  const handleAction = async () => {
    if (!selectedClass || !actionType) return;

    startTransition(async () => {
      let result;
      switch (actionType) {
        case 'delete':
          result = await deleteClass(selectedClass.id);
          break;
        case 'publish':
          result = await publishClass(selectedClass.id);
          break;
        case 'cancel':
          result = await cancelClass(selectedClass.id);
          break;
        case 'complete':
          result = await completeClass(selectedClass.id);
          break;
      }

      if (result?.success) {
        router.refresh();
      }
      setDeleteDialogOpen(false);
      setSelectedClass(null);
      setActionType(null);
    });
  };

  const openConfirmDialog = (cls: ClassWithTeacher, action: typeof actionType) => {
    setSelectedClass(cls);
    setActionType(action);
    setDeleteDialogOpen(true);
  };

  const getDialogContent = () => {
    if (!actionType || !selectedClass) return { title: '', description: '' };

    switch (actionType) {
      case 'delete':
        return {
          title: 'Delete Class',
          description: selectedClass.status === 'draft'
            ? `Are you sure you want to permanently delete "${selectedClass.name}"? This action cannot be undone.`
            : `"${selectedClass.name}" will be cancelled. This action cannot be undone.`,
        };
      case 'publish':
        return {
          title: 'Publish Class',
          description: `Are you sure you want to publish "${selectedClass.name}"? Students will be able to enroll once published.`,
        };
      case 'cancel':
        return {
          title: 'Cancel Class',
          description: `Are you sure you want to cancel "${selectedClass.name}"? All enrollments will be cancelled and students will be notified.`,
        };
      case 'complete':
        return {
          title: 'Complete Class',
          description: `Mark "${selectedClass.name}" as completed? This indicates the class has finished.`,
        };
      default:
        return { title: '', description: '' };
    }
  };

  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t created any classes yet.
          </p>
          <Button asChild>
            <Link href="/teacher/classes/new">Create Your First Class</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const dialogContent = getDialogContent();

  return (
    <>
      <Card>
        <Table data-testid="class-management-table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls) => (
              <TableRow 
                key={cls.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/teacher/classes/${cls.id}`)}
                data-testid={`class-row-${cls.id}`}
              >
                <TableCell className="font-medium">{cls.name}</TableCell>
                <TableCell>
                  {cls.day ? (
                    <span>
                      {cls.day} • {cls.block || 'TBD'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">To Be Announced</span>
                  )}
                </TableCell>
                <TableCell>{cls.capacity}</TableCell>
                <TableCell>{formatCurrency(cls.price, true)}</TableCell>
                <TableCell>
                  <Badge variant={statusConfig[cls.status]?.variant || 'outline'}>
                    {statusConfig[cls.status]?.label || cls.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={isPending} data-testid="class-actions-trigger">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/teacher/classes/${cls.id}`}>
                          <span className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/teacher/classes/${cls.id}`}>
                          <span className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            View Roster
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/teacher/classes/${cls.id}/edit`}>
                          <span className="flex items-center">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {cls.status === 'draft' && (
                        <DropdownMenuItem
                          onClick={() => openConfirmDialog(cls, 'publish')}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Publish
                        </DropdownMenuItem>
                      )}
                      {cls.status === 'published' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => openConfirmDialog(cls, 'complete')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Complete
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openConfirmDialog(cls, 'cancel')}
                            className="text-destructive"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openConfirmDialog(cls, 'delete')}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isPending}
              className={actionType === 'delete' || actionType === 'cancel' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

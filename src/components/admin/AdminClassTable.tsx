'use client';

import { ClassWithTeacher } from '@/types';
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
import { Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useTransition } from 'react';
import { adminDeleteClass } from '@/lib/actions/classes';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AdminClassTableProps {
  initialClasses: ClassWithTeacher[];
  total: number;
  currentPage: number;
  limit: number;
}

export default function AdminClassTable({ 
  initialClasses, 
  total, 
  currentPage, 
  limit 
}: AdminClassTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (classId: string) => {
    // In a real app, use a proper Dialog component instead of confirm
    if (!confirm('Are you sure you want to delete this class?')) return;

    startTransition(async () => {
      const res = await adminDeleteClass(classId);
      if (res.success) {
        toast.success('Class deleted successfully');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete class');
      }
    });
  };

  const totalPages = Math.ceil(total / limit);
  const showPagination = totalPages > 1;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class Name</TableHead>
            <TableHead>Teacher</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialClasses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                No classes found.
              </TableCell>
            </TableRow>
          ) : (
            initialClasses.map((cls) => (
              <TableRow key={cls.id}>
                <TableCell className="font-medium">{cls.name}</TableCell>
                <TableCell>
                  {cls.teacher?.first_name} {cls.teacher?.last_name}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    cls.status === 'published' ? 'default' :
                    cls.status === 'draft' ? 'secondary' :
                    cls.status === 'completed' ? 'outline' : 'destructive'
                  }>
                    {cls.status}
                  </Badge>
                </TableCell>
                <TableCell>{cls.capacity}</TableCell>
                <TableCell>{formatCurrency(cls.price)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/classes/${cls.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/classes/${cls.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(cls.id)}
                        disabled={isPending}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {showPagination && (
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Total Classes: {total}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`?page=${currentPage - 1}`)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`?page=${currentPage + 1}`)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
      {!showPagination && (
         <div className="p-4 text-sm text-muted-foreground text-center">
            Total Classes: {total}
         </div>
      )}
    </div>
  );
}

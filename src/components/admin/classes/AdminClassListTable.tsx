'use client';

import { Class } from '@/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteClass } from '@/lib/actions/classes';
import { toast } from 'sonner';

interface AdminClassListTableProps {
    classes: (Class & { teacher: { first_name: string; last_name: string } | null })[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
}

export function AdminClassListTable({ classes, totalCount, currentPage, totalPages }: AdminClassListTableProps) {
    const router = useRouter();

    const handleDelete = async (classId: string) => {
        if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) return;
        
        const result = await deleteClass(classId);
        if (result.success) {
            toast.success('Class deleted'); 
            router.refresh();
        } else {
            toast.error(result.error || 'Failed to delete class');
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Capacity</TableHead>
                             <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No classes found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            classes.map((cls) => (
                                <TableRow key={cls.id}>
                                    <TableCell className="font-medium">
                                        {cls.name} {/* Interface says 'name' now? Check type definition View 4 */}
                                        {/* View 4 result: 'name: string; // Renamed from title' */}
                                        {/* But 'getStudentSchedule' used 'title: event.class?.title'. Use 'name' per interface. */}
                                    </TableCell>
                                    <TableCell>
                                        {cls.teacher ? `${cls.teacher.first_name} ${cls.teacher.last_name}` : 'Unassigned'}
                                    </TableCell>
                                    <TableCell>
                                        {cls.day || 'TBD'} - {cls.block || 'TBD'}
                                    </TableCell>
                                    <TableCell>
                                        {cls.capacity}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={cls.status === 'published' ? 'default' : 'secondary'}>{cls.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Link href={`/admin/classes/${cls.id}/edit`}>
                                            <Button variant="ghost" size="icon">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cls.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
             <div className="flex items-center justify-end space-x-2">
                 {/* Pagination buttons reusing logic */}
                <div className="text-sm font-medium">Page {currentPage} of {Math.max(1, totalPages)} (Total: {totalCount})</div>
            </div>
        </div>
    );
}

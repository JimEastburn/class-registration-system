'use client';

import { useState } from 'react';
import { adminUpdateClass, adminDeleteClass } from '@/lib/actions/admin';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface AdminClassActionsProps {
    classId: string;
    currentStatus: string;
}

export default function AdminClassActions({ classId, currentStatus }: AdminClassActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStatusChange = async (newStatus: string) => {
        setIsLoading(true);
        setError(null);
        const result = await adminUpdateClass(classId, { status: newStatus });
        if (result.error) {
            setError(result.error);
        }
        setIsLoading(false);
    };

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        const result = await adminDeleteClass(classId);
        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            setDeleteOpen(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isLoading}>
                        {isLoading ? '...' : 'Actions'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/class_scheduler/classes/${classId}/edit`}>
                            Edit Class
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => handleStatusChange('draft')}
                        disabled={currentStatus === 'draft'}
                    >
                        Set as Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleStatusChange('active')}
                        disabled={currentStatus === 'active'}
                    >
                        Set as Active
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleStatusChange('completed')}
                        disabled={currentStatus === 'completed'}
                    >
                        Set as Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleStatusChange('cancelled')}
                        disabled={currentStatus === 'cancelled'}
                    >
                        Set as Cancelled
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-red-600"
                    >
                        Delete Class
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Class</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this class? This will also delete
                            all associated enrollments and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                            {isLoading ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

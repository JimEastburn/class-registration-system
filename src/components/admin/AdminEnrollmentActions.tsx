'use client';

import { useState } from 'react';
import { adminUpdateEnrollment, adminDeleteEnrollment } from '@/lib/actions/admin';
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

interface AdminEnrollmentActionsProps {
    enrollmentId: string;
    currentStatus: string;
}

export default function AdminEnrollmentActions({
    enrollmentId,
    currentStatus,
}: AdminEnrollmentActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStatusChange = async (newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
        setIsLoading(true);
        setError(null);
        const result = await adminUpdateEnrollment(enrollmentId, newStatus);
        if (result.error) {
            setError(result.error);
        }
        setIsLoading(false);
    };

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        const result = await adminDeleteEnrollment(enrollmentId);
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
                    <DropdownMenuItem
                        onClick={() => handleStatusChange('pending')}
                        disabled={currentStatus === 'pending'}
                    >
                        Set as Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleStatusChange('confirmed')}
                        disabled={currentStatus === 'confirmed'}
                    >
                        Set as Confirmed
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
                        Delete Enrollment
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Enrollment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this enrollment? This action cannot be undone.
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

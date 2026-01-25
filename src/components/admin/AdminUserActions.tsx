'use client';

import { useState } from 'react';
import { updateUserRole, deleteUser } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

interface AdminUserActionsProps {
    userId: string;
    currentRole: string;
}

export default function AdminUserActions({ userId, currentRole }: AdminUserActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRoleChange = async (newRole: 'parent' | 'teacher' | 'student' | 'admin' | 'class_scheduler') => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await updateUserRole(userId, newRole);
            if (result.error) {
                setError(result.error);
                toast.error('Failed to update role', {
                    description: result.error,
                });
            } else {
                toast.success('Role updated successfully');
            }
        } catch (err) {
            console.error('Unexpected error updating role:', err);
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        setError(null);
        const result = await deleteUser(userId);
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
                        onClick={() => handleRoleChange('parent')}
                        disabled={currentRole === 'parent'}
                    >
                        Set as Parent
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleRoleChange('teacher')}
                        disabled={currentRole === 'teacher'}
                    >
                        Set as Teacher
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleRoleChange('student')}
                        disabled={currentRole === 'student'}
                    >
                        Set as Student
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleRoleChange('admin')}
                        disabled={currentRole === 'admin'}
                    >
                        Set as Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleRoleChange('class_scheduler')}
                        disabled={currentRole === 'class_scheduler'}
                    >
                        Set as Class Scheduler
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-red-600"
                    >
                        Delete User
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this user? This action cannot be undone
                            and will remove all associated data.
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

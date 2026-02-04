'use client';

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
import { UserRole } from '@/types';
import { useState } from 'react';
import { updateUserRole } from '@/lib/actions/admin';
import { toast } from 'sonner';

interface ChangeRoleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    newRole: UserRole;
    currentRole: UserRole;
    onSuccess: () => void;
}

export function ChangeRoleDialog({ open, onOpenChange, userId, newRole, currentRole, onSuccess }: ChangeRoleDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const { success, error } = await updateUserRole(userId, newRole);
            if (success) {
                toast.success(`Role updated to ${newRole}`);
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(error || 'Failed to update role');
            }
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent data-testid="change-role-dialog">
                <AlertDialogHeader>
                    <AlertDialogTitle>Change User Role?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to change this user&apos;s role from <span className="font-semibold">{currentRole}</span> to <span className="font-semibold">{newRole}</span>?
                        This may grant or revoke access to sensitive features.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading} data-testid="change-role-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirm(); }} disabled={loading} data-testid="change-role-confirm">
                        {loading ? 'Updating...' : 'Confirm'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

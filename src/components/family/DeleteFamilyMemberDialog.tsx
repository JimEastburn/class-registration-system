'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteFamilyMember } from '@/lib/actions/family';
import { Loader2 } from 'lucide-react';

interface DeleteFamilyMemberDialogProps {
    memberId: string;
    memberName: string;
    children: React.ReactNode;
}

export function DeleteFamilyMemberDialog({
    memberId,
    memberName,
    children,
}: DeleteFamilyMemberDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleDelete() {
        setIsLoading(true);

        try {
            const { success, error } = await deleteFamilyMember(memberId);

            if (error) {
                toast.error(error);
                return;
            }

            if (success) {
                toast.success(`${memberName} has been removed from your family.`);
                setOpen(false);
            }
        } catch {
            toast.error('An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove <strong>{memberName}</strong> from
                        your family? This action cannot be undone. Any active enrollments
                        for this family member will also be affected.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

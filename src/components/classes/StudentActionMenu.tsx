'use client';

import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Ban, UserCheck } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { blockStudent, unblockStudent } from '@/lib/actions/classes';

interface StudentActionMenuProps {
    classId: string;
    studentId: string;
    studentName: string;
    isBlocked: boolean;
}

export function StudentActionMenu({
    classId,
    studentId,
    studentName,
    isBlocked,
}: StudentActionMenuProps) {
    const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleBlock = async () => {
        setIsLoading(true);
        try {
            const result = await blockStudent(classId, studentId, reason);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Blocked ${studentName} successfully`);
                setIsBlockDialogOpen(false);
                setReason('');
            }
        } catch {
            toast.error('Failed to block student');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnblock = async () => {
        setIsLoading(true);
        try {
            const result = await unblockStudent(classId, studentId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Unblocked ${studentName} successfully`);
            }
        } catch {
            toast.error('Failed to unblock student');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isBlocked ? (
                        <DropdownMenuItem onClick={handleUnblock}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Unblock Student
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem
                            onClick={() => setIsBlockDialogOpen(true)}
                            className="text-red-600 focus:text-red-600"
                        >
                            <Ban className="mr-2 h-4 w-4" />
                            Block from Class
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Block {studentName}</DialogTitle>
                        <DialogDescription>
                            Blocking this student will cancel their current enrollment effectively immediately.
                            They will not be able to re-enroll in this class.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason for blocking</Label>
                            <Textarea
                                id="reason"
                                placeholder="e.g. Disciplinary action, non-payment..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsBlockDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBlock}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Blocking...' : 'Block Student'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

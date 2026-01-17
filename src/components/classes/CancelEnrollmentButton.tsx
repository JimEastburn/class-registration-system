'use client';

import { useState } from 'react';
import { cancelEnrollment } from '@/lib/actions/enrollments';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface CancelEnrollmentButtonProps {
    enrollmentId: string;
    className: string;
}

export default function CancelEnrollmentButton({
    enrollmentId,
    className,
}: CancelEnrollmentButtonProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCancel = async () => {
        setIsLoading(true);
        setError(null);
        const result = await cancelEnrollment(enrollmentId);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            setOpen(false);
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    Cancel
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancel Enrollment</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to cancel the enrollment in &quot;{className}&quot;?
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Keep Enrollment
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Cancelling...' : 'Cancel Enrollment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

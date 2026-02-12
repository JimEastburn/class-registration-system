'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EnrollmentTable } from './EnrollmentTable';
import { cancelEnrollment } from '@/lib/actions/enrollments';
import type { Enrollment } from '@/types';

interface EnrollmentWithClass extends Enrollment {
    class: {
        id: string;
        name: string;
        teacher_id: string;
        price: number;
    } | null;
}

interface EnrollmentListClientProps {
    enrollments: EnrollmentWithClass[];
}

export function EnrollmentListClient({
    enrollments: initialEnrollments,
}: EnrollmentListClientProps) {
    const [enrollments, setEnrollments] = useState(initialEnrollments);

    async function handleCancel(enrollmentId: string) {

        const { success, error } = await cancelEnrollment(enrollmentId);

        if (error || !success) {
            toast.error(error || 'Failed to cancel enrollment');
        } else {
            toast.success('Enrollment cancelled successfully');
            setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
        }
    }

    return (
        <EnrollmentTable
            enrollments={enrollments}
            onCancel={handleCancel}
            showStudent={false}
        />
    );
}

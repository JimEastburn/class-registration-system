'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEnrollment } from '@/lib/actions/enrollments';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

interface EnrollmentFormProps {
    classId: string;
    students: {
        id: string;
        first_name: string;
        last_name: string;
        grade_level: string | null;
    }[];
}

export default function EnrollmentForm({ classId, students }: EnrollmentFormProps) {
    const router = useRouter();
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleEnroll = async () => {
        if (!selectedStudent) {
            setError('Please select a student');
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await createEnrollment(selectedStudent, classId);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            setSuccess(true);
            setIsLoading(false);
            setTimeout(() => {
                router.push('/parent/enrollments');
            }, 2000);
        }
    };

    if (success) {
        return (
            <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <p className="font-medium text-green-600">Enrollment Successful!</p>
                <p className="text-sm text-slate-500 mt-1">
                    Redirecting to your enrollments...
                </p>
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="text-center py-4">
                <p className="text-slate-600 mb-3">
                    You need to add a child to your family before enrolling.
                </p>
                <Link href="/parent/family/add">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                        Add Family Member
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Select Student
                </label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choose a child to enroll" />
                    </SelectTrigger>
                    <SelectContent>
                        {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                                {student.first_name} {student.last_name}
                                {student.grade_level && ` (Grade ${student.grade_level})`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={handleEnroll}
                disabled={isLoading || !selectedStudent}
            >
                {isLoading ? 'Enrolling...' : 'Enroll Now'}
            </Button>

            <p className="text-xs text-slate-500 text-center">
                By enrolling, you agree to pay the class fee before the first session.
            </p>
        </div>
    );
}

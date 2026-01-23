import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import CancelEnrollmentButton from '@/components/classes/CancelEnrollmentButton';
import PayButton, { PaymentAlert } from '@/components/payments/PayButton';
import { Suspense } from 'react';
import EnrollmentStatusLegend from '@/components/admin/EnrollmentStatusLegend';

export const metadata = {
    title: 'My Enrollments | Class Registration System',
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

export default async function EnrollmentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get all family members for this parent
    const { data: familyMembers } = await supabase
        .from('family_members')
        .select('id')
        .eq('parent_id', user?.id);

    const familyMemberIds = familyMembers?.map((fm) => fm.id) || [];

    // Get all enrollments for family members
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      enrolled_at,
      student:family_members(first_name, last_name, grade_level),
      class:classes(
        id,
        name,
        schedule,
        location,
        start_date,
        fee,
        teacher:profiles!classes_teacher_id_fkey(first_name, last_name)
      )
    `)
        .in('student_id', familyMemberIds)
        .order('enrolled_at', { ascending: false });

    // Group enrollments by status
    const activeEnrollments = enrollments?.filter(
        (e) => e.status === 'pending' || e.status === 'confirmed'
    ) || [];
    const pastEnrollments = enrollments?.filter(
        (e) => e.status === 'cancelled' || e.status === 'completed'
    ) || [];

    return (
        <div className="space-y-6">
            <Suspense fallback={null}>
                <PaymentAlert />
            </Suspense>
            <div>
                <h2 className="text-xl font-semibold">My Enrollments</h2>
                <p className="text-slate-500">Track your children&apos;s class enrollments</p>
            </div>

            <EnrollmentStatusLegend />

            {/* Active Enrollments */}
            <div>
                <h3 className="text-lg font-medium mb-4">Active Enrollments</h3>
                {activeEnrollments.length > 0 ? (
                    <div className="grid gap-4">
                        {activeEnrollments.map((enrollment) => {
                            const student = enrollment.student as unknown as {
                                first_name: string;
                                last_name: string;
                                grade_level: string | null;
                            };
                            const classData = enrollment.class as unknown as {
                                id: string;
                                name: string;
                                schedule: string;
                                location: string;
                                start_date: string;
                                fee: number;
                                teacher: { first_name: string; last_name: string };
                            };

                            return (
                                <Card key={enrollment.id} className="border-0 shadow-lg">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-semibold text-lg">{classData.name}</h4>
                                                    <Badge
                                                        className={statusColors[enrollment.status as keyof typeof statusColors]}
                                                    >
                                                        {enrollment.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-slate-500 text-sm mb-2">
                                                    Student: {student.first_name} {student.last_name}
                                                    {student.grade_level && ` (Grade ${student.grade_level})`}
                                                </p>
                                                <div className="grid sm:grid-cols-3 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-slate-500">Schedule:</span>{' '}
                                                        {classData.schedule}
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">Location:</span>{' '}
                                                        {classData.location}
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">Teacher:</span>{' '}
                                                        {classData.teacher.first_name} {classData.teacher.last_name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <p className="text-xl font-bold">${classData.fee.toFixed(2)}</p>
                                                {enrollment.status === 'pending' && (
                                                    <div className="flex flex-col gap-2">
                                                        <PayButton
                                                            enrollmentId={enrollment.id}
                                                            className={classData.name}
                                                            amount={classData.fee}
                                                        />
                                                        <CancelEnrollmentButton
                                                            enrollmentId={enrollment.id}
                                                            className={classData.name}
                                                        />
                                                    </div>
                                                )}
                                                {enrollment.status === 'confirmed' && (
                                                    <Badge variant="outline" className="text-green-600">
                                                        Paid
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="border-0 shadow-lg">
                        <CardContent className="text-center py-8">
                            <p className="text-slate-500 mb-4">No active enrollments.</p>
                            <Link href="/parent/classes">
                                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                                    Browse Classes
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Past Enrollments */}
            {pastEnrollments.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium mb-4">Past Enrollments</h3>
                    <div className="grid gap-4">
                        {pastEnrollments.map((enrollment) => {
                            const student = enrollment.student as unknown as {
                                first_name: string;
                                last_name: string;
                            };
                            const classData = enrollment.class as unknown as {
                                name: string;
                            };

                            return (
                                <Card key={enrollment.id} className="border-0 shadow-lg opacity-75">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{classData.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {student.first_name} {student.last_name}
                                                </p>
                                            </div>
                                            <Badge
                                                className={statusColors[enrollment.status as keyof typeof statusColors]}
                                            >
                                                {enrollment.status}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

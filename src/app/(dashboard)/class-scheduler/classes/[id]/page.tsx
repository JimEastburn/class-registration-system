
import { SchedulerClassForm } from '@/components/class-scheduler/SchedulerClassForm';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getClassRoster } from '@/lib/actions/enrollments';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { EnrollmentStatusBadge } from '@/components/classes/EnrollmentStatusBadge';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: PageProps) {
    const { id } = await params;
    
    // We can fetch directly or reuse action if it supported fetching one.
    // getClassesForScheduler returns list.
    // I'll assume I can fetch one via Supabase directly here for simplicity or add getClass to API.
    // Using direct fetch for server component is fine.
    const supabase = await createClient();
    const { data: cls } = await supabase.from('classes').select('*').eq('id', id).single();
    const adminClient = await createAdminClient();
    const { data: syllabus } = await adminClient
        .from('class_materials')
        .select('file_url')
        .eq('class_id', id)
        .eq('title', 'Syllabus')
        .eq('type', 'link')
        .maybeSingle();
    const rosterResult = await getClassRoster(id);
    const enrollments = rosterResult.data || [];

    if (!cls) {
        notFound();
    }

    return (
        <div className="container mx-auto py-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-6">Edit Class</h1>
                <SchedulerClassForm
                    initialData={cls}
                    initialSyllabusUrl={syllabus?.file_url || null}
                    isEdit={true}
                />
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Enrolled Students</h2>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Parent/Guardian</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Waitlist</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrollments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No students enrolled.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                enrollments.map((enrollment) => (
                                    <TableRow key={enrollment.id}>
                                        <TableCell className="font-medium">
                                            {enrollment.student.first_name} {enrollment.student.last_name}
                                        </TableCell>
                                        <TableCell>
                                            {enrollment.student.parent
                                                ? `${enrollment.student.parent.first_name} ${enrollment.student.parent.last_name}`
                                                : 'Unknown'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span>{enrollment.student.parent?.email}</span>
                                                <span className="text-muted-foreground">{enrollment.student.parent?.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <EnrollmentStatusBadge
                                                status={enrollment.status}
                                                waitlistPosition={enrollment.waitlist_position}
                                            />
                                        </TableCell>
                                        <TableCell>{enrollment.waitlist_position || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

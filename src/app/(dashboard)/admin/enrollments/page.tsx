import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AdminEnrollmentActions from '@/components/admin/AdminEnrollmentActions';

export const metadata = {
    title: 'Enrollment Management | Admin Portal',
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

export default async function AdminEnrollmentsPage() {
    const supabase = await createClient();

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
      *,
      student:family_members(first_name, last_name),
      class:classes(name)
    `)
        .order('enrolled_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Enrollment Management</h2>
                <p className="text-slate-500">View and manage all enrollments</p>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>All Enrollments ({enrollments?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Enrolled On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrollments?.map((enrollment) => {
                                const student = enrollment.student as unknown as { first_name: string; last_name: string };
                                const classData = enrollment.class as unknown as { name: string };
                                return (
                                    <TableRow key={enrollment.id}>
                                        <TableCell className="font-medium">
                                            {student.first_name} {student.last_name}
                                        </TableCell>
                                        <TableCell>{classData.name}</TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[enrollment.status as keyof typeof statusColors]}>
                                                {enrollment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AdminEnrollmentActions
                                                enrollmentId={enrollment.id}
                                                currentStatus={enrollment.status}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

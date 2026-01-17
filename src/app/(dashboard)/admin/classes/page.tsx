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
import AdminClassActions from '@/components/admin/AdminClassActions';

export const metadata = {
    title: 'Class Management | Admin Portal',
};

const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

export default async function AdminClassesPage() {
    const supabase = await createClient();

    const { data: classes } = await supabase
        .from('classes')
        .select(`
      *,
      teacher:profiles!classes_teacher_id_fkey(first_name, last_name)
    `)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Class Management</h2>
                <p className="text-slate-500">View and manage all classes</p>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>All Classes ({classes?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Class Name</TableHead>
                                <TableHead>Teacher</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Enrollment</TableHead>
                                <TableHead>Fee</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes?.map((classItem) => {
                                const teacher = classItem.teacher as unknown as { first_name: string; last_name: string };
                                return (
                                    <TableRow key={classItem.id}>
                                        <TableCell className="font-medium">{classItem.name}</TableCell>
                                        <TableCell>
                                            {teacher.first_name} {teacher.last_name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[classItem.status as keyof typeof statusColors]}>
                                                {classItem.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {classItem.current_enrollment}/{classItem.max_students}
                                        </TableCell>
                                        <TableCell>${classItem.fee.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <AdminClassActions
                                                classId={classItem.id}
                                                currentStatus={classItem.status}
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

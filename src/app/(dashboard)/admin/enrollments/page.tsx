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
import { ResponsiveTable } from '@/components/ui/responsive-table';
import AdminEnrollmentActions from '@/components/admin/AdminEnrollmentActions';
import { SearchBar, FilterSelect, ClearFilters } from '@/components/admin/SearchFilters';

export const metadata = {
    title: 'Enrollment Management | Admin Portal',
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' },
];

interface PageProps {
    searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminEnrollmentsPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;
    const searchQuery = params.q || '';
    const statusFilter = params.status || '';

    let query = supabase
        .from('enrollments')
        .select(`
      *,
      student:family_members(first_name, last_name),
      class:classes(name)
    `)
        .order('enrolled_at', { ascending: false });

    // Apply status filter
    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }

    const { data: enrollments } = await query;

    // Client-side search filter for student/class names (Supabase can't search joined tables easily)
    const filteredEnrollments = searchQuery
        ? enrollments?.filter((enrollment) => {
            const student = enrollment.student as unknown as { first_name: string; last_name: string };
            const classData = enrollment.class as unknown as { name: string };
            const searchLower = searchQuery.toLowerCase();
            return (
                `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchLower) ||
                classData.name.toLowerCase().includes(searchLower)
            );
        })
        : enrollments;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Enrollment Management</h2>
                <p className="text-slate-500">View and manage all enrollments</p>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle>All Enrollments ({filteredEnrollments?.length || 0})</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <SearchBar placeholder="Search student or class..." />
                            <FilterSelect
                                options={statusOptions}
                                paramName="status"
                                placeholder="All Statuses"
                                allLabel="All Statuses"
                            />
                            <ClearFilters paramNames={['q', 'status']} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveTable>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead className="hidden sm:table-cell">Class</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Enrolled On</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEnrollments?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                            No enrollments found matching your criteria
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredEnrollments?.map((enrollment) => {
                                    const student = enrollment.student as unknown as { first_name: string; last_name: string };
                                    const classData = enrollment.class as unknown as { name: string };
                                    return (
                                        <TableRow key={enrollment.id}>
                                            <TableCell className="font-medium">
                                                <div>
                                                    {student.first_name} {student.last_name}
                                                    <div className="sm:hidden text-xs text-slate-500 truncate max-w-[120px]">
                                                        {classData.name}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">{classData.name}</TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[enrollment.status as keyof typeof statusColors]}>
                                                    {enrollment.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
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
                    </ResponsiveTable>
                </CardContent>
            </Card>
        </div>
    );
}

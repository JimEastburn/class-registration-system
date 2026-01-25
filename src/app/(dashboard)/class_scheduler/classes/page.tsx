import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import AdminClassActions from '@/components/admin/AdminClassActions';
import { SearchBar, FilterSelect, ClearFilters } from '@/components/admin/SearchFilters';
import ClassStatusLegend from '@/components/admin/ClassStatusLegend';

export const metadata = {
    title: 'Class Management | Class Scheduler',
};

const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' },
];

interface PageProps {
    searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function ClassSchedulerClassesPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;
    const searchQuery = params.q || '';
    const statusFilter = params.status || '';

    let query = supabase
        .from('classes')
        .select(`
      *,
      teacher:profiles!classes_teacher_id_fkey(first_name, last_name)
    `)
        .order('created_at', { ascending: false });

    // Apply search filter
    if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
    }

    // Apply status filter
    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }

    const { data: classes } = await query;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold">Class Management</h2>
                    <p className="text-slate-500">View and manage all classes</p>
                </div>
                <Link href="/class_scheduler/classes/new">
                    <Button>+ New Class</Button>
                </Link>
            </div>

            <ClassStatusLegend />

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle>All Classes ({classes?.length || 0})</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <SearchBar placeholder="Search classes..." />
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
                                    <TableHead>Class Name</TableHead>
                                    <TableHead className="hidden sm:table-cell">Teacher</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Enrollment</TableHead>
                                    <TableHead>Fee</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classes?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                            No classes found matching your criteria
                                        </TableCell>
                                    </TableRow>
                                )}
                                {classes?.map((classItem) => {
                                    const teacher = classItem.teacher as unknown as { first_name: string; last_name: string };
                                    return (
                                        <TableRow key={classItem.id}>
                                            <TableCell className="font-medium">
                                                <div>
                                                    {classItem.name}
                                                    <div className="sm:hidden text-xs text-slate-500">
                                                        {teacher.first_name} {teacher.last_name}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                {teacher?.first_name} {teacher?.last_name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[classItem.status as keyof typeof statusColors]}>
                                                    {classItem.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
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
                    </ResponsiveTable>
                </CardContent>
            </Card>
        </div>
    );
}

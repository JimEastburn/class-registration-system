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
import AdminPaymentActions from '@/components/admin/AdminPaymentActions';
import { SearchBar, FilterSelect, ClearFilters } from '@/components/admin/SearchFilters';

export const metadata = {
    title: 'Payment Management | Admin Portal',
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-purple-100 text-purple-700',
};

const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
];

interface PageProps {
    searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;
    const searchQuery = params.q || '';
    const statusFilter = params.status || '';

    let query = supabase
        .from('payments')
        .select(`
      *,
      enrollment:enrollments(
        student:family_members(first_name, last_name),
        class:classes(name)
      )
    `)
        .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }

    const { data: payments } = await query;

    // Client-side search filter for student/class names
    const filteredPayments = searchQuery
        ? payments?.filter((payment) => {
            const enrollment = payment.enrollment as unknown as {
                student: { first_name: string; last_name: string };
                class: { name: string };
            };
            const searchLower = searchQuery.toLowerCase();
            return (
                `${enrollment?.student?.first_name} ${enrollment?.student?.last_name}`.toLowerCase().includes(searchLower) ||
                enrollment?.class?.name?.toLowerCase().includes(searchLower)
            );
        })
        : payments;

    // Calculate totals
    const totalRevenue = payments?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Payment Management</h2>
                <p className="text-slate-500">View and manage all payments</p>
            </div>

            {/* Revenue Summary */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <CardContent className="py-6">
                    <p className="text-green-100">Total Revenue</p>
                    <p className="text-3xl sm:text-4xl font-bold">${totalRevenue.toFixed(2)}</p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle>All Payments ({filteredPayments?.length || 0})</CardTitle>
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
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                            No payments found matching your criteria
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredPayments?.map((payment) => {
                                    const enrollment = payment.enrollment as unknown as {
                                        student: { first_name: string; last_name: string };
                                        class: { name: string };
                                    };
                                    return (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-medium">
                                                <div>
                                                    {enrollment?.student?.first_name} {enrollment?.student?.last_name}
                                                    <div className="sm:hidden text-xs text-slate-500 truncate max-w-[100px]">
                                                        {enrollment?.class?.name}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">{enrollment?.class?.name}</TableCell>
                                            <TableCell>${payment.amount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[payment.status as keyof typeof statusColors]}>
                                                    {payment.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {new Date(payment.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <AdminPaymentActions
                                                    paymentId={payment.id}
                                                    currentStatus={payment.status}
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

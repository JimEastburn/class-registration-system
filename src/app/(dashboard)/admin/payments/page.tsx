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
import AdminPaymentActions from '@/components/admin/AdminPaymentActions';

export const metadata = {
    title: 'Payment Management | Admin Portal',
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-purple-100 text-purple-700',
};

export default async function AdminPaymentsPage() {
    const supabase = await createClient();

    const { data: payments } = await supabase
        .from('payments')
        .select(`
      *,
      enrollment:enrollments(
        student:family_members(first_name, last_name),
        class:classes(name)
      )
    `)
        .order('created_at', { ascending: false });

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
                    <p className="text-4xl font-bold">${totalRevenue.toFixed(2)}</p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>All Payments ({payments?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments?.map((payment) => {
                                const enrollment = payment.enrollment as unknown as {
                                    student: { first_name: string; last_name: string };
                                    class: { name: string };
                                };
                                return (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">
                                            {enrollment?.student?.first_name} {enrollment?.student?.last_name}
                                        </TableCell>
                                        <TableCell>{enrollment?.class?.name}</TableCell>
                                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[payment.status as keyof typeof statusColors]}>
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
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
                </CardContent>
            </Card>
        </div>
    );
}

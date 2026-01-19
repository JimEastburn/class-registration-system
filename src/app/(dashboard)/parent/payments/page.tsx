import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const metadata = {
    title: 'Payment History | Parent Portal',
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-purple-100 text-purple-700',
};

export default async function PaymentHistoryPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get all family members for this parent
    const { data: familyMembers } = await supabase
        .from('family_members')
        .select('id')
        .eq('parent_id', user.id);

    const familyMemberIds = familyMembers?.map(fm => fm.id) || [];

    // Get all enrollments for family members
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id')
        .in('student_id', familyMemberIds);

    const enrollmentIds = enrollments?.map(e => e.id) || [];

    // Get all payments for these enrollments
    const { data: payments } = await supabase
        .from('payments')
        .select(`
            *,
            enrollment:enrollments(
                student:family_members(first_name, last_name),
                class:classes(name, fee)
            )
        `)
        .in('enrollment_id', enrollmentIds)
        .order('created_at', { ascending: false });

    // Calculate totals
    const totalPaid = payments?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

    const totalPending = payments?.filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

    const refundedAmount = payments?.filter(p => p.status === 'refunded')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Payment History</h2>
                <p className="text-slate-500">View all your payment transactions</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="pt-6">
                        <p className="text-green-100 text-sm">Total Paid</p>
                        <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                    <CardContent className="pt-6">
                        <p className="text-yellow-100 text-sm">Pending</p>
                        <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="pt-6">
                        <p className="text-purple-100 text-sm">Refunded</p>
                        <p className="text-2xl font-bold">${refundedAmount.toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Payment List */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>All Transactions ({payments?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    {payments?.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            No payment history yet
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {payments?.map((payment) => {
                                const enrollment = payment.enrollment as unknown as {
                                    student: { first_name: string; last_name: string };
                                    class: { name: string; fee: number };
                                };

                                return (
                                    <div
                                        key={payment.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 rounded-lg gap-3"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {enrollment?.class?.name}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {enrollment?.student?.first_name} {enrollment?.student?.last_name}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {new Date(payment.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Badge className={statusColors[payment.status as keyof typeof statusColors]}>
                                                {payment.status}
                                            </Badge>
                                            <span className={`text-lg font-semibold ${payment.status === 'refunded' ? 'text-purple-600 line-through' : ''
                                                }`}>
                                                ${payment.amount.toFixed(2)}
                                            </span>
                                            <Link
                                                href={`/api/invoice?id=${payment.id}`}
                                                target="_blank"
                                                className="text-sm text-purple-600 hover:text-purple-800 underline"
                                            >
                                                Invoice
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-0 shadow-lg bg-slate-50">
                <CardContent className="py-4">
                    <p className="text-sm text-slate-600">
                        <strong>Need help?</strong> If you have questions about a payment or need to request a refund,
                        please contact us at <a href="mailto:support@example.com" className="text-purple-600 underline">support@example.com</a>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

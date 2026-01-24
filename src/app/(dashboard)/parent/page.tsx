import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
    title: 'Parent Dashboard | Class Registration System',
};

export default async function ParentDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch family members for this parent
    const { data: familyMembers, count: familyCount } = await supabase
        .from('family_members')
        .select('id', { count: 'exact' })
        .eq('parent_id', user?.id);

    const familyMemberIds = familyMembers?.map((fm) => fm.id) || [];

    // Fetch active enrollments for this parent's family members only
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      class:classes(name, teacher_id)
    `)
        .in('student_id', familyMemberIds)
        .in('status', ['pending', 'confirmed']);

    const activeEnrollments = enrollments?.length || 0;

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">
                    Hi {user?.user_metadata?.first_name}!
                </h2>
                <p className="text-purple-100">
                    Manage your family and class enrollments from your dashboard.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Family Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{familyCount || 0}</div>
                        <Link href="/parent/family">
                            <Button variant="link" className="p-0 h-auto text-purple-600">
                                Manage family →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Active Enrollments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{activeEnrollments}</div>
                        <Link href="/parent/enrollments">
                            <Button variant="link" className="p-0 h-auto text-purple-600">
                                View enrollments →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Browse Classes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 text-sm mb-2">
                            Find and enroll in new classes
                        </p>
                        <Link href="/parent/classes">
                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                                Browse Classes
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Link href="/parent/family/add">
                        <Button variant="outline">+ Add Family Member</Button>
                    </Link>
                    <Link href="/parent/classes">
                        <Button variant="outline">Browse Classes</Button>
                    </Link>
                    <Link href="/parent/payments">
                        <Button variant="outline">View Payment History</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}

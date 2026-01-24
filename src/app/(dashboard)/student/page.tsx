import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import RedeemInviteCodeForm from '@/components/family/RedeemInviteCodeForm';

export const metadata = {
    title: 'Student Dashboard | Class Registration System',
};

export default async function StudentDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if student is linked to a family member
    const { data: familyMember } = await supabase
        .from('family_members')
        .select('id, first_name, last_name')
        .eq('user_id', user?.id)
        .single();

    const isLinked = !!familyMember;

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">
                    Hi {user?.user_metadata?.first_name}!
                </h2>
                <p className="text-green-100">
                    {isLinked
                        ? 'View your class schedule and materials.'
                        : 'Link your account to see your enrolled classes.'}
                </p>
            </div>

            {/* Link Account Section - Show if not linked */}
            {!isLinked && (
                <div className="max-w-md mx-auto">
                    <RedeemInviteCodeForm />
                    <p className="text-center text-sm text-slate-500 mt-4">
                        Ask your parent to generate an invite code from their family page.
                    </p>
                </div>
            )}

            {/* Main Dashboard - Show if linked */}
            {isLinked && (
                <>
                    {/* Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">
                                    My Schedule
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 text-sm mb-2">
                                    View your upcoming classes
                                </p>
                                <Link href="/student/schedule">
                                    <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                                        View Schedule
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">
                                    My Classes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 text-sm mb-2">
                                    View enrolled classes and materials
                                </p>
                                <Link href="/student/classes">
                                    <Button variant="outline">View Classes</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Today's Classes */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle>Today&apos;s Classes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-slate-500">
                                <p>No classes scheduled for today.</p>
                                <Link href="/student/schedule">
                                    <Button variant="link" className="mt-2">
                                        View full schedule →
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

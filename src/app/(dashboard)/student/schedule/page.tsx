import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
    title: 'My Schedule | Class Registration System',
};

// Helper to group classes by day of week
function parseScheduleDays(schedule: string): string[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const foundDays: string[] = [];

    for (const day of days) {
        if (schedule.toLowerCase().includes(day.toLowerCase())) {
            foundDays.push(day);
        }
    }

    return foundDays.length > 0 ? foundDays : ['TBD'];
}

export default async function StudentSchedulePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // For students, we need to find classes they're enrolled in
    // Students can be users directly, or family members (children) linked to parents
    // For this implementation, we'll handle the direct student user case

    // First check if this user is a family member being viewed
    // For simplicity, students see their confirmed enrollments

    // Get enrollments where this student's profile is linked
    // Note: In a full system, students would have their own accounts linked to family_members
    // For now, we'll show a placeholder or fetch based on student role

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      class:classes(
        id,
        name,
        schedule,
        location,
        start_date,
        end_date,
        teacher:profiles!classes_teacher_id_fkey(first_name, last_name)
      )
    `)
        .eq('status', 'confirmed');

    // Group by days
    const scheduleByDay: Record<string, typeof enrollments> = {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: [],
        Sun: [],
    };

    enrollments?.forEach((enrollment) => {
        const classData = enrollment.class as unknown as {
            id: string;
            name: string;
            schedule: string;
            location: string;
            start_date: string;
            end_date: string;
            teacher: { first_name: string; last_name: string };
        };

        const days = parseScheduleDays(classData.schedule);
        days.forEach((day) => {
            if (scheduleByDay[day]) {
                scheduleByDay[day]?.push(enrollment);
            }
        });
    });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const hasClasses = enrollments && enrollments.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">My Schedule</h2>
                <p className="text-slate-500">View your weekly class schedule</p>
            </div>

            {hasClasses ? (
                <div className="grid gap-4">
                    {/* Weekly View */}
                    <div className="grid md:grid-cols-5 gap-4">
                        {weekDays.map((day) => (
                            <Card key={day} className="border-0 shadow-lg">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-center text-sm font-medium">
                                        {day}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {scheduleByDay[day]?.length ? (
                                        scheduleByDay[day]?.map((enrollment) => {
                                            const classData = enrollment.class as unknown as {
                                                id: string;
                                                name: string;
                                                schedule: string;
                                                location: string;
                                                teacher: { first_name: string; last_name: string };
                                            };
                                            return (
                                                <div
                                                    key={enrollment.id}
                                                    className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100"
                                                >
                                                    <p className="font-medium text-sm text-green-900">
                                                        {classData.name}
                                                    </p>
                                                    <p className="text-xs text-green-700 mt-1">
                                                        {classData.location}
                                                    </p>
                                                    <p className="text-xs text-green-600 mt-1">
                                                        {classData.teacher.first_name} {classData.teacher.last_name}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-center text-sm text-slate-400 py-4">
                                            No classes
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* List View */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle>All Classes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {enrollments?.map((enrollment) => {
                                    const classData = enrollment.class as unknown as {
                                        id: string;
                                        name: string;
                                        schedule: string;
                                        location: string;
                                        start_date: string;
                                        end_date: string;
                                        teacher: { first_name: string; last_name: string };
                                    };
                                    return (
                                        <div
                                            key={enrollment.id}
                                            className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
                                        >
                                            <div>
                                                <h4 className="font-medium">{classData.name}</h4>
                                                <p className="text-sm text-slate-500">
                                                    {classData.schedule} • {classData.location}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {classData.teacher.first_name} {classData.teacher.last_name}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="outline" className="text-green-600">
                                                    Enrolled
                                                </Badge>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {new Date(classData.start_date).toLocaleDateString()} -{' '}
                                                    {new Date(classData.end_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="border-0 shadow-lg">
                    <CardContent className="text-center py-12">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
                        <p className="text-slate-500">
                            You haven&apos;t been enrolled in any classes yet.
                            <br />
                            Ask your parent or guardian to enroll you in a class.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

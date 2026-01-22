'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ClassData {
    id: string;
    name: string;
    schedule: string;
    location: string;
    start_date: string;
    end_date: string;
    teacher: { first_name: string; last_name: string };
}

interface Enrollment {
    id: string;
    status: string;
    class: ClassData;
}

interface StudentScheduleViewProps {
    enrollments: Enrollment[];
}

// Helper to group classes by day of week
export function parseScheduleDays(schedule: string): string[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const foundDays: string[] = [];

    for (const day of days) {
        if (schedule.toLowerCase().includes(day.toLowerCase())) {
            foundDays.push(day);
        }
    }

    return foundDays.length > 0 ? foundDays : ['TBD'];
}

export default function StudentScheduleView({ enrollments }: StudentScheduleViewProps) {
    // Group by days
    const scheduleByDay: Record<string, Enrollment[]> = {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: [],
        Sun: [],
    };

    enrollments.forEach((enrollment) => {
        const days = parseScheduleDays(enrollment.class.schedule);
        days.forEach((day) => {
            if (scheduleByDay[day]) {
                scheduleByDay[day].push(enrollment);
            }
        });
    });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const hasClasses = enrollments.length > 0;

    if (!hasClasses) {
        return (
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
                        You haven't been enrolled in any classes yet.
                        <br />
                        Ask your parent or guardian to enroll you in a class.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
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
                            {scheduleByDay[day].length ? (
                                scheduleByDay[day].map((enrollment) => (
                                    <div
                                        key={`${enrollment.id}-${day}`}
                                        className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100"
                                    >
                                        <p className="font-medium text-sm text-green-900">
                                            {enrollment.class.name}
                                        </p>
                                        <p className="text-xs text-green-700 mt-1">
                                            {enrollment.class.location}
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">
                                            {enrollment.class.teacher.first_name} {enrollment.class.teacher.last_name}
                                        </p>
                                    </div>
                                ))
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
                        {enrollments.map((enrollment) => (
                            <div
                                key={enrollment.id}
                                className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
                            >
                                <div>
                                    <h4 className="font-medium">{enrollment.class.name}</h4>
                                    <p className="text-sm text-slate-500">
                                        {enrollment.class.schedule} • {enrollment.class.location}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {enrollment.class.teacher.first_name} {enrollment.class.teacher.last_name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="text-green-600">
                                        Enrolled
                                    </Badge>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {new Date(enrollment.class.start_date).toLocaleDateString()} -{' '}
                                        {new Date(enrollment.class.end_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

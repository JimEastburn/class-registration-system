import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
    title: 'My Classes | Class Registration System',
};

export default async function StudentClassesPage() {
    const supabase = await createClient();

    // Get confirmed enrollments with class details
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      enrolled_at,
      class:classes(
        id,
        name,
        description,
        schedule,
        location,
        start_date,
        end_date,
        syllabus,
        teacher:profiles!classes_teacher_id_fkey(first_name, last_name, bio)
      )
    `)
        .eq('status', 'confirmed')
        .order('enrolled_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">My Classes</h2>
                <p className="text-slate-500">View your enrolled classes and materials</p>
            </div>

            {enrollments && enrollments.length > 0 ? (
                <div className="grid gap-6">
                    {enrollments.map((enrollment) => {
                        const classData = enrollment.class as unknown as {
                            id: string;
                            name: string;
                            description: string | null;
                            schedule: string;
                            location: string;
                            start_date: string;
                            end_date: string;
                            syllabus: string | null;
                            teacher: { first_name: string; last_name: string; bio: string | null };
                        };

                        return (
                            <Card key={enrollment.id} className="border-0 shadow-lg">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-xl">{classData.name}</CardTitle>
                                            <p className="text-slate-500 mt-1">
                                                with {classData.teacher.first_name} {classData.teacher.last_name}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-green-600">
                                            Enrolled
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {classData.description && (
                                        <p className="text-slate-600">{classData.description}</p>
                                    )}

                                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide">Schedule</p>
                                            <p className="font-medium mt-1">{classData.schedule}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide">Location</p>
                                            <p className="font-medium mt-1">{classData.location}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide">Start Date</p>
                                            <p className="font-medium mt-1">
                                                {new Date(classData.start_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide">End Date</p>
                                            <p className="font-medium mt-1">
                                                {new Date(classData.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {classData.syllabus && (
                                        <div className="pt-2">
                                            <a
                                                href={classData.syllabus}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                                            >
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                                View Syllabus
                                            </a>
                                        </div>
                                    )}

                                    {/* Teacher Info */}
                                    <div className="border-t pt-4 mt-4">
                                        <p className="text-sm font-medium text-slate-700 mb-2">About Your Teacher</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                                                {classData.teacher.first_name[0]}
                                                {classData.teacher.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {classData.teacher.first_name} {classData.teacher.last_name}
                                                </p>
                                                {classData.teacher.bio && (
                                                    <p className="text-sm text-slate-500 line-clamp-1">
                                                        {classData.teacher.bio}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
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
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
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

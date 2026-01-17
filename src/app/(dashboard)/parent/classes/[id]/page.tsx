import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnrollmentForm from '@/components/classes/EnrollmentForm';

export const metadata = {
    title: 'Class Details | Class Registration System',
};

export default async function ClassDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch class with teacher info
    const { data: classData } = await supabase
        .from('classes')
        .select(`
      *,
      teacher:profiles!classes_teacher_id_fkey(first_name, last_name, bio)
    `)
        .eq('id', id)
        .eq('status', 'active')
        .single();

    if (!classData) {
        notFound();
    }

    // Fetch parent's family members
    const { data: familyMembers } = await supabase
        .from('family_members')
        .select('id, first_name, last_name, grade_level')
        .eq('parent_id', user?.id)
        .eq('relationship', 'child');

    // Check existing enrollments for this class
    const { data: existingEnrollments } = await supabase
        .from('enrollments')
        .select('student_id, status')
        .eq('class_id', id)
        .in('status', ['pending', 'confirmed']);

    const enrolledStudentIds = new Set(
        existingEnrollments?.map((e) => e.student_id) || []
    );

    const teacher = classData.teacher as unknown as {
        first_name: string;
        last_name: string;
        bio: string | null;
    };

    const spotsLeft = classData.max_students - classData.current_enrollment;
    const availableStudents = familyMembers?.filter(
        (fm) => !enrolledStudentIds.has(fm.id)
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-semibold mb-2">{classData.name}</h2>
                    <p className="text-slate-500">
                        Taught by {teacher.first_name} {teacher.last_name}
                    </p>
                </div>
                <Badge
                    variant={spotsLeft <= 3 ? 'destructive' : 'secondary'}
                    className="text-lg px-4 py-2"
                >
                    {spotsLeft} spots left
                </Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Class Information */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle>About This Class</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-slate-600">
                                {classData.description || 'No description available.'}
                            </p>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500">Schedule</p>
                                    <p className="font-medium">{classData.schedule}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Location</p>
                                    <p className="font-medium">{classData.location}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Start Date</p>
                                    <p className="font-medium">
                                        {new Date(classData.start_date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">End Date</p>
                                    <p className="font-medium">
                                        {new Date(classData.end_date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {classData.syllabus && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Syllabus</p>
                                    <a
                                        href={classData.syllabus}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-600 hover:underline"
                                    >
                                        View Syllabus →
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Teacher Info */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle>About the Teacher</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                                    {teacher.first_name[0]}
                                    {teacher.last_name[0]}
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">
                                        {teacher.first_name} {teacher.last_name}
                                    </p>
                                    <p className="text-slate-500">Teacher</p>
                                </div>
                            </div>
                            {teacher.bio && (
                                <p className="text-slate-600">{teacher.bio}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Enrollment Card */}
                <div>
                    <Card className="border-0 shadow-lg sticky top-24">
                        <CardHeader>
                            <CardTitle>Enroll Now</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-4 border-b">
                                <p className="text-3xl font-bold">${classData.fee.toFixed(2)}</p>
                                <p className="text-slate-500">per student</p>
                            </div>

                            {spotsLeft > 0 ? (
                                <EnrollmentForm
                                    classId={id}
                                    students={availableStudents}
                                />
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-red-600 font-medium">Class is Full</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Check back later or browse other classes.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

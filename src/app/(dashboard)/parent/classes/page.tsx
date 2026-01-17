import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const metadata = {
    title: 'Browse Classes | Class Registration System',
};

export default async function BrowseClassesPage() {
    const supabase = await createClient();

    // Fetch all active classes with teacher info
    const { data: classes } = await supabase
        .from('classes')
        .select(`
      *,
      teacher:profiles!classes_teacher_id_fkey(first_name, last_name)
    `)
        .eq('status', 'active')
        .order('start_date', { ascending: true });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Browse Classes</h2>
                <p className="text-slate-500">Find and enroll your children in available classes</p>
            </div>

            {classes && classes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((classItem) => {
                        const teacher = classItem.teacher as unknown as {
                            first_name: string;
                            last_name: string;
                        };
                        const spotsLeft = classItem.max_students - classItem.current_enrollment;

                        return (
                            <Card key={classItem.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg">{classItem.name}</CardTitle>
                                        <Badge
                                            variant={spotsLeft <= 3 ? 'destructive' : 'secondary'}
                                        >
                                            {spotsLeft} spots left
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        by {teacher.first_name} {teacher.last_name}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {classItem.description && (
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                            {classItem.description}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-slate-500">Schedule</p>
                                            <p className="font-medium">{classItem.schedule}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Location</p>
                                            <p className="font-medium">{classItem.location}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Dates</p>
                                            <p className="font-medium">
                                                {new Date(classItem.start_date).toLocaleDateString()} -{' '}
                                                {new Date(classItem.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Fee</p>
                                            <p className="font-medium text-lg">${classItem.fee.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <Link href={`/parent/classes/${classItem.id}`} className="block">
                                        <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                                            View Details & Enroll
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border-0 shadow-lg">
                    <CardContent className="text-center py-12">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-purple-600"
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
                        <h3 className="text-lg font-semibold mb-2">No Classes Available</h3>
                        <p className="text-slate-500">
                            Check back later for new class offerings.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

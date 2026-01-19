import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import MaterialsList from '@/components/classes/MaterialsList';
import AddMaterialForm from '@/components/classes/AddMaterialForm';

export const metadata = {
    title: 'Class Materials | Teacher Portal',
};

const fileTypeIcons: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    image: '🖼️',
    video: '🎬',
    link: '🔗',
    other: '📎',
};

export default async function ClassMaterialsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get class details
    const { data: classData } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .eq('id', id)
        .single();

    if (!classData) {
        notFound();
    }

    // Verify teacher owns this class
    if (classData.teacher_id !== user.id) {
        redirect('/teacher/classes');
    }

    // Get materials
    const { data: materials } = await supabase
        .from('class_materials')
        .select('*')
        .eq('class_id', id)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Class Materials</h2>
                    <p className="text-slate-500">{classData.name}</p>
                </div>
                <Link href={`/teacher/classes/${id}`}>
                    <Button variant="outline">← Back to Class</Button>
                </Link>
            </div>

            {/* Add Material Form */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Add New Material</CardTitle>
                </CardHeader>
                <CardContent>
                    <AddMaterialForm classId={id} />
                </CardContent>
            </Card>

            {/* Materials List */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Uploaded Materials ({materials?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    {materials?.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <p>No materials uploaded yet</p>
                            <p className="text-sm mt-1">Add PDFs, documents, links, or other resources for your students</p>
                        </div>
                    ) : (
                        <MaterialsList materials={materials || []} classId={id} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

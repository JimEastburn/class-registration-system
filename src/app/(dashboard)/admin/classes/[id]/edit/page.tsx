import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AdminClassForm } from '@/components/admin/classes/AdminClassForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Class } from '@/types';

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    // Verify Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) redirect('/');

    // Fetch Class and Teachers parallel
    const [classRes, teachersRes] = await Promise.all([
        supabase.from('classes').select('*').eq('id', id).single(),
        supabase.from('profiles').select('id, first_name, last_name').eq('role', 'teacher').order('last_name')
    ]);

    if (!classRes.data) notFound();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/classes">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">Edit Class</h2>
            </div>
            
            <AdminClassForm 
                initialData={classRes.data as Class} 
                teachers={teachersRes.data || []} 
            />
        </div>
    );
}

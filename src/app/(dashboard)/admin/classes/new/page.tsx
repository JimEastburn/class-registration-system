import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminClassForm } from '@/components/admin/classes/AdminClassForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewClassPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    // Verify Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) redirect('/');

    // Fetch Teachers
    const { data: teachers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'teacher')
        .order('last_name');

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center gap-4">
            <Link href="/admin/classes">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <h2 className="text-3xl font-bold tracking-tight">Create New Class</h2>
        </div>
        
        <AdminClassForm teachers={teachers || []} />
    </div>
  );
}

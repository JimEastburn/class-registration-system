import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'super_admin')) redirect('/');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !profile) notFound();

  // Parallel fetch for related data
  const [familyMembers, enrollments, teachingClasses] = await Promise.all([
    supabase.from('family_members').select('*').eq('parent_id', id),
    // For enrollments, check if they are a student or family member student
    supabase.from('enrollments').select('*, class:classes(name)').eq('student_id', id), // Direct student
    supabase.from('classes').select('*').eq('teacher_id', id)
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
            <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">User Details</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Full Name</span>
                    <span>{profile.first_name} {profile.last_name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Email</span>
                    <span>{profile.email}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Role</span>
                    <Badge variant="outline" className="capitalize">{profile.role}</Badge>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="font-medium">Joined</span>
                    <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
            </CardContent>
        </Card>

        {/* Conditional Cards based on Role/Data */}
        {profile.role === 'parent' && (
            <Card>
                <CardHeader>
                    <CardTitle>Family Members</CardTitle>
                </CardHeader>
                <CardContent>
                    {familyMembers.data?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No family members registered.</p>
                    ) : (
                        <ul className="space-y-2">
                            {familyMembers.data?.map((fm) => (
                                <li key={fm.id} className="flex justify-between items-center border p-2 rounded">
                                    <span>{fm.first_name} {fm.last_name}</span>
                                    <Badge variant="secondary">{fm.relationship}</Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        )}

        {profile.role === 'teacher' && (
             <Card>
                <CardHeader>
                    <CardTitle>Classes Taught</CardTitle>
                </CardHeader>
                <CardContent>
                    {teachingClasses.data?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No classes assigned.</p>
                    ) : (
                        <ul className="space-y-2">
                            {teachingClasses.data?.map((c) => (
                                <li key={c.id} className="border p-2 rounded">
                                    <div className="font-medium">{c.name}</div>
                                    <div className="text-xs text-muted-foreground">{c.day_of_week} {c.start_time}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        )}

        {(profile.role === 'student' || (enrollments.data && enrollments.data.length > 0)) && (
             <Card>
                <CardHeader>
                    <CardTitle>Enrollments (Direct)</CardTitle>
                </CardHeader>
                <CardContent>
                     {enrollments.data?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active enrollments.</p>
                    ) : (
                        <ul className="space-y-2">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {enrollments.data?.map((e: any) => (
                                <li key={e.id} className="flex justify-between items-center border p-2 rounded">
                                    <span>{e.class?.name || 'Unknown Class'}</span>
                                    <Badge variant={e.status === 'confirmed' ? 'default' : 'secondary'}>{e.status}</Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
             </Card>
        )}
      </div>
    </div>
  );
}

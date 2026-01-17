import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import DeleteFamilyMemberButton from '@/components/family/DeleteFamilyMemberButton';

export const metadata = {
    title: 'Family Members | Class Registration System',
};

export default async function FamilyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: familyMembers } = await supabase
        .from('family_members')
        .select('*')
        .eq('parent_id', user?.id)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Family Members</h2>
                    <p className="text-slate-500">Manage your children and family members</p>
                </div>
                <Link href="/parent/family/add">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                        + Add Family Member
                    </Button>
                </Link>
            </div>

            {familyMembers && familyMembers.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {familyMembers.map((member) => (
                        <Card key={member.id} className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        {member.first_name} {member.last_name}
                                    </CardTitle>
                                    <Badge variant="secondary" className="capitalize">
                                        {member.relationship}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {member.grade_level && (
                                    <p className="text-sm text-slate-600">
                                        <span className="font-medium">Grade:</span> {member.grade_level}
                                    </p>
                                )}
                                {member.birth_date && (
                                    <p className="text-sm text-slate-600">
                                        <span className="font-medium">Birthday:</span>{' '}
                                        {new Date(member.birth_date).toLocaleDateString()}
                                    </p>
                                )}
                                {member.notes && (
                                    <p className="text-sm text-slate-500 italic">{member.notes}</p>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <Link href={`/parent/family/${member.id}/edit`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            Edit
                                        </Button>
                                    </Link>
                                    <DeleteFamilyMemberButton id={member.id} name={member.first_name} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
                                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Family Members Yet</h3>
                        <p className="text-slate-500 mb-4">
                            Add your children or family members to start enrolling them in classes.
                        </p>
                        <Link href="/parent/family/add">
                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                                Add Your First Family Member
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

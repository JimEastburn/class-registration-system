import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import DeleteFamilyMemberButton from '@/components/family/DeleteFamilyMemberButton';
import InviteCodeButton from '@/components/family/InviteCodeButton';

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

    // Sort family members: children first, then others
    const sortedFamilyMembers = familyMembers?.sort((a, b) => {
        const aIsChild = a.relationship === 'child' ? 0 : 1;
        const bIsChild = b.relationship === 'child' ? 0 : 1;
        return aIsChild - bIsChild;
    });

    // Check if there are any children to show the link code explanation
    const hasChildren = sortedFamilyMembers?.some((m) => m.relationship === 'child') ?? false;

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

            {sortedFamilyMembers && sortedFamilyMembers.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Student Link Code Explanation - only show when there are children */}
                    {hasChildren && (
                        <Card className="border-0 shadow-md bg-gradient-to-r from-purple-50 to-pink-50">
                            <CardContent className="py-4">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 mb-1">Link Your Child&apos;s Student Account</h3>
                                        <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                                            <li>Click <span className="font-medium text-purple-600">&quot;Generate Student Link Code&quot;</span> on your child&apos;s card below</li>
                                            <li>Share the 6-character code with your child</li>
                                            <li>Your child logs into their student account and enters the code</li>
                                            <li>They&apos;ll instantly see their enrolled classes!</li>
                                        </ol>
                                        <p className="text-xs text-slate-500 mt-2">Codes expire after 7 days. The &quot;Linked&quot; badge shows when connected.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {sortedFamilyMembers.map((member) => (
                        <Card key={member.id} className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        {member.first_name} {member.last_name}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        {member.user_id && (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                Linked
                                            </Badge>
                                        )}
                                        <Badge variant="secondary" className="capitalize">
                                            {member.relationship}
                                        </Badge>
                                    </div>
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

                                {/* Invite Code Section - only show for children who are not already linked */}
                                {!member.user_id && member.relationship === 'child' && (
                                    <div className="pt-2 border-t">
                                        <InviteCodeButton
                                            familyMemberId={member.id}
                                            memberName={member.first_name}
                                        />
                                    </div>
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

'use client';

import { User, Calendar, BookOpen, Edit, Trash2, Link, Link2Off, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FamilyMember } from '@/types';
import { EditFamilyMemberDialog } from './EditFamilyMemberDialog';
import { DeleteFamilyMemberDialog } from './DeleteFamilyMemberDialog';
import { LinkStudentDialog } from './LinkStudentDialog';

interface FamilyMemberListProps {
    members: FamilyMember[];
}

export function FamilyMemberList({ members }: FamilyMemberListProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
                <FamilyMemberCard key={member.id} member={member} />
            ))}
        </div>
    );
}

interface FamilyMemberCardProps {
    member: FamilyMember;
}

function FamilyMemberCard({ member }: FamilyMemberCardProps) {
    const fullName = `${member.first_name} ${member.last_name}`;
    const age = member.dob ? calculateAge(member.dob) : null;

    return (
        <Card className="relative">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{fullName}</CardTitle>
                            <div className="flex gap-1.5 mt-1">
                                {age !== null && (
                                    <Badge variant="secondary">
                                        {age} {age === 1 ? 'year' : 'years'} old
                                    </Badge>
                                )}
                                {member.relationship === 'Student' && (
                                    <>
                                        {member.student_user_id ? (
                                            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                                                <UserCheck className="h-3 w-3" />
                                                Linked
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                                                <Link2Off className="h-3 w-3" />
                                                Not Linked
                                            </Badge>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                    {member.dob && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                                Born: {new Date(member.dob).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                    {member.grade && (
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>Grade: {member.grade}</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {member.relationship === 'Student' && !member.student_user_id && (
                        <LinkStudentDialog
                            familyMemberId={member.id}
                            familyMemberName={fullName}
                            trigger={
                                <Button variant="outline" size="sm">
                                    <Link className="mr-2 h-3 w-3" />
                                    Link
                                </Button>
                            }
                        />
                    )}
                    <EditFamilyMemberDialog member={member}>
                        <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-3 w-3" />
                            Edit
                        </Button>
                    </EditFamilyMemberDialog>
                    <DeleteFamilyMemberDialog 
                        memberId={member.id} 
                        memberName={fullName}
                    >
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                        </Button>
                    </DeleteFamilyMemberDialog>
                </div>
            </CardContent>
        </Card>
    );
}

function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

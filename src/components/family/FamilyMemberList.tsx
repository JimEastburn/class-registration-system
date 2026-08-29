'use client';

import { useState, useTransition } from 'react';
import {
  User,
  Calendar,
  BookOpen,
  Edit,
  Trash2,
  Link,
  Link2Off,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { FamilyMember } from '@/types';
import { updatePhotoConsent } from '@/lib/actions/family';
import { toast } from 'sonner';
import { EditFamilyMemberDialog } from './EditFamilyMemberDialog';
import { DeleteFamilyMemberDialog } from './DeleteFamilyMemberDialog';
import { LinkStudentDialog } from './LinkStudentDialog';

interface FamilyMemberListProps {
  members: FamilyMember[];
}

export function FamilyMemberList({ members }: FamilyMemberListProps) {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      data-testid="family-member-list"
    >
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
    <Card className="relative" data-testid={`family-member-card-${member.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <User className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{fullName}</CardTitle>
              <div className="mt-1 flex gap-1.5">
                {age !== null && (
                  <Badge variant="secondary">
                    {age} {age === 1 ? 'year' : 'years'} old
                  </Badge>
                )}
                {member.relationship === 'Student' && (
                  <>
                    {member.student_user_id ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-200 bg-green-50 text-green-700"
                      >
                        <UserCheck className="h-3 w-3" />
                        Linked
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-200 bg-amber-50 text-amber-700"
                      >
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
        <div className="text-muted-foreground space-y-2 text-sm">
          {member.dob && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Born: {new Date(member.dob).toLocaleDateString()}</span>
            </div>
          )}
          {member.grade && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Grade: {member.grade}</span>
            </div>
          )}
        </div>

        {member.relationship === 'Student' && (
          <PhotoConsentCheckbox
            familyMemberId={member.id}
            studentName={fullName}
            initialConsent={member.photo_consent}
          />
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {member.relationship === 'Student' && !member.student_user_id && (
            <LinkStudentDialog
              familyMemberId={member.id}
              familyMemberName={fullName}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="link-student-button"
                >
                  <Link className="mr-2 h-3 w-3" />
                  Link
                </Button>
              }
            />
          )}
          <EditFamilyMemberDialog member={member}>
            <Button
              variant="outline"
              size="sm"
              data-testid="edit-member-button"
            >
              <Edit className="mr-2 h-3 w-3" />
              Edit
            </Button>
          </EditFamilyMemberDialog>
          <DeleteFamilyMemberDialog memberId={member.id} memberName={fullName}>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              data-testid="delete-member-button"
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Delete
            </Button>
          </DeleteFamilyMemberDialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface PhotoConsentCheckboxProps {
  familyMemberId: string;
  studentName: string;
  initialConsent: boolean;
}

function PhotoConsentCheckbox({
  familyMemberId,
  studentName,
  initialConsent,
}: PhotoConsentCheckboxProps) {
  const [checked, setChecked] = useState(initialConsent);
  const [isPending, startTransition] = useTransition();
  const checkboxId = `photo-consent-${familyMemberId}`;

  const handleCheckedChange = (value: boolean | 'indeterminate') => {
    const nextChecked = value === true;
    const previousChecked = checked;
    setChecked(nextChecked);

    startTransition(async () => {
      try {
        const result = await updatePhotoConsent(familyMemberId, nextChecked);

        if (!result.success) {
          setChecked(previousChecked);
          toast.error(result.error || 'Failed to update photo consent');
          return;
        }

        toast.success('Photo consent updated.');
      } catch {
        setChecked(previousChecked);
        toast.error('An unexpected error occurred.');
      }
    });
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={checkboxId}
          checked={checked}
          disabled={isPending}
          onCheckedChange={handleCheckedChange}
          className="mt-0.5"
        />
        <label
          htmlFor={checkboxId}
          className="text-sm leading-snug font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          I consent to photographs of {studentName} being posted on AAC social
          media platforms and used in other marketing materials.
        </label>
      </div>
    </div>
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

interface FamilyMemberLink {
  id: string;
  first_name: string;
  last_name: string;
  student_user_id: string | null;
}

/**
 * Resolve the family_members row for a logged-in student.
 * Falls back to email lookup and self-heals stale/missing student_user_id links.
 */
export async function resolveStudentFamilyMember(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => unknown;
      update: (values: Record<string, unknown>) => unknown;
    };
  },
  user: { id: string; email?: string | null }
): Promise<FamilyMemberLink | null> {
  const selectColumns = 'id, first_name, last_name, student_user_id';

  const { data: linkedMember, error: linkedError } = await supabase
    .from('family_members')
    .select(selectColumns)
    .eq('student_user_id', user.id)
    .maybeSingle();

  if (!linkedError && linkedMember) {
    return linkedMember;
  }

  const normalizedEmail = user.email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const { data: emailMatches, error: emailError } = await supabase
    .from('family_members')
    .select(selectColumns)
    .eq('relationship', 'Student')
    .ilike('email', normalizedEmail)
    .limit(2);

  if (emailError || !emailMatches || emailMatches.length !== 1) {
    return null;
  }

  const emailMatch = emailMatches[0];
  if (emailMatch.student_user_id !== user.id) {
    const { error: relinkError } = await supabase
      .from('family_members')
      .update({ student_user_id: user.id })
      .eq('id', emailMatch.id);

    if (!relinkError) {
      return { ...emailMatch, student_user_id: user.id };
    }
  }

  return emailMatch;
}

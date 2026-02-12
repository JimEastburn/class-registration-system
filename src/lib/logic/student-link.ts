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
  type LinkedLookupQuery = {
    eq: (column: string, value: string) => {
      limit: (count: number) => Promise<{ data: FamilyMemberLink[] | null; error: unknown }>;
    };
  };
  type EmailLookupQuery = {
    eq: (column: string, value: string) => {
      ilike: (column: string, pattern: string) => {
        limit: (count: number) => Promise<{ data: FamilyMemberLink[] | null; error: unknown }>;
      };
    };
  };
  type UpdateQuery = {
    eq: (column: string, value: string) => Promise<{ error: unknown }>;
  };
  const singleLookup = supabase
    .from('family_members')
    .select(selectColumns) as LinkedLookupQuery;

  const { data: linkedMembers, error: linkedError } = await singleLookup
    .eq('student_user_id', user.id)
    .limit(2);

  // Return the first match even if duplicates exist, instead of failing closed.
  if (!linkedError && linkedMembers && linkedMembers.length > 0) {
    return linkedMembers[0];
  }

  const normalizedEmail = user.email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const emailLookup = supabase
    .from('family_members')
    .select(selectColumns) as EmailLookupQuery;
  const { data: emailMatches, error: emailError } = await emailLookup
    .eq('relationship', 'Student')
    .ilike('email', normalizedEmail)
    .limit(2);

  if (emailError || !emailMatches || emailMatches.length !== 1) {
    return null;
  }

  const emailMatch = emailMatches[0];
  if (emailMatch.student_user_id !== user.id) {
    const relinkUpdate = supabase
      .from('family_members')
      .update({ student_user_id: user.id }) as UpdateQuery;
    const { error: relinkError } = await relinkUpdate
      .eq('id', emailMatch.id);

    if (!relinkError) {
      return { ...emailMatch, student_user_id: user.id };
    }
  }

  return emailMatch;
}

import { describe, expect, it } from 'vitest';
import { resolveStudentFamilyMember } from './student-link';

interface FamilyMemberLink {
  id: string;
  first_name: string;
  last_name: string;
  student_user_id: string | null;
}

function createSupabaseMock({
  linkedLookupResult,
  emailLookupResult,
  updateError = null,
}: {
  linkedLookupResult: { data: FamilyMemberLink[] | null; error: unknown };
  emailLookupResult: { data: FamilyMemberLink[] | null; error: unknown };
  updateError?: unknown;
}) {
  const updates: Array<{ values: Record<string, unknown>; id: string }> = [];

  const supabase = {
    from: (table: string) => {
      expect(table).toBe('family_members');
      return {
        select: () => ({
          eq: (column: string) => {
            if (column === 'student_user_id') {
              return {
                limit: async () => linkedLookupResult,
              };
            }

            if (column === 'relationship') {
              return {
                ilike: () => ({
                  limit: async () => emailLookupResult,
                }),
              };
            }

            throw new Error(`Unexpected select.eq column: ${column}`);
          },
        }),
        update: (values: Record<string, unknown>) => ({
          eq: async (_column: string, id: string) => {
            updates.push({ values, id });
            return { error: updateError };
          },
        }),
      };
    },
  };

  return { supabase, updates };
}

describe('resolveStudentFamilyMember', () => {
  it('returns a linked member even when duplicate student_user_id rows exist', async () => {
    const { supabase } = createSupabaseMock({
      linkedLookupResult: {
        data: [
          { id: 'fm-1', first_name: 'Jim', last_name: 'Student', student_user_id: 'user-1' },
          { id: 'fm-2', first_name: 'Jim', last_name: 'Duplicate', student_user_id: 'user-1' },
        ],
        error: null,
      },
      emailLookupResult: { data: null, error: null },
    });

    const result = await resolveStudentFamilyMember(
      supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => unknown;
          update: (values: Record<string, unknown>) => unknown;
        };
      },
      { id: 'user-1', email: 'jimteststudent@example.com' }
    );

    expect(result?.id).toBe('fm-1');
  });

  it('falls back to email and self-heals missing student_user_id link', async () => {
    const { supabase, updates } = createSupabaseMock({
      linkedLookupResult: { data: [], error: null },
      emailLookupResult: {
        data: [{ id: 'fm-3', first_name: 'Jim', last_name: 'Student', student_user_id: null }],
        error: null,
      },
    });

    const result = await resolveStudentFamilyMember(
      supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => unknown;
          update: (values: Record<string, unknown>) => unknown;
        };
      },
      { id: 'user-2', email: 'jimteststudent@example.com' }
    );

    expect(result?.id).toBe('fm-3');
    expect(result?.student_user_id).toBe('user-2');
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({
      values: { student_user_id: 'user-2' },
      id: 'fm-3',
    });
  });
});

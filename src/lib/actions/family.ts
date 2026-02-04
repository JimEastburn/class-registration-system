'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { FamilyMember } from '@/types';

/**
 * Log an audit entry for family member actions
 */
async function logAuditEntry(
  userId: string,
  action: string,
  targetId: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      target_type: 'family_member',
      target_id: targetId,
      details: details || {},
    });
  } catch (error) {
    // Log but don't fail the main operation
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Get all family members for the authenticated user
 */
interface GetFamilyMembersOptions {
    relationship?: 'Student' | 'Parent/Guardian';
}

export async function getFamilyMembers(
    options: GetFamilyMembersOptions = {}
): Promise<{
    data: FamilyMember[] | null;
    error: string | null;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        let query = supabase
            .from('family_members')
            .select('*')
            .eq('parent_id', user.id);

        if (options.relationship) {
            query = query.eq('relationship', options.relationship);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching family members:', error);
            return { data: null, error: error.message };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Unexpected error in getFamilyMembers:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

/**
 * Get family member count for the authenticated user
 */
export async function getFamilyMemberCount(): Promise<{
    count: number;
    error: string | null;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { count: 0, error: 'Not authenticated' };
        }

        const { count, error } = await supabase
            .from('family_members')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', user.id);

        if (error) {
            console.error('Error counting family members:', error);
            return { count: 0, error: error.message };
        }

        return { count: count || 0, error: null };
    } catch (err) {
        console.error('Unexpected error in getFamilyMemberCount:', err);
        return { count: 0, error: 'An unexpected error occurred' };
    }
}

interface CreateFamilyMemberInput {
    firstName: string;
    lastName: string;
    email: string;
    relationship: 'Student' | 'Parent/Guardian';
    dob?: string;
    grade?: string;
}

/**
 * Create a new family member
 */
export async function createFamilyMember(
    input: CreateFamilyMemberInput
): Promise<{ data: FamilyMember | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        const { data, error } = await supabase
            .from('family_members')
            .insert({
                parent_id: user.id,
                first_name: input.firstName,
                last_name: input.lastName,
                email: input.email,
                relationship: input.relationship,
                dob: input.dob || null,
                grade: input.grade || null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating family member:', error);
            return { data: null, error: error.message };
        }

        // Log audit entry
        await logAuditEntry(user.id, 'family_member.created', data.id, {
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          relationship: input.relationship,
        });

        revalidatePath('/parent/family');
        revalidatePath('/parent');

        return { data, error: null };
    } catch (err) {
        console.error('Unexpected error in createFamilyMember:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

interface UpdateFamilyMemberInput {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    relationship?: 'Student' | 'Parent/Guardian';
    dob?: string | null;
    grade?: string | null;
}

/**
 * Update a family member (with ownership check)
 */
export async function updateFamilyMember(
    input: UpdateFamilyMemberInput
): Promise<{ data: FamilyMember | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        // Verify ownership
        const { data: existing, error: checkError } = await supabase
            .from('family_members')
            .select('id')
            .eq('id', input.id)
            .eq('parent_id', user.id)
            .single();

        if (checkError || !existing) {
            return {
                data: null,
                error: 'Family member not found or you do not have permission',
            };
        }

        const updateData: Record<string, unknown> = {};
        if (input.firstName !== undefined) updateData.first_name = input.firstName;
        if (input.lastName !== undefined) updateData.last_name = input.lastName;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.relationship !== undefined) {
             updateData.relationship = input.relationship;
             // If relationship changes to Parent/Guardian, grade can optionally be cleared, 
             // but schema validates grade is required for Student.
             // Clearing grade for Parent/Guardian happens if passed explicitly as null.
        }
        if (input.dob !== undefined) updateData.dob = input.dob;
        if (input.grade !== undefined) updateData.grade = input.grade;

        const { data, error } = await supabase
            .from('family_members')
            .update(updateData)
            .eq('id', input.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating family member:', error);
            return { data: null, error: error.message };
        }

        // Log audit entry
        await logAuditEntry(user.id, 'family_member.updated', input.id, {
          changes: updateData,
        });

        revalidatePath('/parent/family');
        revalidatePath('/parent');

        return { data, error: null };
    } catch (err) {
        console.error('Unexpected error in updateFamilyMember:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

/**
 * Delete a family member (with ownership check)
 */
export async function deleteFamilyMember(
    id: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Verify ownership and delete
        const { error } = await supabase
            .from('family_members')
            .delete()
            .eq('id', id)
            .eq('parent_id', user.id);

        if (error) {
            console.error('Error deleting family member:', error);
            return { success: false, error: error.message };
        }

        // Log audit entry
        await logAuditEntry(user.id, 'family_member.deleted', id);

        revalidatePath('/parent/family');
        revalidatePath('/parent');

        return { success: true, error: null };
    } catch (err) {
        console.error('Unexpected error in deleteFamilyMember:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

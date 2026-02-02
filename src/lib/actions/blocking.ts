'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ClassBlock, FamilyMember, Profile } from '@/types';

export interface BlockWithDetails extends ClassBlock {
  student: FamilyMember & {
    parent: Pick<Profile, 'first_name' | 'last_name' | 'email' | 'phone'> | null;
  };
}

export async function blockStudent(
  studentId: string,
  reason: string | null = null,
  path?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is a teacher
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
    if (!profile || profile.role !== 'teacher') {
         // Allow admins as well
         if (profile?.role !== 'admin') {
             return { success: false, error: 'Only teachers can block students' };
         }
    }

    // Check existing block
    const { data: existing } = await supabase
        .from('class_blocks')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('student_id', studentId)
        .single();
        
    if (existing) {
        return { success: false, error: 'Student is already blocked' };
    }

    const { error } = await supabase
        .from('class_blocks')
        .insert({
            teacher_id: user.id,
            student_id: studentId,
            reason: reason,
            created_by: user.id
        });

    if (error) {
        console.error('Error blocking student:', error);
        return { success: false, error: error.message };
    }

    // Cancel existing enrollments for this student in teacher's classes
    const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id);

    if (teacherClasses && teacherClasses.length > 0) {
        const classIds = teacherClasses.map(c => c.id);
        
        const { error: cancelError } = await supabase
            .from('enrollments')
            .update({ status: 'cancelled' })
            .eq('student_id', studentId)
            .in('class_id', classIds)
            .neq('status', 'cancelled'); // Optimization: don't touch already cancelled

        if (cancelError) {
            console.error('Error cancelling enrollments for blocked student:', cancelError);
            // We don't rollback the block, but we log the error. 
            // Ideally this should be a transaction.
        }
    }

    revalidatePath('/teacher');
    revalidatePath('/teacher/blocked');
    revalidatePath('/parent'); 
    revalidatePath('/parent/browse');
    if (path) {
        revalidatePath(path);
    }

    return { success: true, error: null };
  } catch (err) {
      console.error('Unexpected error blocking student:', err);
      return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function unblockStudent(
    blockId: string,
    path?: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Verify ownership
        const { data: block, error: fetchError } = await supabase
            .from('class_blocks')
            .select('teacher_id')
            .eq('id', blockId)
            .single();

        if (fetchError || !block) {
             return { success: false, error: 'Block not found' };
        }

        if (block.teacher_id !== user.id) {
             // Admin override
             const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
             if (profile?.role !== 'admin') {
                 return { success: false, error: 'Access denied' };
             }
        }

        const { error } = await supabase
            .from('class_blocks')
            .delete()
            .eq('id', blockId);

        if (error) {
            console.error('Error unblocking student:', error);
            return { success: false, error: error.message };
        }

        revalidatePath('/teacher');
    revalidatePath('/teacher/blocked');
    revalidatePath('/parent');
        revalidatePath('/parent/browse');
        if (path) {
            revalidatePath(path);
        }

        return { success: true, error: null };
    } catch (err) {
        console.error('Unexpected error unblocking student:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

export async function unblockStudentByStudentId(
    studentId: string,
    path?: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) { return { success: false, error: 'Not authenticated' }; }

        // Find the block
        const { data: block } = await supabase
            .from('class_blocks')
            .select('id')
            .eq('teacher_id', user.id)
            .eq('student_id', studentId)
            .single();
            
        if (!block) {
            return { success: false, error: 'Block not found' };
        }
        
        return unblockStudent(block.id, path);
    } catch (_err) {
        return { success: false, error: 'Unexpected error' };
    }
}

export async function getBlockedStudents(): Promise<{ data: BlockWithDetails[] | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        // Fetch blocks for this teacher
        const { data, error } = await supabase
            .from('class_blocks')
            .select(`
                *,
                student:family_members (
                    *,
                    parent:profiles (
                        first_name,
                        last_name,
                        email,
                        phone
                    )
                )
            `)
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching blocked students:', error);
            return { data: null, error: error.message };
        }

        return { data: data as unknown as BlockWithDetails[], error: null };
    } catch (err) {
        console.error('Unexpected error fetching blocked students:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

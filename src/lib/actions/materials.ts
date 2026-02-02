'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // Assuming zod is used for validation as per other files
import type { ClassMaterial, ActionResult } from '@/types';

// Validation schema for adding/updating material
const materialSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  file_url: z.string().url('Invalid URL'),
  type: z.string().min(1, 'Type is required'),
});

export type MaterialInput = z.infer<typeof materialSchema>;

export async function addMaterial(
  classId: string,
  input: MaterialInput
): Promise<ActionResult<ClassMaterial>> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    // Validate input
    const validated = materialSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    // Check ownership/permissions
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return { success: false, error: 'Class not found' };
    }

    // Allow admins, super_admins, or the class teacher
    const canEdit =
      profile.role === 'admin' ||
      profile.role === 'super_admin' ||
      classData.teacher_id === user.id;

    if (!canEdit) {
      return { success: false, error: 'Not authorized to manage materials for this class' };
    }

    const { data: material, error: insertError } = await supabase
      .from('class_materials')
      .insert({
        class_id: classId,
        title: validated.data.title,
        file_url: validated.data.file_url,
        type: validated.data.type,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: 'Failed to add material' };
    }

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/parent/browse/${classId}`);

    return { success: true, data: material as ClassMaterial };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

export async function getMaterialsForClass(
  classId: string
): Promise<ActionResult<ClassMaterial[]>> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is authorized (Teacher, Admin, or Enrolled)
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return { success: false, error: 'Class not found' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isTeacher = classData.teacher_id === user.id;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isTeacher && !isAdmin) {
      // Check for enrollment (either as student or parent of student)
      // 1. Check if user is a student in family_members linked to this class
      // 2. Check if user is a parent of a student enrolled in this class
      
      // Simplest check: Get family_member ids for this user (if they are a parent or student themselves linked to auth)
      // Actually, we need to know if the user (auth.uid) is linked to an enrollment.
      
      // Scenario A: User is Parent
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('id')
        .or(`parent_id.eq.${user.id},student_user_id.eq.${user.id}`);
      
      const familyMemberIds = familyMembers?.map(fm => fm.id) || [];
      
      if (familyMemberIds.length === 0) {
         return { success: false, error: 'Not authorized' };
      }

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('class_id', classId)
        .eq('status', 'confirmed')
        .in('student_id', familyMemberIds)
        .maybeSingle();

      if (!enrollment) {
        return { success: false, error: 'Not enrolled in this class' };
      }
    }

    // Fetch materials
    const { data: materials, error } = await supabase
      .from('class_materials')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: 'Failed to fetch materials' };
    }

    return { success: true, data: materials as ClassMaterial[] };
  } catch (err) {
    console.error('getMaterialsForClass error:', err);
    return { success: false, error: 'Internal server error' };
  }
}

export async function updateMaterial(
  materialId: string,
  input: Partial<MaterialInput>
): Promise<ActionResult<ClassMaterial>> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const validated = materialSchema.partial().safeParse(input);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    // Check ownership
    const { data: material, error: fetchError } = await supabase
      .from('class_materials')
      .select('class_id, classes!inner(teacher_id)')
      .eq('id', materialId)
      .single();

    if (fetchError || !material) {
      return { success: false, error: 'Material not found' };
    }

    // Supabase returns nested data as: { class_id: ..., classes: { teacher_id: ... } }
    // We need to type cast or handle it.
    const materialWithClass = material as unknown as { class_id: string; classes: { teacher_id: string } };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const canEdit =
      profile?.role === 'admin' ||
      profile?.role === 'super_admin' ||
      materialWithClass.classes.teacher_id === user.id;

    if (!canEdit) {
      return { success: false, error: 'Not authorized' };
    }

    const { data: updatedMaterial, error: updateError } = await supabase
      .from('class_materials')
      .update(validated.data)
      .eq('id', materialId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: 'Failed to update material' };
    }

    revalidatePath(`/teacher/classes/${materialWithClass.class_id}`);
    revalidatePath(`/parent/browse/${materialWithClass.class_id}`);

    return { success: true, data: updatedMaterial as ClassMaterial };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

export async function deleteMaterial(
  materialId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  try {
     const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

     // Check ownership
    const { data: material, error: fetchError } = await supabase
      .from('class_materials')
      .select('class_id, classes!inner(teacher_id)')
      .eq('id', materialId)
      .single();

    if (fetchError || !material) {
      return { success: false, error: 'Material not found' };
    }
    
    // Type cast
    const materialWithClass = material as unknown as { class_id: string; classes: { teacher_id: string } };

     const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const canEdit =
      profile?.role === 'admin' ||
      profile?.role === 'super_admin' ||
      materialWithClass.classes.teacher_id === user.id;

    if (!canEdit) {
      return { success: false, error: 'Not authorized' };
    }

    const { error: deleteError } = await supabase
      .from('class_materials')
      .delete()
      .eq('id', materialId);

    if (deleteError) {
      return { success: false, error: 'Failed to delete material' };
    }

    revalidatePath(`/teacher/classes/${materialWithClass.class_id}`);
    revalidatePath(`/parent/browse/${materialWithClass.class_id}`);

    return { success: true, data: undefined };

  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

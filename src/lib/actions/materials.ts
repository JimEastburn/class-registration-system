'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type MaterialResult = {
    error?: string;
    success?: boolean;
    materialId?: string;
};

export async function addMaterial(
    classId: string,
    data: {
        name: string;
        description?: string;
        fileUrl: string;
        fileType: string;
        fileSize?: number;
        isPublic?: boolean;
    }
): Promise<MaterialResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Please log in' };
    }

    // Verify user is the teacher of this class or admin
    const { data: classData } = await supabase
        .from('classes')
        .select('teacher_id')
        .eq('id', classId)
        .single();

    const isAdmin = user.user_metadata?.role === 'admin';
    const isTeacher = classData?.teacher_id === user.id;

    if (!isAdmin && !isTeacher) {
        return { error: 'You do not have permission to add materials to this class' };
    }

    const { data: material, error } = await supabase
        .from('class_materials')
        .insert({
            class_id: classId,
            name: data.name,
            description: data.description || null,
            file_url: data.fileUrl,
            file_type: data.fileType,
            file_size: data.fileSize || null,
            uploaded_by: user.id,
            is_public: data.isPublic || false,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Add material error:', error);
        return { error: 'Failed to add material' };
    }

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/teacher/classes/${classId}/materials`);

    return { success: true, materialId: material.id };
}

export async function updateMaterial(
    materialId: string,
    data: {
        name?: string;
        description?: string;
        isPublic?: boolean;
    }
): Promise<MaterialResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Please log in' };
    }

    // Get material and class info
    const { data: material } = await supabase
        .from('class_materials')
        .select('class_id, class:classes(teacher_id)')
        .eq('id', materialId)
        .single();

    if (!material) {
        return { error: 'Material not found' };
    }

    const classInfo = material.class as unknown as { teacher_id: string };
    const isAdmin = user.user_metadata?.role === 'admin';
    const isTeacher = classInfo.teacher_id === user.id;

    if (!isAdmin && !isTeacher) {
        return { error: 'You do not have permission to update this material' };
    }

    const { error } = await supabase
        .from('class_materials')
        .update({
            name: data.name,
            description: data.description,
            is_public: data.isPublic,
            updated_at: new Date().toISOString(),
        })
        .eq('id', materialId);

    if (error) {
        return { error: 'Failed to update material' };
    }

    revalidatePath(`/teacher/classes/${material.class_id}`);
    revalidatePath(`/teacher/classes/${material.class_id}/materials`);

    return { success: true };
}

export async function deleteMaterial(materialId: string): Promise<MaterialResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Please log in' };
    }

    // Get material and class info
    const { data: material } = await supabase
        .from('class_materials')
        .select('class_id, file_url, class:classes(teacher_id)')
        .eq('id', materialId)
        .single();

    if (!material) {
        return { error: 'Material not found' };
    }

    const classInfo = material.class as unknown as { teacher_id: string };
    const isAdmin = user.user_metadata?.role === 'admin';
    const isTeacher = classInfo.teacher_id === user.id;

    if (!isAdmin && !isTeacher) {
        return { error: 'You do not have permission to delete this material' };
    }

    // Delete from database
    const { error } = await supabase
        .from('class_materials')
        .delete()
        .eq('id', materialId);

    if (error) {
        return { error: 'Failed to delete material' };
    }

    revalidatePath(`/teacher/classes/${material.class_id}`);
    revalidatePath(`/teacher/classes/${material.class_id}/materials`);

    return { success: true };
}

export async function getClassMaterials(classId: string) {
    const supabase = await createClient();

    const { data: materials } = await supabase
        .from('class_materials')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

    return materials || [];
}

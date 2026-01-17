'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = {
    error?: string;
    success?: boolean;
    data?: unknown;
};

export async function addFamilyMember(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const relationship = formData.get('relationship') as string;
    const gradeLevel = formData.get('gradeLevel') as string;
    const birthDate = formData.get('birthDate') as string;
    const notes = formData.get('notes') as string;

    const { error } = await supabase.from('family_members').insert({
        parent_id: user.id,
        first_name: firstName,
        last_name: lastName,
        relationship,
        grade_level: gradeLevel || null,
        birth_date: birthDate || null,
        notes: notes || null,
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/parent/family');
    return { success: true };
}

export async function updateFamilyMember(
    id: string,
    formData: FormData
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const relationship = formData.get('relationship') as string;
    const gradeLevel = formData.get('gradeLevel') as string;
    const birthDate = formData.get('birthDate') as string;
    const notes = formData.get('notes') as string;

    const { error } = await supabase
        .from('family_members')
        .update({
            first_name: firstName,
            last_name: lastName,
            relationship,
            grade_level: gradeLevel || null,
            birth_date: birthDate || null,
            notes: notes || null,
        })
        .eq('id', id)
        .eq('parent_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/parent/family');
    return { success: true };
}

export async function deleteFamilyMember(id: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id)
        .eq('parent_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/parent/family');
    return { success: true };
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ProfileActionResult = {
    error?: string;
    success?: boolean;
};

export async function updateProfile(data: {
    firstName: string;
    lastName: string;
    phone?: string;
    bio?: string;
}): Promise<ProfileActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Update profile in database
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone || null,
            bio: data.bio || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    if (profileError) {
        return { error: profileError.message };
    }

    // Update user metadata in auth
    const { error: authError } = await supabase.auth.updateUser({
        data: {
            first_name: data.firstName,
            last_name: data.lastName,
        },
    });

    if (authError) {
        console.error('Failed to update auth metadata:', authError);
        // Don't fail the whole operation for this
    }

    const role = user.user_metadata?.role || 'parent';
    revalidatePath(`/${role}/profile`);
    revalidatePath(`/${role}`);

    return { success: true };
}

export async function getProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return profile;
}

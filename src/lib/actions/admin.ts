'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type AdminActionResult = {
    error?: string;
    success?: boolean;
    data?: unknown;
};

// User management
export async function updateUserRole(
    userId: string,
    role: 'parent' | 'teacher' | 'student' | 'admin' | 'class_scheduler'
): Promise<AdminActionResult> {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser || currentUser.user_metadata?.role !== 'admin') {
        return { error: 'Not authorized' };
    }

    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

    if (error) {
        return { error: error.message };
    }

    // Sync role to auth metadata
    const adminClient = createAdminClient();
    const { error: metadataError } = await adminClient.auth.admin.updateUserById(
        userId,
        { user_metadata: { role } }
    );

    if (metadataError) {
        // Return the error so the UI can display it
        console.error('Failed to sync user role to auth metadata:', metadataError);
        return {
            error: `Profile updated, but metadata sync failed: ${metadataError.message}`,
            success: false
        };
    }

    revalidatePath('/admin/users');
    return { success: true };
}

export async function deleteUser(userId: string): Promise<AdminActionResult> {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser || currentUser.user_metadata?.role !== 'admin') {
        return { error: 'Not authorized' };
    }

    // Can't delete yourself
    if (userId === currentUser.id) {
        return { error: 'Cannot delete your own account' };
    }

    // Delete profile (cascade will handle related data)
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
}

// Class management
export async function adminUpdateClass(
    classId: string,
    updates: {
        name?: string;
        status?: string;
        max_students?: number;
        fee?: number;
    }
): Promise<AdminActionResult> {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser || (currentUser.user_metadata?.role !== 'admin' && currentUser.user_metadata?.role !== 'class_scheduler')) {
        return { error: 'Not authorized' };
    }

    const { error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', classId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/classes');
    return { success: true };
}

export async function adminDeleteClass(classId: string): Promise<AdminActionResult> {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser || (currentUser.user_metadata?.role !== 'admin' && currentUser.user_metadata?.role !== 'class_scheduler')) {
        return { error: 'Not authorized' };
    }

    const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/classes');
    return { success: true };
}

// Enrollment management
export async function adminUpdateEnrollment(
    enrollmentId: string,
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
): Promise<AdminActionResult> {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser || (currentUser.user_metadata?.role !== 'admin' && currentUser.user_metadata?.role !== 'class_scheduler')) {
        return { error: 'Not authorized' };
    }

    const { error } = await supabase
        .from('enrollments')
        .update({ status })
        .eq('id', enrollmentId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/enrollments');
    return { success: true };
}

export async function adminDeleteEnrollment(enrollmentId: string): Promise<AdminActionResult> {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser || (currentUser.user_metadata?.role !== 'admin' && currentUser.user_metadata?.role !== 'class_scheduler')) {
        return { error: 'Not authorized' };
    }

    const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/enrollments');
    return { success: true };
}

// Payment management
export async function adminUpdatePayment(
    paymentId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
): Promise<AdminActionResult> {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser || currentUser.user_metadata?.role !== 'admin') {
        return { error: 'Not authorized' };
    }

    const { error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', paymentId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/payments');
    return { success: true };
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export type InviteActionResult = {
    error?: string;
    success?: boolean;
    code?: string;
    data?: unknown;
};

/**
 * Generates a random 6-character alphanumeric code
 */
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Parent action: Generate an invite code for a family member
 */
export async function generateFamilyInviteCode(familyMemberId: string): Promise<InviteActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Verify parent owns this family member
    const { data: familyMember } = await supabase
        .from('family_members')
        .select('id, first_name, parent_id')
        .eq('id', familyMemberId)
        .single();

    if (!familyMember) {
        return { error: 'Family member not found' };
    }

    if (familyMember.parent_id !== user.id) {
        return { error: 'Not authorized' };
    }

    // Check if there's already an active (non-expired, non-redeemed) invite
    const { data: existingInvite } = await supabase
        .from('family_member_invites')
        .select('code, expires_at')
        .eq('family_member_id', familyMemberId)
        .is('redeemed_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (existingInvite) {
        // Return existing code
        return { success: true, code: existingInvite.code };
    }

    // Generate a unique code
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const { data: existing } = await supabase
            .from('family_member_invites')
            .select('id')
            .eq('code', code)
            .single();

        if (!existing) break;
        code = generateCode();
        attempts++;
    }

    if (attempts >= maxAttempts) {
        return { error: 'Failed to generate unique code. Please try again.' };
    }

    // Create invite with 7-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase
        .from('family_member_invites')
        .insert({
            family_member_id: familyMemberId,
            code,
            created_by: user.id,
            expires_at: expiresAt.toISOString(),
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/parent/family');
    return { success: true, code };
}

/**
 * Student action: Redeem an invite code to link their account
 */
export async function redeemFamilyInviteCode(code: string): Promise<InviteActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Get user profile to check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'student') {
        return { error: 'Only students can redeem invite codes' };
    }

    // Find the invite code
    const { data: invite } = await supabase
        .from('family_member_invites')
        .select('id, family_member_id, expires_at, redeemed_at')
        .eq('code', code.toUpperCase().trim())
        .single();

    if (!invite) {
        return { error: 'Invalid invite code' };
    }

    if (invite.redeemed_at) {
        return { error: 'This code has already been used' };
    }

    if (new Date(invite.expires_at) < new Date()) {
        return { error: 'This code has expired' };
    }

    // Check if student is already linked to a family member
    const { data: existingLink } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (existingLink) {
        return { error: 'Your account is already linked to a family' };
    }

    // Use service role for the linking operation (students can't update family_members via RLS)
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Link the student account to the family member
    const { error: linkError } = await adminClient
        .from('family_members')
        .update({ user_id: user.id })
        .eq('id', invite.family_member_id);

    if (linkError) {
        return { error: linkError.message };
    }

    // Mark invite as redeemed
    await adminClient
        .from('family_member_invites')
        .update({
            redeemed_at: new Date().toISOString(),
            redeemed_by: user.id,
        })
        .eq('id', invite.id);

    revalidatePath('/student');
    revalidatePath('/student/classes');
    return { success: true };
}

/**
 * Get active invite code for a family member (for display)
 */
export async function getActiveInviteCode(familyMemberId: string): Promise<InviteActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const { data: invite } = await supabase
        .from('family_member_invites')
        .select('code, expires_at')
        .eq('family_member_id', familyMemberId)
        .is('redeemed_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (!invite) {
        return { success: true, code: undefined };
    }

    return { success: true, code: invite.code };
}

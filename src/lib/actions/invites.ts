'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, FamilyMember } from '@/types';

/**
 * Log an audit entry for student linking actions
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
      target_type: 'student_link',
      target_id: targetId,
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Search for a student by email and link them to a family member
 * 
 * Flow:
 * 1. Search for a user with 'student' role and matching email
 * 2. If found, link them to the family member (set student_user_id)
 * 3. If not found, return appropriate status for pending link creation
 */
export async function linkStudentByEmail(
  familyMemberId: string,
  studentEmail: string
): Promise<
  ActionResult<{
    linked: boolean;
    studentProfile?: { id: string; email: string; first_name: string | null; last_name: string | null };
  }>
> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify the family member belongs to the current user
  const { data: familyMember, error: familyError } = await supabase
    .from('family_members')
    .select('id, first_name, last_name, student_user_id, parent_id')
    .eq('id', familyMemberId)
    .single();

  if (familyError || !familyMember) {
    return { success: false, error: 'Family member not found' };
  }

  if (familyMember.parent_id !== user.id) {
    return { success: false, error: 'You do not have permission to link this family member' };
  }

  // Check if already linked
  if (familyMember.student_user_id) {
    return { success: false, error: 'This family member is already linked to a student account' };
  }

  // Search for a student profile with the given email
  const adminClient = await createAdminClient();

  const { data: studentProfile, error: searchError } = await adminClient
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .eq('email', studentEmail.toLowerCase().trim())
    .eq('role', 'student')
    .single();

  if (searchError || !studentProfile) {
    // No student found with this email - return not linked status
    return {
      success: true,
      data: { linked: false },
    };
  }

  // Check if the student is already linked to another family member
  const { data: existingLink, error: linkCheckError } = await adminClient
    .from('family_members')
    .select('id, parent_id')
    .eq('student_user_id', studentProfile.id)
    .single();

  if (!linkCheckError && existingLink) {
    // Check if it's a different parent
    if (existingLink.parent_id !== user.id) {
      return {
        success: false,
        error: 'This student is already linked to another family',
      };
    } else {
      return {
        success: false,
        error: 'This student is already linked to another family member in your account',
      };
    }
  }

  // Link the student to the family member
  const { error: updateError } = await adminClient
    .from('family_members')
    .update({ student_user_id: studentProfile.id })
    .eq('id', familyMemberId);

  if (updateError) {
    console.error('Error linking student:', updateError);
    return { success: false, error: 'Failed to link student account' };
  }

  // Log audit entry
  await logAuditEntry(user.id, 'student.linked', familyMemberId, {
    student_id: studentProfile.id,
    student_email: studentEmail,
  });

  revalidatePath('/parent/family');

  return {
    success: true,
    data: {
      linked: true,
      studentProfile: {
        id: studentProfile.id,
        email: studentProfile.email,
        first_name: studentProfile.first_name,
        last_name: studentProfile.last_name,
      },
    },
  };
}

/**
 * Create a pending link record for a student that doesn't exist yet
 * This can be completed when the student registers with the specified email
 */
export async function createPendingLink(
  familyMemberId: string,
  studentEmail: string
): Promise<ActionResult<{ pendingEmail: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify family member ownership
  const { data: familyMember, error: familyError } = await supabase
    .from('family_members')
    .select('id, parent_id, student_user_id')
    .eq('id', familyMemberId)
    .single();

  if (familyError || !familyMember) {
    return { success: false, error: 'Family member not found' };
  }

  if (familyMember.parent_id !== user.id) {
    return { success: false, error: 'You do not have permission to modify this family member' };
  }

  if (familyMember.student_user_id) {
    return { success: false, error: 'This family member is already linked to a student account' };
  }

  // Check if a user with this email already exists
  const adminClient = await createAdminClient();

  const { data: existingUser } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', studentEmail.toLowerCase().trim())
    .single();

  if (existingUser) {
    return {
      success: false,
      error: 'A user with this email already exists. Use "Link by Email" instead.',
    };
  }

  // Store the pending link email in the system_settings table
  // Using a pattern: pending_links -> { [email]: { familyMemberId, parentId, createdAt } }
  const pendingKey = `pending_link:${studentEmail.toLowerCase().trim()}`;
  
  await adminClient.from('system_settings').upsert(
    {
      key: pendingKey,
      value: {
        family_member_id: familyMemberId,
        parent_id: user.id,
        created_at: new Date().toISOString(),
      },
    },
    { onConflict: 'key' }
  );

  // Log audit entry
  await logAuditEntry(user.id, 'student.pending_link_created', familyMemberId, {
    pending_email: studentEmail,
  });

  revalidatePath('/parent/family');

  return {
    success: true,
    data: { pendingEmail: studentEmail.toLowerCase().trim() },
  };
}

/**
 * Complete a pending link when a student registers
 * Called during the registration process if a pending link exists for the email
 */
export async function completePendingLink(
  studentEmail: string,
  studentUserId: string
): Promise<ActionResult<{ familyMemberId: string }>> {
  const supabase = await createClient();

  // Look up pending link in system_settings
  const pendingKey = `pending_link:${studentEmail.toLowerCase().trim()}`;

  const { data: pendingLink, error: lookupError } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', pendingKey)
    .single();

  if (lookupError || !pendingLink) {
    // No pending link - this is okay, just means no one is waiting for this student
    return { success: true, data: { familyMemberId: '' } };
  }

  const linkData = pendingLink.value as {
    family_member_id: string;
    parent_id: string;
    created_at: string;
  };

  // Link the student to the family member
  const { error: updateError } = await supabase
    .from('family_members')
    .update({ student_user_id: studentUserId })
    .eq('id', linkData.family_member_id)
    .eq('parent_id', linkData.parent_id); // Extra safety check

  if (updateError) {
    console.error('Error completing pending link:', updateError);
    return { success: false, error: 'Failed to complete student link' };
  }

  // Delete the pending link
  await supabase.from('system_settings').delete().eq('key', pendingKey);

  // Log audit entry (using the parent_id as the user who initiated)
  await logAuditEntry(linkData.parent_id, 'student.pending_link_completed', linkData.family_member_id, {
    student_id: studentUserId,
    student_email: studentEmail,
  });

  return {
    success: true,
    data: { familyMemberId: linkData.family_member_id },
  };
}

/**
 * Unlink a student from a family member
 */
export async function unlinkStudent(
  familyMemberId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify ownership
  const { data: familyMember, error: familyError } = await supabase
    .from('family_members')
    .select('id, parent_id, student_user_id')
    .eq('id', familyMemberId)
    .single();

  if (familyError || !familyMember) {
    return { success: false, error: 'Family member not found' };
  }

  if (familyMember.parent_id !== user.id) {
    return { success: false, error: 'You do not have permission to unlink this student' };
  }

  if (!familyMember.student_user_id) {
    return { success: false, error: 'This family member is not linked to a student account' };
  }

  const previousStudentId = familyMember.student_user_id;

  // Remove the link
  const { error: updateError } = await supabase
    .from('family_members')
    .update({ student_user_id: null })
    .eq('id', familyMemberId);

  if (updateError) {
    console.error('Error unlinking student:', updateError);
    return { success: false, error: 'Failed to unlink student account' };
  }

  // Log audit entry
  await logAuditEntry(user.id, 'student.unlinked', familyMemberId, {
    previous_student_id: previousStudentId,
  });

  revalidatePath('/parent/family');

  return { success: true, data: undefined };
}

/**
 * Get family member with linked student info (if any)
 */
export async function getFamilyMemberWithStudent(
  familyMemberId: string
): Promise<
  ActionResult<{
    familyMember: FamilyMember;
    linkedStudent?: {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
    };
  }>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: familyMember, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('id', familyMemberId)
    .eq('parent_id', user.id)
    .single();

  if (error || !familyMember) {
    return { success: false, error: 'Family member not found' };
  }

  // If linked, get the student profile
  let linkedStudent;
  if (familyMember.student_user_id) {
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', familyMember.student_user_id)
      .single();

    if (studentProfile) {
      linkedStudent = studentProfile;
    }
  }

  return {
    success: true,
    data: {
      familyMember: familyMember as FamilyMember,
      linkedStudent,
    },
  };
}

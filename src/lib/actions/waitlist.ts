'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendWaitlistNotification } from '@/lib/email';
import type { ActionResult, Enrollment } from '@/types';

/**
 * Map a stable HINT from add_to_waitlist (or related waitlist RPCs) to a
 * user-facing error message. Falls back to the raw message if the hint is
 * absent or unrecognized.
 */
function mapAddToWaitlistError(err: {
  message?: string;
  hint?: string | null;
}): string {
  switch (err.hint) {
    case 'WL_NOT_AUTHORIZED':
      return 'You do not have permission for this family member';
    case 'WL_CLASS_NOT_FOUND':
      return 'Class not found';
    case 'WL_NOT_PUBLISHED':
      return 'This class is not available for enrollment';
    case 'WL_BLOCKED':
      return "This student has been blocked from the teacher's classes";
    case 'WL_SEATS_OPEN':
      return 'This class has open seats — please enroll directly';
    case 'WL_DUPLICATE_WAITLISTED':
      return 'This student is already on the waitlist for this class';
    case 'WL_DUPLICATE_ACTIVE':
      return 'This student is already enrolled in this class';
    default:
      return err.message || 'Failed to add to waitlist';
  }
}

/**
 * Log an audit entry for waitlist actions
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
      target_type: 'enrollment',
      target_id: targetId,
      details: (details || {}) as import('@/types/database').Json,
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Add a student to the waitlist for a class.
 *
 * Auth (cookie-based) is checked at the app layer for a clean error. The
 * heavy lifting — family ownership, class-publication gate, teacher-block
 * gate, capacity check (must be full), duplicate rejection, and position
 * assignment — happens atomically inside the add_to_waitlist RPC under a
 * FOR UPDATE lock on the class row. See migration
 * 20260523200000_atomic_add_to_waitlist.sql.
 */
export async function addToWaitlist(
  classId: string,
  familyMemberId: string
): Promise<ActionResult<{ enrollmentId: string; position: number }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Pre-check existence + ownership at the app layer so we can return
  // distinct, friendly errors. The RPC re-checks ownership via auth.uid() for
  // defense in depth.
  const { data: familyMember, error: familyError } = await supabase
    .from('family_members')
    .select('id, parent_id')
    .eq('id', familyMemberId)
    .single();

  if (familyError || !familyMember) {
    return { success: false, error: 'Family member not found' };
  }

  if (familyMember.parent_id !== user.id) {
    return {
      success: false,
      error: 'You do not have permission for this family member',
    };
  }

  const { data: enrollment, error: rpcError } = await supabase.rpc(
    'add_to_waitlist',
    { p_class_id: classId, p_student_id: familyMemberId }
  );

  if (rpcError) {
    return {
      success: false,
      error: mapAddToWaitlistError(rpcError),
    };
  }

  if (!enrollment) {
    return { success: false, error: 'Failed to add to waitlist' };
  }

  const position = enrollment.waitlist_position ?? 0;

  await logAuditEntry(user.id, 'waitlist.added', enrollment.id, {
    class_id: classId,
    family_member_id: familyMemberId,
    position,
  });

  revalidatePath('/parent/enrollments');
  revalidatePath(`/parent/browse/${classId}`);

  return {
    success: true,
    data: { enrollmentId: enrollment.id, position },
  };
}

/**
 * Remove a student from the waitlist
 */
export async function removeFromWaitlist(
  enrollmentId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get the enrollment with ownership check
  const { data: enrollment, error: fetchError } = await supabase
    .from('enrollments')
    .select('id, status, class_id, waitlist_position, student_id')
    .eq('id', enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    return { success: false, error: 'Enrollment not found' };
  }

  // Verify ownership through family_members
  const { data: familyMemberCheck } = await supabase
    .from('family_members')
    .select('id')
    .eq('id', enrollment.student_id)
    .eq('parent_id', user.id)
    .single();

  if (!familyMemberCheck) {
    return {
      success: false,
      error: 'You do not have permission to remove this enrollment',
    };
  }

  if (enrollment.status !== 'waitlisted') {
    return { success: false, error: 'This enrollment is not on the waitlist' };
  }

  const classId = enrollment.class_id;

  // Delete the waitlist entry. The on_waitlist_delete_resequence trigger closes
  // the gap this leaves, atomically and for every removal path — see migration
  // 20260804100000_resequence_waitlist_on_removal.sql. Reordering here as well
  // would decrement the remaining positions a second time.
  const { error: deleteError } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId);

  if (deleteError) {
    console.error('Error removing from waitlist:', deleteError);
    return { success: false, error: 'Failed to remove from waitlist' };
  }

  // Log audit entry
  await logAuditEntry(user.id, 'waitlist.removed', enrollmentId, {
    class_id: classId,
  });

  revalidatePath('/parent/enrollments');
  revalidatePath(`/parent/browse/${classId}`);

  return { success: true, data: undefined };
}

/**
 * Promote the first person on the waitlist to enrolled status
 * Called when a spot opens up (e.g., someone cancels)
 */
export async function promoteFromWaitlist(
  classId: string,
  actorUserId: string = 'system'
): Promise<
  ActionResult<{ enrollmentId: string; familyMemberId: string } | null>
> {
  const supabase = await createClient();

  // Atomic capacity-aware promotion: the SQL function locks the class row
  // (FOR UPDATE) and performs the seat-count check and the waitlist UPDATE under
  // that lock — serializes with enroll_student() and with concurrent
  // promote_waitlist_one() calls. The gap left by the promoted row is closed by
  // the on_waitlist_update_resequence trigger. See migrations
  // 20260522200000_atomic_promote_waitlist.sql and
  // 20260804100000_resequence_waitlist_on_removal.sql.
  const { data: promoted, error: rpcError } = await supabase.rpc(
    'promote_waitlist_one',
    { p_class_id: classId }
  );

  if (rpcError) {
    console.error('Error promoting from waitlist:', rpcError);
    return { success: false, error: 'Failed to promote from waitlist' };
  }

  if (!promoted) {
    // No capacity, or no one on the waitlist — caller treats this as a no-op.
    return { success: true, data: null };
  }

  // Audit log
  await logAuditEntry(actorUserId, 'waitlist.promoted', promoted.id, {
    class_id: classId,
    student_id: promoted.student_id,
  });

  // Notification email — fetch student + parent + class for the message.
  const { data: student } = await supabase
    .from('family_members')
    .select('first_name, last_name, parent_id')
    .eq('id', promoted.student_id)
    .single();

  if (student?.parent_id) {
    const { data: parent } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', student.parent_id)
      .single();

    const { data: classInfo } = await supabase
      .from('classes')
      .select('name, start_date')
      .eq('id', classId)
      .single();

    if (parent) {
      await sendWaitlistNotification({
        parentEmail: parent.email,
        parentName: `${parent.first_name} ${parent.last_name}`,
        studentName: `${student.first_name} ${student.last_name}`,
        className: classInfo?.name || 'Unknown Class',
        schedule: 'Check Dashboard',
        startDate: classInfo?.start_date
          ? new Date(classInfo.start_date).toLocaleDateString()
          : 'TBA',
      });
    }
  }

  revalidatePath('/parent/enrollments');
  revalidatePath(`/parent/browse/${classId}`);

  return {
    success: true,
    data: {
      enrollmentId: promoted.id,
      familyMemberId: promoted.student_id,
    },
  };
}

/**
 * Admin-only: promote the next waitlisted student for a class.
 */
export async function promoteWaitlistEntryAsAdmin(
  classId: string
): Promise<
  ActionResult<{ enrollmentId: string; familyMemberId: string } | null>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin or super_admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Failed to verify permissions' };
  }

  if (!['admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized' };
  }

  return promoteFromWaitlist(classId, user.id);
}

/**
 * Get waitlist position for a specific enrollment
 */
export async function getWaitlistPosition(
  enrollmentId: string
): Promise<ActionResult<{ position: number; totalWaitlisted: number }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .select('id, class_id, waitlist_position, status, student_id')
    .eq('id', enrollmentId)
    .single();

  if (error || !enrollment) {
    return { success: false, error: 'Enrollment not found' };
  }

  if (enrollment.status !== 'waitlisted') {
    return { success: false, error: 'This enrollment is not on the waitlist' };
  }

  // Get total count of waitlisted for this class
  const { count } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', enrollment.class_id)
    .eq('status', 'waitlisted');

  return {
    success: true,
    data: {
      position: enrollment.waitlist_position || 0,
      totalWaitlisted: count || 0,
    },
  };
}

/**
 * Get all waitlisted enrollments for a class (for admin/teacher view)
 */
export async function getClassWaitlist(
  classId: string
): Promise<ActionResult<Enrollment[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('enrollments')
    .select(
      `
      *,
      student:family_members(id, first_name, last_name)
    `
    )
    .eq('class_id', classId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true });

  if (error) {
    console.error('Error fetching waitlist:', error);
    return { success: false, error: 'Failed to fetch waitlist' };
  }

  return { success: true, data: data as Enrollment[] };
}

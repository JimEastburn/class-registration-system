'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, Enrollment } from '@/types';

/**
 * Get the next waitlist position for a class
 */
async function getNextWaitlistPosition(classId: string): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('enrollments')
    .select('waitlist_position')
    .eq('class_id', classId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: false })
    .limit(1)
    .single();

  return (data?.waitlist_position || 0) + 1;
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
      details: details || {},
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Add a student to the waitlist for a class
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

  // Verify family member ownership
  const { data: familyMember, error: familyError } = await supabase
    .from('family_members')
    .select('id, parent_id, first_name, last_name')
    .eq('id', familyMemberId)
    .single();

  if (familyError || !familyMember) {
    return { success: false, error: 'Family member not found' };
  }

  if (familyMember.parent_id !== user.id) {
    return { success: false, error: 'You do not have permission for this family member' };
  }

  // Check if already enrolled or waitlisted
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('class_id', classId)
    .eq('family_member_id', familyMemberId)
    .in('status', ['enrolled', 'waitlisted'])
    .single();

  if (existingEnrollment) {
    const status = existingEnrollment.status === 'enrolled' ? 'enrolled' : 'already on the waitlist';
    return { success: false, error: `This student is already ${status} for this class` };
  }

  // Get the next waitlist position
  const position = await getNextWaitlistPosition(classId);

  // Create waitlist enrollment
  const { data: enrollment, error: insertError } = await supabase
    .from('enrollments')
    .insert({
      class_id: classId,
      family_member_id: familyMemberId,
      parent_id: user.id,
      status: 'waitlisted',
      waitlist_position: position,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error adding to waitlist:', insertError);
    return { success: false, error: 'Failed to add to waitlist' };
  }

  // Log audit entry
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
    .select('id, status, parent_id, class_id, waitlist_position')
    .eq('id', enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    return { success: false, error: 'Enrollment not found' };
  }

  if (enrollment.parent_id !== user.id) {
    return { success: false, error: 'You do not have permission to remove this enrollment' };
  }

  if (enrollment.status !== 'waitlisted') {
    return { success: false, error: 'This enrollment is not on the waitlist' };
  }

  const classId = enrollment.class_id;
  const removedPosition = enrollment.waitlist_position;

  // Delete the waitlist entry
  const { error: deleteError } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId);

  if (deleteError) {
    console.error('Error removing from waitlist:', deleteError);
    return { success: false, error: 'Failed to remove from waitlist' };
  }

  // Reorder remaining waitlist positions
  if (removedPosition) {
    await reorderWaitlistPositions(classId, removedPosition);
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
 * Reorder waitlist positions after a removal
 */
async function reorderWaitlistPositions(
  classId: string,
  removedPosition: number
): Promise<void> {
  const supabase = await createClient();

  // Get all waitlisted enrollments with position greater than removed
  const { data: waitlisted } = await supabase
    .from('enrollments')
    .select('id, waitlist_position')
    .eq('class_id', classId)
    .eq('status', 'waitlisted')
    .gt('waitlist_position', removedPosition)
    .order('waitlist_position', { ascending: true });

  if (!waitlisted?.length) return;

  // Update each position to be one less
  for (const enrollment of waitlisted) {
    await supabase
      .from('enrollments')
      .update({ waitlist_position: (enrollment.waitlist_position || 1) - 1 })
      .eq('id', enrollment.id);
  }
}

/**
 * Promote the first person on the waitlist to enrolled status
 * Called when a spot opens up (e.g., someone cancels)
 */
export async function promoteFromWaitlist(
  classId: string
): Promise<ActionResult<{ enrollmentId: string; familyMemberId: string } | null>> {
  const supabase = await createClient();

  // Check if there's capacity (in case this was called manually)
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('capacity')
    .eq('id', classId)
    .single();

  if (classError || !classData) {
    return { success: false, error: 'Class not found' };
  }

  // Count current enrollments
  const { count: enrolledCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('status', 'enrolled');

  if ((enrolledCount || 0) >= classData.capacity) {
    // No capacity - nothing to do
    return { success: true, data: null };
  }

  // Get the first person on the waitlist
  const { data: firstInLine, error: waitlistError } = await supabase
    .from('enrollments')
    .select('id, family_member_id, parent_id')
    .eq('class_id', classId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .single();

  if (waitlistError || !firstInLine) {
    // No one on waitlist
    return { success: true, data: null };
  }

  // Promote to enrolled
  const { error: updateError } = await supabase
    .from('enrollments')
    .update({
      status: 'enrolled',
      waitlist_position: null,
    })
    .eq('id', firstInLine.id);

  if (updateError) {
    console.error('Error promoting from waitlist:', updateError);
    return { success: false, error: 'Failed to promote from waitlist' };
  }

  // Reorder remaining waitlist
  await reorderWaitlistPositions(classId, 1);

  // Log audit entry
  await logAuditEntry(firstInLine.parent_id, 'waitlist.promoted', firstInLine.id, {
    class_id: classId,
    family_member_id: firstInLine.family_member_id,
  });

  revalidatePath('/parent/enrollments');
  revalidatePath(`/parent/browse/${classId}`);

  return {
    success: true,
    data: {
      enrollmentId: firstInLine.id,
      familyMemberId: firstInLine.family_member_id,
    },
  };
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
    .select('id, class_id, waitlist_position, status, parent_id')
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
    .select(`
      *,
      family_member:family_members(id, first_name, last_name),
      parent:profiles!enrollments_parent_id_fkey(id, email, first_name, last_name)
    `)
    .eq('class_id', classId)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true });

  if (error) {
    console.error('Error fetching waitlist:', error);
    return { success: false, error: 'Failed to fetch waitlist' };
  }

  return { success: true, data: data as Enrollment[] };
}

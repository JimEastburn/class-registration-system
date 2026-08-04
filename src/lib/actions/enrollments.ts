'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAuditAction } from '@/lib/actions/audit';
import type {
  ClassStatus,
  Enrollment,
  EnrollmentStatus,
  FamilyMember,
  Profile,
  ScheduleConfig,
} from '@/types';
import { checkStudentScheduleConflict } from '@/lib/logic/scheduling';
import { promoteFromWaitlist } from '@/lib/actions/waitlist';
import {
  getEnrollmentCountsByClass,
  EMPTY_COUNTS,
} from '@/lib/enrollment-counts';

interface EnrollmentWithClass extends Enrollment {
  class: {
    id: string;
    name: string;
    teacher_id: string;
    price: number;
    day: string | null;
    block: string | null;
    location: string | null;
    schedule_config: ScheduleConfig | null;
    age_min: number | null;
    age_max: number | null;
    teacher: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
}

export interface RosterEnrollment extends Enrollment {
  student: FamilyMember & {
    parent: Pick<
      Profile,
      'first_name' | 'last_name' | 'email' | 'phone'
    > | null;
    /** Set when the student self-registered and was linked to this record */
    student_user: Pick<Profile, 'age'> | null;
  };
  isBlocked?: boolean;
}

export type AdminEnrollmentView = RosterEnrollment & {
  class: {
    id: string;
    name: string;
    teacher_id: string;
    price: number | null;
  } | null;
};

/**
 * Get enrollments for a specific family member
 */
export async function getEnrollmentsForFamilyMember(
  familyMemberId: string
): Promise<{ data: EnrollmentWithClass[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Verify the family member belongs to this parent
    const { data: familyMember, error: ownerError } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', familyMemberId)
      .eq('parent_id', user.id)
      .single();

    if (ownerError || !familyMember) {
      return { data: null, error: 'Family member not found or access denied' };
    }

    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
                *,
                class:classes (
                    id,
                    name,
                    teacher_id,
                    price,
                    day,
                    block,
                    location,
                    schedule_config,
                    teacher:profiles(first_name, last_name)
                )
            `
      )
      .eq('student_id', familyMemberId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrollments:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as EnrollmentWithClass[], error: null };
  } catch (err) {
    console.error('Unexpected error in getEnrollmentsForFamilyMember:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all enrollments for a parent's family
 */
export async function getEnrollmentsForFamily(): Promise<{
  data: EnrollmentWithClass[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get all family member IDs for this parent
    const { data: familyMembers, error: familyError } = await supabase
      .from('family_members')
      .select('id')
      .eq('parent_id', user.id);

    if (familyError || !familyMembers) {
      return { data: null, error: 'Failed to fetch family members' };
    }

    const familyMemberIds = familyMembers.map((m) => m.id);

    if (familyMemberIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
                *,
                class:classes (
                    id,
                    name,
                    teacher_id,
                    price,
                    day,
                    block,
                    location,
                    schedule_config,
                    age_min,
                    age_max,
                    teacher:profiles(first_name, last_name)
                ),
                student:family_members (
                    id,
                    first_name,
                    last_name
                )
            `
      )
      .in('student_id', familyMemberIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching family enrollments:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as EnrollmentWithClass[], error: null };
  } catch (err) {
    console.error('Unexpected error in getEnrollmentsForFamily:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

interface EnrollStudentInput {
  classId: string;
  familyMemberId: string;
}

/**
 * Enroll a student in a class (with capacity check and waitlist logic)
 */
export async function enrollStudent(input: EnrollStudentInput): Promise<{
  data: Enrollment | null;
  status:
    | 'confirmed'
    | 'waitlisted'
    | 'blocked'
    | 'pending'
    | 'schedule_conflict'
    | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, status: null, error: 'Not authenticated' };
    }

    // Enforce registration settings
    const adminClient = await createAdminClient();
    const { data: registrationSetting } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', 'registration_settings')
      .maybeSingle();

    if (registrationSetting?.value) {
      const settings = registrationSetting.value as {
        registrationOpen?: boolean;
        semesterStart?: string;
        semesterEnd?: string;
      };

      if (settings.registrationOpen === false) {
        return {
          data: null,
          status: null,
          error: 'Registration is currently closed',
        };
      }

      if (settings.semesterStart && settings.semesterEnd) {
        const now = new Date();
        const start = new Date(settings.semesterStart);
        const end = new Date(settings.semesterEnd);
        if (now < start || now > end) {
          return {
            data: null,
            status: null,
            error: 'Registration is outside the current semester dates',
          };
        }
      }
    }

    // Verify the family member belongs to this parent
    const { data: familyMember, error: ownerError } = await supabase
      .from('family_members')
      .select('id, first_name, last_name, relationship')
      .eq('id', input.familyMemberId)
      .eq('parent_id', user.id)
      .single();

    if (ownerError || !familyMember) {
      return {
        data: null,
        status: null,
        error: 'Family member not found or access denied',
      };
    }
    if (familyMember.relationship !== 'Student') {
      return {
        data: null,
        status: null,
        error: 'Only students can be enrolled in classes',
      };
    }

    // Check if student is already enrolled in this class (active status)
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('student_id', input.familyMemberId)
      .eq('class_id', input.classId)
      .in('status', ['confirmed', 'pending', 'waitlisted'])
      .limit(1)
      .maybeSingle();

    if (existingEnrollment) {
      return {
        data: null,
        status: existingEnrollment.status as 'confirmed' | 'waitlisted',
        error: 'Student is already enrolled in this class',
      };
    }

    // Check for schedule conflicts (same day + block as an existing enrollment)
    const { data: studentEnrollments } = await supabase
      .from('enrollments')
      .select('class_id, classes:class_id (id, name, status, schedule_config)')
      .eq('student_id', input.familyMemberId)
      .in('status', ['confirmed', 'pending', 'waitlisted']);

    // Check for teacher blocks
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, capacity, teacher_id, schedule_config')
      .eq('id', input.classId)
      .single();

    if (classError || !classData) {
      return { data: null, status: null, error: 'Class not found' };
    }

    // Student schedule conflict check
    const targetConfig = classData.schedule_config as ScheduleConfig | null;
    if (targetConfig && studentEnrollments) {
      const enrolledClasses = studentEnrollments
        .map((e) => {
          const cls = e.classes as unknown as {
            id: string;
            name: string;
            status: ClassStatus;
            schedule_config: ScheduleConfig | null;
          } | null;
          return cls;
        })
        .filter(Boolean) as {
        id: string;
        name: string;
        status: ClassStatus;
        schedule_config: ScheduleConfig | null;
      }[];

      const conflict = checkStudentScheduleConflict(
        targetConfig,
        enrolledClasses
      );
      if (conflict) {
        return {
          data: null,
          status: 'schedule_conflict' as const,
          error: `Schedule conflict: ${familyMember.first_name} is already enrolled in ${conflict.name} during ${targetConfig.day} ${targetConfig.block}`,
        };
      }
    }

    // Check if teacher has blocked this student
    const { data: block } = await supabase
      .from('class_blocks')
      .select('id')
      .eq('teacher_id', classData.teacher_id)
      .eq('student_id', input.familyMemberId)
      .single();

    if (block) {
      return {
        data: null,
        status: 'blocked',
        error:
          "This student has been blocked from enrolling in this teacher's classes",
      };
    }

    // Atomic, RLS-safe capacity check + insert. The enroll_student function counts
    // seats with definer rights (so it sees the whole class, not just this parent's
    // rows) and decides pending vs. waitlisted under a row lock on the class.
    const { data, error } = await supabase.rpc('enroll_student', {
      p_student_id: input.familyMemberId,
      p_class_id: input.classId,
    });

    if (error || !data) {
      console.error('Error creating enrollment:', error);
      return {
        data: null,
        status: null,
        error: error?.message ?? 'An unexpected error occurred',
      };
    }

    revalidatePath('/parent');
    revalidatePath('/parent/browse');
    revalidatePath(`/parent/browse/${input.classId}`);

    // Teacher enrollment notification temporarily disabled. Keep the helper in
    // src/lib/notifications/teacher-enrollment.ts so this can be restored later.
    // if (data.status === 'pending') {
    //   await notifyTeacherOfEnrollment(input.classId, input.familyMemberId);
    // }

    return {
      data,
      status: data.status as 'pending' | 'waitlisted',
      error: null,
    };
  } catch (err) {
    console.error('Unexpected error in enrollStudent:', err);
    return { data: null, status: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Cancel an enrollment (before payment confirmation)
 */
export async function cancelEnrollment(
  enrollmentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get enrollment and verify ownership
    const { data: enrollment, error: fetchError } = await supabase
      .from('enrollments')
      .select(
        `
                id,
                status,
                class_id,
                student_id,
                family_member:family_members(parent_id)
            `
      )
      .eq('id', enrollmentId)
      .single();

    if (fetchError || !enrollment) {
      return { success: false, error: 'Enrollment not found' };
    }

    // Safely check parent ownership
    const familyMemberData = enrollment.family_member as unknown as
      | { parent_id: string }
      | { parent_id: string }[];
    const ownerId = Array.isArray(familyMemberData)
      ? familyMemberData[0]?.parent_id
      : familyMemberData?.parent_id;

    // Check Admin privilege
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

    if (ownerId !== user.id && !isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    // Only allow cancellation of pending or waitlisted enrollments unless admin
    if (enrollment.status === 'confirmed' && !isAdmin) {
      return {
        success: false,
        error: 'Cannot cancel a confirmed enrollment. Please contact support.',
      };
    }

    // Delete the enrollment
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (deleteError) {
      console.error('Error deleting enrollment:', deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath('/parent');
    revalidatePath('/parent/browse');

    // Record the un-enrollment. This path hard-deletes the row, and no
    // status-change trigger fires on DELETE, so without this log parent
    // self-cancellations are invisible and permanently uncountable.
    await logAuditAction(
      user.id,
      'parent_cancel_enrollment',
      'enrollment',
      enrollmentId,
      {
        student_id: enrollment.student_id,
        class_id: enrollment.class_id,
        previous_status: enrollment.status,
      }
    );

    // Teacher unenrollment notification temporarily disabled. Keep the helper in
    // src/lib/notifications/teacher-enrollment.ts so this can be restored later.
    // if (enrollment.status === 'pending' || enrollment.status === 'confirmed') {
    //   await notifyTeacherOfUnenrollment(
    //     enrollment.class_id,
    //     enrollment.student_id
    //   );
    // }

    // Promote from waitlist if there are waitlisted students
    await promoteFromWaitlist(enrollment.class_id);

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in cancelEnrollment:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get enrollment count for a family
 */
export async function getActiveEnrollmentCount(): Promise<{
  count: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { count: 0, error: 'Not authenticated' };
    }

    // Get all family member IDs for this parent
    const { data: familyMembers, error: familyError } = await supabase
      .from('family_members')
      .select('id')
      .eq('parent_id', user.id);

    if (familyError || !familyMembers) {
      return { count: 0, error: 'Failed to fetch family members' };
    }

    const familyMemberIds = familyMembers.map((m) => m.id);

    if (familyMemberIds.length === 0) {
      return { count: 0, error: null };
    }

    const { count, error } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .in('student_id', familyMemberIds)
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error counting enrollments:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0, error: null };
  } catch (err) {
    console.error('Unexpected error in getActiveEnrollmentCount:', err);
    return { count: 0, error: 'An unexpected error occurred' };
  }
}

/**
 * Get roster for a specific class (Teacher only)
 */
export async function getClassRoster(
  classId: string
): Promise<{ data: RosterEnrollment[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Verify user is teacher of the class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return { data: null, error: 'Class not found' };
    }

    // Check if user is admin or teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin', 'class_scheduler'].includes(
      profile?.role || ''
    );

    if (classData.teacher_id !== user.id && !isAdmin) {
      return {
        data: null,
        error:
          'Access denied: You are not the teacher of this class or an administrator',
      };
    }

    // Use admin client for data queries (authorization already verified above)
    const adminClient = await createAdminClient();

    // Fetch enrollments with student and parent details
    const { data, error } = await adminClient
      .from('enrollments')
      .select(
        `
                *,
                student:family_members (
                    *,
                    parent:profiles!family_members_parent_id_fkey (
                        first_name,
                        last_name,
                        email,
                        phone
                    ),
                    student_user:profiles!family_members_student_user_id_fkey (
                        age
                    )
                )
            `
      )
      .eq('class_id', classId)
      .in('status', ['confirmed', 'waitlisted', 'pending'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching class roster:', error);
      return { data: null, error: error.message };
    }

    // Check for blocks
    const studentIds = data.map((e) => e.student_id);
    const blockedStudentIds = new Set<string>();

    if (studentIds.length > 0) {
      const { data: blocks } = await adminClient
        .from('class_blocks')
        .select('student_id')
        .eq('teacher_id', classData.teacher_id)
        .in('student_id', studentIds);

      if (blocks) {
        blocks.forEach((b) => blockedStudentIds.add(b.student_id));
      }
    }

    const mappedData = data.map((item) => ({
      ...item,
      isBlocked: blockedStudentIds.has(item.student_id),
    }));

    return { data: mappedData as unknown as RosterEnrollment[], error: null };
  } catch (err) {
    console.error('Unexpected error in getClassRoster:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Update the deposit_paid status for an enrollment (Teacher or Admin only)
 */
export async function updateDepositPaid(
  enrollmentId: string,
  depositPaid: boolean,
  classId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is teacher of the class or admin
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

    const isAdmin = ['admin', 'super_admin', 'class_scheduler'].includes(
      profile?.role || ''
    );

    if (classData.teacher_id !== user.id && !isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    // Update deposit_paid via admin client (RLS bypass since auth is verified)
    const adminClient = await createAdminClient();
    const { error } = await adminClient
      .from('enrollments')
      .update({ deposit_paid: depositPaid })
      .eq('id', enrollmentId)
      .eq('class_id', classId);

    if (error) {
      console.error('Error updating deposit_paid:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/teacher/classes/${classId}`);

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in updateDepositPaid:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

import { processRefund } from './refunds';

interface AdminCancelEnrollmentOptions {
  refund: boolean;
}

export async function adminCancelEnrollment(
  enrollmentId: string,
  options: AdminCancelEnrollmentOptions
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check Admin privilege
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

    if (!isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    // Get enrollment
    const { data: enrollment, error: fetchError } = await supabase
      .from('enrollments')
      .select('id, status, class_id, student_id')
      .eq('id', enrollmentId)
      .single();

    if (fetchError || !enrollment) {
      return { success: false, error: 'Enrollment not found' };
    }

    // Process Refund if requested
    if (options.refund) {
      // Find payment?
      const { data: payment } = await supabase
        .from('payments')
        .select('id, amount, status')
        .eq('enrollment_id', enrollmentId)
        .eq('status', 'completed')
        .single();

      if (payment) {
        const refundResult = await processRefund({ paymentId: payment.id });
        if (!refundResult.success) {
          return {
            success: false,
            error: `Refund failed: ${refundResult.error}`,
          };
        }
        // Update payment status? Refunds action might handle it, or we do it here.
        // Assuming processRefund stub handles it or we do nothing for now.
        // update payment status to refunded
        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('id', payment.id);
      } else {
        console.warn(
          'No completed payment found for enrollment, skipping refund.'
        );
      }
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('enrollments')
      .update({ status: 'cancelled', waitlist_position: null })
      .eq('id', enrollmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await logAuditAction(
      user.id,
      'admin_cancel_enrollment',
      'enrollment',
      enrollmentId,
      { refund: options.refund }
    );

    // Teacher unenrollment notification temporarily disabled. Keep the helper in
    // src/lib/notifications/teacher-enrollment.ts so this can be restored later.
    // if (enrollment.status === 'pending' || enrollment.status === 'confirmed') {
    //   await notifyTeacherOfUnenrollment(
    //     enrollment.class_id,
    //     enrollment.student_id
    //   );
    // }

    // Promote waitlisted student if not using refund path
    // (refund path handles its own promotion via processRefund → promoteFromWaitlist)
    if (!options.refund) {
      await promoteFromWaitlist(enrollment.class_id);
    }

    revalidatePath('/admin/enrollments');
    revalidatePath('/parent');

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in adminCancelEnrollment:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function teacherCancelEnrollment(
  enrollmentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is a teacher (or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isTeacher = profile?.role === 'teacher';
    // class_scheduler is intentionally omitted — they do not manage enrollments
    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

    if (!isTeacher && !isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    interface TeacherCancelClassJoin {
      id: string;
      name: string;
      teacher_id: string;
    }

    // Get enrollment with class details
    const { data: enrollment, error: fetchError } = await supabase
      .from('enrollments')
      .select(
        `
        id, status, class_id, student_id,
        class:classes!inner(id, name, teacher_id)
      `
      )
      .eq('id', enrollmentId)
      .single();

    if (fetchError || !enrollment) {
      return { success: false, error: 'Enrollment not found' };
    }

    // Verify teacher owns the class (or is admin)
    const classData = enrollment.class as TeacherCancelClassJoin;
    if (classData.teacher_id !== user.id && !isAdmin) {
      return {
        success: false,
        error: 'Access denied: You are not the teacher of this class',
      };
    }

    // Prevent cancelling already cancelled enrollments
    if (enrollment.status === 'cancelled') {
      return { success: false, error: 'Enrollment is already cancelled' };
    }

    // Block cancellation if a completed payment exists
    const { data: completedPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('enrollment_id', enrollmentId)
      .eq('status', 'completed')
      .maybeSingle();

    if (completedPayment) {
      return {
        success: false,
        error:
          'Cannot cancel a paid enrollment — please ask an admin to issue a refund',
      };
    }

    // Use admin client for update (RLS does not allow teacher updates on enrollments)
    const adminClient = await createAdminClient();

    const { error: updateError } = await adminClient
      .from('enrollments')
      .update({ status: 'cancelled', waitlist_position: null })
      .eq('id', enrollmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await logAuditAction(
      user.id,
      'teacher_cancel_enrollment',
      'enrollment',
      enrollmentId,
      { class_id: classData.id }
    );

    // Promote waitlisted student
    await promoteFromWaitlist(classData.id);

    revalidatePath('/teacher/classes');
    revalidatePath(`/teacher/classes/${classData.id}`);
    revalidatePath('/parent');
    revalidatePath('/parent/enrollments');
    revalidatePath('/admin/enrollments');

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in teacherCancelEnrollment:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Admin: Hard remove (delete) an enrollment.
 */
export async function adminRemoveEnrollment(
  enrollmentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check Admin privilege
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

    if (!isAdmin) {
      return { success: false, error: 'Access denied' };
    }

    if (process.env.VERCEL_ENV === 'production') {
      return { success: false, error: 'Hard delete is disabled in production' };
    }

    // Hard delete
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    await logAuditAction(
      user.id,
      'admin_remove_enrollment',
      'enrollment',
      enrollmentId
    );

    revalidatePath('/admin/enrollments');
    revalidatePath('/parent');

    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in adminRemoveEnrollment:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export interface AdminEnrollStudentInput {
  studentId: string;
  classId: string;
}

export type AdminEnrollStudentResult = {
  data: Enrollment | null;
  status:
    | 'pending'
    | 'waitlisted'
    | 'blocked'
    | 'schedule_conflict'
    | 'reactivated'
    | 'confirmed'
    | null;
  error: string | null;
};

export interface AdminEnrollmentStudentOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  parent_name: string | null;
}

export interface AdminEnrollmentClassOption {
  id: string;
  name: string;
  teacher_name: string | null;
  day: string | null;
  block: string | null;
  capacity: number;
  /** Seats held (confirmed + pending) — see lib/logic/class-capacity. */
  enrolled_count: number;
}

/**
 * Admin: Enroll a student in a class (normal flow, no force)
 */
export async function adminEnrollStudent(
  input: AdminEnrollStudentInput
): Promise<AdminEnrollStudentResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, status: null, error: 'Not authenticated' };
    }

    // Check admin privilege
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');
    if (!isAdmin) {
      return { data: null, status: null, error: 'Access denied' };
    }

    const adminClient = await createAdminClient();

    // Verify student exists and is actually a student
    const { data: student, error: studentError } = await adminClient
      .from('family_members')
      .select('id, first_name, last_name, relationship, parent_id')
      .eq('id', input.studentId)
      .maybeSingle();

    if (studentError || !student) {
      return { data: null, status: null, error: 'Student not found' };
    }

    if (student.relationship !== 'Student') {
      return {
        data: null,
        status: null,
        error: 'Only students can be enrolled in classes',
      };
    }

    // Verify class exists
    const { data: classData, error: classError } = await adminClient
      .from('classes')
      .select('id, name, capacity, teacher_id, schedule_config')
      .eq('id', input.classId)
      .maybeSingle();

    if (classError || !classData) {
      return { data: null, status: null, error: 'Class not found' };
    }

    // Check for existing enrollment
    const { data: existingEnrollment } = await adminClient
      .from('enrollments')
      .select('id, status, waitlist_position')
      .eq('student_id', input.studentId)
      .eq('class_id', input.classId)
      .maybeSingle();

    if (existingEnrollment) {
      const activeStatuses = ['confirmed', 'pending', 'waitlisted'];
      if (activeStatuses.includes(existingEnrollment.status as string)) {
        return {
          data: null,
          status: existingEnrollment.status as 'confirmed' | 'waitlisted',
          error: 'Student is already enrolled in this class',
        };
      }

      // Reactivate the cancelled enrollment atomically via the RPC, which
      // capacity-checks and upserts (ON CONFLICT) under a row lock on the class.
      const { data: updated, error: updateError } = await adminClient.rpc(
        'enroll_student',
        { p_student_id: input.studentId, p_class_id: input.classId }
      );

      if (updateError || !updated) {
        return {
          data: null,
          status: null,
          error: updateError?.message ?? 'An unexpected error occurred',
        };
      }

      await logAuditAction(
        user.id,
        'admin_enroll_student',
        'enrollment',
        existingEnrollment.id,
        {
          classId: input.classId,
          studentId: input.studentId,
          reactivated: true,
        }
      );

      revalidatePath('/admin/enrollments');
      revalidatePath('/parent');
      revalidatePath('/parent/browse');
      revalidatePath(`/parent/browse/${input.classId}`);
      revalidatePath(`/admin/classes/${input.classId}`);

      // Teacher enrollment notification temporarily disabled. Keep the helper in
      // src/lib/notifications/teacher-enrollment.ts so this can be restored later.
      // if ((updated as Enrollment).status === 'pending') {
      //   await notifyTeacherOfEnrollment(input.classId, input.studentId);
      // }

      return {
        data: updated as Enrollment,
        status: 'reactivated',
        error: null,
      };
    }

    // Check for teacher blocks
    const { data: block } = await adminClient
      .from('class_blocks')
      .select('id')
      .eq('teacher_id', classData.teacher_id)
      .eq('student_id', input.studentId)
      .maybeSingle();

    if (block) {
      return {
        data: null,
        status: 'blocked',
        error:
          "This student has been blocked from enrolling in this teacher's classes",
      };
    }

    // Check for schedule conflicts
    const { data: studentEnrollments } = await adminClient
      .from('enrollments')
      .select('class_id, classes:class_id (id, name, status, schedule_config)')
      .eq('student_id', input.studentId)
      .in('status', ['confirmed', 'pending', 'waitlisted']);

    const targetConfig = classData.schedule_config as ScheduleConfig | null;
    if (targetConfig && studentEnrollments) {
      const enrolledClasses = studentEnrollments
        .map((e) => {
          const cls = e.classes as unknown as {
            id: string;
            name: string;
            status: ClassStatus;
            schedule_config: ScheduleConfig | null;
          } | null;
          return cls;
        })
        .filter(Boolean) as {
        id: string;
        name: string;
        status: ClassStatus;
        schedule_config: ScheduleConfig | null;
      }[];

      const conflict = checkStudentScheduleConflict(
        targetConfig,
        enrolledClasses
      );
      if (conflict) {
        return {
          data: null,
          status: 'schedule_conflict',
          error: `Schedule conflict: Student is already enrolled in ${conflict.name} during ${targetConfig.day} ${targetConfig.block}`,
        };
      }
    }

    // Atomic, RLS-safe capacity check + insert. The enroll_student function decides
    // pending vs. waitlisted under a row lock on the class. The admin client runs as
    // service_role, so the function skips its family-ownership check.
    const { data, error } = await adminClient.rpc('enroll_student', {
      p_student_id: input.studentId,
      p_class_id: input.classId,
    });

    if (error || !data) {
      return {
        data: null,
        status: null,
        error: error?.message ?? 'An unexpected error occurred',
      };
    }

    await logAuditAction(
      user.id,
      'admin_enroll_student',
      'enrollment',
      data.id,
      { classId: input.classId, studentId: input.studentId }
    );

    revalidatePath('/admin/enrollments');
    revalidatePath('/parent');
    revalidatePath('/parent/browse');
    revalidatePath(`/parent/browse/${input.classId}`);
    revalidatePath(`/admin/classes/${input.classId}`);

    // Teacher enrollment notification temporarily disabled. Keep the helper in
    // src/lib/notifications/teacher-enrollment.ts so this can be restored later.
    // if (data.status === 'pending') {
    //   await notifyTeacherOfEnrollment(input.classId, input.studentId);
    // }

    return {
      data: data as Enrollment,
      status: data.status as 'pending' | 'waitlisted',
      error: null,
    };
  } catch (err) {
    console.error('Unexpected error in adminEnrollStudent:', err);
    return { data: null, status: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Admin: Get student options for enrollment dropdown
 */
export async function getAdminEnrollmentStudentOptions(
  search?: string
): Promise<{
  data: AdminEnrollmentStudentOption[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');
    if (!isAdmin) {
      return { data: null, error: 'Access denied' };
    }

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('family_members')
      .select(
        'id, first_name, last_name, email, parent:profiles!family_members_parent_id_fkey(first_name, last_name)'
      )
      .eq('relationship', 'Student')
      .order('last_name', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    let students = data || [];
    if (search) {
      const lowerSearch = search.toLowerCase();
      students = students.filter(
        (s: Record<string, unknown>) =>
          String(s.first_name || '')
            .toLowerCase()
            .includes(lowerSearch) ||
          String(s.last_name || '')
            .toLowerCase()
            .includes(lowerSearch) ||
          String(s.email || '')
            .toLowerCase()
            .includes(lowerSearch)
      );
    }

    const mapped = students.map((item: Record<string, unknown>) => {
      const parent = item.parent as unknown as {
        first_name: string | null;
        last_name: string | null;
      } | null;
      return {
        id: item.id as string,
        first_name: item.first_name as string,
        last_name: item.last_name as string,
        email: item.email as string,
        parent_name: parent
          ? `${parent.first_name || ''} ${parent.last_name || ''}`.trim() ||
            null
          : null,
      };
    });

    return { data: mapped, error: null };
  } catch (err) {
    console.error('Unexpected error in getAdminEnrollmentStudentOptions:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Admin: Get class options for enrollment dropdown
 */
export async function getAdminEnrollmentClassOptions(search?: string): Promise<{
  data: AdminEnrollmentClassOption[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');
    if (!isAdmin) {
      return { data: null, error: 'Access denied' };
    }

    const adminClient = await createAdminClient();
    let query = adminClient
      .from('classes')
      .select(
        'id, name, day, block, capacity, teacher:profiles(first_name, last_name)'
      )
      .eq('status', 'published');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    // So the admin can see which classes will waitlist rather than seat the student.
    const counts = await getEnrollmentCountsByClass(
      adminClient,
      (data || []).map((item) => item.id as string)
    );

    const mapped = (data || []).map((item: Record<string, unknown>) => {
      const teacher = item.teacher as unknown as {
        first_name: string | null;
        last_name: string | null;
      } | null;
      const id = item.id as string;
      return {
        id,
        name: item.name as string,
        day: (item.day as string | null) ?? null,
        block: (item.block as string | null) ?? null,
        capacity: item.capacity as number,
        enrolled_count: (counts.get(id) ?? EMPTY_COUNTS).enrolled_count,
        teacher_name: teacher
          ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() ||
            null
          : null,
      };
    });

    return { data: mapped, error: null };
  } catch (err) {
    console.error('Unexpected error in getAdminEnrollmentClassOptions:', err);
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Admin: Get all enrollments with pagination and filters.
 */
export async function getAllEnrollments(
  page = 1,
  limit = 20,
  filters?: {
    classId?: string;
    status?: EnrollmentStatus | 'all';
    search?: string; // Search student name
  }
): Promise<{
  data: AdminEnrollmentView[] | null;
  count: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, count: 0, error: 'Not authenticated' };
    }

    // Check Admin privilege (or class scheduler? task 8.5 is Admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

    if (!isAdmin) {
      return { data: null, count: 0, error: 'Access denied' };
    }

    const offset = (page - 1) * limit;

    let query = supabase.from('enrollments').select(
      `
                *,
                class:classes (
                    id,
                    name,
                    teacher_id,
                    price
                ),
                student:family_members!inner (
                    *,
                    parent:profiles!family_members_parent_id_fkey (
                        first_name,
                        last_name,
                        email,
                        phone
                    )
                )
            `,
      { count: 'exact' }
    );

    if (filters?.classId && filters.classId !== 'all') {
      query = query.eq('class_id', filters.classId);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      // Search on student name (family_members)
      // Note: referenced tables search syntax: 'student.first_name.ilike.%search%'
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`,
        { foreignTable: 'student' }
      );
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all enrollments:', error);
      return { data: null, count: 0, error: error.message };
    }

    const mappedData = data;

    return {
      data: mappedData as AdminEnrollmentView[],
      count: count || 0,
      error: null,
    };
  } catch (err) {
    console.error('Unexpected error in getAllEnrollments:', err);
    return { data: null, count: 0, error: 'An unexpected error occurred' };
  }
}

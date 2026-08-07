import { createClient } from '@supabase/supabase-js';
import { sendEnrollmentCancelled } from '@/lib/email';

/**
 * Notify a family when one of their enrollments is cancelled.
 *
 * Four paths end a single enrollment and all of them were silent before this:
 *
 *   cancelEnrollment()        - the parent cancels it themselves
 *   adminCancelEnrollment()   - an admin cancels it
 *   teacherCancelEnrollment() - the teacher removes the student
 *   processRefund()           - a refund cancels the enrollment as a side effect
 *
 * Cancelling a whole class emails every family; dropping one child from that
 * same class emailed nobody.
 *
 * Best-effort and fire-and-forget, matching notifications/teacher-enrollment.ts:
 * failures are logged and swallowed so a mail problem can never fail the
 * cancellation itself. dispatch() in @/lib/email already logs the template,
 * recipient and reason for anything Resend rejects.
 *
 * Takes ids rather than the enrollment row on purpose -- cancelEnrollment()
 * hard-DELETEs the row, so there is nothing left to read by the time this runs.
 * family_members and classes both outlive it.
 */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function notifyEnrollmentCancelled(
  classId: string,
  studentId: string
): Promise<void> {
  try {
    const admin = getAdminClient();

    const [{ data: cls }, { data: student }] = await Promise.all([
      admin.from('classes').select('name').eq('id', classId).maybeSingle(),
      admin
        .from('family_members')
        .select('first_name, last_name, parent_id')
        .eq('id', studentId)
        .maybeSingle(),
    ]);

    if (!student?.parent_id) return;

    const { data: parent } = await admin
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', student.parent_id)
      .maybeSingle();

    if (!parent?.email) return;

    await sendEnrollmentCancelled({
      parentEmail: parent.email,
      parentName: `${parent.first_name ?? ''} ${parent.last_name ?? ''}`.trim(),
      studentName:
        `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
      className: cls?.name ?? 'your class',
    });
  } catch (error) {
    console.error('Failed to notify family of enrollment cancellation:', error);
  }
}

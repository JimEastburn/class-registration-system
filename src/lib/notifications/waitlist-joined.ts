import { createClient } from '@supabase/supabase-js';
import { sendWaitlistJoined } from '@/lib/email';

/**
 * Notify a family when their student lands on a class waitlist.
 *
 * Two paths put a student on a waitlist and both go through here, so the family
 * gets the same confirmation either way:
 *
 *   addToWaitlist()  - the explicit "Join Waitlist" button
 *   enrollStudent()  - enrolling in a class that turns out to be full, where
 *                      enroll_student() auto-waitlists rather than erroring
 *
 * Best-effort and fire-and-forget, matching notifications/teacher-enrollment.ts:
 * any failure is logged and swallowed so it can never fail the enrollment the
 * family just completed. dispatch() in @/lib/email already logs the template,
 * recipient and reason for anything Resend rejects.
 *
 * A dedicated service-role client is used so this is callable from server
 * actions and route handlers alike without threading a client through every
 * call site — and so the parent-profile lookup is not subject to the caller's
 * RLS scope.
 */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function notifyWaitlistJoined(
  classId: string,
  studentId: string,
  position: number
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

    await sendWaitlistJoined({
      parentEmail: parent.email,
      parentName: `${parent.first_name ?? ''} ${parent.last_name ?? ''}`.trim(),
      studentName:
        `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
      className: cls?.name ?? 'your class',
      position,
    });
  } catch (error) {
    console.error('Failed to notify family of waitlist placement:', error);
  }
}

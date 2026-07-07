import { createClient } from '@supabase/supabase-js';
import {
  sendTeacherEnrollmentNotification,
  sendTeacherUnenrollmentNotification,
} from '@/lib/email';

/**
 * Notify teachers when a student is added to or removed from one of their
 * classes. These are best-effort, fire-and-forget notifications: any failure is
 * logged and swallowed so it can never block the enrollment/cancellation flow.
 *
 * A dedicated service-role client is created here (mirroring the Stripe webhook)
 * so this helper is callable from both server actions and route handlers without
 * threading a Supabase client through every call site.
 */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface TeacherAndStudent {
  className: string;
  teacherEmail: string;
  teacherName: string;
  studentName: string;
}

/**
 * Load the teacher's email + name and the student's name for a class/student
 * pair. Returns null if the teacher has no email (nothing to notify) or the
 * records can't be found.
 */
async function loadTeacherAndStudent(
  classId: string,
  studentId: string
): Promise<TeacherAndStudent | null> {
  const admin = getAdminClient();

  const [{ data: cls }, { data: student }] = await Promise.all([
    admin
      .from('classes')
      .select('name, teacher:profiles(email, first_name, last_name)')
      .eq('id', classId)
      .maybeSingle(),
    admin
      .from('family_members')
      .select('first_name, last_name')
      .eq('id', studentId)
      .maybeSingle(),
  ]);

  const classData = cls as unknown as {
    name: string | null;
    teacher: {
      email: string | null;
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;

  const studentData = student as unknown as {
    first_name: string | null;
    last_name: string | null;
  } | null;

  const teacherEmail = classData?.teacher?.email;
  if (!classData || !teacherEmail || !studentData) {
    return null;
  }

  return {
    className: classData.name ?? 'your class',
    teacherEmail,
    teacherName:
      `${classData.teacher?.first_name ?? ''} ${classData.teacher?.last_name ?? ''}`.trim() ||
      'Teacher',
    studentName:
      `${studentData.first_name ?? ''} ${studentData.last_name ?? ''}`.trim() ||
      'A student',
  };
}

export async function notifyTeacherOfEnrollment(
  classId: string,
  studentId: string
): Promise<void> {
  try {
    const info = await loadTeacherAndStudent(classId, studentId);
    if (!info) return;
    await sendTeacherEnrollmentNotification(info);
  } catch (error) {
    console.error('Failed to notify teacher of enrollment:', error);
  }
}

export async function notifyTeacherOfUnenrollment(
  classId: string,
  studentId: string
): Promise<void> {
  try {
    const info = await loadTeacherAndStudent(classId, studentId);
    if (!info) return;
    await sendTeacherUnenrollmentNotification({
      teacherEmail: info.teacherEmail,
      teacherName: info.teacherName,
      studentName: info.studentName,
      className: info.className,
    });
  } catch (error) {
    console.error('Failed to notify teacher of unenrollment:', error);
  }
}

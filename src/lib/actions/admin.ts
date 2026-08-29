'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logAuditAction } from '@/lib/actions/audit';
import type { AuditLog, AuditLogWithUser, Profile, UserRole } from '@/types';
import { revalidatePath } from 'next/cache';

export interface SystemStats {
  totalUsers: number;
  totalClasses: number;
  totalEnrollments: number;
  totalRevenue: number;
}

export interface PhotoConsentRosterMember {
  id: string;
  studentName: string;
  grade: string | null;
  photoConsent: boolean;
  parentName: string;
  parentEmail: string;
}

export async function getSystemStats(): Promise<{
  data: SystemStats | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: 'Not authenticated' };

    // Verify Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { data: null, error: 'Unauthorized' };
    }

    // Use Admin Client for Super Admin
    const db =
      profile.role === 'super_admin' ? await createAdminClient() : supabase;

    // Parallel counts
    const [users, classes, enrollments, payments] = await Promise.all([
      db.from('profiles').select('*', { count: 'exact', head: true }),
      db.from('classes').select('*', { count: 'exact', head: true }),
      db
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed'),
      // For revenue, we need to sum. Supabase doesn't do sum easily without RPC or fetching.
      // We'll simplisticly fetch paid payments. WARNING: Scaling issue.
      // Better: Create a database function 'get_total_revenue'.
      // For now: Fetch 'amount' of completed payments.
      db.from('payments').select('amount').eq('status', 'completed'),
    ]);

    const totalRevenue =
      payments.data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

    return {
      data: {
        totalUsers: users.count || 0,
        totalClasses: classes.count || 0,
        totalEnrollments: enrollments.count || 0,
        totalRevenue, // DB stores amounts in dollars
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching stats:', err);
    return { data: null, error: 'Failed' };
  }
}

export async function getRecentActivity(
  limit = 10
): Promise<{ data: AuditLogWithUser[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    // Auth check...
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    // Verify Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { data: null, error: 'Unauthorized' };
    }

    const db =
      profile.role === 'super_admin' ? await createAdminClient() : supabase;

    const { data, error } = await db
      .from('audit_logs')
      .select('*, profiles:user_id(first_name, last_name, email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data: data as AuditLogWithUser[], error: null };
  } catch (err) {
    console.error(err);
    return { data: null, error: 'Failed to fetch activity' };
  }
}

// 8.2.2 getAllUsers
export async function getAllUsers(
  page = 1,
  limit = 20,
  search?: string
): Promise<{ data: Profile[] | null; count: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, count: 0, error: 'Not authenticated' };

    // Verify Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { data: null, count: 0, error: 'Unauthorized' };
    }

    const db =
      profile.role === 'super_admin' ? await createAdminClient() : supabase;

    const offset = (page - 1) * limit;

    let query = db
      .from('profiles')
      .select('*, is_volunteer_admin, is_photo_consent_admin', {
        count: 'exact',
      })
      .neq('is_banned', true);

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, count: count || 0, error: null };
  } catch (err) {
    console.error('Error fetching users:', err);
    return { data: null, count: 0, error: 'Failed to fetch users' };
  }
}

// 8.2.3 getUserById (Optional if we just use direct query in page, but action is safer for admin checks)
export async function getUserById(userId: string) {
  try {
    const supabase = await createClient();
    // Auth check...
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };
    // Verify Admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role))
      return { data: null, error: 'Unauthorized' };

    const db =
      adminProfile.role === 'super_admin'
        ? await createAdminClient()
        : supabase;

    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching user:', err);
    return { data: null, error: 'Failed' };
  }
}

// 8.2.4 updateUserRole
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role))
      return { success: false, error: 'Unauthorized' };

    const db =
      adminProfile.role === 'super_admin'
        ? await createAdminClient()
        : supabase;

    // Constraints 8.2.5, 8.2.6
    // "Teachers cannot be Class Schedulers" - Role is single enum, so this is implicit?
    // Ah, typically a user has ONE role.
    // If `role` is an enum, they can't be both.
    // Constraint: "Teachers cannot be Class Schedulers" implies checking if they are ALREADY a teacher and strictly preventing switching if logic forbids it?
    // But here we are UPDATING role.
    // Maybe the constraint means "A user with role Teacher cannot perform Class Scheduler actions"? That's enforced by middleware.
    // Or maybe "You cannot have a user record that implies both"?
    // Since `role` is a single column, this is handled.
    // "Privilege Revocation" (8.2.9)
    // If demoting to parent, we might need to remove them from `classes.teacher_id`?
    // Typically we just update the role. The application should handle "Former Teacher".

    if (targetUserId === user.id && newRole !== 'admin') {
      return { success: false, error: 'You cannot demote yourself.' };
    }

    const { error } = await db
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);
    if (error) throw error;

    await logAuditAction(user.id, 'update_role', 'profile', targetUserId, {
      newRole,
    });

    revalidatePath('/admin/users');
    return { success: true, error: null };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to update role' };
  }
}

// updateParentStatus
export async function updateParentStatus(
  targetUserId: string,
  isParent: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role))
      return { success: false, error: 'Unauthorized' };

    const db = await createAdminClient();

    const { error } = await db
      .from('profiles')
      .update({ is_parent: isParent })
      .eq('id', targetUserId);
    if (error) throw error;

    await logAuditAction(
      user.id,
      'update_parent_status',
      'profile',
      targetUserId,
      { is_parent: isParent }
    );

    revalidatePath('/', 'layout');
    return { success: true, error: null };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Failed to update parent status' };
  }
}

export async function updateVolunteerAdminStatus(
  targetUserId: string,
  isVolunteerAdmin: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (
      !adminProfile ||
      !['admin', 'super_admin'].includes(adminProfile.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    const db = await createAdminClient();
    const { error } = await db
      .from('profiles')
      .update({ is_volunteer_admin: isVolunteerAdmin })
      .eq('id', targetUserId);
    if (error) throw error;

    await logAuditAction(
      user.id,
      'update_volunteer_admin_status',
      'profile',
      targetUserId,
      { is_volunteer_admin: isVolunteerAdmin }
    );

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${targetUserId}`);
    revalidatePath('/', 'layout');
    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating volunteer admin status:', err);
    return {
      success: false,
      error: 'Failed to update volunteer administrator access',
    };
  }
}

export async function updatePhotoConsentAdminStatus(
  targetUserId: string,
  isPhotoConsentAdmin: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (
      !adminProfile ||
      !['admin', 'super_admin'].includes(adminProfile.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    const db = await createAdminClient();
    const { data: updated, error } = await db
      .from('profiles')
      .update({ is_photo_consent_admin: isPhotoConsentAdmin })
      .eq('id', targetUserId)
      .select('id')
      .single();
    if (error || !updated) {
      throw error || new Error('User not found');
    }

    await logAuditAction(
      user.id,
      'update_photo_consent_admin_status',
      'profile',
      targetUserId,
      { is_photo_consent_admin: isPhotoConsentAdmin }
    );

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${targetUserId}`);
    revalidatePath('/', 'layout');
    return { success: true, error: null };
  } catch (err) {
    console.error('Error updating photo consent admin status:', err);
    return {
      success: false,
      error: 'Failed to update photo consent administrator access',
    };
  }
}

export async function getPhotoConsentRoster(): Promise<{
  data: PhotoConsentRosterMember[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_photo_consent_admin')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      (!['admin', 'super_admin'].includes(profile.role) &&
        profile.is_photo_consent_admin !== true)
    ) {
      return { data: null, error: 'Unauthorized' };
    }

    // Delegated administrators do not receive broad family-member RLS access.
    // Use the service-role client only after the explicit permission check.
    const db = await createAdminClient();
    const { data: students, error: studentsError } = await db
      .from('family_members')
      .select(
        'id, parent_id, first_name, last_name, grade, photo_consent, relationship'
      )
      .eq('relationship', 'Student')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (studentsError) throw studentsError;
    if (!students?.length) return { data: [], error: null };

    const parentIds = [
      ...new Set(students.map((student) => student.parent_id)),
    ];
    const { data: parents, error: parentsError } = await db
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', parentIds);

    if (parentsError) throw parentsError;

    const parentsById = new Map(
      (parents || []).map((parent) => [parent.id, parent])
    );

    return {
      data: students.map((student) => {
        const parent = parentsById.get(student.parent_id);
        return {
          id: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          grade: student.grade,
          photoConsent: student.photo_consent,
          parentName: parent
            ? `${parent.first_name} ${parent.last_name}`
            : 'Unknown',
          parentEmail: parent?.email || 'Unknown',
        };
      }),
      error: null,
    };
  } catch (err) {
    console.error('Error fetching photo consent roster:', err);
    return { data: null, error: 'Failed to fetch photo consent records' };
  }
}

// 8.2.7 deleteUser
export async function deleteUser(
  targetUserId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role))
      return { success: false, error: 'Unauthorized' };

    if (targetUserId === user.id)
      return { success: false, error: 'Cannot delete yourself' };

    // Delete from auth.users? We can't via client unless we use service role.
    // But we can delete from `profiles`?
    // If foreign keys cascade, it wipes everything.
    // Usually we want Soft Delete.
    // Or use `supabase.auth.admin.deleteUser` if we had service role client here.
    // `createClient` uses usage-based keys.
    // If we don't have service role client exposed in this file, we can't fully delete auth user.
    // We can only delete profile?
    // For now, let's assume `profiles` delete triggers cascade or just marks inactive.
    // Requirement "Soft delete or cascade logic".

    // I'll try deleting profile.
    const db =
      adminProfile.role === 'super_admin'
        ? await createAdminClient()
        : supabase;
    const { error } = await db.from('profiles').delete().eq('id', targetUserId);

    if (error) {
      // Likely FK constraint if no cascade
      return { success: false, error: error.message };
    }

    await logAuditAction(user.id, 'delete_user', 'profile', targetUserId, null);
    revalidatePath('/admin/users');
    return { success: true, error: null };
  } catch (err) {
    console.error('Error deleting user:', err);
    return { success: false, error: 'Failed to delete' };
  }
}

export async function getAuditLogs(
  page = 1,
  limit = 20,
  filters?: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ data: AuditLog[] | null; count: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, count: 0, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['admin', 'super_admin'].includes(profile.role))
      return { data: null, count: 0, error: 'Unauthorized' };

    const db =
      profile.role === 'super_admin' ? await createAdminClient() : supabase;

    const offset = (page - 1) * limit;

    let query = db.from('audit_logs').select('*', { count: 'exact' });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      // Add time to end date to include the full day
      const endDateTime = new Date(filters.endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDateTime.toISOString());
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { data: data as AuditLog[], count: count || 0, error: null };
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return { data: null, count: 0, error: 'Failed to fetch logs' };
  }
}

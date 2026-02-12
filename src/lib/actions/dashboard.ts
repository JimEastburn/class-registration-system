'use server';

import { createClient } from '@/lib/supabase/server';
import type { ScheduleConfig } from '@/types';

interface DashboardStats {
    familyMemberCount: number;
    activeEnrollmentCount: number;
    pendingPaymentTotal: number;
    upcomingClassCount: number;
}

/**
 * Get parent dashboard statistics
 */
export async function getParentDashboardStats(): Promise<{
    data: DashboardStats | null;
    error: string | null;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        // Get family member count
        const { count: familyMemberCount } = await supabase
            .from('family_members')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', user.id);

        // Get active enrollment count (enrollments for user's family members)
        const { data: familyMembers } = await supabase
            .from('family_members')
            .select('id')
            .eq('parent_id', user.id);

        const familyMemberIds = familyMembers?.map((fm) => fm.id) || [];

        let activeEnrollmentCount = 0;
        if (familyMemberIds.length > 0) {
            const { count } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .in('family_member_id', familyMemberIds)
                .eq('status', 'confirmed');

            activeEnrollmentCount = count || 0;
        }

        // Get pending payments total
        const { data: pendingPayments } = await supabase
            .from('payments')
            .select('amount')
            .eq('parent_id', user.id)
            .eq('status', 'pending');

        const pendingPaymentTotal =
            pendingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // Get upcoming classes count (today and future)
        const today = new Date().toISOString().split('T')[0];
        let upcomingClassCount = 0;

        if (familyMemberIds.length > 0) {
            const { count } = await supabase
                .from('enrollments')
                .select(
                    `
                    id,
                    classes!inner(start_date)
                `,
                    { count: 'exact', head: true }
                )
                .in('family_member_id', familyMemberIds)
                .eq('status', 'confirmed')
                .gte('classes.start_date', today);

            upcomingClassCount = count || 0;
        }

        return {
            data: {
                familyMemberCount: familyMemberCount || 0,
                activeEnrollmentCount,
                pendingPaymentTotal: pendingPaymentTotal / 100, // Convert cents to dollars
                upcomingClassCount,
            },
            error: null,
        };
    } catch (err) {
        console.error('Unexpected error in getParentDashboardStats:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

interface UpcomingClass {
    id: string;
    className: string;
    startTime: string;
    endTime: string;
    dayOfWeek: string;
    teacherName: string;
    familyMemberName: string;
}

/**
 * Get upcoming classes for the parent's family
 */
export async function getUpcomingClassesForFamily(
    limit = 5
): Promise<{ data: UpcomingClass[] | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        // Get family members
        const { data: familyMembers } = await supabase
            .from('family_members')
            .select('id, first_name, last_name')
            .eq('parent_id', user.id);

        if (!familyMembers || familyMembers.length === 0) {
            return { data: [], error: null };
        }

        const familyMemberIds = familyMembers.map((fm) => fm.id);
        const familyMemberMap = new Map(
            familyMembers.map((fm) => [fm.id, `${fm.first_name} ${fm.last_name}`])
        );

        // Get enrollments with class details
        const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select(
                `
                id,
                family_member_id,
                classes(
                    id,
                    name,
                    start_time,
                    end_time,
                    day_of_week,
                    profiles(first_name, last_name)
                )
            `
            )
            .in('family_member_id', familyMemberIds)
            .eq('status', 'confirmed')
            .limit(limit);

        if (error) {
            console.error('Error fetching upcoming classes:', error);
            return { data: null, error: error.message };
        }

        const upcomingClasses: UpcomingClass[] = (enrollments || [])
        .filter((e) => e.classes)
        .map((e) => {
            const classData = e.classes as unknown as {
                id: string;
                name: string;
                start_time: string;
                end_time: string;
                day_of_week: string;
                profiles: { first_name: string; last_name: string } | null;
            };
            return {
                id: classData.id,
                className: classData.name,
                startTime: classData.start_time,
                endTime: classData.end_time,
                dayOfWeek: classData.day_of_week,
                teacherName: classData.profiles
                    ? `${classData.profiles.first_name} ${classData.profiles.last_name}`
                    : 'TBD',
                familyMemberName:
                    familyMemberMap.get(e.family_member_id) || 'Unknown',
            };
        });

        return { data: upcomingClasses, error: null };
    } catch (err) {
        console.error('Unexpected error in getUpcomingClassesForFamily:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

interface RecentPayment {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    description: string;
}

/**
 * Get recent payments for the parent
 */
export async function getRecentPayments(
    limit = 3
): Promise<{ data: RecentPayment[] | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        // Get family member IDs
        const { data: familyMembers } = await supabase
            .from('family_members')
            .select('id')
            .eq('parent_id', user.id);

        const familyMemberIds = familyMembers?.map(fm => fm.id) || [];

        // Get enrollment IDs for these family members
        let enrollmentIds: string[] = [];
        if (familyMemberIds.length > 0) {
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select('id')
                .in('family_member_id', familyMemberIds);
            
            enrollmentIds = enrollments?.map(e => e.id) || [];
        }

        if (enrollmentIds.length === 0) {
             return { data: [], error: null };
        }

        const { data: payments, error } = await supabase
            .from('payments')
            .select('id, amount, status, created_at')
            .in('enrollment_id', enrollmentIds)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent payments:', error);
            return { data: null, error: error.message };
        }

        const recentPayments: RecentPayment[] = (payments || []).map((p) => ({
            id: p.id,
            amount: (p.amount || 0) / 100, // Convert cents to dollars
            status: p.status,
            createdAt: p.created_at,
            description: 'Payment',
        }));

        return { data: recentPayments, error: null };
    } catch (err) {
        console.error('Unexpected error in getRecentPayments:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

interface PendingEnrollment {
    id: string;
    className: string;
    familyMemberName: string;
    amountDue: number;
}

/**
 * Get pending enrollments awaiting payment
 */
export async function getPendingEnrollments(): Promise<{
    data: PendingEnrollment[] | null;
    error: string | null;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        // Get family members
        const { data: familyMembers } = await supabase
            .from('family_members')
            .select('id, first_name, last_name')
            .eq('parent_id', user.id);

        if (!familyMembers || familyMembers.length === 0) {
            return { data: [], error: null };
        }

        const familyMemberIds = familyMembers.map((fm) => fm.id);
        const familyMemberMap = new Map(
            familyMembers.map((fm) => [fm.id, `${fm.first_name} ${fm.last_name}`])
        );

        // Get pending enrollments
        const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select(
                `
                id,
                family_member_id,
                classes(name, price)
            `
            )
            .in('family_member_id', familyMemberIds)
            .eq('status', 'pending');

        if (error) {
            console.error('Error fetching pending enrollments:', error);
            return { data: null, error: error.message };
        }

        const pendingEnrollments: PendingEnrollment[] = (enrollments || [])
        .filter((e) => e.classes)
        .map((e) => {
            const classData = e.classes as unknown as { name: string; price: number };
            return {
                id: e.id,
                className: classData.name,
                familyMemberName:
                    familyMemberMap.get(e.family_member_id) || 'Unknown',
                amountDue: (classData.price || 0) / 100,
            };
        });

        return { data: pendingEnrollments, error: null };
    } catch (err) {
        console.error('Unexpected error in getPendingEnrollments:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

// ============================================================================
// Teacher Dashboard Functions
// ============================================================================

interface TeacherStats {
  totalClasses: number;
  activeClasses: number;
  totalStudents: number;
  classesToday: number;
  upcomingClasses: number;
}

interface TodayClass {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  enrolledCount: number;
  capacity: number;
}

interface RecentEnrollment {
  id: string;
  studentName: string;
  className: string;
  enrolledAgo: string;
}

interface TeacherDashboardData {
  stats: TeacherStats;
  todayClasses: TodayClass[];
  recentEnrollments: RecentEnrollment[];
}

/**
 * Get teacher dashboard data including stats, today's classes, and recent enrollments
 */
export async function getTeacherDashboardData(): Promise<{
  success: boolean;
  data?: TeacherDashboardData;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return { success: false, error: 'Not authorized' };
    }

    // Get all classes taught by this teacher using current schedule fields.
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, status, capacity, day, block, schedule_config')
      .eq('teacher_id', user.id);

    if (classesError) {
      console.error('Error fetching teacher classes:', classesError);
      return { success: false, error: classesError.message };
    }

    const classIds = classes?.map(c => c.id) || [];

    // Get enrollment counts for each class
    let enrollmentCounts: { class_id: string; count: number }[] = [];
    if (classIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'confirmed');

      // Count enrollments per class
      const countMap = new Map<string, number>();
      (enrollments || []).forEach(e => {
        countMap.set(e.class_id, (countMap.get(e.class_id) || 0) + 1);
      });
      enrollmentCounts = Array.from(countMap.entries()).map(([class_id, count]) => ({ class_id, count }));
    }

    // Calculate stats
    const totalClasses = classes?.length || 0;
    const isSchedulableStatus = (status: string | null | undefined) =>
      status === 'published';
    const activeClasses = classes?.filter(c => isSchedulableStatus(c.status)).length || 0;
    const totalStudents = enrollmentCounts.reduce((sum, e) => sum + e.count, 0);
    
    // Today's day of week
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDayOfWeek = dayNames[new Date().getDay()];
    
    const classesTodayList = classes?.filter(c => {
      const config = c.schedule_config as ScheduleConfig | null;
      const classDay = c.day || config?.day;
      return classDay?.toLowerCase() === todayDayOfWeek && isSchedulableStatus(c.status);
    }) || [];
    const classesToday = classesTodayList.length;

    // Get next 7 days of scheduled classes
    const upcomingClasses = classes?.filter(c => isSchedulableStatus(c.status)).length || 0;

    const stats: TeacherStats = {
      totalClasses,
      activeClasses,
      totalStudents,
      classesToday,
      upcomingClasses,
    };

    // Format today's classes
    const todayClasses: TodayClass[] = classesTodayList.map(c => ({
      id: c.id,
      name: c.name,
      startTime: c.block || (c.schedule_config as ScheduleConfig | null)?.block || 'TBA',
      enrolledCount: enrollmentCounts.find(e => e.class_id === c.id)?.count || 0,
      capacity: c.capacity || 0,
    }));

    // Get recent enrollments (last 5)
    let recentEnrollments: RecentEnrollment[] = [];
    if (classIds.length > 0) {
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select(`
          id,
          created_at,
          family_members(first_name, last_name),
          classes(name)
        `)
        .in('class_id', classIds)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(5);

      recentEnrollments = (enrollmentData || []).map(e => {
        const fm = e.family_members as unknown as { first_name: string; last_name: string } | null;
        const cls = e.classes as unknown as { name: string } | null;
        
        // Calculate time ago
        const enrolledDate = new Date(e.created_at);
        const now = new Date();
        const diffMs = now.getTime() - enrolledDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        let enrolledAgo = 'just now';
        if (diffDays > 0) {
          enrolledAgo = `${diffDays}d ago`;
        } else if (diffHours > 0) {
          enrolledAgo = `${diffHours}h ago`;
        }

        return {
          id: e.id,
          studentName: fm ? `${fm.first_name} ${fm.last_name}` : 'Unknown',
          className: cls?.name || 'Unknown Class',
          enrolledAgo,
        };
      });
    }

    return {
      success: true,
      data: {
        stats,
        todayClasses,
        recentEnrollments,
      },
    };
  } catch (err) {
    console.error('Unexpected error in getTeacherDashboardData:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

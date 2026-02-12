'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAuditAction } from '@/lib/actions/audit';
import type { Enrollment, EnrollmentStatus, FamilyMember, Profile } from '@/types';
import { sendEnrollmentConfirmation } from '@/lib/email';

interface EnrollmentWithClass extends Enrollment {
    class: {
        id: string;
        name: string;
        teacher_id: string;
        price: number;
    } | null;
}

export interface RosterEnrollment extends Enrollment {
    student: FamilyMember & {
        parent: Pick<Profile, 'first_name' | 'last_name' | 'email' | 'phone'> | null;
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

export type ForceEnrollInput = {
    studentId: string;
    classId: string;
    bypassCapacity?: boolean;
    bypassBlocks?: boolean;
    adminId?: string;
};

/**
 * Get enrollments for a specific family member
 */
export async function getEnrollmentsForFamilyMember(
    familyMemberId: string
): Promise<{ data: EnrollmentWithClass[] | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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
            .select(`
                *,
                class:classes (
                    id,
                    name,
                    teacher_id,
                    price
                )
            `)
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
        const { data: { user } } = await supabase.auth.getUser();

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
            .select(`
                *,
                class:classes (
                    id,
                    name,
                    teacher_id,
                    price
                ),
                student:family_members (
                    id,
                    first_name,
                    last_name
                )
            `)
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
export async function enrollStudent(
    input: EnrollStudentInput
): Promise<{
    data: Enrollment | null;
    status: 'confirmed' | 'waitlisted' | 'blocked' | 'pending' | null;
    error: string | null;
}> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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
                return { data: null, status: null, error: 'Registration is currently closed' };
            }

            if (settings.semesterStart && settings.semesterEnd) {
                const now = new Date();
                const start = new Date(settings.semesterStart);
                const end = new Date(settings.semesterEnd);
                if (now < start || now > end) {
                    return { data: null, status: null, error: 'Registration is outside the current semester dates' };
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

        // Check if student is already enrolled in this class
        const { data: existingEnrollment } = await supabase
            .from('enrollments')
            .select('id, status')
            .eq('student_id', input.familyMemberId)
            .eq('class_id', input.classId)
            .single();

        if (existingEnrollment) {
            return {
                data: null,
                status: existingEnrollment.status as 'confirmed' | 'waitlisted',
                error: 'Student is already enrolled in this class',
            };
        }

        // Check for teacher blocks
        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id, capacity, teacher_id')
            .eq('id', input.classId)
            .single();

        if (classError || !classData) {
            return { data: null, status: null, error: 'Class not found' };
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
                error: 'This student has been blocked from enrolling in this teacher\'s classes',
            };
        }

        // Check capacity
        const { count: enrolledCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', input.classId)
            .eq('status', 'confirmed');

        const enrolled = enrolledCount || 0;
        const isFull = enrolled >= classData.capacity;

        let enrollmentStatus: EnrollmentStatus;
        let waitlistPosition: number | null = null;

        if (isFull) {
            // Add to waitlist
            enrollmentStatus = 'waitlisted';

            // Get next waitlist position
            const { count: waitlistCount } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', input.classId)
                .eq('status', 'waitlisted');

            waitlistPosition = (waitlistCount || 0) + 1;
        } else {
            // Confirm enrollment (pending payment)
            enrollmentStatus = 'pending';
        }

        // Create enrollment
        const { data, error } = await supabase
            .from('enrollments')
            .insert({
                student_id: input.familyMemberId,
                class_id: input.classId,
                status: enrollmentStatus,
                waitlist_position: waitlistPosition,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating enrollment:', error);
            return { data: null, status: null, error: error.message };
        }

        revalidatePath('/parent');
        revalidatePath('/parent/browse');
        revalidatePath(`/parent/browse/${input.classId}`);

        return {
            data,
            status: enrollmentStatus as 'confirmed' | 'waitlisted' | 'blocked',
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
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Get enrollment and verify ownership
        const { data: enrollment, error: fetchError } = await supabase
            .from('enrollments')
            .select(`
                id,
                status,
                class_id,
                student_id,
                family_member:family_members (
                    parent_id
                )
            `)
            .eq('id', enrollmentId)
            .single();

        if (fetchError || !enrollment) {
            return { success: false, error: 'Enrollment not found' };
        }

        // Safely check parent ownership
        const familyMemberData = enrollment.family_member as unknown as { parent_id: string } | { parent_id: string }[];
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
        const { data: { user } } = await supabase.auth.getUser();

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
        const { data: { user } } = await supabase.auth.getUser();

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

        const isAdmin = ['admin', 'super_admin', 'class_scheduler'].includes(profile?.role || '');

        if (classData.teacher_id !== user.id && !isAdmin) {
            return { data: null, error: 'Access denied: You are not the teacher of this class or an administrator' };
        }

        // Fetch enrollments with student and parent details
        const { data, error } = await supabase
            .from('enrollments')
            .select(`
                *,
                student:family_members (
                    *,
                    parent:profiles!family_members_parent_id_fkey (
                        first_name,
                        last_name,
                        email,
                        phone
                    )
                )
            `)
            .eq('class_id', classId)
            .in('status', ['confirmed', 'waitlisted', 'pending']) 
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching class roster:', error);
            return { data: null, error: error.message };
        }

        // Check for blocks
        const studentIds = data.map(e => e.student_id);
        const blockedStudentIds = new Set<string>();

        if (studentIds.length > 0) {
            const { data: blocks } = await supabase
                .from('class_blocks')
                .select('student_id')
                .eq('teacher_id', classData.teacher_id)
                .in('student_id', studentIds);
            
            if (blocks) {
                blocks.forEach(b => blockedStudentIds.add(b.student_id));
            }
        }

        const mappedData = data.map(item => ({
            ...item,
            isBlocked: blockedStudentIds.has(item.student_id)
        }));

        return { data: mappedData as unknown as RosterEnrollment[], error: null };
    } catch (err) {
        console.error('Unexpected error in getClassRoster:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}


/**
 * Admin: Force enroll a student, bypassing capacity and blocks.
 */
export async function adminForceEnroll(
    input: ForceEnrollInput
): Promise<{ data: Enrollment | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: null, error: 'Not authenticated' };
        }

        // Check Admin privilege
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

        if (!isAdmin) {
            return { data: null, error: 'Access denied: Admin privileges required' };
        }

        // Verify users/class exist
        // Student (Family Member)
        const { data: student, error: studentError } = await supabase
            .from('family_members')
            .select('*, parent:profiles(email, first_name, last_name)')
            .eq('id', input.studentId)
            .single();
        
        if (studentError || !student) {
            return { data: null, error: 'Student not found' };
        }

        // Class
        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('*, teacher:profiles(first_name, last_name)')
            .eq('id', input.classId)
            .single();
        
        if (classError || !classData) {
            return { data: null, error: 'Class not found' };
        }

        // Check for existing enrollment
        const { data: existingEnrollment } = await supabase
            .from('enrollments')
            .select('id, status')
            .eq('student_id', input.studentId)
            .eq('class_id', input.classId)
            .single();

        if (existingEnrollment) {
             // If waitlisted/cancelled, we might want to update to confirmed.
             // If confirmed, just return it.
             if (existingEnrollment.status === 'confirmed') {
                 return { data: existingEnrollment as Enrollment, error: 'Student is already enrolled.' };
             }
             
             // Update to confirmed
             const { data: updated, error: updateError } = await supabase
                .from('enrollments')
                .update({ status: 'confirmed', waitlist_position: null })
                .eq('id', existingEnrollment.id)
                .select()
                .single();
            
             if (updateError) {
                 return { data: null, error: updateError.message };
             }

             // Send Confirmation Email
             if (student.parent) {
                 await sendEnrollmentConfirmation({
                     parentEmail: student.parent.email,
                     parentName: `${student.parent.first_name || ''} ${student.parent.last_name || ''}`.trim(),
                     studentName: `${student.first_name} ${student.last_name}`,
                     className: classData.name,
                     teacherName: `${classData.teacher?.first_name || 'Teacher'} ${classData.teacher?.last_name || ''}`.trim(),
                     schedule: `${classData.day || 'TBD'} ${classData.block || ''}`.trim(),
                     location: classData.location || 'Main Studio',
                     startDate: classData.start_date || 'TBD',
                     fee: (classData.price || 0) / 100 // Convert cents to dollars
                 });
             }

             await logAuditAction(user.id, 'force_enroll_update', 'enrollment', existingEnrollment.id, { reason: 'Force Enroll Update' });
             
             revalidatePath('/parent');
             revalidatePath('/admin/enrollments'); // Future path
             
             return { data: updated as Enrollment, error: null };
        }

        // Create new confirmed enrollment
        const { data, error } = await supabase
            .from('enrollments')
            .insert({
                student_id: input.studentId,
                class_id: input.classId,
                status: 'confirmed',
                waitlist_position: null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error force enrolling:', error);
            return { data: null, error: error.message };
        }

        // Send Confirmation Email
        if (student.parent) {
            await sendEnrollmentConfirmation({
                parentEmail: student.parent.email,
                parentName: `${student.parent.first_name || ''} ${student.parent.last_name || ''}`.trim(),
                studentName: `${student.first_name} ${student.last_name}`,
                className: classData.name,
                teacherName: `${classData.teacher?.first_name || 'Teacher'} ${classData.teacher?.last_name || ''}`.trim(),
                schedule: `${classData.day || 'TBD'} ${classData.block || ''}`.trim(),
                location: classData.location || 'Main Studio',
                startDate: classData.start_date || 'TBD',
                fee: (classData.price || 0) / 100 // Convert cents to dollars
            });
        }

        await logAuditAction(user.id, 'force_enroll', 'enrollment', data.id, { classId: input.classId, studentId: input.studentId });

        revalidatePath('/parent');
        revalidatePath('/admin/enrollments');

        return { data: data as Enrollment, error: null };

    } catch (err) {
        console.error('Unexpected error in adminForceEnroll:', err);
        return { data: null, error: 'An unexpected error occurred' };
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
        const { data: { user } } = await supabase.auth.getUser();

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
                const refundResult = await processRefund(payment.id);
                if (!refundResult.success) {
                    return { success: false, error: `Refund failed: ${refundResult.error}` };
                }
                // Update payment status? Refunds action might handle it, or we do it here.
                // Assuming processRefund stub handles it or we do nothing for now.
                // update payment status to refunded
                 await supabase
                    .from('payments')
                    .update({ status: 'refunded' })
                    .eq('id', payment.id);
            } else {
                console.warn('No completed payment found for enrollment, skipping refund.');
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

        await logAuditAction(user.id, 'admin_cancel_enrollment', 'enrollment', enrollmentId, { refund: options.refund });

        revalidatePath('/admin/enrollments');
        revalidatePath('/parent');

        return { success: true, error: null };

    } catch (err) {
        console.error('Unexpected error in adminCancelEnrollment:', err);
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
        const { data: { user } } = await supabase.auth.getUser();

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

        // Hard delete
        const { error: deleteError } = await supabase
            .from('enrollments')
            .delete()
            .eq('id', enrollmentId);

        if (deleteError) {
            return { success: false, error: deleteError.message };
        }

        await logAuditAction(user.id, 'admin_remove_enrollment', 'enrollment', enrollmentId);

        revalidatePath('/admin/enrollments');
        revalidatePath('/parent');

        return { success: true, error: null };

    } catch (err) {
        console.error('Unexpected error in adminRemoveEnrollment:', err);
        return { success: false, error: 'An unexpected error occurred' };
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
): Promise<{ data: AdminEnrollmentView[] | null; count: number; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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

        let query = supabase
            .from('enrollments')
            .select(`
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
            `, { count: 'exact' });

        if (filters?.classId && filters.classId !== 'all') {
            query = query.eq('class_id', filters.classId);
        }

        if (filters?.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }

        if (filters?.search) {
            // Search on student name (family_members)
            // Note: referenced tables search syntax: 'student.first_name.ilike.%search%'
            query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`, { foreignTable: 'student' });
        }

        const { data, count, error } = await query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all enrollments:', error);
            return { data: null, count: 0, error: error.message };
        }

        const mappedData = data;

        return { data: mappedData as AdminEnrollmentView[], count: count || 0, error: null };

    } catch (err) {
        console.error('Unexpected error in getAllEnrollments:', err);
        return { data: null, count: 0, error: 'An unexpected error occurred' };
    }
}

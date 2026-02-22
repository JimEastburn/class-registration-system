'use server';

import { createClient } from '@/lib/supabase/server';
import type { ClassStatus, ClassWithTeacher, ScheduleConfig } from '@/types';
import { checkScheduleConflict, validateScheduleConfig } from '@/lib/logic/scheduling';
import { generateClassEvents } from '@/lib/logic/calendar';

interface ClassFilters {
    status?: ClassStatus;
    teacherId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    dayOfWeek?: string;
}



/**
 * Get all published classes for browsing
 */
export async function getPublishedClasses(
    filters?: ClassFilters
): Promise<{ data: ClassWithTeacher[] | null; error: string | null }> {
    try {
        const supabase = await createClient();

        let query = supabase
            .from('classes')
            .select(`
                *,
                teacher:profiles!teacher_id (
                    id,
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('status', 'published')
            .order('start_date', { ascending: true });

        // Apply filters
        if (filters?.teacherId) {
            query = query.eq('teacher_id', filters.teacherId);
        }

        if (filters?.minPrice !== undefined) {
            query = query.gte('price', filters.minPrice);
        }

        if (filters?.maxPrice !== undefined) {
            query = query.lte('price', filters.maxPrice);
        }

        if (filters?.dayOfWeek !== undefined) {
            query = query.eq('day_of_week', filters.dayOfWeek);
        }

        if (filters?.search) {
            query = query.or(
                `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
            );
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching published classes:', error);
            return { data: null, error: error.message };
        }

        return { data: data as ClassWithTeacher[], error: null };
    } catch (err) {
        console.error('Unexpected error in getPublishedClasses:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

/**
 * Get details of a single class
 */
export async function getClassDetails(
    classId: string
): Promise<{ data: ClassWithTeacher | null; error: string | null }> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('classes')
            .select(`
                *,
                teacher:profiles!teacher_id (
                    id,
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('id', classId)
            .single();

        if (error) {
            console.error('Error fetching class details:', error);
            return { data: null, error: error.message };
        }

        return { data: data as ClassWithTeacher, error: null };
    } catch (err) {
        console.error('Unexpected error in getClassDetails:', err);
        return { data: null, error: 'An unexpected error occurred' };
    }
}

/**
 * Get available spots for a class
 */
export async function getClassAvailability(
    classId: string
): Promise<{
    capacity: number;
    enrolled: number;
    available: number;
    error: string | null;
}> {
    try {
        const supabase = await createClient();

        // Get class capacity
        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('capacity')
            .eq('id', classId)
            .single();

        if (classError || !classData) {
            return {
                capacity: 0,
                enrolled: 0,
                available: 0,
                error: 'Class not found',
            };
        }

        // Count confirmed enrollments
        const { count: enrolledCount, error: countError } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId)
            .eq('status', 'confirmed');

        if (countError) {
            console.error('Error counting enrollments:', countError);
            return {
                capacity: classData.capacity,
                enrolled: 0,
                available: classData.capacity,
                error: countError.message,
            };
        }

        const enrolled = enrolledCount || 0;
        const available = Math.max(0, classData.capacity - enrolled);

        return {
            capacity: classData.capacity,
            enrolled,
            available,
            error: null,
        };
    } catch (err) {
        console.error('Unexpected error in getClassAvailability:', err);
        return {
            capacity: 0,
            enrolled: 0,
            available: 0,
            error: 'An unexpected error occurred',
        };
    }
}

// ============================================================================
// Teacher Class Management Functions
// ============================================================================

import type { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';
import { logAuditAction } from '@/lib/actions/audit';
import { sendClassCancellation, sendScheduleChangeNotification } from '@/lib/email';


interface CreateClassInput {
  name: string;
  description?: string | null;
  price?: number; // Ignored — all classes are $30 (3000 cents)
  capacity: number;
  schedule_config?: ScheduleConfig;
  status?: ClassStatus;
  teacherId?: string;
  // Legacy/Linear fields for backward compat or direct access if needed, 
  // but we prefer schedule_config object now.
  location?: string | null;
  ageMin?: number;
  ageMax?: number;
}



/**
 * Create a new class (teacher only)
 * Default status is 'draft' with schedule as "To Be Announced"
 */
export async function createClass(
  input: CreateClassInput
): Promise<ActionResult<{ classId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is a teacher or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return { success: false, error: 'Not authorized to create classes' };
    }

    // Validate schedule config and teacher conflicts
    if (input.schedule_config) {
      const validation = validateScheduleConfig(input.schedule_config);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid schedule configuration' };
      }
    }

    // Insert the class with draft status
    const teacherIdToUse = (input.teacherId && (profile.role === 'admin' || profile.role === 'super_admin')) 
        ? input.teacherId 
        : user.id;

    if (input.schedule_config && teacherIdToUse) {
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', teacherIdToUse)
        .in('status', ['published', 'draft']);

      if (teacherClasses) {
        const conflict = checkScheduleConflict(
          input.schedule_config,
          teacherIdToUse,
          teacherClasses as import('@/types').Class[]
        );
        if (conflict) {
          return {
            success: false,
            error: `Teacher Conflict: ${conflict.name} at ${conflict.schedule_config?.day} ${conflict.schedule_config?.block}`,
          };
        }
      }
    }

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        name: input.name,
        description: input.description || null,
        price: 3000, // Fixed $30 for all classes
        capacity: input.capacity,
        teacher_id: teacherIdToUse,
        status: 'draft',
        schedule_config: (input.schedule_config || null) as import('@/types/database').Json,
        // Populate new columns from config
        day: input.schedule_config?.day || null,
        block: input.schedule_config?.block || null,
        start_date: input.schedule_config?.startDate || null,
        end_date: input.schedule_config?.endDate || null,
        location: input.location || null,
        age_min: input.ageMin || null,
        age_max: input.ageMax || null,
      })
      .select('id, schedule_config, location, description')
      .single();

    if (error) {
      console.error('Error creating class:', error);
      return { success: false, error: error.message };
    }

    console.error(`[DEBUG] Created class ${newClass.id} for teacher ${teacherIdToUse}`);

    // Generate calendar events
    if (newClass.schedule_config) {
        const events = generateClassEvents(newClass.id, newClass.schedule_config as unknown as ScheduleConfig, {
            location: newClass.location,
            description: newClass.description,
        });

        if (events.length > 0) {
            const { error: eventsError } = await supabase
                .from('calendar_events')
                .insert(events);

            if (eventsError) {
                console.error('Error creating calendar events:', eventsError);
                // Non-fatal, but should be logged/alerted
            }
        }
    }

    await logAuditAction(user.id, 'class.created', 'class', newClass.id, { name: input.name });
    revalidatePath('/teacher/classes');

    return { success: true, data: { classId: newClass.id } };
  } catch (err) {
    console.error('Unexpected error in createClass:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing class (ownership check)
 */
export async function updateClass(
  classId: string,
  input: Partial<CreateClassInput>
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership or admin access
    const { data: existingClass } = await supabase
      .from('classes')
      .select('teacher_id, status, name, location, schedule_config, start_date, end_date')
      .eq('id', classId)
      .single();

    if (!existingClass) {
      return { success: false, error: 'Class not found' };
    }

    // Check ownership
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = existingClass.teacher_id === user.id;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Not authorized to update this class' };
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    updateData.price = 3000; // Fixed $30 for all classes
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    
    if (input.schedule_config !== undefined) {
        const validation = validateScheduleConfig(input.schedule_config);
        if (!validation.valid) {
          return { success: false, error: validation.error || 'Invalid schedule configuration' };
        }
        updateData.schedule_config = input.schedule_config;
        updateData.day = input.schedule_config.day;
        updateData.block = input.schedule_config.block;
        updateData.start_date = input.schedule_config.startDate;
        updateData.end_date = input.schedule_config.endDate;
    }

    if (input.location !== undefined) updateData.location = input.location;
    if (input.ageMin !== undefined) updateData.age_min = input.ageMin;
    if (input.ageMax !== undefined) updateData.age_max = input.ageMax;
    if (input.teacherId !== undefined && isAdmin) updateData.teacher_id = input.teacherId;
    if (input.status !== undefined && isAdmin) updateData.status = input.status; // Allow admin to force status

    // Teacher conflict check (if schedule or teacher changed)
    const proposedTeacherId =
      (input.teacherId !== undefined && isAdmin ? input.teacherId : existingClass.teacher_id) || undefined;
    const proposedSchedule =
      input.schedule_config ?? (existingClass.schedule_config as ScheduleConfig | null) ?? undefined;

    if (proposedTeacherId && proposedSchedule) {
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', proposedTeacherId)
        .neq('id', classId)
        .in('status', ['published', 'draft']);

      if (teacherClasses) {
        const conflict = checkScheduleConflict(
          proposedSchedule,
          proposedTeacherId,
          teacherClasses as import('@/types').Class[]
        );
        if (conflict) {
          return {
            success: false,
            error: `Teacher Conflict: ${conflict.name} at ${conflict.schedule_config?.day} ${conflict.schedule_config?.block}`,
          };
        }
      }
    }

    const { error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', classId);

    if (error) {
      console.error('Error updating class:', error);
      return { success: false, error: error.message };
    }

    // Update calendar events if schedule or location changed
    if (input.schedule_config || input.location !== undefined) {
        // 1. Delete future events (or all events? effectively rebuilding the calendar for this class)
        // Keeping it simple: delete all future events for this class to avoid duplicates/orphans
        // We might want to keep past events for history, but for now, full rebuild from start_date is safest for consistency
        const today = new Date().toISOString().split('T')[0];
        
        const { error: deleteError } = await supabase
            .from('calendar_events')
            .delete()
            .eq('class_id', classId)
            .gte('date', today);

        if (deleteError) {
             console.error('Error deleting old calendar events:', deleteError);
        } else {
             // 2. Generate new events
             // Need full class details to generate events
             const { data: updatedClass } = await supabase
                .from('classes')
                .select('*')
                .eq('id', classId)
                .single();
             
             if (updatedClass && updatedClass.schedule_config) {
                 const events = generateClassEvents(classId, updatedClass.schedule_config as unknown as ScheduleConfig, {
                     location: updatedClass.location,
                     description: updatedClass.description,
                 });

                 // Filter for future only if we only deleted future? 
                 // Actually, generateClassEvents generates for the whole range.
                 // If we deleted only >= today, we should only insert >= today to avoid duplicates with past events we didn't delete.
                 // OR we delete ALL events and regenerate ALL.
                 // Decision: Regenerate ALL to ensure consistency (e.g. if start date changed to be earlier).
                 // Refining: Delete ALL events for this class.
                 
                 await supabase.from('calendar_events').delete().eq('class_id', classId);
                 
                 if (events.length > 0) {
                     const { error: insertError } = await supabase
                         .from('calendar_events')
                         .insert(events);
                     
                     if (insertError) console.error('Error regenerating calendar events:', insertError);
                 }
             }
        }
    }

    await logAuditAction(user.id, 'class.updated', 'class', classId, updateData);

    // Check for schedule/location changes and notify parents
    const changes: {
        schedule?: { old: string; new: string };
        location?: { old: string; new: string };
        dates?: { old: string; new: string };
    } = {};
    let shouldNotify = false;

    // Check location
    if (input.location && input.location !== existingClass.location) {
        changes.location = { 
            old: existingClass.location || 'TBA', 
            new: input.location 
        };
        shouldNotify = true;
    }

    // Check schedule (Day/Block)
    if (input.schedule_config) {
        const oldConfig = existingClass.schedule_config as unknown as ScheduleConfig | null;
        const oldSchedule = oldConfig
            ? `${oldConfig.day} ${oldConfig.block}`
            : 'TBA';
        const newSchedule = `${input.schedule_config.day} ${input.schedule_config.block}`;
        
        if (oldSchedule !== newSchedule) {
            changes.schedule = { old: oldSchedule, new: newSchedule };
            shouldNotify = true;
        }

        // Check dates
        const oldDates = existingClass.start_date && existingClass.end_date
            ? `${existingClass.start_date} to ${existingClass.end_date}`
            : 'TBA';
        const newDates = input.schedule_config.startDate && input.schedule_config.endDate
            ? `${input.schedule_config.startDate} to ${input.schedule_config.endDate}`
            : 'TBA';

        if (oldDates !== newDates) {
            changes.dates = { old: oldDates, new: newDates };
            shouldNotify = true;
        }
    }

    if (shouldNotify) {
        // Fetch enrollments
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('*, student:family_members(*)')
            .eq('class_id', classId)
            .in('status', ['confirmed', 'pending']);

        if (enrollments && enrollments.length > 0) {
           for (const enrollment of enrollments) {
               if (enrollment.student?.parent_id) {
                   const { data: parent } = await supabase
                       .from('profiles')
                       .select('email, first_name, last_name')
                       .eq('id', enrollment.student.parent_id)
                       .single();

                   if (parent) {
                       await sendScheduleChangeNotification({
                           parentEmail: parent.email,
                           parentName: `${parent.first_name} ${parent.last_name}`,
                           studentName: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
                           className: existingClass.name, // Use original name or new name? Using original for now, usually name doesn't change with schedule often
                           changes
                       });
                   }
               }
           }
        }
    }

    revalidatePath('/teacher/classes');
    revalidatePath(`/teacher/classes/${classId}`);

    return { success: true, data: undefined };
  } catch (err) {
    console.error('Unexpected error in updateClass:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a class (drafts only, soft-delete for published)
 */
export async function deleteClass(classId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership
    const { data: existingClass } = await supabase
      .from('classes')
      .select('teacher_id, status, name')
      .eq('id', classId)
      .single();

    if (!existingClass) {
      return { success: false, error: 'Class not found' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = existingClass.teacher_id === user.id;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Not authorized to delete this class' };
    }

    // Only drafts can be hard-deleted
    if (existingClass.status === 'draft') {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) {
        console.error('Error deleting class:', error);
        return { success: false, error: error.message };
      }
    } else {
      // For published/archived/completed classes, use cancelClass to handle logic
      // (cancelling enrollments, sending emails, etc.)
      const result = await cancelClass(classId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      // Note: cancelClass already logs audit
    }

    if (existingClass.status === 'draft') {
        // Only log/revalidate if we did manual delete. 
        // cancelClass handles its own logging/revalidation
        await logAuditAction(user.id, 'class.deleted', 'class', classId, { name: existingClass.name });
        revalidatePath('/teacher/classes');
        revalidatePath('/admin/classes');
    }

    return { success: true, data: undefined };
  } catch (err) {
    console.error('Unexpected error in deleteClass:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Publish a class (draft -> active/published)
 */
export async function publishClass(classId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership
    const { data: existingClass } = await supabase
      .from('classes')
      .select('teacher_id, status, name')
      .eq('id', classId)
      .single();

    if (!existingClass) {
      return { success: false, error: 'Class not found' };
    }

    if (existingClass.teacher_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return { success: false, error: 'Not authorized to publish this class' };
      }
    }

    if (existingClass.status !== 'draft') {
      return { success: false, error: 'Only draft classes can be published' };
    }

    const { error } = await supabase
      .from('classes')
      .update({ status: 'published' })
      .eq('id', classId);

    if (error) {
      console.error('Error publishing class:', error);
      return { success: false, error: error.message };
    }

    await logAuditAction(user.id, 'class.published', 'class', classId, { name: existingClass.name });
    revalidatePath('/teacher/classes');
    revalidatePath('/parent/browse');

    return { success: true, data: undefined };
  } catch (err) {
    console.error('Unexpected error in publishClass:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Cancel a class (with enrollment handling)
 */
export async function cancelClass(classId: string): Promise<ActionResult<{ affectedEnrollments: number }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership
    const { data: existingClass } = await supabase
      .from('classes')
      .select('teacher_id, status, name')
      .eq('id', classId)
      .single();

    if (!existingClass) {
      return { success: false, error: 'Class not found' };
    }

    if (existingClass.teacher_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return { success: false, error: 'Not authorized to cancel this class' };
      }
    }

    // 1. Fetch details for emails
    const { data: enrollmentsToNotify } = await supabase
      .from('enrollments')
      .select('*, student:family_members(*), class:classes(name)')
      .eq('class_id', classId)
      .in('status', ['confirmed', 'pending', 'waitlisted']);

    // 2. Cancel all relevant enrollments (Update status)
    const { data: affectedEnrollments } = await supabase
        .from('enrollments')
        .update({ status: 'cancelled' })
        .eq('class_id', classId)
        .in('status', ['confirmed', 'pending', 'waitlisted'])
        .select('id');

    // Send Cancellation Emails
    for (const enrollment of (enrollmentsToNotify || [])) {
        if (enrollment.student?.parent_id) {
            // Need to fetch parent email
            const { data: parent } = await supabase
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', enrollment.student.parent_id)
                .single();
            
            if (parent) {
                await sendClassCancellation({
                    parentEmail: parent.email,
                    parentName: `${parent.first_name} ${parent.last_name}`,
                    studentName: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
                    className: enrollment.class?.name || existingClass.name,
                });
            }
        }
    }

    // Update class status
    const { error } = await supabase
      .from('classes')
      .update({ status: 'cancelled' })
      .eq('id', classId);

    if (error) {
      console.error('Error cancelling class:', error);
      return { success: false, error: error.message };
    }

    await logAuditAction(user.id, 'class.cancelled', 'class', classId, {
      name: existingClass.name,
      affectedEnrollments: affectedEnrollments?.length || 0,
    });
    revalidatePath('/teacher/classes');
    revalidatePath('/parent/enrollments');

    return { success: true, data: { affectedEnrollments: affectedEnrollments?.length || 0 } };
  } catch (err) {
    console.error('Unexpected error in cancelClass:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Complete a class (mark as finished)
 */
export async function completeClass(classId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership
    const { data: existingClass } = await supabase
      .from('classes')
      .select('teacher_id, status, name')
      .eq('id', classId)
      .single();

    if (!existingClass) {
      return { success: false, error: 'Class not found' };
    }

    if (existingClass.teacher_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return { success: false, error: 'Not authorized to complete this class' };
      }
    }

    if (existingClass.status !== 'published') {
      return { success: false, error: 'Only published classes can be completed' };
    }

    const { error } = await supabase
      .from('classes')
      .update({ status: 'completed' })
      .eq('id', classId);

    if (error) {
      console.error('Error completing class:', error);
      return { success: false, error: error.message };
    }

    await logAuditAction(user.id, 'class.completed', 'class', classId, { name: existingClass.name });
    revalidatePath('/teacher/classes');

    return { success: true, data: undefined };
  } catch (err) {
    console.error('Unexpected error in completeClass:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all classes for the current teacher
 */
export async function getTeacherClasses(): Promise<ActionResult<ClassWithTeacher[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    console.error('[DEBUG] getTeacherClasses: User ID:', user.id);
    const { data: classes, error } = await supabase
      .from('classes')
      .select(`
        *,
        teacher:profiles!teacher_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    console.error('[DEBUG] getTeacherClasses: Found classes:', classes?.length);

    if (error) {
      console.error('Error fetching teacher classes:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: classes as ClassWithTeacher[] };
  } catch (err) {
    console.error('Unexpected error in getTeacherClasses:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all classes (Admin/Class Scheduler only)
 * Allows viewing all classes regardless of status
 */
export async function getAllClasses(
  filters?: ClassFilters & { page?: number; limit?: number }
): Promise<ActionResult<{ classes: ClassWithTeacher[]; total: number }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['admin', 'super_admin', 'class_scheduler'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return { success: false, error: 'Not authorized to view all classes' };
    }

    let query = supabase
      .from('classes')
      .select(`
        *,
        teacher:profiles!teacher_id (
          id,
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.teacherId) {
      query = query.eq('teacher_id', filters.teacherId);
    }

    if (filters?.search) {
      // Search by class name or description
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    // Sort by created_at desc by default
    query = query.order('created_at', { ascending: false });

    // Pagination
    if (filters?.page && filters?.limit) {
        const from = (filters.page - 1) * filters.limit;
        const to = from + filters.limit - 1;
        query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching all classes:', error);
      return { success: false, error: error.message };
    }

    return { 
        success: true, 
        data: { 
            classes: data as ClassWithTeacher[], 
            total: count || 0 
        } 
    };
  } catch (err) {
    console.error('Unexpected error in getAllClasses:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Admin Update Class
 * Allows admins/schedulers to update any class
 */
export async function adminUpdateClass(
  classId: string,
  input: Partial<CreateClassInput>
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['admin', 'super_admin', 'class_scheduler'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return { success: false, error: 'Not authorized to update classes' };
    }
    // Fetch existing class details for comparison
    const { data: existingClass } = await supabase
      .from('classes')
      .select('name, location, schedule_config, start_date, end_date')
      .eq('id', classId)
      .single();

    if (!existingClass) {
        return { success: false, error: 'Class not found' };
    }

    // Update class
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    updateData.price = 3000; // Fixed $30 for all classes
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    
    if (input.schedule_config !== undefined) {
        updateData.schedule_config = input.schedule_config;
        updateData.day = input.schedule_config.day;
        updateData.block = input.schedule_config.block;
        updateData.start_date = input.schedule_config.startDate;
        updateData.end_date = input.schedule_config.endDate;
    }

    if (input.location !== undefined) updateData.location = input.location;
    if (input.ageMin !== undefined) updateData.age_min = input.ageMin;
    if (input.ageMax !== undefined) updateData.age_max = input.ageMax;
    if (input.teacherId !== undefined) updateData.teacher_id = input.teacherId;
    if (input.status !== undefined) updateData.status = input.status;

    const { error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', classId);

    if (error) {
      console.error('Error updating class (admin):', error);
      return { success: false, error: error.message };
    }

    await logAuditAction(user.id, 'admin.class.updated', 'class', classId, updateData);

    // Check for schedule/location changes and notify parents
    const changes: {
        schedule?: { old: string; new: string };
        location?: { old: string; new: string };
        dates?: { old: string; new: string };
    } = {};
    let shouldNotify = false;

    // Check location
    if (input.location && input.location !== existingClass.location) {
        changes.location = { 
            old: existingClass.location || 'TBA', 
            new: input.location 
        };
        shouldNotify = true;
    }

    // Check schedule (Day/Block)
    if (input.schedule_config) {
        const oldConfig = existingClass.schedule_config as unknown as ScheduleConfig | null;
        const oldSchedule = oldConfig
            ? `${oldConfig.day} ${oldConfig.block}`
            : 'TBA';
        const newSchedule = `${input.schedule_config.day} ${input.schedule_config.block}`;
        
        if (oldSchedule !== newSchedule) {
            changes.schedule = { old: oldSchedule, new: newSchedule };
            shouldNotify = true;
        }

        // Check dates
        const oldDates = existingClass.start_date && existingClass.end_date
            ? `${existingClass.start_date} to ${existingClass.end_date}`
            : 'TBA';
        const newDates = input.schedule_config.startDate && input.schedule_config.endDate
            ? `${input.schedule_config.startDate} to ${input.schedule_config.endDate}`
            : 'TBA';

        if (oldDates !== newDates) {
            changes.dates = { old: oldDates, new: newDates };
            shouldNotify = true;
        }
    }

    if (shouldNotify) {
        // Fetch enrollments
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('*, student:family_members(*)')
            .eq('class_id', classId)
            .in('status', ['confirmed', 'pending']);

        if (enrollments && enrollments.length > 0) {
           for (const enrollment of enrollments) {
               if (enrollment.student?.parent_id) {
                   const { data: parent } = await supabase
                       .from('profiles')
                       .select('email, first_name, last_name')
                       .eq('id', enrollment.student.parent_id)
                       .single();

                   if (parent) {
                       await sendScheduleChangeNotification({
                           parentEmail: parent.email,
                           parentName: `${parent.first_name} ${parent.last_name}`,
                           studentName: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
                           className: existingClass.name, 
                           changes
                       });
                   }
               }
           }
        }
    }

    revalidatePath('/admin/classes');
    revalidatePath(`/admin/classes/${classId}`);
    
    return { success: true, data: undefined };
  } catch (err) {
    console.error('Unexpected error in adminUpdateClass:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Admin Delete Class
 */
export async function adminDeleteClass(classId: string): Promise<ActionResult<void>> {
  return deleteClass(classId);
}

'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Class, ActionResult, ScheduleConfig } from '@/types';
import { checkScheduleConflict, checkRoomConflict } from '@/lib/logic/scheduling';

export interface SchedulerStats {
    totalClasses: number;
    unscheduledCount: number;
    conflictCount: number;
}

// ... (stats function remains same)

export async function getSchedulerStats(): Promise<ActionResult<SchedulerStats>> {
    try {
        const supabase = await createClient();
        
        // Verify role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['class_scheduler', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Unauthorized' };
        }

        // Use admin client for data fetching to bypass RLS
        const adminClient = await createAdminClient();

        // 1. Total Classes (active)
        const { count: totalClasses, error: totalError } = await adminClient
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'cancelled');
        
        if (totalError) throw totalError;

        // 2. Unscheduled (draft)
        const { count: unscheduledCount, error: unscheduledError } = await adminClient
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'draft');

        if (unscheduledError) throw unscheduledError;

        // 3. Conflicts (Re-using getConflictAlerts logic briefly or calling it if possible, 
        // but for stats usually we just want a number. 
        // For efficiency, let's call getConflictAlerts internal logic or just 0 for now if heavy.
        // The prompt implies implementing it. I'll call getConflictAlerts since it exists in this file.)
        const conflictResult = await getConflictAlerts();
        const conflictCount = conflictResult.success && conflictResult.data ? conflictResult.data.length : 0;

        return {
            success: true,
            data: {
                totalClasses: totalClasses || 0,
                unscheduledCount: unscheduledCount || 0,
                conflictCount
            }
        };

    } catch (err) {
        console.error('Error getting scheduler stats:', err);
        return { success: false, error: 'Internal server error' };
    }
}

export async function schedulerUpdateClass(id: string, updates: Partial<Class>): Promise<ActionResult> {
    try {
        const supabase = await createClient();
        
        // Verify role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['class_scheduler', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Unauthorized' };
        }

        // Use admin client for updates to ensure we can access/modify any class
        const adminClient = await createAdminClient();

        // --- Conflict Detection Start ---
        // 1. Fetch existing class to get full context (e.g. if only updating time, we need teacher/room)
        const { data: existingClass, error: fetchError } = await adminClient
            .from('classes')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError || !existingClass) {
             return { success: false, error: 'Class not found' };
        }

        // 2. Merge updates to create "Proposed State"
        const proposedState = { ...existingClass, ...updates } as Class;

        // 3. Check Teacher Conflict (if teacher or time is relevant)
        if (proposedState.teacher_id && proposedState.schedule_config) {
             const { data: teacherClasses } = await adminClient
                .from('classes')
                .select('*')
                .eq('teacher_id', proposedState.teacher_id)
                .neq('id', id) // Exclude self
                .in('status', ['published', 'draft']); // Only check active classes

             if (teacherClasses) {
                 const conflict = checkScheduleConflict(
                     proposedState.schedule_config as ScheduleConfig,
                     proposedState.teacher_id,
                     teacherClasses
                 );
                 
                 if (conflict) {
                     return { success: false, error: `Teacher Conflict: ${conflict.name} at ${conflict.schedule_config?.day} ${conflict.schedule_config?.block}` };
                 }
             }
        }

        // 4. Check Room Conflict (if room or time is relevant)
        if (proposedState.location && proposedState.schedule_config) {
            const { data: roomClasses } = await adminClient
                .from('classes')
                .select('*')
                .eq('location', proposedState.location)
                .neq('id', id)
                .in('status', ['published', 'draft']);

            if (roomClasses) {
                const conflict = checkRoomConflict(
                    proposedState.schedule_config as ScheduleConfig,
                    proposedState.location,
                    roomClasses
                );

                if (conflict) {
                    return { success: false, error: `Room Conflict: ${conflict.name} uses ${conflict.location} at ${conflict.schedule_config?.day} ${conflict.schedule_config?.block}` };
                }
            }
        }
        // --- Conflict Detection End ---

        const resolvedUpdates: Partial<Class> = { ...updates };
        if (updates.schedule_config) {
            resolvedUpdates.day = updates.schedule_config.day ?? null;
            resolvedUpdates.block = updates.schedule_config.block ?? null;
            resolvedUpdates.start_date = updates.schedule_config.startDate ?? null;
            resolvedUpdates.end_date = updates.schedule_config.endDate ?? null;
        }

        const { error } = await adminClient
            .from('classes')
            .update(resolvedUpdates)
            .eq('id', id);

        if (error) {
            console.error('Error updating class:', error);
            return { success: false, error: 'Failed to update class' };
        }

        return { success: true, data: undefined };
    } catch (error) {
        console.error('Error in schedulerUpdateClass:', error);
        return { success: false, error: 'Internal server error' };
    }
}


export async function schedulerCreateClass(
    data: Partial<Class>
): Promise<ActionResult<{ classId: string }>> {
    try {
        const supabase = await createClient();
        
        // Verify role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['class_scheduler', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Unauthorized' };
        }

        // Use admin client for creation and checks
        const adminClient = await createAdminClient();

        // --- Conflict Detection Start ---
        // 1. Check Teacher Conflict
        if (data.teacher_id && data.schedule_config) {
            const { data: teacherClasses } = await adminClient
            .from('classes')
            .select('*')
            .eq('teacher_id', data.teacher_id)
            .in('status', ['published', 'draft']);

            if (teacherClasses) {
                 const conflict = checkScheduleConflict(
                     data.schedule_config as ScheduleConfig,
                     data.teacher_id,
                     teacherClasses
                 );
                 
                 if (conflict) {
                     return { success: false, error: `Teacher Conflict: ${conflict.name}` };
                 }
            }
        }

        // 2. Check Room Conflict
        if (data.location && data.schedule_config) {
            const { data: roomClasses } = await adminClient
                .from('classes')
                .select('*')
                .eq('location', data.location)
                .in('status', ['published', 'draft']);

            if (roomClasses) {
                const conflict = checkRoomConflict(
                    data.schedule_config as ScheduleConfig,
                    data.location,
                    roomClasses
                );

                if (conflict) {
                     return { success: false, error: `Room Conflict: ${conflict.name} is already using ${conflict.location}` };
                }
            }
        }
        // --- Conflict Detection End ---

        const insertData: Partial<Class> = {
            ...data,
            day: data.schedule_config?.day ?? null,
            block: data.schedule_config?.block ?? null,
            start_date: data.schedule_config?.startDate ?? null,
            end_date: data.schedule_config?.endDate ?? null,
            status: data.status || 'draft',
        };

        const { data: createdClass, error } = await adminClient
            .from('classes')
            .insert(insertData)
            .select('id')
            .single();

        if (error) {
            console.error('Error creating class:', error);
            return { success: false, error: 'Failed to create class' };
        }

        return { success: true, data: { classId: createdClass.id } };
    } catch (error) {
        console.error('Error in schedulerCreateClass:', error);
        return { success: false, error: 'Internal server error' };
    }
}

export async function getConflictAlerts(): Promise<ActionResult<{ id: string; message: string; severity: 'high' | 'medium' | 'low' }[]>> {
    try {
        const supabase = await createClient();
        
        // Verify role before doing heavy lifting
        const { data: { user } } = await supabase.auth.getUser();
         if (!user) return { success: false, error: 'Not authenticated' };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['class_scheduler', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Unauthorized' };
        }

        // Use admin client to ensure we see ALL classes
        const adminClient = await createAdminClient();

        // Fetch ALL active classes
        // Warning: This could be heavy with thousands of classes. 
        // Optimize by filtering for current semester only in a real app.
        const { data: classes } = await adminClient
            .from('classes')
            .select('*')
            .in('status', ['published', 'draft']);

        if (!classes) return { success: true, data: [] };

        const conflicts: { id: string; message: string; severity: 'high' | 'medium' | 'low' }[] = [];

        // Naive O(N^2) check - acceptable for moderate number of classes (~100s)
        for (let i = 0; i < classes.length; i++) {
            const c1 = classes[i];
            if (!c1.teacher_id || !c1.schedule_config) continue;

            for (let j = i + 1; j < classes.length; j++) {
                const c2 = classes[j];
                if (!c2.teacher_id || !c2.schedule_config) continue;
                
                // Check Teacher Conflict
                if (c1.teacher_id === c2.teacher_id) {
                    const conflict = checkScheduleConflict(
                        c1.schedule_config as ScheduleConfig,
                        c1.teacher_id,
                        [c2] // Check against single class
                    );
                    
                    if (conflict) {
                        conflicts.push({
                            id: `${c1.id}-${c2.id}`,
                            message: `Teacher Conflict: ${c1.name} overlaps with ${c2.name}`,
                            severity: 'high'
                        });
                    }
                }

                // Check Room Conflict (if location is used)
                if (c1.location && c2.location && c1.location === c2.location) {
                     const c1Config = c1.schedule_config as ScheduleConfig;
                     const c2Config = c2.schedule_config as ScheduleConfig;

                     if (c1Config.day && c2Config.day) {
                         // Check day
                         if (c1Config.day === c2Config.day) {
                              // Check block
                              if (c1Config.block === c2Config.block) {
                                  conflicts.push({
                                      id: `room-${c1.id}-${c2.id}`,
                                      message: `Room Conflict: ${c1.name} and ${c2.name} in ${c1.location}`,
                                      severity: 'medium'
                                  });
                              }
                         }
                     }
                }
            }
        }

        return { success: true, data: conflicts };

    } catch(err) {
        console.error("Error checking conflicts:", err);
        return { success: false, error: "Failed to check conflicts" };
    }
}

/**
 * Get classes for the scheduler view (Admin/Scheduler only)
 * Optimized for calendar grid display.
 */
export async function getClassesForScheduler(
    page = 1, 
    limit = 100
): Promise<ActionResult<{ classes: Class[]; total: number }>> {
    try {
        const supabase = await createClient();
        
        // Verify role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['class_scheduler', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Unauthorized' };
        }

        // Use admin client to bypass RLS
        const adminClient = await createAdminClient();

        const offset = (page - 1) * limit;

        const { data, count, error } = await adminClient
            .from('classes')
            .select(`
                *,
                teacher:profiles!teacher_id (
                    id,
                    first_name,
                    last_name,
                    email
                )
            `, { count: 'exact' })
            .in('status', ['published', 'draft']) 
            .order('start_date', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching scheduler classes:', error);
            return { success: false, error: error.message };
        }

        return { 
            success: true, 
            data: { 
                classes: data as Class[], 
                total: count || 0 
            } 
        };
    } catch (err) {
        console.error('Error in getClassesForScheduler:', err);
        return { success: false, error: 'Internal server error' };
    }
}

export async function getUnscheduledClasses(limit = 5): Promise<ActionResult<Class[]>> {
    try {
        const supabase = await createClient();
        
        // Verify role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || !['class_scheduler', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Unauthorized' };
        }

        // Use admin client for fetching unscheduled classes
        const adminClient = await createAdminClient();

        const { data, error } = await adminClient
            .from('classes')
            .select('*')
            .eq('status', 'draft')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching unscheduled classes:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data as Class[] };
    } catch (err) {
        console.error('Error in getUnscheduledClasses:', err);
        return { success: false, error: 'Internal server error' };
    }
}

export async function getTeachersForScheduler(): Promise<
    ActionResult<{ id: string; first_name: string | null; last_name: string | null; email: string }[]>
> {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['class_scheduler', 'super_admin'].includes(profile.role)) {
            return { success: false, error: 'Unauthorized' };
        }

        const adminClient = await createAdminClient();
        const { data, error } = await adminClient
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('role', 'teacher')
            .order('last_name', { ascending: true });

        if (error) {
            console.error('Error fetching teachers:', error);
            return { success: false, error: 'Failed to fetch teachers' };
        }

        return { success: true, data: data as { id: string; first_name: string | null; last_name: string | null; email: string }[] };
    } catch (err) {
        console.error('Error in getTeachersForScheduler:', err);
        return { success: false, error: 'Internal server error' };
    }
}

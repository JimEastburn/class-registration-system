'use server';

import { createClient } from '@/lib/supabase/server';
import { resolveStudentFamilyMember } from '@/lib/logic/student-link';

export interface ScheduleEvent {
  id: string;
  class_id: string;
  title: string;
  date: string;
  block: string;
  location?: string;
  description?: string;
  color?: string;
}

export async function getStudentSchedule(
  studentId: string,
  from?: Date,
  to?: Date
): Promise<{ data: ScheduleEvent[] | null; error: string | null }> {
  try {

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { data: null, error: 'Not authenticated' };
    }

    // Verify student belongs to user (security check)
    const linkedFamilyMember = await resolveStudentFamilyMember(supabase, user);

    // If not a linked student, check whether the user is parent of this student
    if (!linkedFamilyMember || linkedFamilyMember.id !== studentId) {
        // Check if user is parent
        const { data: relationship } = await supabase
            .from('family_members')
            .select('id')
            .eq('id', studentId)
            .eq('parent_id', user.id) // User is the parent
            .single();
            
        if (!relationship) {
             return { data: null, error: 'Unauthorized access to student schedule' };
        }
    }

    // 1. Get confirmed enrollments
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('status', 'confirmed');

    if (!enrollments || enrollments.length === 0) {
        return { data: [], error: null };
    }

    const classIds = enrollments.map(e => e.class_id);

    // 2. Fetch events
    let query = supabase
        .from('calendar_events')
        .select(`
            *,
            class:classes (
                title,
                location
            )
        `)
        .in('class_id', classIds)
        .order('date', { ascending: true })
        .order('block', { ascending: true }); // Approximate sort for blocks

    if (from) {
        query = query.gte('date', from.toISOString());
    }
    if (to) {
        query = query.lte('date', to.toISOString());
    }

    const { data: events, error } = await query;

    if (error) {
        console.error('Error fetching schedule:', error);
        return { data: null, error: error.message };
    }

    // Transform to ScheduleEvent
    const scheduleEvents: ScheduleEvent[] = events.map((event) => ({
        id: event.id,
        class_id: event.class_id,
        title: event.class?.title || 'Untitled Class',
        date: event.date,
        block: event.block,
        location: event.location || event.class?.location,
        description: event.description,
    }));

    return { data: scheduleEvents, error: null };

  } catch (err) {
      console.error('Unexpected error fetching schedule:', err);
      return { data: null, error: 'An unexpected error occurred' };
  }
}

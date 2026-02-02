'use server';

import { createClient } from '@/lib/supabase/server';

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
    // Although the page fetches the ID based on user, the action should double check
    // or we assume server components pass trusted data?
    // Using a server action called from client component might be vulnerable if we just pass any ID.
    // Ideally we re-verify ownership.
    
    const { data: familyMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('id', studentId)
        .eq('student_user_id', user.id) // Ensure this student is the logged in user
        // OR checks parent ownership if parent is viewing?
        // For now, let's assume strict student login access for the student portal.
        // If parent portal uses this, we might need looser checks (parent_id = user.id).
        // Let's check both possibilities or just user linkage for now.
        .single();
        
    // If not direct student user, check if it's a parent of the student
    if (!familyMember) {
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

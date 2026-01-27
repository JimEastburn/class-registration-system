
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConflicts() {
    console.log('Checking for schedule conflicts...');

    // Fetch all active/draft classes
    // Include current_enrollment to help decide which to keep
    const { data: classes, error } = await supabase
        .from('classes')
        .select(`
            id, 
            name, 
            teacher_id, 
            teacher:profiles!classes_teacher_id_fkey(first_name, last_name),
            recurrence_days, 
            recurrence_time,
            recurrence_duration,
            status,
            current_enrollment,
            created_at
        `)
        .neq('status', 'cancelled');

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    if (!classes || classes.length === 0) {
        console.log('No classes found.');
        return;
    }

    // Group by teacher
    const classesByTeacher: Record<string, typeof classes> = {};
    for (const cls of classes) {
        if (!classesByTeacher[cls.teacher_id]) {
            classesByTeacher[cls.teacher_id] = [];
        }
        classesByTeacher[cls.teacher_id].push(cls);
    }

    let deletedCount = 0;
    const classesToDelete = new Set<string>();

    for (const teacherId in classesByTeacher) {
        const teacherClasses = classesByTeacher[teacherId];
        
        // We need to group conflicting classes together.
        // A conflict is when time intervals overlap on the same day.
        
        // This O(N^2) approach is fine for small count.
        // We want to find *Maximal Cliques* of conflicts or just greedily remove?
        // Greedy: for each class, if it conflicts with an *already accepted* class, reject (delete) it.
        // But we want to prioritize "better" classes (more enrollments).
        
        // Sort teacher's classes by priority:
        // 1. More enrollments (desc)
        // 2. Created earlier (asc)
        teacherClasses.sort((a, b) => {
            if (a.current_enrollment !== b.current_enrollment) {
                return b.current_enrollment - a.current_enrollment; // Higher enrollment first
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // Older first
        });

        const acceptedClasses: typeof teacherClasses = [];

        for (const cls of teacherClasses) {
            let hasConflict = false;

            // Check against already accepted classes
            for (const accepted of acceptedClasses) {
                // If overlap in time and day
                const t1Start = cls.recurrence_time;
                const t2Start = accepted.recurrence_time;

                if (!t1Start || !t2Start) continue; // Should not happen based on filtering logic usually, but specific manual ones might?
                
                // Assume 70 min duration if null (standard block)
                const d1 = cls.recurrence_duration || 70;
                const d2 = accepted.recurrence_duration || 70;

                const [h1, m1] = t1Start.split(':').map(Number);
                const min1 = h1 * 60 + m1;
                const end1 = min1 + d1;

                const [h2, m2] = t2Start.split(':').map(Number);
                const min2 = h2 * 60 + m2;
                const end2 = min2 + d2;

                const timeOverlap = (min1 < end2) && (end1 > min2);

                if (timeOverlap) {
                    // Check Days
                    const days1 = Array.isArray(cls.recurrence_days) ? cls.recurrence_days : JSON.parse((cls.recurrence_days as any) || '[]');
                    const days2 = Array.isArray(accepted.recurrence_days) ? accepted.recurrence_days : JSON.parse((accepted.recurrence_days as any) || '[]');
                    
                    const dayOverlap = days1.some((d: string) => days2.includes(d));

                    if (dayOverlap) {
                         hasConflict = true;
                         const teacherLastName = (Array.isArray(cls.teacher) ? cls.teacher[0] : (cls.teacher as any))?.last_name;
                         console.log(`Conflict detected for teacher ${teacherLastName}:`);
                         console.log(`   KEEPING: ${accepted.name} (${accepted.current_enrollment} students)`);
                         console.log(`   DELETING: ${cls.name} (${cls.current_enrollment} students)`);
                         break;
                    }
                }
            }

            if (hasConflict) {
                classesToDelete.add(cls.id);
            } else {
                acceptedClasses.push(cls);
            }
        }
    }

    if (classesToDelete.size > 0) {
        console.log(`Deleting ${classesToDelete.size} conflicting classes...`);
        const { error: deleteError } = await supabase
            .from('classes')
            .delete()
            .in('id', Array.from(classesToDelete));

        if (deleteError) {
            console.error('Error deleting classes:', deleteError);
        } else {
            console.log('Successfully deleted conflicting classes.');
        }
    } else {
        console.log('No conflicts found/resolved.');
    }
}

fixConflicts();

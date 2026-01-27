
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConflicts() {
    console.log('Checking for schedule conflicts...');

    // Fetch all active classes
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
            status
        `)
        .neq('status', 'cancelled');

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    if (!classes) return;

    // Group by teacher
    const classesByTeacher: Record<string, typeof classes> = {};
    for (const cls of classes) {
        if (!classesByTeacher[cls.teacher_id]) {
            classesByTeacher[cls.teacher_id] = [];
        }
        classesByTeacher[cls.teacher_id].push(cls);
    }

    let conflictCount = 0;

    for (const teacherId in classesByTeacher) {
        const teacherClasses = classesByTeacher[teacherId];
        const teacherName = teacherClasses[0].teacher ? `${teacherClasses[0].teacher.first_name} ${teacherClasses[0].teacher.last_name}` : 'Unknown';
        
        // Naive O(N^2) check for this teacher
        for (let i = 0; i < teacherClasses.length; i++) {
            for (let j = i + 1; j < teacherClasses.length; j++) {
                const c1 = teacherClasses[i];
                const c2 = teacherClasses[j];

                // 1. Time overlap check
                const t1Start = c1.recurrence_time;
                const t2Start = c2.recurrence_time;

                // Simple check: if start times are same (since we aligned blocks)
                // But strict overlap check:
                // Assume blocks logic holds (time + 70 mins)
                const [h1, m1] = t1Start.split(':').map(Number);
                const min1 = h1 * 60 + m1;
                const end1 = min1 + (c1.recurrence_duration || 70);

                const [h2, m2] = t2Start.split(':').map(Number);
                const min2 = h2 * 60 + m2;
                const end2 = min2 + (c2.recurrence_duration || 70);

                const overlap = (min1 < end2) && (end1 > min2);
                
                if (overlap) {
                    // 2. Day overlap check
                     const days1 = c1.recurrence_days || [];
                     const days2 = c2.recurrence_days || [];
                     
                     // Supabase returns these as simple arrays usually
                     const d1 = Array.isArray(days1) ? days1 : JSON.parse(days1 as any);
                     const d2 = Array.isArray(days2) ? days2 : JSON.parse(days2 as any);
                     
                     const dayOverlap = d1.some((d: string) => d2.includes(d));

                     if (dayOverlap) {
                         console.log(`CONFLICT FOUND for ${teacherName}:`);
                         console.log(`  Class 1: ${c1.name} (${c1.id}) - ${d1.join(',')} @ ${t1Start}`);
                         console.log(`  Class 2: ${c2.name} (${c2.id}) - ${d2.join(',')} @ ${t2Start}`);
                         conflictCount++;
                     }
                }
            }
        }
    }

    console.log(`Total conflicts found: ${conflictCount}`);
}

checkConflicts();

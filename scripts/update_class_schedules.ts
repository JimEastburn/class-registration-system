
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchedules() {
    console.log('Fetching classes...');
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*');

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Found ${classes.length} classes. Starting update...`);
    let updatedCount = 0;

    for (const cls of classes) {
        // 1. Determine Time
        let time = cls.recurrence_time;

        if (!time && cls.schedule) {
            // Try to parse time from legacy string
            const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
            const match = cls.schedule.match(timeRegex);
            if (match) {
                let h = parseInt(match[1], 10);
                let m = match[2] || '00';
                const ampm = match[3]?.toLowerCase();

                if (ampm === 'pm' && h < 12) h += 12;
                if (ampm === 'am' && h === 12) h = 0;
                
                // Heuristic if no am/pm (same as in page.tsx)
                if (!ampm && h >= 1 && h <= 6) h += 12;

                // Format as HH:MM:00
                time = `${h.toString().padStart(2, '0')}:${m}:00`;
            }
        }

        // Default to 10:00 AM if no time found
        if (!time) {
            time = '10:00:00';
        }

        // 2. Construct new Schedule String
        // "Tue/Thu 10:00 AM"
        const [hStr, mStr] = time.split(':');
        const h = parseInt(hStr, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const newScheduleString = `Tue/Thu ${displayH}:${mStr} ${ampm}`;

        // 3. Update Record
        const { error: updateError } = await supabase
            .from('classes')
            .update({
                recurrence_pattern: 'weekly',
                recurrence_days: ['tuesday', 'thursday'],
                recurrence_time: time,
                recurrence_duration: cls.recurrence_duration || 60, // Default to 60 min if missing
                schedule: newScheduleString
            })
            .eq('id', cls.id);

        if (updateError) {
            console.error(`Failed to update class ${cls.id}:`, updateError);
        } else {
            updatedCount++;
        }
    }

    console.log(`Successfully updated ${updatedCount} classes.`);
}

updateSchedules();

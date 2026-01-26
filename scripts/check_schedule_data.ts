
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchedules() {
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, schedule, recurrence_pattern, status')
        .neq('status', 'cancelled');

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Found ${classes.length} active/draft classes.`);
    
    // Group by schedule format patterns
    const formats: Record<string, number> = {};
    const examples: Record<string, string[]> = {};

    classes.forEach(c => {
        const sched = c.schedule || 'NULL';
        let type = 'Unknown';
        
        if (c.recurrence_pattern && c.recurrence_pattern !== 'none') {
            type = 'Structured Recurrence';
        } else if (sched === 'NULL') {
            type = 'NULL';
        } else if (sched.toLowerCase().includes('tba') || sched.toLowerCase().includes('announced')) {
            type = 'TBA';
        } else {
             // Try to categorize the string format
             if (/^[A-Za-z]{3}\s+\d{1,2}/.test(sched)) type = 'Day Time (e.g. Mon 10)';
             else if (/^[A-Za-z]+\s+\d{1,2}:/.test(sched)) type = 'Day Time: (e.g. Monday 10:)';
             else type = 'Other String';
        }

        formats[type] = (formats[type] || 0) + 1;
        if (!examples[type]) examples[type] = [];
        if (examples[type].length < 5) examples[type].push(sched);
    });

    console.log('Schedule Formats Distribution:');
    console.table(formats);
    
    console.log('\nExamples of "Other String":');
    console.log(examples['Other String']);

    console.log('\nExamples of "Day Time (e.g. Mon 10)":');
    console.log(examples['Day Time (e.g. Mon 10)']);
}

checkSchedules();

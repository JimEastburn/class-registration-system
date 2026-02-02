
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectClasses() {
  console.log('Fetching last 10 classes...');
  const { data: classes, error } = await supabase
    .from('classes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching classes:', error);
    return;
  }

  console.log(`Found ${classes.length} classes.`);
  if (classes.length > 0) {
      console.log('Most recent class:', JSON.stringify(classes[0], null, 2));
      console.log('------------------------------------------------');
      classes.forEach(c => {
          console.log(`ID: ${c.id} | Name: ${c.name} | Status: ${c.status} | Teacher: ${c.teacher_id} | Created: ${c.created_at}`);
      });
  }

  console.log('Fetching last 10 profiles...');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
    if (profiles) {
        console.log(`Found ${profiles.length} profiles.`);
        profiles.forEach(p => console.log(`ID: ${p.id} | Email: ${p.email} | Role: ${p.role}`));
    }
}

inspectClasses();

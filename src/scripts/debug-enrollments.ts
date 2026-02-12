
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEnrollments() {
  console.log('Debugging enrollments...');

  const { data: allEnrollments, error } = await supabase
      .from('enrollments')
      .select('*')
      .limit(5);

  if (error) {
      console.error('Error fetching enrollments:', error);
      return;
  }

  console.log(`Found ${allEnrollments.length} enrollments.`);
  allEnrollments.forEach(e => {
      console.log(`- ID: ${e.id}, Student: ${e.student_id}, Class: ${e.class_id}, Status: '${e.status}'`);
  });
}

debugEnrollments();

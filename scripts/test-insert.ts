
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
  console.log('Inserting test class...');
  
  // Need a valid teacher ID. I saw one in previous output: 431e8725...
  // Or I can pick the first profile found.
  
  const { data: profiles } = await supabase.from('profiles').select('id').eq('role', 'teacher').limit(1);
  if (!profiles || profiles.length === 0) {
      console.log('No teacher profile found.');
      return;
  }
  const teacherId = profiles[0].id;
  console.log('Using teacher ID:', teacherId);

  const { data, error } = await supabase
    .from('classes')
    .insert({
        name: 'Script Test Class',
        capacity: 10,
        price: 1000,
        teacher_id: teacherId,
        status: 'draft'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Insert error:', error);
    return;
  }
  
  console.log('Inserted ID:', data.id);
  
  // verify it exists
  const { data: verify, error: vError } = await supabase.from('classes').select('*').eq('id', data.id).single();
  if (vError) {
      console.error('Verification error:', vError);
  } else {
      console.log('Verification success:', verify.name);
  }
}

testInsert();

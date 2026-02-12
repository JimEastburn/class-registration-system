
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

async function verifyDuplicatePrevention() {
  console.log('Verifying duplicate enrollment prevention logic...');

  // 1. Use KNOWN existing enrollment (Jim in Intro to Robotics)
  const testCase = {
      student_id: 'a1cb35ee-6960-4d91-95c1-536acca79f1e',
      class_id: '8ca3f6a5-76ce-41a7-9c12-eccbcd812d8a',
      status: 'confirmed'
  };
  console.log(`Testing with known existing enrollment: Student ${testCase.student_id}, Class ${testCase.class_id} (${testCase.status})`);

  // 2. Run the LOGIC that is in enrollments.ts
  console.log('--- Test 1: Should DETECT existing enrollment ---');
  const { data: found, error: queryError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('student_id', testCase.student_id)
      .eq('class_id', testCase.class_id)
      .in('status', ['confirmed', 'pending', 'waitlisted'])
      .limit(1)
      .maybeSingle();

  if (queryError) {
      console.error('❌ Query Error:', queryError);
  } else if (found) {
      console.log('✅ PASSED: Found existing enrollment as expected.');
      console.log('   Data:', found);
  } else {
      console.error('❌ FAILED: Did not find existing enrollment.');
  }

  // 3. Run safely with a FAKE class ID (Should NOT find anything)
  console.log('\n--- Test 2: Should ALLOW new enrollment (No duplicate) ---');
  const fakeClassId = '00000000-0000-0000-0000-000000000000';
  const { data: notFound, error: queryError2 } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('student_id', testCase.student_id)
      .eq('class_id', fakeClassId)
      .in('status', ['confirmed', 'pending', 'waitlisted'])
      .limit(1)
      .maybeSingle();

  if (queryError2) {
      console.error('❌ Query Error 2:', queryError2);
  } else if (notFound) {
      console.error('❌ FAILED: Found enrollment where none should exist.');
  } else {
      console.log('✅ PASSED: No enrollment found (would allow new enrollment).');
  }
}

verifyDuplicatePrevention();

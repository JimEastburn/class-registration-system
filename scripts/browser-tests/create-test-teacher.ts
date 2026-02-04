#!/usr/bin/env tsx
/**
 * Create a test teacher user and output credentials as JSON
 * Usage: npx tsx scripts/browser-tests/create-test-teacher.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(JSON.stringify({ error: 'Missing Supabase credentials' }));
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestTeacher() {
  const email = `teacher-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
  const password = 'Password123!';
  const firstName = 'Test';
  const lastName = 'Teacher';

  // Create auth user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: 'teacher'
    }
  });

  if (createError) {
    console.error(JSON.stringify({ error: createError.message }));
    process.exit(1);
  }

  const userId = userData.user.id;

  // Update profile to teacher role
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      role: 'teacher',
      first_name: firstName,
      last_name: lastName,
      code_of_conduct_agreed_at: new Date().toISOString()
    });

  if (profileError) {
    // Cleanup on failure
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.error(JSON.stringify({ error: profileError.message }));
    process.exit(1);
  }

  // Output credentials as JSON
  console.log(JSON.stringify({
    email,
    password,
    userId
  }));
}

createTestTeacher();

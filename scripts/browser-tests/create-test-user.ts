#!/usr/bin/env tsx
/**
 * Create a test user with a specified role and output credentials as JSON
 * Usage: npx tsx scripts/browser-tests/create-test-user.ts <role>
 * 
 * Roles: parent, student, teacher, admin, class_scheduler, super_admin
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

type UserRole = 'parent' | 'student' | 'teacher' | 'admin' | 'class_scheduler' | 'super_admin';

const VALID_ROLES: UserRole[] = ['parent', 'student', 'teacher', 'admin', 'class_scheduler', 'super_admin'];

const ROLE_NAMES: Record<UserRole, { firstName: string; lastName: string }> = {
  parent: { firstName: 'Test', lastName: 'Parent' },
  student: { firstName: 'Test', lastName: 'Student' },
  teacher: { firstName: 'Test', lastName: 'Teacher' },
  admin: { firstName: 'Test', lastName: 'Admin' },
  class_scheduler: { firstName: 'Test', lastName: 'Scheduler' },
  super_admin: { firstName: 'Test', lastName: 'SuperAdmin' }
};

async function createTestUser(role: UserRole) {
  const { firstName, lastName } = ROLE_NAMES[role];
  const roleSlug = role.replace('_', '-');
  const email = `${roleSlug}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
  const password = 'Password123!';

  // Create auth user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role
    }
  });

  if (createError) {
    console.error(JSON.stringify({ error: createError.message }));
    process.exit(1);
  }

  const userId = userData.user.id;

  // Update profile with the specified role
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      role,
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
    userId,
    role
  }));
}

// Parse command line arguments
const role = process.argv[2] as UserRole;

if (!role || !VALID_ROLES.includes(role)) {
  console.error(JSON.stringify({ 
    error: `Invalid role. Valid roles: ${VALID_ROLES.join(', ')}`
  }));
  process.exit(1);
}

createTestUser(role);

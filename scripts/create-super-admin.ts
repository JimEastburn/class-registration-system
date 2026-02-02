
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@classregistration.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use Service Role Key for Admin Access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  console.log(`👑 Creating Super Admin (${ADMIN_EMAIL})...`);

  // 1. Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    process.exit(1);
  }

  let userId: string | null = null;
  const existingUser = users.find((u) => u.email === ADMIN_EMAIL);

  if (existingUser) {
    console.log('ℹ️ User already exists in Auth.');
    userId = existingUser.id;
  } else {
    // 2. Create User
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: 'Super',
        last_name: 'Admin',
      },
    });

    if (createError) {
      console.error('❌ Error creating user:', createError.message);
      process.exit(1);
    }
    console.log('✅ Auth User Created.');
    userId = newUser.user.id;
  }

  if (!userId) {
     console.error('❌ Failed to resolve User ID.');
     process.exit(1);
  }

  // 3. Update Role in Profiles
  // Note: The 'handle_new_user' trigger might have already created the profile with default role.
  // We need to force update it to 'super_admin'.
  
  // Wait a moment for trigger (if new user)
  if (!existingUser) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'super_admin' })
    .eq('id', userId);

  if (updateError) {
     // If update fails, maybe profile doesn't exist yet (trigger failed?), try inserting
     console.log('⚠️ Update failed, attempting upsert...', updateError.message);
     
     const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: ADMIN_EMAIL,
            role: 'super_admin',
            first_name: 'Super',
            last_name: 'Admin'
        });
        
     if (upsertError) {
         console.error('❌ Failed to set super_admin role:', upsertError.message);
         process.exit(1);
     }
  }

  console.log(`✅ Successfully promoted ${ADMIN_EMAIL} to Super Admin.`);
}

createSuperAdmin();

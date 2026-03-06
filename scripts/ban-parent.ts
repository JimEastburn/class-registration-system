import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    '❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// --- Usage ---
// npx tsx scripts/ban-parent.ts <email>
// npx tsx scripts/ban-parent.ts <email> --unban

async function banParent() {
  const email = process.argv[2];
  const unban = process.argv.includes('--unban');

  if (!email) {
    console.error('Usage: npx tsx scripts/ban-parent.ts <email> [--unban]');
    process.exit(1);
  }

  // 1. Look up user by email via profiles table
  console.log(`🔍 Looking up user: ${email}...`);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name')
    .ilike('email', email)
    .single();

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError.message);
    process.exit(1);
  }

  console.log(
    `👤 Found: ${profile.first_name} ${profile.last_name} (role: ${profile.role})`
  );

  if (profile.role !== 'parent') {
    console.error(
      `⚠️  This user has role "${profile.role}", not "parent". Aborting.`
    );
    console.error(
      '   If you really want to ban this user, modify the script to remove this check.'
    );
    process.exit(1);
  }

  // 3. Ban or unban the user
  if (unban) {
    console.log(`🔓 Unbanning ${email}...`);

    const { data, error } = await supabase.auth.admin.updateUserById(profile.id, {
      ban_duration: 'none',
    });

    if (error) {
      console.error('❌ Error unbanning user:', error.message);
      process.exit(1);
    }

    // Also clear the is_banned flag on profiles
    await supabase
      .from('profiles')
      .update({ is_banned: false })
      .eq('id', profile.id);

    console.log(`✅ Successfully unbanned ${email}`);
    console.log(`   banned_until: ${data.user.banned_until}`);
  } else {
    console.log(`🚫 Banning ${email} indefinitely...`);

    const { data, error } = await supabase.auth.admin.updateUserById(profile.id, {
      ban_duration: '876600h', // ~100 years
    });

    if (error) {
      console.error('❌ Error banning user:', error.message);
      process.exit(1);
    }

    // Also set the is_banned flag on profiles
    await supabase
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', profile.id);

    console.log(`✅ Successfully banned ${email}`);
    console.log(`   banned_until: ${data.user.banned_until}`);
  }
}

banParent();

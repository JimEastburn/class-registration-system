const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function makeAdmin(email) {
    console.log(`--- Elevating ${email} to Admin ---`);

    // 1. Get User ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) return console.error('List error:', listError);

    const user = users.find(u => u.email === email);
    if (!user) return console.error('User not found');

    console.log('User found:', user.id);

    // 2. Update Auth Metadata
    const { error: metaError } = await supabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: { role: 'admin' } }
    );

    if (metaError) console.error('Auth update failed:', metaError);
    else console.log('Auth metadata updated to admin');

    // 3. Update Profile (for consistency)
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);

    if (profileError) console.error('Profile update failed:', profileError);
    else console.log('Profile updated to admin');
}

makeAdmin('test-b@a.com');

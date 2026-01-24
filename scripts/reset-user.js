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

async function resetUser() {
    console.log('--- Resetting User to Parent ---');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === 'test-a@b.com');

    if (!user) return console.error('User not found');

    // Update Auth Metadata
    await supabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: { role: 'parent' } }
    );
    console.log('Auth Metadata reset to parent');

    // Update Profile
    const { error } = await supabase
        .from('profiles')
        .update({ role: 'parent' })
        .eq('id', user.id);

    if (error) console.error('Profile update error:', error);
    else console.log('Profile reset to parent');
}

resetUser();

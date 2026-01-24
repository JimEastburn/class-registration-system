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

async function tryUpdate() {
    console.log('--- Attempting Update ---');
    // First find the user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) return console.error('List error:', listError);

    const user = users.find(u => u.email === 'test-a@b.com');
    if (!user) return console.error('User not found');

    console.log('User ID:', user.id);
    console.log('Current Role:', user.user_metadata?.role);

    // Try update
    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: { role: 'admin' } }
    );

    if (error) {
        console.error('Update FAILED:', error);
    } else {
        console.log('Update SUCCESS:', data.user.user_metadata);
    }
}

tryUpdate();

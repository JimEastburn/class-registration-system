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

console.log('--- Environment Check ---');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'Present' : 'Missing');
console.log('Key length:', serviceRoleKey?.length || 0);

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function checkUser(email) {
    console.log(`\n--- Checking User: ${email} ---`);
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const user = users.find(u => u.email === email);

    if (user) {
        console.log('User found:', user.id);
        console.log('Role in Metadata:', user.user_metadata?.role);
    } else {
        console.log('User not found');
    }
}

async function main() {
    await checkUser('test-b@a.com');
}

main();

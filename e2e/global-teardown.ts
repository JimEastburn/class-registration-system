import { createClient } from '@supabase/supabase-js';
import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Global Teardown: Cleans up test-created users
 * Runs once after all tests.
 */

export default async function globalTeardown(config: FullConfig) {
    console.log('\n🧹 Global Teardown: Cleaning up test data...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.warn('⚠️  Missing Supabase env vars, skipping cleanup.');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // Emails to preserve (seed data that should persist)
    const preserveEmails = [
        'john@example.com',
        'alice@example.com',
        'admin@example.com',
        'student@example.com',
    ];

    // Pattern for dynamically created test users
    // Matches: student-123@example.com, test+student123@gmail.com, etc.
    const dynamicTestPatterns = [
        /^student-\d+@/i,
        /^test\+student\d+@/i,
    ];


    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Failed to list users:', error.message);
        return;
    }

    let deletedCount = 0;
    for (const user of users?.users || []) {
        // Skip preserved emails
        if (user.email && preserveEmails.includes(user.email)) continue;

        // Delete if matches any dynamic pattern
        const isDynamic = dynamicTestPatterns.some(pattern => pattern.test(user.email || ''));

        if (user.email && isDynamic) {
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (deleteError) {
                console.error(`  ❌ Failed to delete ${user.email}:`, deleteError.message);
            } else {
                console.log(`  🗑️  Deleted: ${user.email}`);
                deletedCount++;
            }
        }
    }


    if (deletedCount === 0) {
        console.log('  ✨ No dynamic test users to clean up.');
    }

    console.log('🧹 Global Teardown: Complete!\n');
}

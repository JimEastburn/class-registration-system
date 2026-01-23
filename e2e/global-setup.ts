import { createClient } from '@supabase/supabase-js';
import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Global Setup: Seeds test users via Supabase Admin API
 * Runs once before all tests.
 */

export default async function globalSetup(config: FullConfig) {
    console.log('🌱 Global Setup: Seeding test users...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    const testUsers = [
        {
            email: 'john@example.com',
            password: 'password123',
            role: 'parent',
            firstName: 'John',
            lastName: 'Doe',
        },
        {
            email: 'alice@example.com',
            password: 'password123',
            role: 'teacher',
            firstName: 'Alice',
            lastName: 'Smith',
        },
        {
            email: 'admin@example.com',
            password: 'Password123',
            role: 'admin',
            firstName: 'System',
            lastName: 'Admin',
        },
        {
            email: 'student@example.com',
            password: 'Password123',
            role: 'student',
            firstName: 'Test',
            lastName: 'Student',
        },
    ];

    for (const user of testUsers) {
        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const exists = existingUsers?.users?.some((u) => u.email === user.email);

        if (exists) {
            console.log(`  ⏭️  User ${user.email} already exists, skipping...`);
            continue;
        }

        // Create user with Admin API
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
                role: user.role,
                first_name: user.firstName,
                last_name: user.lastName,
            },
        });

        if (error) {
            console.error(`  ❌ Failed to create ${user.email}:`, error.message);
        } else {
            console.log(`  ✅ Created user: ${user.email} (${user.role})`);
        }
    }

    console.log('🌱 Global Setup: Complete!\n');
}

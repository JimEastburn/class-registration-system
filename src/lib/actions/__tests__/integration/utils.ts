import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for integration tests.');
}

// Admin client for setup/teardown
export const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

/**
 * Creates a unique test user with the specified role.
 */
export async function createTestUser(role: 'parent' | 'teacher' | 'student' | 'admin' = 'parent') {
    const email = `test-${role}-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            role,
            first_name: 'Test',
            last_name: role.charAt(0).toUpperCase() + role.slice(1),
        },
    });

    if (authError) throw authError;

    return {
        id: authData.user.id,
        email,
        password,
        role,
    };
}

/**
 * Deletes a test user and all their associated data (via cascade).
 */
export async function deleteTestUser(userId: string) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
        console.error(`Failed to delete test user ${userId}:`, error.message);
    }
}

/**
 * Creates a real Supabase client authenticated as the given user.
 * This client is used to test the actions as if they were running in a session.
 */
export function getAuthenticatedClient(accessToken: string) {
    return createClient<Database>(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}

import { beforeAll, afterAll, vi } from 'vitest';
import { adminClient } from './utils';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

// We need to mock next/headers for cookies() if actions use them
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

/**
 * Global setup for integration tests.
 * This ensures we are connected to a real Supabase project (ideally a branch).
 */
beforeAll(async () => {
    // Verify connection
    const { error } = await adminClient.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('❌ Integration Test Setup Failed: Cannot connect to Supabase.');
        console.error('Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
        console.error('Error:', error.message);
        throw error;
    }
    console.log('✅ Connected to Supabase for integration tests.');
});

afterAll(async () => {
    // Cleanup will be handled by individual tests or a pattern of deleting test users
});

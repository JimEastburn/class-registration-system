
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateUserRole } from '@/lib/actions/admin';

// Define the mock function outside so we can reference it
const updateUserByIdMock = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(() => ({
        auth: {
            admin: {
                updateUserById: updateUserByIdMock
            }
        }
    }))
}));

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: {
                    user: { id: 'admin-id', user_metadata: { role: 'admin' } }
                }
            })
        },
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null })
            }))
        }))
    }))
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}));

describe('updateUserRole', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call admin.auth.updateUserById', async () => {
        await updateUserRole('target-user-id', 'admin');

        expect(updateUserByIdMock).toHaveBeenCalledWith(
            'target-user-id',
            { user_metadata: { role: 'admin' } }
        );
    });
});

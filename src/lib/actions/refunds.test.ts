
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processRefund } from '@/lib/actions/refunds';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { logAuditAction } from '@/lib/actions/audit';
import { sendWaitlistNotification } from '@/lib/email';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: {
        create: vi.fn(),
    }
  },
}));

vi.mock('@/lib/actions/audit', () => ({
    logAuditAction: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
    sendWaitlistNotification: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Refund Actions', () => {
    const mockUser = { id: 'admin-123' };
    
    // Setup persistent builders
    const profilesBuilder = {
        select: vi.fn(),
    };
    const paymentsBuilder = {
        select: vi.fn(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
    };
    const enrollmentsBuilder = {
        select: vi.fn(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(),
    };

    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (createClient as any).mockResolvedValue(mockSupabase);
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        // Reset builders state (important for mockReturnValueOnce)
        profilesBuilder.select.mockReset();
        paymentsBuilder.select.mockReset();
        paymentsBuilder.update.mockReset(); 
        paymentsBuilder.update.mockReturnThis();
        enrollmentsBuilder.select.mockReset();
        enrollmentsBuilder.update.mockReset();
        enrollmentsBuilder.update.mockReturnThis();
        
        // Default Stubs
        (stripe.refunds.create as any).mockResolvedValue({ id: 're_123' });
    });

    it('processes refund successfully', async () => {
        // 1. Admin check
        profilesBuilder.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
            })
        });

        // 2. Fetch Payment
        paymentsBuilder.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ 
                    data: { 
                        id: 'pay-1', 
                        transaction_id: 'pi_123', 
                        amount: 1000, 
                        status: 'completed',
                        enrollment_id: 'enr-1'
                    }, 
                    error: null 
                })
            })
        });

        // 3. Update Payment
        // update().eq() calls. update returns this. eq returns this? No, eq returns a promise-like?
        // In Supabase, update().eq() returns a Promise. 
        // My builder: update returns this. eq returns this?
        // Wait, chain: update({...}).eq('id', ...).
        // My builder definition: update returns this (builder). eq returns this (builder).
        // But the code awaits it. So `builder` must be thenable or we mock resolved value on last call.
        // Or simpler: make `eq` return `{ error: null }`.
        
        // Let's refine builders for mutation chains.
        const mutationChain = {
             eq: vi.fn().mockResolvedValue({ error: null })
        };
        paymentsBuilder.update.mockReturnValue(mutationChain);
        enrollmentsBuilder.update.mockReturnValue(mutationChain); // For enrollment status update & promotion

        // 4. Fetch Enrollment class_id
        enrollmentsBuilder.select.mockReturnValueOnce({
             eq: vi.fn().mockReturnValue({
                 single: vi.fn().mockResolvedValue({ data: { class_id: 'class-1' }, error: null })
             })
        });

        // 5. Update Enrollment (cancelled) -> handled by mutationChain

        // 6. Fetch Next Waitlisted
        enrollmentsBuilder.select.mockReturnValueOnce({
             eq: vi.fn().mockReturnValue({
                 eq: vi.fn().mockReturnValue({
                     order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({ 
                                data: { 
                                    id: 'enr-wait-1', 
                                    class: { name: 'Math' },
                                    student: { parent_id: 'parent-2', first_name: 'Next', last_name: 'Student' }
                                }, 
                                error: null 
                            })
                        })
                     })
                 })
             })
        });

        // 7. Update Waitlisted to Pending -> mutationChain
        
        // 8. Fetch Parent Profile
        profilesBuilder.select.mockReturnValueOnce({
             eq: vi.fn().mockReturnValue({
                 single: vi.fn().mockResolvedValue({ data: { email: 'parent@test.com', first_name: 'P', last_name: 'T' }, error: null })
             })
        });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'profiles') return profilesBuilder;
            if (table === 'payments') return paymentsBuilder;
            if (table === 'enrollments') return enrollmentsBuilder;
            return {};
        });

        const result = await processRefund({ paymentId: 'pay-1' });

        expect(result.success).toBe(true);
        expect(stripe.refunds.create).toHaveBeenCalledWith(expect.objectContaining({
            payment_intent: 'pi_123',
            amount: 1000
        }));
        expect(sendWaitlistNotification).toHaveBeenCalled();
        expect(revalidatePath).toHaveBeenCalledWith('/admin/payments');
    });

    it('fails if non-admin', async () => {
         profilesBuilder.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'parent' }, error: null })
            })
        });
        
        mockSupabase.from.mockReturnValue(profilesBuilder);

        const result = await processRefund({ paymentId: 'pay-1' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain('Not authorized');
        }
    });

    it('fails if payment not found', async () => {
         profilesBuilder.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
            })
        });
        
        paymentsBuilder.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            })
        });

        mockSupabase.from.mockImplementation((table) => {
            if (table === 'profiles') return profilesBuilder;
            if (table === 'payments') return paymentsBuilder;
            return {};
        });

        const result = await processRefund({ paymentId: 'pay-1' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain('Payment not found');
        }
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncPaymentToZoho } from '../zoho';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({
                        data: {
                            id: 'pay_123',
                            amount: 100,
                            transaction_id: 'txn_456',
                            created_at: '2026-01-20T00:00:00Z',
                            paid_at: '2026-01-20T00:00:00Z',
                            enrollment: {
                                id: 'enr_789',
                                student: { first_name: 'Jane', last_name: 'Doe' },
                                class: { name: 'Math 101' },
                                parent: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
                            }
                        },
                        error: null
                    })
                })
            }),
            update: () => ({
                eq: () => Promise.resolve({ error: null })
            })
        })
    })
}));

// Mock global fetch
global.fetch = vi.fn();

describe('syncPaymentToZoho', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Zoho OAuth response
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: 'fake_token' })
        });
    });

    it('should successfully sync a payment to Zoho', async () => {
        // Mock Contact Search (Not found)
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ contacts: [] })
        });

        // Mock Contact Creation
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ code: 0, contact: { contact_id: 'zc_111' } })
        });

        // Mock Invoice Creation
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ code: 0, invoice: { invoice_id: 'zi_222' } })
        });

        // Mock Payment Creation
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ code: 0 })
        });

        const result = await syncPaymentToZoho('pay_123');

        expect(result.success).toBe(true);
        expect(result.invoiceId).toBe('zi_222');
        expect(fetch).toHaveBeenCalledTimes(5); // Token + Search + CreateContact + CreateInvoice + RecordPayment
    });

    it('should handle API failures gracefully', async () => {
        // Mock Contact Search (Failure)
        (fetch as any).mockResolvedValueOnce({
            ok: false,
            statusText: 'Service Unavailable',
            json: () => Promise.resolve({ message: 'Error' })
        });

        const result = await syncPaymentToZoho('pay_123');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});

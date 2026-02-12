import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { POST } from '../route';
import { stripe } from '@/lib/stripe';
import { sendPaymentReceipt } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

// Mock the dependencies
vi.mock('@/lib/stripe', () => ({
    stripe: {
        webhooks: {
            constructEvent: vi.fn(),
        },
    },
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

// Mock Zoho library
vi.mock('@/lib/zoho', () => ({
    syncPaymentToZoho: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/email', () => ({
    sendPaymentReceipt: vi.fn().mockResolvedValue({ success: true }),
    sendEnrollmentConfirmation: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue('mock-signature'),
    }),
}));

describe('Stripe Webhook API Route', () => {
    type FakeRow = Record<string, unknown>;

    class FakeQueryBuilder {
        private filters: Array<(row: FakeRow) => boolean> = [];
        private expectSingle = false;
        private pendingUpdate: FakeRow | null = null;
        private pendingDelete = false;

        constructor(
            private tableName: string,
            private tables: Record<string, FakeRow[]>
        ) {}

        select() {
            return this;
        }

        eq(column: string, value: unknown) {
            this.filters.push((row) => row[column] === value);
            return this;
        }

        update(payload: FakeRow) {
            this.pendingUpdate = payload;
            return this;
        }

        delete() {
            this.pendingDelete = true;
            return this;
        }

        single() {
            this.expectSingle = true;
            return this;
        }

        private execute() {
            const table = this.tables[this.tableName] || [];
            const matches = table.filter((row) => this.filters.every((f) => f(row)));

            if (this.pendingDelete) {
                this.tables[this.tableName] = table.filter((row) => !matches.includes(row));
                return { data: null, error: null };
            }

            if (this.pendingUpdate) {
                const updated = matches.map((row) => Object.assign(row, this.pendingUpdate || {}));
                if (this.expectSingle) {
                    return { data: updated[0] ?? null, error: null };
                }
                return { data: updated, error: null };
            }

            if (this.expectSingle) {
                return { data: matches[0] ?? null, error: null };
            }

            return { data: matches, error: null };
        }

        then<TResult1 = { data: FakeRow[] | FakeRow | null; error: null }>(
            onfulfilled?: ((value: { data: FakeRow[] | FakeRow | null; error: null }) => TResult1 | PromiseLike<TResult1>) | null
        ): Promise<TResult1> {
            return Promise.resolve(this.execute() as { data: FakeRow[] | FakeRow | null; error: null }).then(
                onfulfilled || undefined
            );
        }
    }

    class FakeSupabase {
        constructor(private tables: Record<string, FakeRow[]>) {}

        from(table: string) {
            return new FakeQueryBuilder(table, this.tables);
        }

        getTable(table: string) {
            return this.tables[table] || [];
        }
    }

    let fakeSupabase: FakeSupabase;

    beforeEach(() => {
        vi.clearAllMocks();
        fakeSupabase = new FakeSupabase({
            payments: [],
            enrollments: [],
            profiles: [],
        });
        (createClient as Mock).mockReturnValue(fakeSupabase);
    });

    it('should return 400 if signature is missing', async () => {
        const { headers } = await import('next/headers');
        (headers as Mock).mockResolvedValueOnce({
            get: vi.fn().mockReturnValue(null),
        });

        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: 'payload',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('No signature');
    });

    it('should handle checkout.session.completed and update database', async () => {
        const mockEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_123',
                    metadata: { enrollmentId: 'enroll123' },
                    payment_intent: 'pi_123',
                },
            },
        };

        (stripe.webhooks.constructEvent as Mock).mockReturnValue(mockEvent);
        fakeSupabase = new FakeSupabase({
            payments: [{ id: 'payment123', transaction_id: 'cs_123', status: 'pending' }],
            enrollments: [
                {
                    id: 'enroll123',
                    status: 'pending',
                    student: { first_name: 'Jane', last_name: 'Smith', parent_id: 'parent123' },
                    class: { name: 'Art 101', fee: 150, day: 2, block: 1, location: 'Room A', start_date: '2024-01-10', teacher: null },
                },
            ],
            profiles: [{ id: 'parent123', first_name: 'John', email: 'john@example.com' }],
        });
        (createClient as Mock).mockReturnValue(fakeSupabase);

        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: 'payload',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(fakeSupabase.getTable('payments')[0].status).toBe('completed');
        expect(fakeSupabase.getTable('enrollments')[0].status).toBe('confirmed');
        expect(sendPaymentReceipt).toHaveBeenCalled();
    });

    it('should handle checkout.session.expired and update payment status', async () => {
        const mockEvent = {
            type: 'checkout.session.expired',
            data: {
                object: {
                    id: 'cs_123',
                    metadata: { enrollmentId: 'enroll123' },
                },
            },
        };

        (stripe.webhooks.constructEvent as Mock).mockReturnValue(mockEvent);
        fakeSupabase = new FakeSupabase({
            payments: [{ id: 'pay1', transaction_id: 'cs_123', status: 'pending' }],
            enrollments: [{ id: 'enroll123', status: 'pending' }],
            profiles: [],
        });
        (createClient as Mock).mockReturnValue(fakeSupabase);

        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: 'payload',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(fakeSupabase.getTable('payments')).toHaveLength(0);
        expect(fakeSupabase.getTable('enrollments')[0].status).toBe('pending');
    });
});

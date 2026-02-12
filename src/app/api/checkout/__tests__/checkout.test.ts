import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { POST } from '../route';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
    stripe: {
        checkout: {
            sessions: {
                create: vi.fn(),
            },
        },
    },
    formatAmountForStripe: vi.fn((amount: number) => Math.round(amount)),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

describe('Checkout API Route', () => {
    interface FakeUser {
        id: string;
    }

    type FakeRow = Record<string, unknown>;

    class FakeQueryBuilder {
        private filters: Array<(row: FakeRow) => boolean> = [];
        private shouldSingle = false;

        constructor(private rows: FakeRow[]) {}

        select() {
            return this;
        }

        eq(column: string, value: unknown) {
            this.filters.push((row) => row[column] === value);
            return this;
        }

        single() {
            this.shouldSingle = true;
            return this;
        }

        private execute() {
            let result = [...this.rows];
            for (const filter of this.filters) {
                result = result.filter(filter);
            }

            if (this.shouldSingle) {
                return { data: result[0] ?? null, error: null };
            }

            return { data: result, error: null };
        }

        then<TResult1 = { data: FakeRow[] | null; error: null }>(
            onfulfilled?: ((value: { data: FakeRow[] | null; error: null }) => TResult1 | PromiseLike<TResult1>) | null
        ): Promise<TResult1> {
            return Promise.resolve(this.execute() as { data: FakeRow[] | null; error: null }).then(onfulfilled || undefined);
        }
    }

    class FakeSupabase {
        constructor(
            private user: FakeUser | null,
            private tables: Record<string, FakeRow[]>
        ) {}

        auth = {
            getUser: async () => ({ data: { user: this.user }, error: null }),
        };

        from(table: string) {
            return new FakeQueryBuilder(this.tables[table] || []);
        }
    }

    const adminPayments: FakeRow[] = [];
    let adminInsert: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        adminPayments.length = 0;

        (createClient as Mock).mockResolvedValue(new FakeSupabase(null, {}));

        adminInsert = vi.fn().mockResolvedValue({ error: null });
        (createSupabaseClient as Mock).mockReturnValue({
            from: (table: string) => ({
                insert: async (payload: FakeRow) => {
                    if (table === 'payments') {
                        adminPayments.push(payload);
                    }
                    await adminInsert(payload);
                    return { error: null };
                },
            }),
        });
    });

    it('should return 401 if not authenticated', async () => {
        (createClient as Mock).mockResolvedValue(new FakeSupabase(null, {}));

        const request = new Request('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({ enrollmentId: 'enroll123' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Not authenticated');
    });

    it('should return 400 if enrollmentId is missing', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase({ id: 'parent123' }, {})
        );

        const request = new Request('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Enrollment ID is required');
    });

    it('should return 403 if user does not own the enrollment', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'parent123' },
                {
                    enrollments: [
                        {
                            id: 'enroll123',
                            status: 'pending',
                            student: { parent_id: 'otherParent', first_name: 'Jane', last_name: 'Smith' },
                            class: { id: 'class123', name: 'Art 101', price: 150 },
                        },
                    ],
                }
            )
        );

        const request = new Request('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({ enrollmentId: 'enroll123' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Not authorized');
    });

    it('should create checkout session and payment record', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'parent123' },
                {
                    enrollments: [
                        {
                            id: 'enroll123',
                            status: 'pending',
                            student: { parent_id: 'parent123', first_name: 'Jane', last_name: 'Smith' },
                            class: { id: 'class123', name: 'Art 101', price: 150 },
                        },
                    ],
                }
            )
        );

        (stripe.checkout.sessions.create as Mock).mockResolvedValue({
            id: 'cs_123',
            url: 'http://stripe.com/checkout/cs_123'
        });

        const request = new Request('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({ enrollmentId: 'enroll123' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.sessionId).toBe('cs_123');
        expect(data.url).toBe('http://stripe.com/checkout/cs_123');

        expect(stripe.checkout.sessions.create).toHaveBeenCalled();
        expect(createSupabaseClient).toHaveBeenCalled();
        expect(adminInsert).toHaveBeenCalledOnce();
        expect(adminPayments).toHaveLength(1);
        expect(adminPayments[0].enrollment_id).toBe('enroll123');
    });
});

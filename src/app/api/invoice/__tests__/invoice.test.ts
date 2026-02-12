import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Invoice API Route', () => {
    interface FakeUser {
        id: string;
        user_metadata?: { role?: string };
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

        in(column: string, values: unknown[]) {
            this.filters.push((row) => values.includes(row[column]));
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

    beforeEach(() => {
        vi.clearAllMocks();
        (createClient as Mock).mockResolvedValue(new FakeSupabase(null, {}));
    });

    it('should return 401 if not authenticated', async () => {
        (createClient as Mock).mockResolvedValue(new FakeSupabase(null, {}));

        const request = new Request('http://localhost:3000/api/invoice?id=pay123');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if id is missing', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase({ id: 'parent123' }, {})
        );

        const request = new Request('http://localhost:3000/api/invoice');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Payment ID required');
    });

    it('should return 403 if user not authorized to view invoice', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'parent123', user_metadata: { role: 'parent' } },
                {
                    payments: [
                        {
                            id: 'pay123',
                            enrollment_id: 'enroll123',
                            amount: 100,
                            status: 'completed',
                            created_at: '2024-01-01',
                            enrollment: {
                                student: { first_name: 'Jane', last_name: 'Smith' },
                                class: { name: 'Art 101', fee: 100 },
                                parent: { first_name: 'John', last_name: 'Smith', email: 'john@example.com' },
                            },
                        },
                    ],
                    family_members: [],
                    enrollments: [],
                }
            )
        );

        const request = new Request('http://localhost:3000/api/invoice?id=pay123');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied');
    });

    it('should return HTML invoice for authorized user', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'parent123', user_metadata: { role: 'parent' } },
                {
                    payments: [
                        {
                            id: 'pay123',
                            enrollment_id: 'enroll123',
                            amount: 100,
                            status: 'completed',
                            created_at: '2024-01-01',
                            enrollment: {
                                student: { first_name: 'Jane', last_name: 'Smith' },
                                class: {
                                    name: 'Art 101',
                                    fee: 100,
                                    schedule: 'Mon 10am',
                                    location: 'Studio A',
                                    start_date: '2024-01-01',
                                    end_date: '2024-03-01',
                                },
                                parent: { first_name: 'John', last_name: 'Smith', email: 'john@example.com', phone: '123' },
                            },
                        },
                    ],
                    family_members: [{ id: 'student123', parent_id: 'parent123' }],
                    enrollments: [{ id: 'enroll123', student_id: 'student123' }],
                }
            )
        );

        const request = new Request('http://localhost:3000/api/invoice?id=pay123');

        const response = await GET(request);
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/html');
        expect(html).toContain('Invoice');
        expect(html).toContain('INV-PAY123');
        expect(html).toContain('Art 101');
    });
});

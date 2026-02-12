import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Export API Route', () => {
    interface FakeUser {
        id: string;
    }
    type FakeRow = Record<string, unknown>;

    class FakeQueryBuilder {
        private filters: Array<(row: FakeRow) => boolean> = [];
        private shouldSingle = false;
        private sort: { column: string; ascending: boolean } | null = null;

        constructor(private rows: FakeRow[]) {}

        select() {
            return this;
        }

        eq(column: string, value: unknown) {
            this.filters.push((row) => row[column] === value);
            return this;
        }

        order(column: string, opts?: { ascending?: boolean }) {
            this.sort = { column, ascending: opts?.ascending ?? true };
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
            if (this.sort) {
                const { column, ascending } = this.sort;
                result.sort((a, b) => {
                    if (a[column] === b[column]) return 0;
                    return (a[column] as string) > (b[column] as string)
                        ? ascending ? 1 : -1
                        : ascending ? -1 : 1;
                });
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

    it('should return 401 if not an admin', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'user-parent' },
                { profiles: [{ id: 'user-parent', role: 'parent' }] }
            )
        );

        const request = new Request('http://localhost:3000/api/export?type=users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('should return CSV data for users', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'user-admin' },
                {
                    profiles: [
                        { id: 'user-admin', role: 'admin', created_at: '2024-02-01' },
                        { id: '1', email: 'test@example.com', first_name: 'John', last_name: 'Doe', role: 'parent', created_at: '2024-01-01' },
                    ],
                }
            )
        );

        const request = new Request('http://localhost:3000/api/export?type=users');

        const response = await GET(request);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/csv');
        expect(text).toContain('test@example.com');
        expect(text).toContain('John');
        expect(text).toContain('Doe');
    });

    it('should return CSV data for classes with teacher names', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'user-admin' },
                {
                    profiles: [{ id: 'user-admin', role: 'admin' }],
                    classes: [
                        {
                            id: 'c1',
                            name: 'Art 101',
                            status: 'published',
                            teacher: { first_name: 'Dali', last_name: 'Salvador' },
                            created_at: '2024-01-01',
                        },
                    ],
                }
            )
        );

        const request = new Request('http://localhost:3000/api/export?type=classes');
        const response = await GET(request);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(text).toContain('Art 101');
        expect(text).toContain('Dali Salvador');
    });

    it('should return CSV data for enrollments with names', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'user-admin' },
                {
                    profiles: [{ id: 'user-admin', role: 'admin' }],
                    enrollments: [
                        {
                            id: 'e1',
                            status: 'confirmed',
                            enrolled_at: '2024-01-01',
                            student: { first_name: 'Jane', last_name: 'Doe' },
                            class: { name: 'Art 101', price: 100 },
                        },
                    ],
                }
            )
        );

        const request = new Request('http://localhost:3000/api/export?type=enrollments');
        const response = await GET(request);
        const text = await response.text();

        expect(text).toContain('Jane Doe');
        expect(text).toContain('Art 101');
    });

    it('should identify CSV injection vulnerability in data', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'user-admin' },
                {
                    profiles: [
                        { id: 'user-admin', role: 'admin', created_at: '2024-02-01' },
                        { id: '1', email: '=SUM(1,2)', first_name: '@John', last_name: '+Doe', role: 'parent', created_at: '2024-01-01' },
                    ],
                }
            )
        );

        const request = new Request('http://localhost:3000/api/export?type=users');
        const response = await GET(request);
        const text = await response.text();

        // If the implementation is secure, it should escape the leading characters
        // Standard security practice is to prefix with a single quote '
        // Let's see if it currently does (it probably doesn't based on the code I saw)
        expect(text).toContain('\"\'=SUM(1,2)\"');
        expect(text).toContain('\"\'@John\"');
        expect(text).toContain('\"\'+Doe\"');
    });

    it('should return 400 for invalid export type', async () => {
        (createClient as Mock).mockResolvedValue(
            new FakeSupabase(
                { id: 'user-admin' },
                { profiles: [{ id: 'user-admin', role: 'admin' }] }
            )
        );

        const request = new Request('http://localhost:3000/api/export?type=invalid');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid export type');
    });
});

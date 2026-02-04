
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollStudent } from '@/lib/actions/enrollments';
import { processRefund } from '@/lib/actions/refunds';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

// Mock Dependencies
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/actions/audit', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEnrollmentConfirmation: vi.fn(),
  sendWaitlistNotification: vi.fn(),
}));

// Simple types for mock DB
type MockProfile = { id: string; role: string; email: string; first_name: string; last_name: string };
type MockFamilyMember = { id: string; first_name: string; last_name: string; parent_id?: string; relationship?: 'Student' | 'Parent/Guardian' };
type MockClass = { id: string; name: string; capacity: number; price: number; status: string; teacher_id: string; start_date?: string };
type MockEnrollment = { 
    id: string; 
    student_id: string; 
    class_id: string; 
    status: string; 
    waitlist_position?: number | null;
    updated_at?: string;
    student?: MockFamilyMember; // Joined
    class?: MockClass;
};
type MockPayment = { id: string; amount: number; status: string; enrollment_id: string; transaction_id: string };

describe('Integration Flow: Waitlist -> Promotion', () => {
    const mockAdminId = 'admin-1';
    const mockClassId = 'class-small-101';
    
    // Mutable "Database"
    let dbProfiles: MockProfile[] = [];
    let dbFamilyMembers: MockFamilyMember[] = [];
    let dbClasses: MockClass[] = [];
    let dbEnrollments: MockEnrollment[] = [];
    let dbPayments: MockPayment[] = [];
    let dbClassBlocks: unknown[] = [];

    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup DB
        dbProfiles = [
            { id: mockAdminId, role: 'admin', email: 'admin@test.com', first_name: 'Admin', last_name: 'User' },
            { id: 'parent-1', role: 'parent', email: 'parent1@test.com', first_name: 'P1', last_name: 'U1' },
            { id: 'parent-2', role: 'parent', email: 'parent2@test.com', first_name: 'P2', last_name: 'U2' },
        ];
        
        dbFamilyMembers = [
            { id: 'student-1', first_name: 'S1', last_name: 'U1', parent_id: 'parent-1', relationship: 'Student' },
            { id: 'student-2', first_name: 'S2', last_name: 'U2', parent_id: 'parent-2', relationship: 'Student' },
        ];

        // Class with capacity 1
        dbClasses = [{ 
            id: mockClassId, 
            name: 'Small Class', 
            capacity: 1, 
            price: 5000,
            status: 'published',
            teacher_id: 'teacher-1',
            start_date: '2025-06-01'
        }];
        
        dbEnrollments = [];
        dbPayments = [];
        dbClassBlocks = [];

        (createClient as unknown as { mockResolvedValue: (val: unknown) => void }).mockResolvedValue(mockSupabase);
        (stripe.refunds.create as any).mockResolvedValue({ id: 're_123' });

        // Robust Mock Builder
        mockSupabase.from.mockImplementation((table: string) => {
            const queryState: { 
                filters: Record<string, unknown>, 
                data: unknown, 
                method: string, 
                order: { col: string, opts: { ascending: boolean } } | null 
            } = {
                filters: {},
                data: null,
                method: 'select',
                order: null
            };

            const builder = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockImplementation((newData) => {
                    queryState.method = 'insert';
                    queryState.data = newData;
                    return builder;
                }),
                update: vi.fn().mockImplementation((updates) => {
                    queryState.method = 'update';
                    queryState.data = updates;
                    return builder;
                }),
                eq: vi.fn().mockImplementation((col, val) => {
                    queryState.filters[col] = val;
                    return builder;
                }),
                order: vi.fn().mockImplementation((col, opts) => {
                    queryState.order = { col, opts };
                    return builder;
                }),
                limit: vi.fn().mockReturnThis(), 
                single: vi.fn().mockImplementation(async () => {
                    return executeQuery(table, queryState, 'single');
                }),
                maybeSingle: vi.fn().mockImplementation(async () => {
                    return executeQuery(table, queryState, 'maybeSingle');
                }),
            };

             Object.assign(builder, {
                then: (resolve: (value: unknown) => void) => {
                    resolve(executeQuery(table, queryState, 'all'));
                }
            });

            return builder;
        });
    });

    const executeQuery = (table: string, state: { filters: Record<string, unknown>, data: unknown, method: string, order: { col: string, opts: { ascending: boolean } } | null }, mode: 'single' | 'maybeSingle' | 'all') => {
        let result: any[] = []; // Keep explicit any for flexible generic result handling
        
        // Methods
        if (state.method === 'insert') {
             const dataObj = state.data as Record<string, unknown>;
             if (table === 'enrollments') {
                const newId = `enr-${dbEnrollments.length + 1}`;
                const record = { ...dataObj, id: newId } as MockEnrollment;
                dbEnrollments.push(record);
                return { data: record, error: null };
            }
        }
        
        if (state.method === 'update') {
            const dataObj = state.data as Record<string, unknown>;
            // Determine targets
             const targets = getTableData(table).filter(item => {
                for (const [key, val] of Object.entries(state.filters)) {
                    if ((item as any)[key] !== val) return false;
                }
                return true;
            });
            
            targets.forEach(t => {
                Object.assign(t, dataObj);
            });
            
            return { data: targets, error: null };
        }

        // Select Logic
        result = [...getTableData(table)];

        // Apply Filters
        result = result.filter(item => {
            for (const [key, val] of Object.entries(state.filters)) {
                if ((item as any)[key] !== val) return false;
            }
            return true;
        });
        
        // Apply Sort
        if (state.order) {
            const { col, opts } = state.order;
            result.sort((a, b) => {
                if (a[col] < b[col]) return opts.ascending ? -1 : 1;
                if (a[col] > b[col]) return opts.ascending ? 1 : -1;
                return 0;
            });
        }
        
        // Joins (Simulated)
        if (table === 'enrollments') {
            result = result.map(e => {
                const s = dbFamilyMembers.find(fm => fm.id === e.student_id);
                const c = dbClasses.find(cl => cl.id === e.class_id);
                 return { ...e, student: s, class: c };
            });
        }

        if (mode === 'single') {
            if (result.length === 0) return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
            return { data: result[0], error: null };
        }
        if (mode === 'maybeSingle') {
             if (result.length === 0) return { data: null, error: null };
             return { data: result[0], error: null };
        }

        return { data: result, count: result.length, error: null };
    };
    
    const getTableData = (table: string) => {
        if (table === 'profiles') return dbProfiles;
        if (table === 'family_members') return dbFamilyMembers;
        if (table === 'classes') return dbClasses;
        if (table === 'enrollments') return dbEnrollments;
        if (table === 'payments') return dbPayments;
        if (table === 'class_blocks') return dbClassBlocks as any[];
        return [];
    };

    it('promotes waitlisted student when spot opens via refund', async () => {
        // 1. Enroll Student 1 -> Confirmed
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'parent-1' } }, error: null });
        const enroll1 = await enrollStudent({ classId: mockClassId, familyMemberId: 'student-1' });
        // NOTE: enrollStudent returns 'pending' if unpaid, or 'confirmed' if logic says so.
        // We verified logic returns 'pending' for paid classes.
        expect(enroll1.status).toBe('pending');
        // We need to simulate payment or manually set status to 'confirmed' in DB to simulate fullness.
        
        // Manually confirm Student 1 and add payment
        dbEnrollments[0].status = 'confirmed';
        dbPayments.push({ 
            id: 'pay-1', 
            amount: 5000, 
            status: 'completed', 
            enrollment_id: dbEnrollments[0].id, 
            transaction_id: 'pi_1' 
        });

        // 2. Enroll Student 2 -> Waitlisted
        mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'parent-2' } }, error: null });
        const enroll2 = await enrollStudent({ classId: mockClassId, familyMemberId: 'student-2' });
        expect(enroll2.status).toBe('waitlisted');
        
        // Verify Waitlist State
        const student2EnrollmentId = enroll2.data!.id;
        const student2Enrollment = dbEnrollments.find(e => e.id === student2EnrollmentId);
        expect(student2Enrollment?.waitlist_position).toBe(1);

        // 3. Process Refund for Student 1 (Simulate Cancellation)
        // Login as Admin
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockAdminId } }, error: null });
        
        const refundResult = await processRefund({ paymentId: 'pay-1' });
        expect(refundResult.success).toBe(true);

        // 4. Verify Promotion
        // Student 1 should be cancelled
        expect(dbEnrollments.find(e => e.id === dbEnrollments[0].id)?.status).toBe('cancelled');
        
        // Student 2 should be 'pending' (promoted) and waitlist_position null
        const promotedEnrollment = dbEnrollments.find(e => e.id === student2EnrollmentId);
        expect(promotedEnrollment?.status).toBe('pending');
        expect(promotedEnrollment?.waitlist_position).toBeNull();
    });
});

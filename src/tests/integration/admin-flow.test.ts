
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminForceEnroll, cancelEnrollment } from '@/lib/actions/enrollments';
import { createClient } from '@/lib/supabase/server';

// Mock Dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/actions/audit', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEnrollmentConfirmation: vi.fn(),
  sendCancellationNotification: vi.fn(),
}));

// Mock Data Types
type MockProfile = { id: string; role: string; email: string; first_name: string; last_name: string };
type MockFamilyMember = { id: string; first_name: string; last_name: string; parent_id: string };
type MockClass = { id: string; name: string; capacity: number; status: string; teacher_id: string };
type MockEnrollment = { id: string; student_id: string; class_id: string; status: string; waitlist_position?: number | null; family_member?: MockFamilyMember };

describe('Integration Flow: Admin Enrollment Actions', () => {
    const mockAdminId = 'admin-user';
    const mockParentId = 'parent-user';
    const mockOtherParentId = 'other-parent'; // Malicious user
    const mockStudentId = 'student-1';
    const mockClassId = 'class-1';
    
    // Mutable "Database"
    let dbProfiles: MockProfile[] = [];
    let dbFamilyMembers: MockFamilyMember[] = [];
    let dbClasses: MockClass[] = [];
    let dbEnrollments: MockEnrollment[] = [];

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
            { id: mockParentId, role: 'parent', email: 'parent@test.com', first_name: 'Parent', last_name: 'User' },
            { id: mockOtherParentId, role: 'parent', email: 'hacker@test.com', first_name: 'Bad', last_name: 'Actor' },
        ];
        
        dbFamilyMembers = [
            { id: mockStudentId, first_name: 'Timmy', last_name: 'Tester', parent_id: mockParentId },
        ];

        dbClasses = [{ 
            id: mockClassId, 
            name: 'Math 101', 
            capacity: 0, // Zero capacity to test Force Enroll bypass
            status: 'published',
            teacher_id: 'teacher-1',
        }];
        
        dbEnrollments = [];

        (createClient as unknown as { mockResolvedValue: (val: unknown) => void }).mockResolvedValue(mockSupabase);
        
        // Robust Mock Builder
        mockSupabase.from.mockImplementation((table: string) => {
            const queryState: { filters: Record<string, unknown>, data: unknown, method: string } = {
                filters: {},
                data: null,
                method: 'select'
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
                delete: vi.fn().mockImplementation(() => {
                    queryState.method = 'delete';
                    return builder;
                }),
                eq: vi.fn().mockImplementation((col, val) => {
                    queryState.filters[col] = val;
                    return builder;
                }),
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

    const executeQuery = (table: string, state: { filters: Record<string, unknown>, data: unknown, method: string }, mode: 'single' | 'maybeSingle' | 'all') => {
        let result: any[] = []; // Explicit any for mock result
        const dataObj = state.data as Record<string, unknown>;

        // Write Methods
        if (state.method === 'insert') {
            if (table === 'enrollments') {
                const newId = `enr-${dbEnrollments.length + 1}`;
                const record = { ...dataObj, id: newId } as MockEnrollment;
                dbEnrollments.push(record);
                return { data: record, error: null };
            }
        }
        
        if (state.method === 'update') {
             const targets = getTableData(table).filter(item => {
                for (const [key, val] of Object.entries(state.filters)) {
                    if ((item as any)[key] !== val) return false;
                }
                return true;
            });
            targets.forEach(t => Object.assign(t, dataObj));
            return { data: targets, error: null };
        }
        
        if (state.method === 'delete') {
            // Filter OUT the matches (Delete)
            const remaining = getTableData(table).filter(item => {
                for (const [key, val] of Object.entries(state.filters)) {
                    if ((item as any)[key] === val) return false; // Exclude Matches
                }
                return true;
            });
            
            if (table === 'enrollments') dbEnrollments = remaining as MockEnrollment[];
            
            return { error: null };
        }

        // Read Logic
        result = [...getTableData(table)];

        // Filters
        result = result.filter(item => {
            for (const [key, val] of Object.entries(state.filters)) {
                if ((item as any)[key] !== val) return false;
            }
            return true;
        });
        
        // Joins (Crucial for Admin checks)
        if (table === 'enrollments') {
            result = result.map(e => ({
                ...e,
                family_member: dbFamilyMembers.find(fm => fm.id === e.student_id)
            }));
        }
        if (table === 'family_members') {
             result = result.map(fm => ({
                ...fm,
                parent: dbProfiles.find(p => p.id === fm.parent_id)
            }));
        }
        if (table === 'classes') {
            result = result.map(c => ({
                ...c,
                teacher: { first_name: 'Teacher', last_name: 'One' } // Mock join
            }));
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
        return [];
    };

    it('allows admin to force enroll a student despite capacity', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockAdminId } }, error: null });

        // Capacity is 0 (set in beforeEach)
        const result = await adminForceEnroll({
            classId: mockClassId,
            studentId: mockStudentId
        });

        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
        
        // Verify Confirmed Status
        expect(result.data!.status).toBe('confirmed'); 
        
        // Verify DB
        expect(dbEnrollments).toHaveLength(1);
        expect(dbEnrollments[0].status).toBe('confirmed');
    });

    it('allows admin to cancel a confirmed enrollment', async () => {
        // Setup: Existing Confirmed Enrollment
        dbEnrollments.push({ 
            id: 'enr-confirmed', 
            student_id: mockStudentId, 
            class_id: mockClassId, 
            status: 'confirmed',
            family_member: dbFamilyMembers.find(f => f.id === mockStudentId)
        });

        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockAdminId } }, error: null });

        const result = await cancelEnrollment('enr-confirmed');
        
        expect(result.success).toBe(true);
        expect(dbEnrollments).toHaveLength(0); // Deleted
    });

    it('prevents non-admin (even owner) from cancelling a CONFIRMED enrollment', async () => {
         // Setup: Existing Confirmed Enrollment
        dbEnrollments.push({ 
            id: 'enr-confirmed', 
            student_id: mockStudentId, 
            class_id: mockClassId, 
            status: 'confirmed' 
        });

        // Act as Parent (Owner)
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockParentId } }, error: null });

        const result = await cancelEnrollment('enr-confirmed');
        
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Cannot cancel a confirmed enrollment/);
        expect(dbEnrollments).toHaveLength(1); // Not deleted
    });
    
    it('prevents parent from cancelling SOMEONE ELSE\'s enrollment', async () => {
        // Setup: Enrollment owned by mockParentId
         dbEnrollments.push({ 
            id: 'enr-target', 
            student_id: mockStudentId, 
            class_id: mockClassId, 
            status: 'pending' 
        });

        // Act as Other Parent (Attacker)
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockOtherParentId } }, error: null });

        const result = await cancelEnrollment('enr-target');
        
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Access denied/);
        expect(dbEnrollments).toHaveLength(1);
    });
});

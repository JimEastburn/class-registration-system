
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFamilyMember } from '@/lib/actions/family';
import { enrollStudent } from '@/lib/actions/enrollments';
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

// Mock Email (referenced in enrollments)
vi.mock('@/lib/email', () => ({
  sendEnrollmentConfirmation: vi.fn(),
  sendWaitlistNotification: vi.fn(),
}));

// Simple types for mock DB
type MockProfile = { id: string; role: string; email: string; first_name: string; last_name: string };
type MockFamilyMember = { id: string; first_name: string; last_name: string; parent_id?: string; relationship?: 'Student' | 'Parent/Guardian' };
type MockClass = { id: string; name: string; capacity: number; price: number; status: string; teacher_id: string };
type MockEnrollment = { id: string; student_id: string; class_id: string; status: string };

describe('Integration Flow: Family Creation -> Enrollment', () => {
    const mockUserId = 'parent-123';
    const mockClassId = 'class-math-101';
    
    // Mutable "Database"
    let dbProfiles: MockProfile[] = [];
    let dbFamilyMembers: MockFamilyMember[] = [];
    let dbClasses: MockClass[] = [];
    let dbEnrollments: MockEnrollment[] = [];
    let dbClassBlocks: unknown[] = [];

    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset "DB"
        dbProfiles = [{ id: mockUserId, role: 'parent', email: 'parent@test.com', first_name: 'Parent', last_name: 'User' }];
        dbFamilyMembers = [];
        dbClasses = [{ 
            id: mockClassId, 
            name: 'Math 101', 
            capacity: 20, 
            price: 10000,
            status: 'published',
            teacher_id: 'teacher-1'
        }];
        dbEnrollments = [];
        dbClassBlocks = [];

        (createClient as unknown as { mockResolvedValue: (val: unknown) => void }).mockResolvedValue(mockSupabase);
        
        // Mock Auth
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });

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
                update: vi.fn().mockReturnThis(), 
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
            
            // To make the builder awaitable:
            Object.assign(builder, {
                then: (resolve: (value: unknown) => void) => {
                    resolve(executeQuery(table, queryState, 'all'));
                }
            });

            return builder;
        });
    });

    const executeQuery = (table: string, state: { filters: Record<string, unknown>, data: unknown, method: string }, mode: 'single' | 'maybeSingle' | 'all') => {
        let result: any[] = []; // Keep explicit any for flexible generic result handling in mock
        
        if (state.method === 'insert') {
            const dataObj = state.data as Record<string, unknown>;
            if (table === 'family_members') {
                const newId = `student-${dbFamilyMembers.length + 1}`;
                const record = { ...dataObj, id: newId } as MockFamilyMember;
                dbFamilyMembers.push(record);
                return { data: record, error: null };
            }
            if (table === 'enrollments') {
                const newId = `enr-${dbEnrollments.length + 1}`;
                const record = { ...dataObj, id: newId } as MockEnrollment;
                dbEnrollments.push(record);
                return { data: record, error: null };
            }
        }

        // Select Logic
        if (table === 'profiles') result = dbProfiles;
        if (table === 'family_members') result = dbFamilyMembers;
        if (table === 'classes') result = dbClasses;
        if (table === 'enrollments') result = dbEnrollments;
        if (table === 'class_blocks') result = dbClassBlocks as any[];

        // Apply Filters
        result = result.filter(item => {
            for (const [key, val] of Object.entries(state.filters)) {
                if ((item as any)[key] !== val) return false;
            }
            return true;
        });

        if (mode === 'single') {
            if (result.length === 0) return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
            return { data: result[0], error: null };
        }
        
        if (mode === 'maybeSingle') {
             if (result.length === 0) return { data: null, error: null };
             return { data: result[0], error: null };
        }

        // Mode 'all' (Array or Count)
        return { data: result, count: result.length, error: null };
    };

    it('successfully creates a student and enrolls them in a class', async () => {
        // Step 1: Create Family Member
        const studentData = {
            firstName: 'Timmy',
            lastName: 'Tester',
            relationship: 'Student',
            dob: '2015-01-01',
            grade: '5th'
        };

        const createResult = await createFamilyMember(studentData);
        expect(createResult.error).toBeNull();
        expect(createResult.data).toBeDefined();
        const newStudentId = createResult.data!.id;

        // Verify "Database" State
        expect(dbFamilyMembers).toHaveLength(1);
        expect(dbFamilyMembers[0].first_name).toBe('Timmy');

        // Step 2: Enroll Student
        const enrollResult = await enrollStudent({
            classId: mockClassId,
            familyMemberId: newStudentId
        });
        
        expect(enrollResult.error).toBeNull();
        expect(enrollResult.status).toBe('pending');
        expect(enrollResult.data).toBeDefined();
        
        // Verify Enrollment in "Database"
        expect(dbEnrollments).toHaveLength(1);
        expect(dbEnrollments[0].student_id).toBe(newStudentId);
        expect(dbEnrollments[0].class_id).toBe(mockClassId);
    });

    it('prevents enrollment if student creation failed (simulated invalid input)', async () => {
         // Flow where we start with an invalid student ID that wasn't created
        const enrollResult = await enrollStudent({
            classId: mockClassId,
            familyMemberId: 'invalid-id'
        });
        
        expect(enrollResult.error).toBeTruthy(); // "Family member not found"
    });
});

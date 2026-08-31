import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import {
  ADMIN_PROFILE,
  PARENT_PROFILE,
  SCHEDULER_PROFILE,
  TEACHER_PROFILE,
  seedFake,
} from '@/__integration__/fakes/fixtures';
import { logAuditAction } from '@/lib/actions/audit';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/actions/audit', () => ({
  logAuditAction: vi.fn(),
}));

const profiles = [
  { ...ADMIN_PROFILE, phone: '512-555-0100', created_at: '2026-01-01' },
  { ...SCHEDULER_PROFILE, created_at: '2026-01-02' },
  { ...TEACHER_PROFILE, created_at: '2026-01-03' },
  {
    ...PARENT_PROFILE,
    phone: '512-555-0199',
    created_at: '2026-01-04',
    is_parent: true,
    is_banned: false,
  },
  {
    id: 'banned-123',
    first_name: 'Archived',
    last_name: 'Person',
    email: 'archived@test.com',
    role: 'parent',
    created_at: '2026-01-05',
    is_banned: true,
  },
] as unknown as Record<string, unknown>[];

const classes = [
  {
    id: 'class-art',
    name: 'Art 101',
    teacher_id: TEACHER_PROFILE.id,
    status: 'published',
    price: 125,
    capacity: 2,
    day: 'Tuesday',
    block: 'Block 1',
    location: 'Room A',
    start_date: '2026-09-01',
    end_date: '2026-12-01',
    created_at: '2026-01-01',
  },
  {
    id: 'class-music',
    name: 'Music Lab',
    teacher_id: TEACHER_PROFILE.id,
    status: 'draft',
    price: 80,
    capacity: 3,
    day: 'Wednesday',
    block: 'Block 2',
    location: 'Room B',
    created_at: '2026-01-02',
  },
] as unknown as Record<string, unknown>[];

const familyMembers = [
  {
    id: 'student-jane',
    parent_id: PARENT_PROFILE.id,
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@test.com',
    relationship: 'Student',
    grade: '7',
    age: 12,
  },
  {
    id: 'student-john',
    parent_id: PARENT_PROFILE.id,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@test.com',
    relationship: 'Student',
    grade: '5',
    age: 10,
  },
] as unknown as Record<string, unknown>[];

const enrollments = [
  {
    id: 'enrollment-confirmed',
    student_id: 'student-jane',
    class_id: 'class-art',
    status: 'confirmed',
    waitlist_position: null,
    deposit_paid: true,
    created_at: '2026-08-01T15:00:00.000Z',
    updated_at: '2026-08-03T15:00:00.000Z',
  },
  {
    id: 'enrollment-waitlisted',
    student_id: 'student-john',
    class_id: 'class-music',
    status: 'waitlisted',
    waitlist_position: 1,
    deposit_paid: false,
    created_at: '2026-08-02T15:00:00.000Z',
    updated_at: '2026-08-02T15:00:00.000Z',
  },
] as unknown as Record<string, unknown>[];

function seed(role: 'admin' | 'class_scheduler' | 'parent' | null) {
  const authUserId =
    role === 'admin'
      ? ADMIN_PROFILE.id
      : role === 'class_scheduler'
        ? SCHEDULER_PROFILE.id
        : role === 'parent'
          ? PARENT_PROFILE.id
          : null;

  return seedFake({
    authUserId,
    data: {
      profiles,
      classes,
      family_members: familyMembers,
      enrollments,
      audit_logs: [],
    },
  });
}

describe('Export API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated and 403 when the role is not allowed', async () => {
    seed(null);
    const unauthenticated = await GET(
      new Request('http://localhost/api/export?type=users')
    );
    expect(unauthenticated.status).toBe(401);

    seed('parent');
    const forbidden = await GET(
      new Request('http://localhost/api/export?type=classes')
    );
    expect(forbidden.status).toBe(403);
  });

  it('allows schedulers to export classes and enrollments but not users', async () => {
    seed('class_scheduler');

    const classesResponse = await GET(
      new Request('http://localhost/api/export?type=classes')
    );
    const enrollmentsResponse = await GET(
      new Request('http://localhost/api/export?type=enrollments')
    );
    const usersResponse = await GET(
      new Request('http://localhost/api/export?type=users')
    );

    expect(classesResponse.status).toBe(200);
    expect(enrollmentsResponse.status).toBe(200);
    expect(usersResponse.status).toBe(403);
  });

  it('exports matching users, excludes banned profiles, and sets download headers', async () => {
    seed('admin');

    const response = await GET(
      new Request(
        'http://localhost/api/export?type=users&scope=matching&search=Parent'
      )
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/csv; charset=utf-8'
    );
    expect(response.headers.get('content-disposition')).toContain(
      'users_matching_'
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(csv).toContain('parent@test.com');
    expect(csv).not.toContain('archived@test.com');
  });

  it('includes banned profiles in the explicit all-users export', async () => {
    seed('admin');

    const response = await GET(
      new Request('http://localhost/api/export?type=users&scope=all')
    );
    const csv = await response.text();

    expect(csv).toContain('archived@test.com');
    expect(csv).toContain('"Banned"');
  });

  it('paginates until an export contains every row beyond one batch', async () => {
    const manyProfiles = [
      { ...ADMIN_PROFILE, created_at: '2026-01-01', is_banned: false },
      ...Array.from({ length: 500 }, (_, index) => ({
        id: `parent-${index}`,
        first_name: 'Parent',
        last_name: String(index),
        email: `parent-${index}@test.com`,
        role: 'parent',
        created_at: '2026-01-01',
        is_banned: false,
      })),
    ] as unknown as Record<string, unknown>[];
    const fake = seedFake({
      authUserId: ADMIN_PROFILE.id,
      data: { profiles: manyProfiles, audit_logs: [] },
    });
    const originalFrom = fake.from.bind(fake);
    const ranges: [number, number][] = [];
    vi.spyOn(fake, 'from').mockImplementation((table) => {
      const query = originalFrom(table);
      if (table === 'profiles') {
        const originalRange = query.range.bind(query);
        vi.spyOn(query, 'range').mockImplementation((from, to) => {
          ranges.push([from, to]);
          return originalRange(from, to);
        });
      }
      return query;
    });

    const response = await GET(
      new Request('http://localhost/api/export?type=users&scope=all')
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv.trimEnd().split('\r\n')).toHaveLength(502);
    expect(ranges).toEqual([
      [0, 499],
      [500, 999],
    ]);
  });

  it('exports all rows when scope=all, ignoring active enrollment filters', async () => {
    seed('admin');

    const matching = await GET(
      new Request(
        'http://localhost/api/export?type=enrollments&scope=matching&status=confirmed'
      )
    );
    const all = await GET(
      new Request(
        'http://localhost/api/export?type=enrollments&scope=all&status=confirmed'
      )
    );

    const matchingCsv = await matching.text();
    const allCsv = await all.text();

    expect(matchingCsv).toContain('Jane Doe');
    expect(matchingCsv).not.toContain('John Doe');
    expect(allCsv).toContain('Jane Doe');
    expect(allCsv).toContain('John Doe');
  });

  it('uses the full operational enrollment columns for admins', async () => {
    seed('admin');

    const response = await GET(
      new Request('http://localhost/api/export?type=enrollments')
    );
    const csv = await response.text();
    const header = csv.split('\r\n')[0];

    expect(header).toContain('Enrollment ID');
    expect(header).toContain('Student Email');
    expect(header).toContain('Parent Phone');
    expect(header).toContain('Deposit Paid');
    expect(header).toContain('Class Fee');
    expect(header).toContain('Status Activity Date');
  });

  it('filters matching enrollment exports by status activity date', async () => {
    seed('admin');

    const response = await GET(
      new Request(
        'http://localhost/api/export?type=enrollments&scope=matching&startDate=2026-08-03&endDate=2026-08-03'
      )
    );
    const csv = await response.text();

    expect(csv).toContain('Jane Doe');
    expect(csv).not.toContain('John Doe');
  });

  it('uses a reduced enrollment roster for class schedulers', async () => {
    seed('class_scheduler');

    const response = await GET(
      new Request('http://localhost/api/export?type=enrollments')
    );
    const csv = await response.text();
    const header = csv.split('\r\n')[0];

    expect(header).toContain('Student');
    expect(header).toContain('Parent Email');
    expect(header).not.toContain('Enrollment ID');
    expect(header).not.toContain('Student Email');
    expect(header).not.toContain('Deposit Paid');
    expect(header).not.toContain('Class Fee');
  });

  it('uses confirmed plus pending as seats held in class exports', async () => {
    seed('class_scheduler');

    const response = await GET(
      new Request('http://localhost/api/export?type=classes')
    );
    const csv = await response.text();

    expect(csv).toContain('"Confirmed","Pending","Seats Held","Waitlisted"');
    expect(csv).toContain('"Art 101"');
  });

  it('rejects invalid types, scopes, statuses, and date ranges', async () => {
    seed('admin');

    for (const query of [
      'type=payments',
      'type=users&scope=page',
      'type=enrollments&status=unknown',
      'type=enrollments&startDate=2026-08-10&endDate=2026-08-01',
    ]) {
      const response = await GET(
        new Request(`http://localhost/api/export?${query}`)
      );
      expect(response.status).toBe(400);
    }
  });

  it('audits successful exports with their scope and row count', async () => {
    seed('admin');

    await GET(
      new Request(
        'http://localhost/api/export?type=enrollments&scope=matching&status=confirmed'
      )
    );

    expect(logAuditAction).toHaveBeenCalledWith(
      ADMIN_PROFILE.id,
      'data_exported',
      'export',
      'enrollments',
      expect.objectContaining({
        exportType: 'enrollments',
        scope: 'matching',
        rowCount: 1,
        filters: expect.objectContaining({ status: 'confirmed' }),
      })
    );
  });
});

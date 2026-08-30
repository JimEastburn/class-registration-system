import type { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import type { Class, EnrollmentStatus, UserRole } from '@/types';
import { encodeCsv } from '@/lib/exports/csv';
import { resolveAdminEnrollmentDateRange } from '@/lib/admin-enrollment-filters';
import {
  formatClassBlock,
  resolveClassSort,
  sortClasses,
  type ClassSort,
} from '@/lib/class-table';
import {
  EMPTY_COUNTS,
  getEnrollmentCountsByClass,
  type EnrollmentCounts,
} from '@/lib/enrollment-counts';

export const EXPORT_TYPES = ['users', 'classes', 'enrollments'] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];
export type ExportScope = 'matching' | 'all';

export interface ExportRequest {
  type: ExportType;
  scope: ExportScope;
  search?: string;
  status?: EnrollmentStatus;
  classId?: string;
  startDate?: string;
  endDate?: string;
  roster?: 'active';
  sort?: ClassSort;
}

export interface CsvExport {
  csv: string;
  filename: string;
  rowCount: number;
  filters: Record<string, string>;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type QueryError = { message: string } | null;
type QueryResult<T> = { data: T[] | null; error: QueryError };
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];
type EnrollmentRow = Database['public']['Tables']['enrollments']['Row'];
type FamilyMemberRow = Database['public']['Tables']['family_members']['Row'];

type ClassExportRow = Class & {
  teacher: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

type EnrollmentExportRow = EnrollmentRow & {
  class: Pick<ClassRow, 'id' | 'name' | 'price'> | null;
  student:
    | (Pick<
        FamilyMemberRow,
        'first_name' | 'last_name' | 'email' | 'grade' | 'age'
      > & {
        parent: Pick<
          ProfileRow,
          'first_name' | 'last_name' | 'email' | 'phone'
        > | null;
      })
    | null;
};

const EXPORT_BATCH_SIZE = 500;
const SAFE_SEARCH = /^[\p{L}\p{N}\s@.+\-']+$/u;
const ENROLLMENT_STATUSES: EnrollmentStatus[] = [
  'confirmed',
  'pending',
  'waitlisted',
  'cancelled',
];

export class ExportRequestError extends Error {}

function readOptionalSearch(params: URLSearchParams): string | undefined {
  const search = params.get('search')?.trim();
  if (!search) return undefined;
  if (search.length > 100 || !SAFE_SEARCH.test(search)) {
    throw new ExportRequestError('Invalid search value');
  }
  return search;
}

export function parseExportRequest(params: URLSearchParams): ExportRequest {
  const type = params.get('type');
  if (!EXPORT_TYPES.includes(type as ExportType)) {
    throw new ExportRequestError('Invalid export type');
  }

  const scope = params.get('scope') ?? 'matching';
  if (scope !== 'matching' && scope !== 'all') {
    throw new ExportRequestError('Invalid export scope');
  }

  const status = params.get('status') || undefined;
  if (status && !ENROLLMENT_STATUSES.includes(status as EnrollmentStatus)) {
    throw new ExportRequestError('Invalid enrollment status');
  }

  const startDate = params.get('startDate') || undefined;
  const endDate = params.get('endDate') || undefined;
  const dateRange = resolveAdminEnrollmentDateRange({ startDate, endDate });
  if (dateRange.filterError) {
    throw new ExportRequestError(dateRange.filterError);
  }

  const rawSort = params.get('sort') || undefined;
  const rawDirection = params.get('dir') || undefined;
  const sort = resolveClassSort(rawSort, rawDirection);
  if (rawSort && !sort) {
    throw new ExportRequestError('Invalid class sort');
  }
  if (rawDirection && rawDirection !== 'asc' && rawDirection !== 'desc') {
    throw new ExportRequestError('Invalid sort direction');
  }

  const classId = params.get('classId')?.trim() || undefined;
  if (classId && classId.length > 100) {
    throw new ExportRequestError('Invalid class');
  }

  const roster = params.get('roster') || undefined;
  if (roster && roster !== 'active') {
    throw new ExportRequestError('Invalid roster filter');
  }

  return {
    type: type as ExportType,
    scope,
    search: readOptionalSearch(params),
    status: status as EnrollmentStatus | undefined,
    classId,
    startDate,
    endDate,
    roster: roster as 'active' | undefined,
    sort,
  };
}

export function canExport(role: UserRole, type: ExportType): boolean {
  if (type === 'users') {
    return role === 'admin' || role === 'super_admin';
  }

  return (
    role === 'admin' || role === 'super_admin' || role === 'class_scheduler'
  );
}

async function collectBatches<T>(
  load: (from: number, to: number) => Promise<QueryResult<T>>
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += EXPORT_BATCH_SIZE) {
    const { data, error } = await load(from, from + EXPORT_BATCH_SIZE - 1);
    if (error) throw new Error(error.message);

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < EXPORT_BATCH_SIZE) break;
  }

  return rows;
}

function filtersForAudit(request: ExportRequest): Record<string, string> {
  if (request.scope === 'all') return {};

  return Object.fromEntries(
    [
      ['search', request.search],
      ['status', request.status],
      ['classId', request.classId],
      ['startDate', request.startDate],
      ['endDate', request.endDate],
      ['roster', request.roster],
      ['sort', request.sort?.key],
      ['dir', request.sort?.direction],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function yesNo(value: boolean | null | undefined): string {
  return value ? 'Yes' : 'No';
}

function fullName(
  person:
    | { first_name: string | null; last_name: string | null }
    | null
    | undefined
): string {
  if (!person) return '';
  return [person.first_name, person.last_name].filter(Boolean).join(' ').trim();
}

function filename(type: ExportType, scope: ExportScope): string {
  return `${type}_${scope}_${new Date().toISOString().slice(0, 10)}.csv`;
}

async function exportUsers(
  supabase: SupabaseClient,
  request: ExportRequest
): Promise<CsvExport> {
  const rows = await collectBatches<ProfileRow>(async (from, to) => {
    let query = supabase
      .from('profiles')
      .select(
        'id, email, first_name, last_name, phone, role, is_parent, is_volunteer_admin, is_photo_consent_admin, is_banned, created_at'
      );

    // Matching means "what this page can show"; the user table deliberately
    // excludes banned profiles. The explicit all-users export includes them so
    // the Banned column is useful and no account silently disappears.
    if (request.scope === 'matching') {
      query = query.neq('is_banned', true);
    }

    if (request.scope === 'matching' && request.search) {
      const term = request.search;
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`
      );
    }

    return (await query
      .order('created_at', { ascending: false })
      .range(from, to)) as unknown as QueryResult<ProfileRow>;
  });

  const headers = [
    'User ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Role',
    'Parent',
    'Volunteer Admin',
    'Photo Consent Admin',
    'Banned',
    'Joined Date',
  ];
  const values = rows.map((profile) => [
    profile.id,
    profile.first_name,
    profile.last_name,
    profile.email,
    profile.phone,
    profile.role,
    yesNo(profile.is_parent),
    yesNo(profile.is_volunteer_admin),
    yesNo(profile.is_photo_consent_admin),
    yesNo(profile.is_banned),
    formatDate(profile.created_at),
  ]);

  return {
    csv: encodeCsv(headers, values),
    filename: filename('users', request.scope),
    rowCount: rows.length,
    filters: filtersForAudit(request),
  };
}

async function getClassSearchIds(
  adminClient: SupabaseClient,
  search: string
): Promise<string[]> {
  const term = search.replace(/[%_]/g, '');
  if (!term) return [];

  const { data, error } = await adminClient.rpc('search_class_ids', {
    search_term: term,
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => row.id);
}

async function getClassCounts(
  supabase: SupabaseClient,
  classIds: string[]
): Promise<Map<string, EnrollmentCounts>> {
  const counts = new Map<string, EnrollmentCounts>();

  for (let from = 0; from < classIds.length; from += EXPORT_BATCH_SIZE) {
    const batchCounts = await getEnrollmentCountsByClass(
      supabase,
      classIds.slice(from, from + EXPORT_BATCH_SIZE)
    );
    for (const [classId, value] of batchCounts) counts.set(classId, value);
  }

  return counts;
}

function scheduleLabel(cls: ClassExportRow): string {
  const schedule = cls.schedule_config as {
    day?: string;
    block?: string;
  } | null;
  const day = cls.day || schedule?.day || 'To Be Announced';
  const block = formatClassBlock({
    block: cls.block,
    schedule_config: schedule
      ? {
          day: schedule.day || '',
          block: schedule.block || '',
          recurring: true,
        }
      : null,
    schedule_display_mode:
      cls.schedule_display_mode === 'asynchronous'
        ? 'asynchronous'
        : 'day_block',
  });

  return block === 'Asynchronous'
    ? block
    : `${day} — ${block || 'To Be Announced'}`;
}

async function exportClasses(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  request: ExportRequest
): Promise<CsvExport> {
  let matchingIds: string[] | undefined;
  if (request.scope === 'matching' && request.search) {
    matchingIds = await getClassSearchIds(adminClient, request.search);
    if (matchingIds.length === 0) {
      const headers = classHeaders();
      return {
        csv: encodeCsv(headers, []),
        filename: filename('classes', request.scope),
        rowCount: 0,
        filters: filtersForAudit(request),
      };
    }
  }

  const classes = await collectBatches<ClassExportRow>(async (from, to) => {
    let query = supabase.from('classes').select(`
      id, name, status, teacher_id, location, price, capacity,
      day, block, schedule_config, schedule_display_mode,
      start_date, end_date, age_min, age_max, created_at,
      teacher:profiles!teacher_id(id, first_name, last_name, email)
    `);

    if (matchingIds) query = query.in('id', matchingIds);

    return (await query
      .order('created_at', { ascending: false })
      .range(from, to)) as unknown as QueryResult<ClassExportRow>;
  });

  const counts = await getClassCounts(
    supabase,
    classes.map((cls) => cls.id)
  );
  const withCounts = classes.map((cls) => ({
    ...cls,
    ...(counts.get(cls.id) ?? EMPTY_COUNTS),
  }));
  const ordered = request.sort
    ? sortClasses(withCounts, request.sort)
    : withCounts;

  const values = ordered.map((cls) => {
    const count = counts.get(cls.id) ?? EMPTY_COUNTS;
    return [
      cls.id,
      cls.name,
      fullName(cls.teacher),
      cls.status,
      scheduleLabel(cls),
      cls.location,
      cls.price.toFixed(2),
      cls.capacity,
      count.confirmed_count,
      count.pending_count,
      count.enrolled_count,
      count.waitlisted_count,
      cls.age_min,
      cls.age_max,
      formatDate(cls.start_date),
      formatDate(cls.end_date),
    ];
  });

  return {
    csv: encodeCsv(classHeaders(), values),
    filename: filename('classes', request.scope),
    rowCount: ordered.length,
    filters: filtersForAudit(request),
  };
}

function classHeaders(): string[] {
  return [
    'Class ID',
    'Class Name',
    'Teacher',
    'Status',
    'Schedule',
    'Location',
    'Fee',
    'Capacity',
    'Confirmed',
    'Pending',
    'Seats Held',
    'Waitlisted',
    'Minimum Age',
    'Maximum Age',
    'Start Date',
    'End Date',
  ];
}

async function exportEnrollments(
  supabase: SupabaseClient,
  role: UserRole,
  request: ExportRequest
): Promise<CsvExport> {
  const dateRange =
    request.scope === 'matching'
      ? resolveAdminEnrollmentDateRange(request)
      : { filterError: null };

  const enrollments = await collectBatches<EnrollmentExportRow>(
    async (from, to) => {
      let query = supabase.from('enrollments').select(`
        id, status, waitlist_position, deposit_paid, created_at,
        class:classes(id, name, price),
        student:family_members!inner(
          first_name, last_name, email, grade, age,
          parent:profiles!family_members_parent_id_fkey(
            first_name, last_name, email, phone
          )
        )
      `);

      if (request.scope === 'matching') {
        if (request.classId) query = query.eq('class_id', request.classId);
        if (request.status) query = query.eq('status', request.status);
        if (request.roster === 'active') {
          query = query.in('status', ['confirmed', 'pending', 'waitlisted']);
        }
        if (dateRange.startAt) {
          query = query.gte('created_at', dateRange.startAt);
        }
        if (dateRange.endBefore) {
          query = query.lt('created_at', dateRange.endBefore);
        }
        if (request.search) {
          query = query.or(
            `first_name.ilike.%${request.search}%,last_name.ilike.%${request.search}%`,
            { foreignTable: 'student' }
          );
        }
      }

      return (await query
        .order('created_at', { ascending: false })
        .range(from, to)) as unknown as QueryResult<EnrollmentExportRow>;
    }
  );

  const scheduler = role === 'class_scheduler';
  const headers = scheduler
    ? [
        'Student',
        'Grade',
        'Age',
        'Class',
        'Parent',
        'Parent Email',
        'Parent Phone',
        'Status',
        'Waitlist Position',
        'Enrollment Date',
      ]
    : [
        'Enrollment ID',
        'Student',
        'Student Email',
        'Grade',
        'Age',
        'Class',
        'Parent',
        'Parent Email',
        'Parent Phone',
        'Status',
        'Waitlist Position',
        'Deposit Paid',
        'Class Fee',
        'Enrollment Date',
      ];

  const values = enrollments.map((enrollment) => {
    const shared = [
      fullName(enrollment.student),
      enrollment.student?.grade,
      enrollment.student?.age,
      enrollment.class?.name,
      fullName(enrollment.student?.parent),
      enrollment.student?.parent?.email,
      enrollment.student?.parent?.phone,
      enrollment.status,
      enrollment.waitlist_position,
    ];

    if (scheduler) {
      return [...shared, formatDate(enrollment.created_at)];
    }

    return [
      enrollment.id,
      shared[0],
      enrollment.student?.email,
      ...shared.slice(1),
      yesNo(enrollment.deposit_paid),
      enrollment.class?.price?.toFixed(2) ?? '',
      formatDate(enrollment.created_at),
    ];
  });

  return {
    csv: encodeCsv(headers, values),
    filename: filename('enrollments', request.scope),
    rowCount: enrollments.length,
    filters: filtersForAudit(request),
  };
}

export async function createCsvExport(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  role: UserRole,
  request: ExportRequest
): Promise<CsvExport> {
  switch (request.type) {
    case 'users':
      return exportUsers(supabase, request);
    case 'classes':
      return exportClasses(supabase, adminClient, request);
    case 'enrollments':
      return exportEnrollments(supabase, role, request);
  }
}

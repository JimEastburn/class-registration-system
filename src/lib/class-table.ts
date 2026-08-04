import type { ClassWithTeacher } from '@/types';

/**
 * Columns the admin class table can be sorted by.
 *
 * Conflict is deliberately absent: it isn't a property of a class, it's derived
 * from the scheduler's conflict scan across the whole catalog.
 */
export const CLASS_SORT_KEYS = [
  'name',
  'teacher',
  'block',
  'status',
  'enrolled',
  'waitlisted',
  'age_min',
  'age_max',
] as const;

export type ClassSortKey = (typeof CLASS_SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';

export interface ClassSort {
  key: ClassSortKey;
  direction: SortDirection;
}

/** A class row carrying the enrollment tallies the table sorts on. */
export type SortableClassRow = ClassWithTeacher & {
  enrolled_count: number;
  waitlisted_count: number;
};

/**
 * Resolve `sort`/`dir` search params into a sort, ignoring anything
 * unrecognized (hand-edited URLs, stale bookmarks) so the caller falls back to
 * the default ordering.
 */
export function resolveClassSort(
  sort?: string,
  dir?: string
): ClassSort | undefined {
  if (!(CLASS_SORT_KEYS as readonly string[]).includes(sort ?? '')) {
    return undefined;
  }

  return {
    key: sort as ClassSortKey,
    direction: dir === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * The Block column's label, or null when the class has no block yet.
 * Asynchronous classes have no block by design; day_block classes may still be
 * unscheduled, since a class can't be published until an admin assigns one.
 */
export function formatClassBlock(
  cls: Pick<
    ClassWithTeacher,
    'block' | 'schedule_config' | 'schedule_display_mode'
  >
): string | null {
  if ((cls.schedule_display_mode ?? 'day_block') === 'asynchronous') {
    return 'Asynchronous';
  }

  return cls.block || cls.schedule_config?.block || null;
}

function teacherName(cls: SortableClassRow): string | null {
  const name = [cls.teacher?.first_name, cls.teacher?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || null;
}

function sortValue(
  cls: SortableClassRow,
  key: ClassSortKey
): string | number | null {
  switch (key) {
    case 'name':
      return cls.name || null;
    case 'teacher':
      return teacherName(cls);
    case 'block':
      return formatClassBlock(cls);
    case 'status':
      return cls.status;
    case 'enrolled':
      return cls.enrolled_count;
    case 'waitlisted':
      return cls.waitlisted_count;
    case 'age_min':
      return cls.age_min;
    case 'age_max':
      return cls.age_max;
  }
}

function compareText(a: string, b: string): number {
  // numeric:true so "Block 2" sorts before "Block 10", not after it.
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Order classes by a sortable column.
 *
 * Rows with no value for the column ("—" in the table) always sort last, in
 * either direction, so reversing never buries the populated rows. Ties break on
 * class name so a row can't hop between pages as you page through.
 */
export function sortClasses<T extends SortableClassRow>(
  classes: T[],
  { key, direction }: ClassSort
): T[] {
  const modifier = direction === 'asc' ? 1 : -1;

  return [...classes].sort((a, b) => {
    const aValue = sortValue(a, key);
    const bValue = sortValue(b, key);

    if (aValue === null || bValue === null) {
      if (aValue === bValue) return compareText(a.name ?? '', b.name ?? '');
      return aValue === null ? 1 : -1;
    }

    const result =
      typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : compareText(String(aValue), String(bValue));

    return result === 0
      ? compareText(a.name ?? '', b.name ?? '')
      : result * modifier;
  });
}

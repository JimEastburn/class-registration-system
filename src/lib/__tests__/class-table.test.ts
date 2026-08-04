import { describe, it, expect } from 'vitest';
import {
  CLASS_SORT_KEYS,
  formatClassBlock,
  resolveClassSort,
  sortClasses,
  withClassListState,
  type SortableClassRow,
} from '@/lib/class-table';

function makeClass(
  overrides: Partial<SortableClassRow> & { name: string }
): SortableClassRow {
  return {
    id: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    description: null,
    teacher_id: 'teacher-1',
    teacher: {
      id: 'teacher-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@test.com',
    },
    status: 'published',
    capacity: 20,
    price: 30,
    current_enrollment: 0,
    age_min: null,
    age_max: null,
    location: null,
    day: null,
    block: null,
    start_date: null,
    end_date: null,
    schedule_config: null,
    age_display_mode: 'both',
    schedule_display_mode: 'day_block',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    enrolled_count: 0,
    waitlisted_count: 0,
    ...overrides,
  } as SortableClassRow;
}

const names = (rows: SortableClassRow[]) => rows.map((r) => r.name);

describe('resolveClassSort', () => {
  it('ignores a missing sort key', () => {
    expect(resolveClassSort(undefined, 'asc')).toBeUndefined();
  });

  it('ignores an unrecognized sort key', () => {
    expect(resolveClassSort('drop table', 'asc')).toBeUndefined();
  });

  it.each(CLASS_SORT_KEYS)('accepts the %s column', (key) => {
    expect(resolveClassSort(key, 'asc')).toEqual({ key, direction: 'asc' });
  });

  it('honors a descending direction', () => {
    expect(resolveClassSort('name', 'desc')).toEqual({
      key: 'name',
      direction: 'desc',
    });
  });

  it.each([undefined, '', 'sideways'])(
    'falls back to ascending for direction "%s"',
    (dir) => {
      expect(resolveClassSort('name', dir)).toEqual({
        key: 'name',
        direction: 'asc',
      });
    }
  );
});

describe('withClassListState', () => {
  it('carries the list state onto a link', () => {
    expect(
      withClassListState(
        '/admin/classes/class-1',
        new URLSearchParams('page=2&limit=10')
      )
    ).toBe('/admin/classes/class-1?page=2&limit=10');
  });

  it('reads the same state from a server searchParams object', () => {
    expect(
      withClassListState('/admin/classes', {
        page: '2',
        limit: '10',
        search: 'Art',
        sort: 'enrolled',
        dir: 'desc',
      })
    ).toBe('/admin/classes?page=2&limit=10&search=Art&sort=enrolled&dir=desc');
  });

  it('returns a bare path when there is no state to carry', () => {
    expect(withClassListState('/admin/classes', new URLSearchParams())).toBe(
      '/admin/classes'
    );
  });

  it('drops params that are not part of the list state', () => {
    expect(
      withClassListState(
        '/admin/classes',
        new URLSearchParams('page=2&redirect=http://evil.test')
      )
    ).toBe('/admin/classes?page=2');
  });

  it('takes the first value when a param is repeated', () => {
    expect(withClassListState('/admin/classes', { page: ['3', '9'] })).toBe(
      '/admin/classes?page=3'
    );
  });
});

describe('formatClassBlock', () => {
  it('labels asynchronous classes instead of showing a block', () => {
    const cls = makeClass({
      name: 'Async Art',
      schedule_display_mode: 'asynchronous',
      block: 'Block 1',
    });

    expect(formatClassBlock(cls)).toBe('Asynchronous');
  });

  it('prefers the block column', () => {
    const cls = makeClass({
      name: 'Math',
      block: 'Block 2',
      schedule_config: {
        day: 'Tuesday',
        block: 'Block 4',
        recurring: true,
      },
    });

    expect(formatClassBlock(cls)).toBe('Block 2');
  });

  it('falls back to schedule_config for legacy rows', () => {
    const cls = makeClass({
      name: 'Math',
      block: null,
      schedule_config: {
        day: 'Tuesday',
        block: 'Block 4',
        recurring: true,
      },
    });

    expect(formatClassBlock(cls)).toBe('Block 4');
  });

  it('returns null when the class has not been scheduled', () => {
    expect(formatClassBlock(makeClass({ name: 'Math' }))).toBeNull();
  });
});

describe('sortClasses', () => {
  it('sorts by class name in both directions', () => {
    const rows = [
      makeClass({ name: 'Zoology' }),
      makeClass({ name: 'Art' }),
      makeClass({ name: 'Math' }),
    ];

    expect(names(sortClasses(rows, { key: 'name', direction: 'asc' }))).toEqual(
      ['Art', 'Math', 'Zoology']
    );
    expect(
      names(sortClasses(rows, { key: 'name', direction: 'desc' }))
    ).toEqual(['Zoology', 'Math', 'Art']);
  });

  it('sorts by the teacher name as displayed', () => {
    const rows = [
      makeClass({
        name: 'Art',
        teacher: {
          id: 't2',
          first_name: 'Zoe',
          last_name: 'Adams',
          email: 'z@test.com',
        },
      }),
      makeClass({
        name: 'Math',
        teacher: {
          id: 't1',
          first_name: 'Ada',
          last_name: 'Zimmer',
          email: 'a@test.com',
        },
      }),
    ];

    expect(
      names(sortClasses(rows, { key: 'teacher', direction: 'asc' }))
    ).toEqual(['Math', 'Art']);
  });

  it('orders blocks numerically rather than alphabetically', () => {
    const rows = [
      makeClass({ name: 'Ten', block: 'Block 10' }),
      makeClass({ name: 'Two', block: 'Block 2' }),
    ];

    expect(
      names(sortClasses(rows, { key: 'block', direction: 'asc' }))
    ).toEqual(['Two', 'Ten']);
  });

  it('sorts by status', () => {
    const rows = [
      makeClass({ name: 'Published', status: 'published' }),
      makeClass({ name: 'Draft', status: 'draft' }),
    ];

    expect(
      names(sortClasses(rows, { key: 'status', direction: 'asc' }))
    ).toEqual(['Draft', 'Published']);
  });

  it('sorts by enrolled count numerically', () => {
    const rows = [
      makeClass({ name: 'Nine', enrolled_count: 9 }),
      makeClass({ name: 'Ten', enrolled_count: 10 }),
      makeClass({ name: 'One', enrolled_count: 1 }),
    ];

    expect(
      names(sortClasses(rows, { key: 'enrolled', direction: 'desc' }))
    ).toEqual(['Ten', 'Nine', 'One']);
  });

  it('sorts by waitlisted count numerically', () => {
    const rows = [
      makeClass({ name: 'Two', waitlisted_count: 2 }),
      makeClass({ name: 'Twelve', waitlisted_count: 12 }),
    ];

    expect(
      names(sortClasses(rows, { key: 'waitlisted', direction: 'asc' }))
    ).toEqual(['Two', 'Twelve']);
  });

  it.each(['age_min', 'age_max'] as const)('sorts by %s', (key) => {
    const rows = [
      makeClass({ name: 'Older', [key]: 12 }),
      makeClass({ name: 'Younger', [key]: 6 }),
    ];

    expect(names(sortClasses(rows, { key, direction: 'asc' }))).toEqual([
      'Younger',
      'Older',
    ]);
  });

  it('keeps unset values last in both directions', () => {
    const rows = [
      makeClass({ name: 'Unset', age_min: null }),
      makeClass({ name: 'Six', age_min: 6 }),
      makeClass({ name: 'Twelve', age_min: 12 }),
    ];

    expect(
      names(sortClasses(rows, { key: 'age_min', direction: 'asc' }))
    ).toEqual(['Six', 'Twelve', 'Unset']);
    expect(
      names(sortClasses(rows, { key: 'age_min', direction: 'desc' }))
    ).toEqual(['Twelve', 'Six', 'Unset']);
  });

  it('breaks ties by class name so paging stays stable', () => {
    const rows = [
      makeClass({ name: 'Woodworking', enrolled_count: 3 }),
      makeClass({ name: 'Astronomy', enrolled_count: 3 }),
      makeClass({ name: 'Music', enrolled_count: 3 }),
    ];

    expect(
      names(sortClasses(rows, { key: 'enrolled', direction: 'desc' }))
    ).toEqual(['Astronomy', 'Music', 'Woodworking']);
  });

  it('does not mutate the input array', () => {
    const rows = [makeClass({ name: 'Zoology' }), makeClass({ name: 'Art' })];

    sortClasses(rows, { key: 'name', direction: 'asc' });

    expect(names(rows)).toEqual(['Zoology', 'Art']);
  });
});

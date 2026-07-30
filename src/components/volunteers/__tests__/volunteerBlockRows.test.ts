import { describe, expect, it } from 'vitest';
import type { VolunteerBlock, VolunteerRole, VolunteerSlot } from '@/types';
import {
  arrangeVolunteerBlockRows,
  buildVolunteerBlockRows,
  getVolunteerOtherRows,
} from '../volunteerBlockRows';

function block(id: string, name: string, sortOrder: number): VolunteerBlock {
  return {
    id,
    name,
    sort_order: sortOrder,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function role(id: string, name: string, sortOrder: number): VolunteerRole {
  return {
    id,
    name,
    description: null,
    sort_order: sortOrder,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function slot(id: string, roleId: string, blockId: string): VolunteerSlot {
  return { id, role_id: roleId, block_id: blockId, created_at: 'x' };
}

const blocks = [
  block('years', 'One to two years (max 2 years)', 1),
  block('months', 'At least 3 months', 2),
  block('t-before', 'Tuesday before Block 1', 3),
  block('t1', 'Tuesday Block 1', 4),
  block('t4', 'Tuesday Block 4', 8),
  block('w1', 'Wednesday Block 1', 11),
  block('w-after', 'Wednesday after Block 3', 15),
  block('th1', 'Thursday Block 1', 17),
  block('th4', 'Thursday Block 4', 21),
  block('weekly', 'Once per week', 23),
  block('t-once', 'Tuesday - once', 24),
  block('w-once', 'Wednesday - once', 25),
  block('th-once', 'Thursday - once', 26),
];

const roles = [
  role('board-1', 'Board Member (Treasurer)', 1),
  role('csc', 'Community Service Coordinator', 4),
  role('open-1', 'Opening YC Team - 1st Member', 5),
  role('open-2', 'Opening YC Team - 2nd Member', 6),
  role('gym', 'Door Monitor Gym', 7),
  role('mb-up', 'Door Monitor Main Building Upstairs', 8),
  role('bath', 'Check bathrooms, restock - YC and MB', 20),
  role('library', 'Library Upkeep', 21),
];

const slots = [
  slot('s-years', 'board-1', 'years'),
  slot('s-months', 'csc', 'months'),
  // before Block 1 across days
  slot('s-tb-2', 'open-2', 't-before'),
  slot('s-tb-1', 'open-1', 't-before'),
  // Block 1 across days
  slot('s-t1-mb', 'mb-up', 't1'),
  slot('s-t1-gym', 'gym', 't1'),
  slot('s-w1-gym', 'gym', 'w1'),
  slot('s-th1-gym', 'gym', 'th1'),
  // Block 4 only Tuesday + Thursday
  slot('s-t4-gym', 'gym', 't4'),
  slot('s-th4-gym', 'gym', 'th4'),
  // Wednesday after Block 3 only
  slot('s-wa', 'library', 'w-after'),
  // once across days
  slot('s-tonce', 'bath', 't-once'),
  slot('s-wonce', 'bath', 'w-once'),
  slot('s-thonce', 'bath', 'th-once'),
  // Once per week (Other)
  slot('s-weekly', 'library', 'weekly'),
];

describe('buildVolunteerBlockRows', () => {
  it('groups blocks that share a stripped label into one row across day columns', () => {
    const rows = buildVolunteerBlockRows(blocks, roles, slots);
    const block1 = rows.find((row) => row.label === 'Block 1')!;

    expect(block1.cells.Tuesday.map((cell) => cell.role.name)).toEqual([
      'Door Monitor Gym',
      'Door Monitor Main Building Upstairs',
    ]);
    expect(block1.cells.Wednesday.map((cell) => cell.role.name)).toEqual([
      'Door Monitor Gym',
    ]);
    expect(block1.cells.Thursday.map((cell) => cell.role.name)).toEqual([
      'Door Monitor Gym',
    ]);
    expect(block1.cells.Other).toEqual([]);
    expect(block1.isOther).toBe(false);
  });

  it('leaves day columns empty when only some days have that block', () => {
    const rows = buildVolunteerBlockRows(blocks, roles, slots);
    const block4 = rows.find((row) => row.label === 'Block 4')!;

    expect(block4.cells.Tuesday).toHaveLength(1);
    expect(block4.cells.Wednesday).toEqual([]);
    expect(block4.cells.Thursday).toHaveLength(1);
  });

  it('shares the once row across days and keeps Once per week as an Other row', () => {
    const rows = buildVolunteerBlockRows(blocks, roles, slots);
    const once = rows.find((row) => row.label === 'once')!;
    const weekly = rows.find((row) => row.label === 'Once per week')!;

    expect(once.isOther).toBe(false);
    expect(once.cells.Tuesday).toHaveLength(1);
    expect(once.cells.Wednesday).toHaveLength(1);
    expect(once.cells.Thursday).toHaveLength(1);

    expect(weekly.isOther).toBe(true);
    expect(weekly.cells.Other.map((cell) => cell.role.name)).toEqual([
      'Library Upkeep',
    ]);
  });

  it('flags Other-column blocks and returns rows in natural sort order', () => {
    const rows = buildVolunteerBlockRows(blocks, roles, slots);

    expect(rows.map((row) => row.label)).toEqual([
      'One to two years (max 2 years)',
      'At least 3 months',
      'before Block 1',
      'Block 1',
      'Block 4',
      'after Block 3',
      'Once per week',
      'once',
    ]);
    expect(rows.filter((row) => row.isOther).map((row) => row.label)).toEqual([
      'One to two years (max 2 years)',
      'At least 3 months',
      'Once per week',
    ]);
  });

  it('sorts roles within a cell by role sort order', () => {
    const rows = buildVolunteerBlockRows(blocks, roles, slots);
    const beforeBlock1 = rows.find((row) => row.label === 'before Block 1')!;

    expect(beforeBlock1.cells.Tuesday.map((cell) => cell.role.name)).toEqual([
      'Opening YC Team - 1st Member',
      'Opening YC Team - 2nd Member',
    ]);
  });

  it('omits blocks with no enabled slots', () => {
    const withEmpty = [...blocks, block('t-lunch', 'Tuesday lunch', 6)];
    const rows = buildVolunteerBlockRows(withEmpty, roles, slots);

    expect(rows.map((row) => row.label)).not.toContain('lunch');
  });
});

describe('arrangeVolunteerBlockRows', () => {
  const rows = buildVolunteerBlockRows(blocks, roles, slots);

  it('natural mode preserves sort order', () => {
    expect(
      arrangeVolunteerBlockRows(rows, 'natural').map((row) => row.label)
    ).toEqual(rows.map((row) => row.label));
  });

  it('rows-bottom mode pushes Other rows to the end, each group still ordered', () => {
    expect(
      arrangeVolunteerBlockRows(rows, 'rows-bottom').map((row) => row.label)
    ).toEqual([
      'before Block 1',
      'Block 1',
      'Block 4',
      'after Block 3',
      'once',
      'One to two years (max 2 years)',
      'At least 3 months',
      'Once per week',
    ]);
  });

  it('merged-cell mode drops Other rows from the grid', () => {
    const arranged = arrangeVolunteerBlockRows(rows, 'merged-cell');

    expect(arranged.every((row) => !row.isOther)).toBe(true);
    expect(arranged.map((row) => row.label)).toEqual([
      'before Block 1',
      'Block 1',
      'Block 4',
      'after Block 3',
      'once',
    ]);
  });
});

describe('getVolunteerOtherRows', () => {
  it('returns only the Other rows in sort order', () => {
    const rows = buildVolunteerBlockRows(blocks, roles, slots);

    expect(getVolunteerOtherRows(rows).map((row) => row.label)).toEqual([
      'One to two years (max 2 years)',
      'At least 3 months',
      'Once per week',
    ]);
  });
});

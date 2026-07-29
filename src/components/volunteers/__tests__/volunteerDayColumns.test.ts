import { describe, expect, it } from 'vitest';
import type { VolunteerBlock, VolunteerRole, VolunteerSlot } from '@/types';
import {
  buildVolunteerDayColumns,
  getVolunteerBlockLabel,
  getVolunteerColumnKey,
} from '../volunteerDayColumns';

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
  return {
    id,
    role_id: roleId,
    block_id: blockId,
    created_at: '2026-01-01T00:00:00Z',
  };
}

const blocks = [
  block('board', 'One to two years (max 2 years)', 1),
  block('t-before', 'Tuesday before Block 1', 3),
  block('t1', 'Tuesday Block 1', 4),
  block('t-lunch', 'Tuesday lunch', 6),
  block('t-after', 'Tuesday after Block 4', 9),
  block('w1', 'Wednesday Block 1', 11),
  block('th1', 'Thursday Block 1', 17),
  block('weekly', 'Once per week', 23),
  block('t-once', 'Tuesday - once', 24),
];

const roles = [
  role('board-1', 'Board Member (Treasurer)', 1),
  role('open-1', 'Opening YC Team - 1st Member', 5),
  role('open-2', 'Opening YC Team - 2nd Member', 6),
  role('gym', 'Door Monitor Gym', 7),
  role('courtyard', 'Courtyard Monitor', 18),
  role('bathrooms', 'Check bathrooms, restock - YC and MB', 20),
  role('library', 'Library Upkeep', 21),
];

const slots = [
  slot('s-board', 'board-1', 'board'),
  slot('s-open-2', 'open-2', 't-before'),
  slot('s-open-1', 'open-1', 't-before'),
  slot('s-t1-gym', 'gym', 't1'),
  slot('s-t-lunch', 'courtyard', 't-lunch'),
  slot('s-t-after', 'gym', 't-after'),
  slot('s-w1', 'gym', 'w1'),
  slot('s-th1', 'gym', 'th1'),
  slot('s-weekly', 'library', 'weekly'),
  slot('s-t-once', 'bathrooms', 't-once'),
];

describe('getVolunteerColumnKey', () => {
  it('maps day-prefixed blocks to their day column, including once blocks', () => {
    expect(getVolunteerColumnKey('Tuesday before Block 1')).toBe('Tuesday');
    expect(getVolunteerColumnKey('Wednesday after Block 3')).toBe('Wednesday');
    expect(getVolunteerColumnKey('Thursday lunch')).toBe('Thursday');
    expect(getVolunteerColumnKey('Tuesday - once')).toBe('Tuesday');
  });

  it('maps blocks without a day prefix to Other', () => {
    expect(getVolunteerColumnKey('Once per week')).toBe('Other');
    expect(getVolunteerColumnKey('At least 3 months')).toBe('Other');
    expect(getVolunteerColumnKey('One to two years (max 2 years)')).toBe(
      'Other'
    );
  });
});

describe('getVolunteerBlockLabel', () => {
  it('strips the day prefix from day blocks', () => {
    expect(getVolunteerBlockLabel('Tuesday before Block 1')).toBe(
      'before Block 1'
    );
    expect(getVolunteerBlockLabel('Tuesday Block 1')).toBe('Block 1');
    expect(getVolunteerBlockLabel('Wednesday lunch')).toBe('lunch');
    expect(getVolunteerBlockLabel('Thursday after Block 4')).toBe(
      'after Block 4'
    );
  });

  it('drops the dangling separator from once blocks', () => {
    expect(getVolunteerBlockLabel('Tuesday - once')).toBe('once');
  });

  it('keeps the full name for blocks without a day prefix', () => {
    expect(getVolunteerBlockLabel('Once per week')).toBe('Once per week');
  });
});

describe('buildVolunteerDayColumns', () => {
  it('always returns Tuesday, Wednesday, Thursday, and Other in that order', () => {
    const columns = buildVolunteerDayColumns([], [], []);

    expect(columns.map((column) => column.key)).toEqual([
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Other',
    ]);
    expect(columns.every((column) => column.sections.length === 0)).toBe(true);
  });

  it('orders a day column chronologically by block sort order', () => {
    const columns = buildVolunteerDayColumns(blocks, roles, slots);
    const tuesday = columns.find((column) => column.key === 'Tuesday')!;

    expect(tuesday.sections.map((section) => section.blockLabel)).toEqual([
      'before Block 1',
      'Block 1',
      'lunch',
      'after Block 4',
      'once',
    ]);
  });

  it('labels each entry with the role name and bracketed block', () => {
    const columns = buildVolunteerDayColumns(blocks, roles, slots);
    const tuesday = columns.find((column) => column.key === 'Tuesday')!;

    expect(tuesday.sections[0].entries.map((entry) => entry.label)).toEqual([
      'Opening YC Team - 1st Member [before Block 1]',
      'Opening YC Team - 2nd Member [before Block 1]',
    ]);
    expect(tuesday.sections[1].entries[0].label).toBe(
      'Door Monitor Gym [Block 1]'
    );
  });

  it('sorts once blocks to the bottom of their day even when sort order says otherwise', () => {
    const reordered = blocks.map((candidate) =>
      candidate.id === 't-once' ? { ...candidate, sort_order: 2 } : candidate
    );
    const columns = buildVolunteerDayColumns(reordered, roles, slots);
    const tuesday = columns.find((column) => column.key === 'Tuesday')!;

    expect(tuesday.sections.at(-1)?.blockLabel).toBe('once');
  });

  it('collects only day-less blocks into Other, using their full names', () => {
    const columns = buildVolunteerDayColumns(blocks, roles, slots);
    const other = columns.find((column) => column.key === 'Other')!;

    expect(other.sections.map((section) => section.blockLabel)).toEqual([
      'One to two years (max 2 years)',
      'Once per week',
    ]);
    expect(other.sections[0].entries[0].label).toBe(
      'Board Member (Treasurer) [One to two years (max 2 years)]'
    );
  });

  it('omits blocks that have no enabled slots', () => {
    const withEmptyBlock = [...blocks, block('t-empty', 'Tuesday Block 4', 8)];
    const columns = buildVolunteerDayColumns(withEmptyBlock, roles, slots);
    const tuesday = columns.find((column) => column.key === 'Tuesday')!;

    expect(tuesday.sections.map((section) => section.blockLabel)).not.toContain(
      'Block 4'
    );
  });
});

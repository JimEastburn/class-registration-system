import { describe, expect, it } from 'vitest';
import type { VolunteerBlock } from '@/types';
import {
  buildVolunteerColumnLayout,
  type CollapsibleVolunteerDay,
} from '../volunteerColumnGroups';

function block(id: string, name: string, sortOrder: number): VolunteerBlock {
  return {
    id,
    name,
    sort_order: sortOrder,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

const blocks = [
  block('t1', 'Tuesday Block 1', 1),
  block('t2', 'Tuesday Block 2', 2),
  block('tl', 'Tuesday lunch', 3),
  block('t3', 'Tuesday Block 3', 4),
  block('t4', 'Tuesday Block 4', 5),
  block('ta', 'Tuesday after Block 4', 6),
  block('w1', 'Wednesday Block 1', 7),
  block('once', 'Once per week', 18),
  block('to', 'Tuesday - once', 19),
  block('wo', 'Wednesday - once', 20),
  block('tho', 'Thursday - once', 21),
];

describe('buildVolunteerColumnLayout', () => {
  it('groups Tuesday, Wednesday, and Thursday day blocks but leaves once columns ungrouped', () => {
    const layout = buildVolunteerColumnLayout(
      blocks,
      new Set<CollapsibleVolunteerDay>()
    );

    expect(layout.headerSegments).toEqual([
      {
        kind: 'day',
        day: 'Tuesday',
        collapsed: false,
        blockCount: 6,
        colSpan: 6,
      },
      {
        kind: 'day',
        day: 'Wednesday',
        collapsed: false,
        blockCount: 1,
        colSpan: 1,
      },
      { kind: 'ungrouped', colSpan: 4 },
    ]);
    expect(layout.columns).toHaveLength(11);
    expect(
      layout.columns
        .filter((column) => column.kind === 'block')
        .map((column) => column.block.name)
    ).toContain('Tuesday - once');
  });

  it('collapses a day to one compact column without removing ungrouped once columns', () => {
    const layout = buildVolunteerColumnLayout(
      blocks,
      new Set<CollapsibleVolunteerDay>(['Tuesday'])
    );

    expect(layout.headerSegments[0]).toMatchObject({
      kind: 'day',
      day: 'Tuesday',
      collapsed: true,
      blockCount: 6,
      colSpan: 1,
    });
    expect(layout.columns[0]).toMatchObject({
      kind: 'collapsed-day',
      day: 'Tuesday',
    });
    expect(
      layout.columns
        .filter((column) => column.kind === 'block')
        .map((column) => column.block.name)
    ).not.toContain('Tuesday Block 1');
    expect(
      layout.columns
        .filter((column) => column.kind === 'block')
        .map((column) => column.block.name)
    ).toEqual([
      'Wednesday Block 1',
      'Once per week',
      'Tuesday - once',
      'Wednesday - once',
      'Thursday - once',
    ]);
  });
});

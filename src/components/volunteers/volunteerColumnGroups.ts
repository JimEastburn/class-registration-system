import type { VolunteerBlock } from '@/types';

export const COLLAPSIBLE_VOLUNTEER_DAYS = [
  'Tuesday',
  'Wednesday',
  'Thursday',
] as const;

export type CollapsibleVolunteerDay =
  (typeof COLLAPSIBLE_VOLUNTEER_DAYS)[number];

export type VolunteerGridColumn =
  | { kind: 'block'; block: VolunteerBlock }
  | {
      kind: 'collapsed-day';
      day: CollapsibleVolunteerDay;
      blocks: VolunteerBlock[];
    };

export type VolunteerGridHeaderSegment =
  | {
      kind: 'day';
      day: CollapsibleVolunteerDay;
      colSpan: number;
      collapsed: boolean;
      blockCount: number;
    }
  | { kind: 'ungrouped'; colSpan: number };

export function getVolunteerBlockDay(
  blockName: string
): CollapsibleVolunteerDay | null {
  if (blockName.includes(' - once')) return null;

  return (
    COLLAPSIBLE_VOLUNTEER_DAYS.find((day) => blockName.startsWith(`${day} `)) ??
    null
  );
}

export function buildVolunteerColumnLayout(
  blocks: VolunteerBlock[],
  collapsedDays: Set<CollapsibleVolunteerDay>
) {
  const columns: VolunteerGridColumn[] = [];
  const headerSegments: VolunteerGridHeaderSegment[] = [];

  let index = 0;
  while (index < blocks.length) {
    const day = getVolunteerBlockDay(blocks[index].name);

    if (!day) {
      const ungroupedStart = index;
      while (
        index < blocks.length &&
        !getVolunteerBlockDay(blocks[index].name)
      ) {
        columns.push({ kind: 'block', block: blocks[index] });
        index += 1;
      }

      headerSegments.push({
        kind: 'ungrouped',
        colSpan: index - ungroupedStart,
      });
      continue;
    }

    const dayBlocks: VolunteerBlock[] = [];
    while (
      index < blocks.length &&
      getVolunteerBlockDay(blocks[index].name) === day
    ) {
      dayBlocks.push(blocks[index]);
      index += 1;
    }

    const collapsed = collapsedDays.has(day);
    if (collapsed) {
      columns.push({ kind: 'collapsed-day', day, blocks: dayBlocks });
    } else {
      columns.push(
        ...dayBlocks.map((block) => ({ kind: 'block' as const, block }))
      );
    }

    headerSegments.push({
      kind: 'day',
      day,
      collapsed,
      blockCount: dayBlocks.length,
      colSpan: collapsed ? 1 : dayBlocks.length,
    });
  }

  return { columns, headerSegments };
}

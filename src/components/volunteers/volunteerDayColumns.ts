import type { VolunteerBlock, VolunteerRole, VolunteerSlot } from '@/types';

export const VOLUNTEER_DAY_COLUMNS = [
  'Tuesday',
  'Wednesday',
  'Thursday',
] as const;

export type VolunteerDay = (typeof VOLUNTEER_DAY_COLUMNS)[number];
export type VolunteerColumnKey = VolunteerDay | 'Other';

export const VOLUNTEER_COLUMN_KEYS: VolunteerColumnKey[] = [
  ...VOLUNTEER_DAY_COLUMNS,
  'Other',
];

export interface VolunteerColumnEntry {
  slot: VolunteerSlot;
  role: VolunteerRole;
  block: VolunteerBlock;
  /** Role name with the block appended, e.g. `Door Monitor Gym [Block 1]`. */
  label: string;
}

export interface VolunteerColumnSection {
  block: VolunteerBlock;
  blockLabel: string;
  entries: VolunteerColumnEntry[];
}

export interface VolunteerColumn {
  key: VolunteerColumnKey;
  sections: VolunteerColumnSection[];
}

/**
 * Blocks named after a day belong to that day's column. Unlike the original
 * board, "Tuesday - once" style blocks stay with their day instead of being
 * treated as ungrouped.
 */
export function getVolunteerColumnKey(blockName: string): VolunteerColumnKey {
  return (
    VOLUNTEER_DAY_COLUMNS.find((day) => blockName.startsWith(`${day} `)) ??
    'Other'
  );
}

function isOnceBlock(blockName: string) {
  return blockName.includes(' - once');
}

/**
 * The column header already names the day, so day blocks only show the part
 * that varies: "Tuesday before Block 1" reads as "before Block 1".
 */
export function getVolunteerBlockLabel(blockName: string): string {
  const key = getVolunteerColumnKey(blockName);
  if (key === 'Other') return blockName;

  const withoutDay = blockName.slice(key.length + 1).replace(/^-\s*/, '');
  return withoutDay.trim() || blockName;
}

export function buildVolunteerDayColumns(
  blocks: VolunteerBlock[],
  roles: VolunteerRole[],
  slots: VolunteerSlot[]
): VolunteerColumn[] {
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const slotsByBlock = new Map<string, VolunteerSlot[]>();

  for (const slot of slots) {
    const existing = slotsByBlock.get(slot.block_id);
    if (existing) {
      existing.push(slot);
    } else {
      slotsByBlock.set(slot.block_id, [slot]);
    }
  }

  return VOLUNTEER_COLUMN_KEYS.map((key) => {
    const sections = blocks
      .filter((block) => getVolunteerColumnKey(block.name) === key)
      .sort(
        (first, second) =>
          Number(isOnceBlock(first.name)) - Number(isOnceBlock(second.name)) ||
          first.sort_order - second.sort_order
      )
      .map((block) => {
        const blockLabel = getVolunteerBlockLabel(block.name);
        const entries = (slotsByBlock.get(block.id) ?? [])
          .map((slot) => {
            const role = rolesById.get(slot.role_id);
            if (!role) return null;

            return {
              slot,
              role,
              block,
              label: `${role.name} [${blockLabel}]`,
            };
          })
          .filter((entry): entry is VolunteerColumnEntry => entry !== null)
          .sort(
            (first, second) => first.role.sort_order - second.role.sort_order
          );

        return { block, blockLabel, entries };
      })
      .filter((section) => section.entries.length > 0);

    return { key, sections };
  });
}

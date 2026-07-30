import type { VolunteerBlock, VolunteerRole, VolunteerSlot } from '@/types';
import {
  getVolunteerBlockLabel,
  getVolunteerColumnKey,
  VOLUNTEER_COLUMN_KEYS,
  VOLUNTEER_DAY_COLUMNS,
  type VolunteerColumnKey,
} from './volunteerDayColumns';

export type VolunteerOtherPlacement = 'rows-bottom' | 'merged-cell' | 'natural';

export interface VolunteerCellRole {
  slot: VolunteerSlot;
  role: VolunteerRole;
  block: VolunteerBlock;
}

export interface VolunteerBlockRow {
  /** Stripped block label; identifies the row and is shown as its header. */
  key: string;
  label: string;
  /** True when the row's blocks live in the Other column, not a day. */
  isOther: boolean;
  /** Lowest block sort order in the group, used for chronological ordering. */
  sortOrder: number;
  cells: Record<VolunteerColumnKey, VolunteerCellRole[]>;
}

/**
 * Pivots the board so each distinct block time (label) becomes a row and the
 * day/Other columns stay put. Blocks that share a stripped label — e.g.
 * "Tuesday Block 1" / "Wednesday Block 1" — collapse into one row so a block
 * time can be read across days. Rows are returned in natural sort order; use
 * arrangeVolunteerBlockRows to reposition the Other rows.
 */
export function buildVolunteerBlockRows(
  blocks: VolunteerBlock[],
  roles: VolunteerRole[],
  slots: VolunteerSlot[]
): VolunteerBlockRow[] {
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

  const rowsByLabel = new Map<string, VolunteerBlockRow>();

  for (const block of blocks) {
    const entries = (slotsByBlock.get(block.id) ?? [])
      .map((slot) => {
        const role = rolesById.get(slot.role_id);
        return role ? { slot, role, block } : null;
      })
      .filter((cell): cell is VolunteerCellRole => cell !== null)
      .sort((first, second) => first.role.sort_order - second.role.sort_order);

    if (entries.length === 0) continue;

    const column = getVolunteerColumnKey(block.name);
    const label = getVolunteerBlockLabel(block.name);

    let row = rowsByLabel.get(label);
    if (!row) {
      row = {
        key: label,
        label,
        isOther: column === 'Other',
        sortOrder: block.sort_order,
        cells: emptyCells(),
      };
      rowsByLabel.set(label, row);
    }

    row.cells[column] = entries;
    row.isOther = row.isOther && column === 'Other';
    row.sortOrder = Math.min(row.sortOrder, block.sort_order);
  }

  return [...rowsByLabel.values()].sort(
    (first, second) => first.sortOrder - second.sortOrder
  );
}

/**
 * Reorders rows for a given Other-column strategy. All modes preserve the
 * chronological order within each group (arrays keep insertion order under a
 * stable filter).
 */
export function arrangeVolunteerBlockRows(
  rows: VolunteerBlockRow[],
  placement: VolunteerOtherPlacement
): VolunteerBlockRow[] {
  if (placement === 'natural') {
    return rows;
  }

  const dayRows = rows.filter((row) => !row.isOther);

  if (placement === 'merged-cell') {
    return dayRows;
  }

  // rows-bottom
  return [...dayRows, ...rows.filter((row) => row.isOther)];
}

export function getVolunteerOtherRows(
  rows: VolunteerBlockRow[]
): VolunteerBlockRow[] {
  return rows.filter((row) => row.isOther);
}

function emptyCells(): Record<VolunteerColumnKey, VolunteerCellRole[]> {
  return VOLUNTEER_COLUMN_KEYS.reduce(
    (acc, key) => {
      acc[key] = [];
      return acc;
    },
    {} as Record<VolunteerColumnKey, VolunteerCellRole[]>
  );
}

export { VOLUNTEER_DAY_COLUMNS, VOLUNTEER_COLUMN_KEYS };
export type { VolunteerColumnKey };

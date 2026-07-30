'use client';

import { type ReactNode, useMemo, useState } from 'react';
import type { VolunteerBoardData, VolunteerRole } from '@/types';
import { cn } from '@/lib/utils';
import { VolunteerGridScrollArea } from './VolunteerGridScrollArea';
import { VOLUNTEER_DAY_COLUMNS } from './volunteerDayColumns';
import {
  arrangeVolunteerBlockRows,
  buildVolunteerBlockRows,
  getVolunteerOtherRows,
  type VolunteerBlockRow,
  type VolunteerCellRole,
  type VolunteerOtherPlacement,
} from './volunteerBlockRows';
import {
  buildSlotMaps,
  buildVolunteerCommitments,
  MyVolunteerSummary,
  useVolunteerBoardActions,
  VolunteerCellEntry,
  VolunteerRoleDialog,
} from './VolunteerBoardShared';

interface VolunteerBoardMatrixClientProps {
  board: VolunteerBoardData;
  /** How the Other column's non-time blocks are placed in the grid. */
  otherMode: VolunteerOtherPlacement;
}

const COLUMN_CLASS = 'min-w-52 border-l px-3 py-3 align-top';

export function VolunteerBoardMatrixClient({
  board,
  otherMode,
}: VolunteerBoardMatrixClientProps) {
  const [selectedRole, setSelectedRole] = useState<VolunteerRole | null>(null);
  const { pendingKey, handleClaim, handleRelease } = useVolunteerBoardActions();
  const { slotsById, signupsBySlot } = useMemo(
    () => buildSlotMaps(board.slots, board.signups),
    [board.slots, board.signups]
  );
  const allRows = useMemo(
    () => buildVolunteerBlockRows(board.blocks, board.roles, board.slots),
    [board.blocks, board.roles, board.slots]
  );
  const rows = useMemo(
    () => arrangeVolunteerBlockRows(allRows, otherMode),
    [allRows, otherMode]
  );
  const otherRows = useMemo(
    () => (otherMode === 'merged-cell' ? getVolunteerOtherRows(allRows) : []),
    [allRows, otherMode]
  );
  const myCommitments = useMemo(
    () => buildVolunteerCommitments(board, slotsById),
    [board, slotsById]
  );

  if (board.slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">No volunteer slots yet</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Volunteer opportunities will appear here after an admin configures the
          board.
        </p>
      </div>
    );
  }

  const isMerged = otherMode === 'merged-cell';
  const dayColumns = [...VOLUNTEER_DAY_COLUMNS];

  function renderCell(entries: VolunteerCellRole[]) {
    if (entries.length === 0) {
      return (
        <span
          className="text-muted-foreground text-sm"
          aria-label="No roles for this block"
        >
          -
        </span>
      );
    }

    return (
      <div className="space-y-3">
        {entries.map((entry) => (
          <VolunteerCellEntry
            key={entry.slot.id}
            role={entry.role}
            slot={entry.slot}
            signup={signupsBySlot.get(entry.slot.id)}
            currentUserId={board.currentUserId}
            pendingKey={pendingKey}
            onClaim={handleClaim}
            onRelease={handleRelease}
            onOpenRole={setSelectedRole}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MyVolunteerSummary
        commitments={myCommitments}
        pendingKey={pendingKey}
        onRelease={handleRelease}
      />

      <VolunteerGridScrollArea className="hidden md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="bg-muted sticky top-0 left-0 z-30 min-w-40 border-b px-4 py-3 text-left align-middle font-semibold"
              >
                Block
              </th>
              {dayColumns.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="bg-muted sticky top-0 z-20 min-w-52 border-b border-l px-3 py-3 text-center font-bold tracking-wide uppercase"
                >
                  {day}
                </th>
              ))}
              <th
                scope="col"
                className="bg-muted sticky top-0 z-20 min-w-52 border-b border-l px-3 py-3 text-center font-bold tracking-wide uppercase"
              >
                Other
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.key} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className="bg-background sticky left-0 z-10 min-w-40 border-b px-4 py-3 text-left align-top font-semibold text-amber-700 dark:text-amber-300"
                >
                  {row.label}
                </th>
                {dayColumns.map((day) => (
                  <td
                    key={day}
                    className={cn(
                      COLUMN_CLASS,
                      'border-b',
                      row.cells[day].length === 0 && 'bg-muted/30'
                    )}
                  >
                    {renderCell(row.cells[day])}
                  </td>
                ))}
                {isMerged ? (
                  rowIndex === 0 && (
                    <td
                      rowSpan={rows.length}
                      className="bg-muted/10 min-w-52 border-b border-l px-3 py-3 align-top"
                    >
                      <MergedOtherCell
                        rows={otherRows}
                        renderCell={renderCell}
                      />
                    </td>
                  )
                ) : (
                  <td
                    className={cn(
                      COLUMN_CLASS,
                      'border-b',
                      row.cells.Other.length === 0 && 'bg-muted/30'
                    )}
                  >
                    {renderCell(row.cells.Other)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </VolunteerGridScrollArea>

      <div className="space-y-4 md:hidden">
        {rows.map((row) => (
          <MobileBlockRow
            key={row.key}
            row={row}
            isMerged={isMerged}
            renderCell={renderCell}
          />
        ))}
        {isMerged && otherRows.length > 0 && (
          <MobileOtherRows rows={otherRows} renderCell={renderCell} />
        )}
      </div>

      <VolunteerRoleDialog
        role={selectedRole}
        onClose={() => setSelectedRole(null)}
      />
    </div>
  );
}

function MergedOtherCell({
  rows,
  renderCell,
}: {
  rows: VolunteerBlockRow[];
  renderCell: (entries: VolunteerCellRole[]) => ReactNode;
}) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.key}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-300">
            {row.label}
          </p>
          {renderCell(row.cells.Other)}
        </div>
      ))}
    </div>
  );
}

function MobileBlockRow({
  row,
  isMerged,
  renderCell,
}: {
  row: VolunteerBlockRow;
  isMerged: boolean;
  renderCell: (entries: VolunteerCellRole[]) => ReactNode;
}) {
  const columns = isMerged
    ? [...VOLUNTEER_DAY_COLUMNS]
    : ([...VOLUNTEER_DAY_COLUMNS, 'Other'] as const);
  const populated = columns.filter((column) => row.cells[column].length > 0);
  if (populated.length === 0) return null;

  return (
    <section className="bg-background rounded-lg border p-4 shadow-xs">
      <h3 className="text-sm font-bold tracking-wide text-amber-700 uppercase dark:text-amber-300">
        {row.label}
      </h3>
      <div className="mt-3 space-y-3">
        {populated.map((column) => (
          <div key={column} className="rounded-md border p-3">
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {column}
            </p>
            {renderCell(row.cells[column])}
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileOtherRows({
  rows,
  renderCell,
}: {
  rows: VolunteerBlockRow[];
  renderCell: (entries: VolunteerCellRole[]) => ReactNode;
}) {
  return (
    <section className="bg-background rounded-lg border p-4 shadow-xs">
      <h3 className="text-sm font-bold tracking-wide text-amber-700 uppercase dark:text-amber-300">
        Other
      </h3>
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-md border p-3">
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {row.label}
            </p>
            {renderCell(row.cells.Other)}
          </div>
        ))}
      </div>
    </section>
  );
}

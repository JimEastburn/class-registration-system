'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeftRight,
  ChevronsRightLeft,
  UserPlus,
  X,
} from 'lucide-react';
import type { VolunteerColumnKey } from './volunteerDayColumns';
import { Button } from '@/components/ui/button';
import type {
  VolunteerBoardData,
  VolunteerRole,
  VolunteerSignup,
} from '@/types';
import { VolunteerGridScrollArea } from './VolunteerGridScrollArea';
import {
  buildVolunteerDayColumns,
  type VolunteerColumnEntry,
} from './volunteerDayColumns';
import {
  buildSlotMaps,
  buildVolunteerCommitments,
  MyVolunteerSummary,
  useVolunteerBoardActions,
  VolunteerNameChip,
  VolunteerRoleDialog,
  VolunteerRoleInfoTrigger,
} from './VolunteerBoardShared';

interface VolunteerBoardV2ClientProps {
  board: VolunteerBoardData;
}

function VolunteerEntryRow({
  entry,
  signup,
  currentUserId,
  pendingKey,
  onClaim,
  onRelease,
  onOpenRole,
}: {
  entry: VolunteerColumnEntry;
  signup: VolunteerSignup | undefined;
  currentUserId: string;
  pendingKey: string | null;
  onClaim: (slotId: string) => void;
  onRelease: (signupId: string) => void;
  onOpenRole: (role: VolunteerRole) => void;
}) {
  const isMine = signup?.user_id === currentUserId;

  return (
    <li className="border-t px-3 py-3 first:border-t-0">
      <VolunteerRoleInfoTrigger
        role={entry.role}
        label={entry.label}
        onOpen={onOpenRole}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!signup ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            isLoading={pendingKey === `claim:${entry.slot.id}`}
            onClick={() => onClaim(entry.slot.id)}
          >
            <UserPlus className="h-4 w-4" />
            Volunteer
          </Button>
        ) : (
          <>
            <VolunteerNameChip
              displayName={signup.display_name}
              isMine={isMine}
            />
            {isMine && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                isLoading={pendingKey === `release:${signup.id}`}
                onClick={() => onRelease(signup.id)}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function VolunteerBoardV2Client({ board }: VolunteerBoardV2ClientProps) {
  const [selectedRole, setSelectedRole] = useState<VolunteerRole | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set()
  );
  const [collapsedColumns, setCollapsedColumns] = useState<
    Set<VolunteerColumnKey>
  >(() => new Set());
  const { pendingKey, handleClaim, handleRelease } = useVolunteerBoardActions();
  const { slotsById, signupsBySlot } = useMemo(
    () => buildSlotMaps(board.slots, board.signups),
    [board.slots, board.signups]
  );
  const columns = useMemo(
    () => buildVolunteerDayColumns(board.blocks, board.roles, board.slots),
    [board.blocks, board.roles, board.slots]
  );
  const myCommitments = useMemo(
    () => buildVolunteerCommitments(board, slotsById),
    [board, slotsById]
  );

  function toggleSection(blockId: string) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }

  function toggleColumn(key: VolunteerColumnKey) {
    setCollapsedColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

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

  return (
    <div className="space-y-6">
      <MyVolunteerSummary
        commitments={myCommitments}
        pendingKey={pendingKey}
        onRelease={handleRelease}
      />

      <VolunteerGridScrollArea>
        <div className="flex min-w-max items-stretch">
          {columns.map((column) => {
            if (collapsedColumns.has(column.key)) {
              return (
                <section
                  key={column.key}
                  className="bg-muted/30 w-12 shrink-0 border-l first:border-l-0"
                  aria-label={`${column.key} volunteer roles`}
                >
                  <h2 className="sticky top-0 z-20">
                    <button
                      type="button"
                      onClick={() => toggleColumn(column.key)}
                      aria-expanded={false}
                      aria-label={`Expand ${column.key} column`}
                      title={`Expand ${column.key}`}
                      className="bg-muted hover:bg-muted/80 flex w-full flex-col items-center gap-3 border-b px-1 py-3 transition-colors"
                    >
                      <ChevronsLeftRight className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-bold tracking-wide uppercase [writing-mode:vertical-rl]">
                        {column.key}
                      </span>
                    </button>
                  </h2>
                </section>
              );
            }

            return (
              <section
                key={column.key}
                className="w-72 shrink-0 border-l first:border-l-0"
                aria-label={`${column.key} volunteer roles`}
              >
                <h2 className="sticky top-0 z-20">
                  <button
                    type="button"
                    onClick={() => toggleColumn(column.key)}
                    aria-expanded={true}
                    aria-label={`Collapse ${column.key} column`}
                    title={`Collapse ${column.key}`}
                    className="bg-muted hover:bg-muted/80 flex w-full items-center justify-center gap-1.5 border-b px-3 py-3 text-sm font-bold tracking-wide uppercase transition-colors"
                  >
                    {column.key}
                    <ChevronsRightLeft className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </h2>

                {column.sections.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                    No volunteer roles
                  </p>
                ) : (
                  column.sections.map((section) => {
                    const collapsed = collapsedSections.has(section.block.id);

                    return (
                      <div key={section.block.id}>
                        <h3>
                          <button
                            type="button"
                            onClick={() => toggleSection(section.block.id)}
                            aria-expanded={!collapsed}
                            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${section.blockLabel} roles`}
                            className="hover:bg-muted flex w-full items-center gap-1.5 border-b bg-amber-100/70 px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-700 uppercase transition-colors dark:bg-amber-950/30 dark:text-amber-300"
                          >
                            {collapsed ? (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                            )}
                            {section.blockLabel}
                          </button>
                        </h3>
                        {!collapsed && (
                          <ul>
                            {section.entries.map((entry) => (
                              <VolunteerEntryRow
                                key={entry.slot.id}
                                entry={entry}
                                signup={signupsBySlot.get(entry.slot.id)}
                                currentUserId={board.currentUserId}
                                pendingKey={pendingKey}
                                onClaim={handleClaim}
                                onRelease={handleRelease}
                                onOpenRole={setSelectedRole}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      </VolunteerGridScrollArea>

      <VolunteerRoleDialog
        role={selectedRole}
        onClose={() => setSelectedRole(null)}
      />
    </div>
  );
}

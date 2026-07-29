'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  VolunteerBoardData,
  VolunteerRole,
  VolunteerSignup,
  VolunteerSlot,
} from '@/types';
import { cn } from '@/lib/utils';
import { VolunteerGridScrollArea } from './VolunteerGridScrollArea';
import {
  buildVolunteerColumnLayout,
  type CollapsibleVolunteerDay,
} from './volunteerColumnGroups';
import {
  buildSlotMaps,
  buildVolunteerCommitments,
  keyFor,
  MyVolunteerSummary,
  useVolunteerBoardActions,
  VolunteerNameChip,
  VolunteerRoleDialog,
  VolunteerRoleInfoTrigger,
} from './VolunteerBoardShared';

interface VolunteerBoardClientProps {
  board: VolunteerBoardData;
}

function SignupCell({
  slot,
  signup,
  currentUserId,
  pendingKey,
  onClaim,
  onRelease,
}: {
  slot: VolunteerSlot | undefined;
  signup: VolunteerSignup | undefined;
  currentUserId: string;
  pendingKey: string | null;
  onClaim: (slotId: string) => void;
  onRelease: (signupId: string) => void;
}) {
  if (!slot) {
    return (
      <span className="text-muted-foreground text-sm" aria-label="Unavailable">
        -
      </span>
    );
  }

  if (!signup) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8"
        isLoading={pendingKey === `claim:${slot.id}`}
        onClick={() => onClaim(slot.id)}
      >
        <UserPlus className="h-4 w-4" />
        Volunteer
      </Button>
    );
  }

  const isMine = signup.user_id === currentUserId;

  return (
    <div className="flex min-w-36 flex-col items-center gap-2">
      <VolunteerNameChip displayName={signup.display_name} isMine={isMine} />
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
    </div>
  );
}

function MobileRoleCard({
  role,
  enabledSlots,
  signupsBySlot,
  currentUserId,
  pendingKey,
  onClaim,
  onRelease,
  onOpenRole,
}: {
  role: VolunteerRole;
  enabledSlots: Array<{ blockName: string; slot: VolunteerSlot }>;
  signupsBySlot: Map<string, VolunteerSignup>;
  currentUserId: string;
  pendingKey: string | null;
  onClaim: (slotId: string) => void;
  onRelease: (signupId: string) => void;
  onOpenRole: (role: VolunteerRole) => void;
}) {
  if (enabledSlots.length === 0) return null;

  return (
    <section className="bg-background rounded-lg border p-4 shadow-xs">
      <VolunteerRoleInfoTrigger role={role} onOpen={onOpenRole} />
      <div className="mt-3 space-y-3">
        {enabledSlots.map(({ blockName, slot }) => {
          const signup = signupsBySlot.get(slot.id);
          const isMine = signup?.user_id === currentUserId;

          return (
            <div
              key={slot.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{blockName}</p>
                {signup && (
                  <div className="mt-2">
                    <VolunteerNameChip
                      displayName={signup.display_name}
                      isMine={isMine}
                    />
                  </div>
                )}
              </div>
              {!signup ? (
                <Button
                  type="button"
                  size="sm"
                  isLoading={pendingKey === `claim:${slot.id}`}
                  onClick={() => onClaim(slot.id)}
                >
                  Volunteer
                </Button>
              ) : isMine ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={pendingKey === `release:${signup.id}`}
                  onClick={() => onRelease(signup.id)}
                >
                  Remove
                </Button>
              ) : (
                <Badge variant="secondary">Filled</Badge>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function VolunteerBoardClient({ board }: VolunteerBoardClientProps) {
  const [selectedRole, setSelectedRole] = useState<VolunteerRole | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<
    Set<CollapsibleVolunteerDay>
  >(() => new Set());
  const { pendingKey, handleClaim, handleRelease } = useVolunteerBoardActions();
  const { slotsByCell, slotsById, signupsBySlot } = useMemo(
    () => buildSlotMaps(board.slots, board.signups),
    [board.slots, board.signups]
  );
  const { columns, headerSegments } = useMemo(
    () => buildVolunteerColumnLayout(board.blocks, collapsedDays),
    [board.blocks, collapsedDays]
  );
  const myCommitments = useMemo(
    () => buildVolunteerCommitments(board, slotsById),
    [board, slotsById]
  );

  const enabledSlots = board.slots.length;

  function toggleCollapsedDay(day: CollapsibleVolunteerDay) {
    setCollapsedDays((current) => {
      const next = new Set(current);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  if (enabledSlots === 0) {
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

      <VolunteerGridScrollArea className="hidden md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="bg-muted sticky top-0 left-0 z-30 min-w-56 border-b px-4 py-3 text-left align-middle font-semibold"
              >
                Role
              </th>
              {headerSegments.map((segment, index) =>
                segment.kind === 'day' ? (
                  <th
                    key={segment.day}
                    colSpan={segment.colSpan}
                    className="bg-muted sticky top-0 z-20 h-11 border-b border-l px-3 py-2 text-center"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs font-bold tracking-wide uppercase"
                      aria-label={`${segment.collapsed ? 'Expand' : 'Collapse'} ${segment.day} volunteer columns`}
                      title={`${segment.collapsed ? 'Expand' : 'Collapse'} ${segment.day} columns`}
                      onClick={() => toggleCollapsedDay(segment.day)}
                    >
                      {segment.collapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {segment.day.toUpperCase()}
                      <span className="text-muted-foreground normal-case">
                        {segment.collapsed ? 'Expand' : 'Collapse'}
                      </span>
                    </Button>
                  </th>
                ) : (
                  <th
                    key={`ungrouped-${index}`}
                    colSpan={segment.colSpan}
                    className="bg-muted sticky top-0 z-20 h-11 border-b border-l px-3 py-2"
                    aria-label="Other volunteer blocks"
                  />
                )
              )}
            </tr>
            <tr>
              {columns.map((column) =>
                column.kind === 'block' ? (
                  <th
                    key={column.block.id}
                    className="bg-muted sticky top-11 z-20 min-w-44 border-b border-l px-3 py-3 text-center font-semibold"
                  >
                    {column.block.name}
                  </th>
                ) : (
                  <th
                    key={`collapsed-${column.day}`}
                    className="bg-muted sticky top-11 z-20 min-w-16 border-b border-l px-2 py-3"
                    aria-label={`${column.day} volunteer columns collapsed`}
                  />
                )
              )}
            </tr>
          </thead>
          <tbody>
            {board.roles.map((role) => (
              <tr key={role.id} className="border-b last:border-b-0">
                <th className="bg-background sticky left-0 z-10 min-w-56 px-4 py-3 text-left align-middle font-medium">
                  <VolunteerRoleInfoTrigger
                    role={role}
                    onOpen={setSelectedRole}
                  />
                </th>
                {columns.map((column) => {
                  if (column.kind === 'collapsed-day') {
                    return (
                      <td
                        key={`collapsed-${column.day}`}
                        className="bg-muted/20 h-24 min-w-16 border-l px-2 py-3"
                        aria-label={`${column.day} volunteer columns collapsed`}
                      />
                    );
                  }

                  const slot = slotsByCell.get(
                    keyFor(role.id, column.block.id)
                  );
                  const signup = slot ? signupsBySlot.get(slot.id) : undefined;

                  return (
                    <td
                      key={column.block.id}
                      className={cn(
                        'h-24 min-w-44 border-l px-3 py-3 text-center align-middle',
                        !slot && 'bg-muted/30'
                      )}
                    >
                      <SignupCell
                        slot={slot}
                        signup={signup}
                        currentUserId={board.currentUserId}
                        pendingKey={pendingKey}
                        onClaim={handleClaim}
                        onRelease={handleRelease}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </VolunteerGridScrollArea>

      <div className="space-y-4 md:hidden">
        {board.roles.map((role) => {
          const roleSlots = board.blocks
            .map((block) => {
              const slot = slotsByCell.get(keyFor(role.id, block.id));
              return slot ? { blockName: block.name, slot } : null;
            })
            .filter(
              (slot): slot is { blockName: string; slot: VolunteerSlot } =>
                Boolean(slot)
            );

          return (
            <MobileRoleCard
              key={role.id}
              role={role}
              enabledSlots={roleSlots}
              signupsBySlot={signupsBySlot}
              currentUserId={board.currentUserId}
              pendingKey={pendingKey}
              onClaim={handleClaim}
              onRelease={handleRelease}
              onOpenRole={setSelectedRole}
            />
          );
        })}
      </div>

      <VolunteerRoleDialog
        role={selectedRole}
        onClose={() => setSelectedRole(null)}
      />
    </div>
  );
}

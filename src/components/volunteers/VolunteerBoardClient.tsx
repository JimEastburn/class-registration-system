'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Info,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  claimVolunteerSlot,
  releaseVolunteerSignup,
} from '@/lib/actions/volunteers';
import type {
  VolunteerBoardData,
  VolunteerRole,
  VolunteerSignup,
  VolunteerSlot,
} from '@/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { VolunteerGridScrollArea } from './VolunteerGridScrollArea';
import {
  buildVolunteerColumnLayout,
  type CollapsibleVolunteerDay,
} from './volunteerColumnGroups';

interface VolunteerBoardClientProps {
  board: VolunteerBoardData;
}

type VolunteerCommitment = {
  signupId: string;
  blockName: string;
  blockSortOrder: number;
  roleName: string;
  roleSortOrder: number;
};

function keyFor(roleId: string, blockId: string) {
  return `${roleId}:${blockId}`;
}

function buildSlotMaps(slots: VolunteerSlot[], signups: VolunteerSignup[]) {
  const slotsByCell = new Map<string, VolunteerSlot>();
  const slotsById = new Map<string, VolunteerSlot>();
  const signupsBySlot = new Map<string, VolunteerSignup>();

  for (const slot of slots) {
    slotsByCell.set(keyFor(slot.role_id, slot.block_id), slot);
    slotsById.set(slot.id, slot);
  }

  for (const signup of signups) {
    signupsBySlot.set(signup.slot_id, signup);
  }

  return { slotsByCell, slotsById, signupsBySlot };
}

function VolunteerNameChip({
  displayName,
  isMine,
}: {
  displayName: string;
  isMine: boolean;
}) {
  return (
    <Badge
      variant={isMine ? 'outline' : 'secondary'}
      className={cn(
        'max-w-44 text-center whitespace-normal',
        isMine &&
          'border-amber-400 bg-amber-200 px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm ring-2 ring-amber-300/60'
      )}
    >
      {isMine ? `You: ${displayName}` : displayName}
    </Badge>
  );
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

function MyVolunteerSummary({
  commitments,
  pendingKey,
  onRelease,
}: {
  commitments: VolunteerCommitment[];
  pendingKey: string | null;
  onRelease: (signupId: string) => void;
}) {
  return (
    <section className="rounded-xl border border-amber-300/70 bg-amber-50/70 p-4 shadow-xs dark:border-amber-500/40 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-slate-900">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Your volunteer spots</h2>
          <p className="text-muted-foreground text-sm">
            A quick summary of every block where you have volunteered.
          </p>
        </div>
      </div>

      {commitments.length === 0 ? (
        <div className="bg-background/70 mt-4 rounded-lg border border-dashed border-amber-300 p-4">
          <p className="text-muted-foreground mt-1 text-sm">
            Use the board below to choose a role and block. Anything you claim
            will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {commitments.map((commitment) => (
            <article
              key={commitment.signupId}
              className="bg-background flex flex-col justify-between gap-4 rounded-lg border border-amber-200 p-4 shadow-xs"
            >
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {commitment.blockName}
                </p>
                <p className="mt-1 text-base font-semibold">
                  {commitment.roleName}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                isLoading={pendingKey === `release:${commitment.signupId}`}
                onClick={() => onRelease(commitment.signupId)}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const NO_DESCRIPTION_MESSAGE =
  'No description is available for this role. Please text Jim Eastburn at 512-689-6860 if you have questions or would like more information about this role.';

function VolunteerRoleInfoTrigger({
  role,
  onOpen,
}: {
  role: VolunteerRole;
  onOpen: (role: VolunteerRole) => void;
}) {
  const hasDescription = Boolean(role.description?.trim());

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="focus-visible:ring-ring cursor-pointer rounded-sm text-left font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        onClick={() => onOpen(role)}
      >
        {role.name}
      </button>
      <span
        className={cn('shrink-0', !hasDescription && 'cursor-not-allowed')}
        title={hasDescription ? undefined : NO_DESCRIPTION_MESSAGE}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={`Information about ${role.name}`}
          disabled={!hasDescription}
          onClick={() => onOpen(role)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </span>
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
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<VolunteerRole | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<
    Set<CollapsibleVolunteerDay>
  >(() => new Set());
  const [, startTransition] = useTransition();
  const { slotsByCell, slotsById, signupsBySlot } = useMemo(
    () => buildSlotMaps(board.slots, board.signups),
    [board.slots, board.signups]
  );
  const { columns, headerSegments } = useMemo(
    () => buildVolunteerColumnLayout(board.blocks, collapsedDays),
    [board.blocks, collapsedDays]
  );
  const myCommitments = useMemo(() => {
    const rolesById = new Map(board.roles.map((role) => [role.id, role]));
    const blocksById = new Map(board.blocks.map((block) => [block.id, block]));

    return board.signups
      .filter((signup) => signup.user_id === board.currentUserId)
      .map((signup) => {
        const slot = slotsById.get(signup.slot_id);
        const role = slot ? rolesById.get(slot.role_id) : undefined;
        const block = slot ? blocksById.get(slot.block_id) : undefined;

        if (!slot || !role || !block) return null;

        return {
          signupId: signup.id,
          blockName: block.name,
          blockSortOrder: block.sort_order,
          roleName: role.name,
          roleSortOrder: role.sort_order,
        };
      })
      .filter(
        (commitment): commitment is VolunteerCommitment => commitment !== null
      )
      .sort(
        (first, second) =>
          first.blockSortOrder - second.blockSortOrder ||
          first.roleSortOrder - second.roleSortOrder
      );
  }, [
    board.blocks,
    board.currentUserId,
    board.roles,
    board.signups,
    slotsById,
  ]);

  const enabledSlots = board.slots.length;

  function runAction(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) {
    setPendingKey(key);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          toast.error(result.error ?? 'Something went wrong');
          return;
        }
        toast.success(successMessage);
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  }

  function handleClaim(slotId: string) {
    runAction(
      `claim:${slotId}`,
      () => claimVolunteerSlot(slotId),
      'Volunteer slot claimed'
    );
  }

  function handleRelease(signupId: string) {
    runAction(
      `release:${signupId}`,
      () => releaseVolunteerSignup(signupId),
      'Volunteer signup removed'
    );
  }

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

      <Dialog
        open={Boolean(selectedRole)}
        onOpenChange={(open) => {
          if (!open) setSelectedRole(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRole?.name}</DialogTitle>
            <DialogDescription className="text-left leading-6 whitespace-pre-wrap">
              {selectedRole?.description?.trim() || NO_DESCRIPTION_MESSAGE}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

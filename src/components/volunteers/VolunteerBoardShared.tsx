'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClipboardCheck, Info, UserPlus, X } from 'lucide-react';
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

export const NO_DESCRIPTION_MESSAGE =
  'No description is available for this role. Please text Jim Eastburn at 512-689-6860 if you have questions or would like more information about this role.';

export type VolunteerCommitment = {
  signupId: string;
  blockName: string;
  blockSortOrder: number;
  roleName: string;
  roleSortOrder: number;
};

export function keyFor(roleId: string, blockId: string) {
  return `${roleId}:${blockId}`;
}

export function buildSlotMaps(
  slots: VolunteerSlot[],
  signups: VolunteerSignup[]
) {
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

export function buildVolunteerCommitments(
  board: VolunteerBoardData,
  slotsById: Map<string, VolunteerSlot>
): VolunteerCommitment[] {
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
}

/**
 * Claim/release plumbing shared by every volunteer board layout: one pending
 * key at a time, a toast per outcome, and a refresh so the server data wins.
 */
export function useVolunteerBoardActions() {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  return { pendingKey, handleClaim, handleRelease };
}

export function VolunteerNameChip({
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

export function MyVolunteerSummary({
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

export function VolunteerRoleInfoTrigger({
  role,
  label,
  onOpen,
}: {
  role: VolunteerRole;
  /** Defaults to the role name; v2 appends the block, e.g. `... [Block 1]`. */
  label?: string;
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
        {label ?? role.name}
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

/**
 * One role inside a grid cell: its name (opens the info dialog) plus the
 * claim/name/remove control. Used by the block-row matrix layouts, where the
 * row and column already say which block and day this is.
 */
export function VolunteerCellEntry({
  role,
  slot,
  signup,
  currentUserId,
  pendingKey,
  onClaim,
  onRelease,
  onOpenRole,
}: {
  role: VolunteerRole;
  slot: VolunteerSlot;
  signup: VolunteerSignup | undefined;
  currentUserId: string;
  pendingKey: string | null;
  onClaim: (slotId: string) => void;
  onRelease: (signupId: string) => void;
  onOpenRole: (role: VolunteerRole) => void;
}) {
  const isMine = signup?.user_id === currentUserId;

  return (
    <div className="space-y-1.5">
      <VolunteerRoleInfoTrigger role={role} onOpen={onOpenRole} />
      {!signup ? (
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
      ) : (
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      )}
    </div>
  );
}

export function VolunteerRoleDialog({
  role,
  onClose,
}: {
  role: VolunteerRole | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(role)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{role?.name}</DialogTitle>
          <DialogDescription className="text-left leading-6 whitespace-pre-wrap">
            {role?.description?.trim() || NO_DESCRIPTION_MESSAGE}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

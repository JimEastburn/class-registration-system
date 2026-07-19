'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface VolunteerBoardClientProps {
  board: VolunteerBoardData;
}

function keyFor(roleId: string, blockId: string) {
  return `${roleId}:${blockId}`;
}

function buildSlotMaps(slots: VolunteerSlot[], signups: VolunteerSignup[]) {
  const slotsByCell = new Map<string, VolunteerSlot>();
  const signupsBySlot = new Map<string, VolunteerSignup>();

  for (const slot of slots) {
    slotsByCell.set(keyFor(slot.role_id, slot.block_id), slot);
  }

  for (const signup of signups) {
    signupsBySlot.set(signup.slot_id, signup);
  }

  return { slotsByCell, signupsBySlot };
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
      <Badge
        variant={isMine ? 'default' : 'secondary'}
        className="max-w-44 text-center whitespace-normal"
      >
        {signup.display_name}
      </Badge>
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
}: {
  role: VolunteerRole;
  enabledSlots: Array<{ blockName: string; slot: VolunteerSlot }>;
  signupsBySlot: Map<string, VolunteerSignup>;
  currentUserId: string;
  pendingKey: string | null;
  onClaim: (slotId: string) => void;
  onRelease: (signupId: string) => void;
}) {
  if (enabledSlots.length === 0) return null;

  return (
    <section className="bg-background rounded-lg border p-4 shadow-xs">
      <h2 className="text-base font-semibold">{role.name}</h2>
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
                  <p className="text-muted-foreground mt-1 text-sm">
                    {signup.display_name}
                  </p>
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
  const [, startTransition] = useTransition();
  const { slotsByCell, signupsBySlot } = useMemo(
    () => buildSlotMaps(board.slots, board.signups),
    [board.slots, board.signups]
  );

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
      <div className="bg-background hidden max-h-[calc(100vh-12rem)] overflow-auto rounded-lg border md:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="bg-muted sticky top-0 left-0 z-30 min-w-56 border-b px-4 py-3 text-left font-semibold">
                Role
              </th>
              {board.blocks.map((block) => (
                <th
                  key={block.id}
                  className="bg-muted sticky top-0 z-20 min-w-44 border-b border-l px-3 py-3 text-center font-semibold"
                >
                  {block.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.roles.map((role) => (
              <tr key={role.id} className="border-b last:border-b-0">
                <th className="bg-background sticky left-0 z-10 min-w-56 px-4 py-3 text-left align-middle font-medium">
                  {role.name}
                </th>
                {board.blocks.map((block) => {
                  const slot = slotsByCell.get(keyFor(role.id, block.id));
                  const signup = slot ? signupsBySlot.get(slot.id) : undefined;

                  return (
                    <td
                      key={block.id}
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
      </div>

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
            />
          );
        })}
      </div>
    </div>
  );
}

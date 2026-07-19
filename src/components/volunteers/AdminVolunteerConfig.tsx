'use client';

import { FormEvent, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  createVolunteerBlock,
  createVolunteerRole,
  deleteVolunteerBlock,
  deleteVolunteerRole,
  moveVolunteerBlock,
  moveVolunteerRole,
  renameVolunteerBlock,
  renameVolunteerRole,
  setVolunteerSlotRequired,
} from '@/lib/actions/volunteers';
import type {
  ActionResult,
  VolunteerBlock,
  VolunteerBoardData,
  VolunteerRole,
  VolunteerSignup,
  VolunteerSlot,
} from '@/types';
import { cn } from '@/lib/utils';

type ItemKind = 'role' | 'block';
type EditableItem = VolunteerRole | VolunteerBlock;
type ItemDialogState =
  | { kind: ItemKind; mode: 'create'; item?: undefined }
  | { kind: ItemKind; mode: 'edit'; item: EditableItem };
type DeleteDialogState = { kind: ItemKind; item: EditableItem };

interface AdminVolunteerConfigProps {
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

function itemLabel(kind: ItemKind) {
  return kind === 'role' ? 'role' : 'block';
}

function ItemDialog({
  state,
  pending,
  onOpenChange,
  onSubmit,
}: {
  state: ItemDialogState | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');

  if (!state) return null;

  const label = itemLabel(state.kind);
  const title =
    state.mode === 'create' ? `Add volunteer ${label}` : `Rename ${label}`;
  const defaultName = state.mode === 'edit' ? state.item.name : '';

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={(open) => {
        if (open) setName(defaultName);
        onOpenChange(open);
      }}
    >
      <DialogContent
        onOpenAutoFocus={() => {
          setName(defaultName);
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Names are trimmed and must be unique ignoring case.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            onSubmit(name);
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={label === 'role' ? 'Door Monitor' : 'Tuesday Block 1'}
            aria-label={`Volunteer ${label} name`}
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  state,
  pending,
  onOpenChange,
  onConfirm,
}: {
  state: DeleteDialogState | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  if (!state) return null;

  return (
    <AlertDialog open={Boolean(state)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete volunteer {itemLabel(state.kind)}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes {state.item.name} and any empty configured slots for
            it. Items with occupied slots cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ItemList({
  kind,
  items,
  pendingKey,
  onCreate,
  onEdit,
  onDelete,
  onMove,
}: {
  kind: ItemKind;
  items: EditableItem[];
  pendingKey: string | null;
  onCreate: (kind: ItemKind) => void;
  onEdit: (kind: ItemKind, item: EditableItem) => void;
  onDelete: (kind: ItemKind, item: EditableItem) => void;
  onMove: (
    kind: ItemKind,
    item: EditableItem,
    direction: 'up' | 'down'
  ) => void;
}) {
  const label = itemLabel(kind);

  return (
    <section className="bg-background rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold capitalize">Volunteer {label}s</h2>
          <p className="text-muted-foreground text-sm">
            {items.length} configured
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => onCreate(kind)}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {item.name}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${item.name} up`}
                disabled={
                  index === 0 || pendingKey === `${kind}:move:${item.id}:up`
                }
                onClick={() => onMove(kind, item, 'up')}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${item.name} down`}
                disabled={
                  index === items.length - 1 ||
                  pendingKey === `${kind}:move:${item.id}:down`
                }
                onClick={() => onMove(kind, item, 'down')}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Rename ${item.name}`}
                onClick={() => onEdit(kind, item)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${item.name}`}
                onClick={() => onDelete(kind, item)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminVolunteerConfig({ board }: AdminVolunteerConfigProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [itemDialog, setItemDialog] = useState<ItemDialogState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(
    null
  );
  const [, startTransition] = useTransition();
  const { slotsByCell, signupsBySlot } = useMemo(
    () => buildSlotMaps(board.slots, board.signups),
    [board.slots, board.signups]
  );

  function runAction<T>(
    key: string,
    action: () => Promise<ActionResult<T>>,
    successMessage: string
  ) {
    setPendingKey(key);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(successMessage);
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
  }

  function handleItemSubmit(name: string) {
    if (!itemDialog) return;

    const { kind, mode } = itemDialog;
    const label = itemLabel(kind);
    const key =
      mode === 'create'
        ? `${kind}:create`
        : `${kind}:edit:${itemDialog.item.id}`;
    const action =
      kind === 'role'
        ? mode === 'create'
          ? () => createVolunteerRole(name)
          : () => renameVolunteerRole(itemDialog.item.id, name)
        : mode === 'create'
          ? () => createVolunteerBlock(name)
          : () => renameVolunteerBlock(itemDialog.item.id, name);

    runAction(key, action, `Volunteer ${label} saved`);
    setItemDialog(null);
  }

  function handleDeleteConfirm() {
    if (!deleteDialog) return;

    const { kind, item } = deleteDialog;
    const action =
      kind === 'role'
        ? () => deleteVolunteerRole(item.id)
        : () => deleteVolunteerBlock(item.id);

    runAction(`${kind}:delete:${item.id}`, action, 'Item deleted');
    setDeleteDialog(null);
  }

  function handleMove(
    kind: ItemKind,
    item: EditableItem,
    direction: 'up' | 'down'
  ) {
    const action =
      kind === 'role'
        ? () => moveVolunteerRole(item.id, direction)
        : () => moveVolunteerBlock(item.id, direction);
    runAction(`${kind}:move:${item.id}:${direction}`, action, 'Order updated');
  }

  function handleSlotChange(
    role: VolunteerRole,
    block: VolunteerBlock,
    checked: boolean
  ) {
    runAction(
      `slot:${role.id}:${block.id}`,
      () => setVolunteerSlotRequired(role.id, block.id, checked),
      checked ? 'Slot enabled' : 'Slot disabled'
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ItemList
          kind="role"
          items={board.roles}
          pendingKey={pendingKey}
          onCreate={(kind) => setItemDialog({ kind, mode: 'create' })}
          onEdit={(kind, item) => setItemDialog({ kind, mode: 'edit', item })}
          onDelete={(kind, item) => setDeleteDialog({ kind, item })}
          onMove={handleMove}
        />
        <ItemList
          kind="block"
          items={board.blocks}
          pendingKey={pendingKey}
          onCreate={(kind) => setItemDialog({ kind, mode: 'create' })}
          onEdit={(kind, item) => setItemDialog({ kind, mode: 'edit', item })}
          onDelete={(kind, item) => setDeleteDialog({ kind, item })}
          onMove={handleMove}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Required Slots</h2>
            <p className="text-muted-foreground text-sm">
              Checked cells appear on the volunteer board.
            </p>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            {board.signups.length} filled
          </div>
        </div>

        <div className="bg-background max-h-[calc(100vh-12rem)] overflow-auto rounded-lg border">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="bg-muted sticky top-0 left-0 z-30 min-w-64 border-b px-4 py-3 text-left font-semibold">
                  Role
                </th>
                {board.blocks.map((block) => (
                  <th
                    key={block.id}
                    className="bg-muted sticky top-0 z-20 min-w-36 border-b border-l px-3 py-3 text-center font-semibold"
                  >
                    {block.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.roles.map((role) => (
                <tr key={role.id} className="border-b last:border-b-0">
                  <th className="bg-background sticky left-0 z-10 min-w-64 px-4 py-3 text-left align-middle font-medium">
                    {role.name}
                  </th>
                  {board.blocks.map((block) => {
                    const slot = slotsByCell.get(keyFor(role.id, block.id));
                    const signup = slot
                      ? signupsBySlot.get(slot.id)
                      : undefined;
                    const pending =
                      pendingKey === `slot:${role.id}:${block.id}`;
                    const disabled = Boolean(signup) || pending;

                    return (
                      <td
                        key={block.id}
                        className={cn(
                          'h-24 min-w-36 border-l px-3 py-3 text-center align-middle',
                          !slot && 'bg-muted/20'
                        )}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Checkbox
                            checked={Boolean(slot)}
                            disabled={disabled}
                            aria-label={`${role.name} during ${block.name}`}
                            title={
                              signup
                                ? `Occupied by ${signup.display_name}; remove the signup before disabling this slot.`
                                : undefined
                            }
                            onCheckedChange={(value) =>
                              handleSlotChange(role, block, value === true)
                            }
                          />
                          {signup && (
                            <span className="text-muted-foreground max-w-32 text-xs">
                              {signup.display_name}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ItemDialog
        state={itemDialog}
        pending={Boolean(pendingKey)}
        onOpenChange={(open) => {
          if (!open) setItemDialog(null);
        }}
        onSubmit={handleItemSubmit}
      />
      <DeleteDialog
        state={deleteDialog}
        pending={Boolean(pendingKey)}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

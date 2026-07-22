'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  moveVolunteerSignup,
  removeVolunteerSignupAsAdmin,
  renameVolunteerBlock,
  renameVolunteerRole,
  setVolunteerSlotRequired,
} from '@/lib/actions/volunteers';
import type {
  ActionResult,
  VolunteerActivityLogPage,
  VolunteerBlock,
  VolunteerBoardData,
  VolunteerRole,
  VolunteerSignup,
  VolunteerSlot,
} from '@/types';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VolunteerGridScrollArea } from './VolunteerGridScrollArea';
import {
  buildVolunteerColumnLayout,
  type CollapsibleVolunteerDay,
} from './volunteerColumnGroups';

type ItemKind = 'role' | 'block';
type EditableItem = VolunteerRole | VolunteerBlock;
type ItemDialogState =
  | { kind: ItemKind; mode: 'create'; item?: undefined }
  | { kind: ItemKind; mode: 'edit'; item: EditableItem };
type DeleteDialogState = { kind: ItemKind; item: EditableItem };
type SignupDialogState = { signup: VolunteerSignup };

interface AdminVolunteerConfigProps {
  board: VolunteerBoardData;
  activityLog: VolunteerActivityLogPage | null;
  activityLogError: string | null;
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

function MoveSignupDialog({
  state,
  board,
  pending,
  onOpenChange,
  onSubmit,
}: {
  state: SignupDialogState;
  board: VolunteerBoardData;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (slotId: string) => void;
}) {
  const [slotId, setSlotId] = useState(state.signup.slot_id);

  const roleNames = new Map(board.roles.map((role) => [role.id, role.name]));
  const blockNames = new Map(
    board.blocks.map((block) => [block.id, block.name])
  );
  const occupiedSlotIds = new Set(
    board.signups
      .filter((signup) => signup.id !== state.signup.id)
      .map((signup) => signup.slot_id)
  );
  const userBlockIds = new Set(
    board.signups
      .filter(
        (signup) =>
          signup.id !== state.signup.id &&
          signup.user_id === state.signup.user_id
      )
      .map((signup) => signup.block_id)
  );
  const availableSlots = board.slots.filter(
    (slot) =>
      slot.id === state.signup.slot_id ||
      (!occupiedSlotIds.has(slot.id) && !userBlockIds.has(slot.block_id))
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move volunteer signup</DialogTitle>
          <DialogDescription>
            Choose a new volunteer role and block for{' '}
            {state.signup.display_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label
            htmlFor="volunteer-signup-slot"
            className="text-sm font-medium"
          >
            Volunteer slot
          </label>
          <Select value={slotId} onValueChange={setSlotId}>
            <SelectTrigger id="volunteer-signup-slot">
              <SelectValue placeholder="Select a volunteer slot" />
            </SelectTrigger>
            <SelectContent>
              {availableSlots.map((slot) => (
                <SelectItem key={slot.id} value={slot.id}>
                  {roleNames.get(slot.role_id) ?? 'Unknown role'} —{' '}
                  {blockNames.get(slot.block_id) ?? 'Unknown block'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!slotId || slotId === state.signup.slot_id || pending}
            isLoading={pending}
            onClick={() => onSubmit(slotId)}
          >
            Move signup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveSignupDialog({
  state,
  pending,
  onOpenChange,
  onConfirm,
}: {
  state: SignupDialogState | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  if (!state) return null;

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove volunteer signup?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes {state.signup.display_name} from this volunteer slot.
            They can claim an available slot again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            Remove signup
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

function VolunteerActivityLog({
  activityLog,
  activityLogError,
}: {
  activityLog: VolunteerActivityLogPage | null;
  activityLogError: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('volunteerLogPage', String(page));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Volunteer Activity Log</h2>
        <p className="text-muted-foreground text-sm">
          Claim and removal history from the volunteer board.
        </p>
      </div>

      {activityLogError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          {activityLogError}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Volunteer Role</TableHead>
                  <TableHead className="text-right">Date / Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!activityLog || activityLog.entries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No volunteer activity yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  activityLog.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge
                          variant={
                            entry.action === 'claim' ? 'default' : 'secondary'
                          }
                          className="capitalize"
                        >
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.display_name}
                      </TableCell>
                      <TableCell>{entry.block_name}</TableCell>
                      <TableCell>{entry.role_name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {activityLog && (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activityLog.currentPage <= 1 || isPending}
                onClick={() => handlePageChange(activityLog.currentPage - 1)}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {activityLog.currentPage} of{' '}
                {Math.max(1, activityLog.totalPages)} (Total:{' '}
                {activityLog.totalCount})
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  activityLog.currentPage >= activityLog.totalPages || isPending
                }
                onClick={() => handlePageChange(activityLog.currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function AdminVolunteerConfig({
  board,
  activityLog,
  activityLogError,
}: AdminVolunteerConfigProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [itemDialog, setItemDialog] = useState<ItemDialogState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(
    null
  );
  const [signupDialog, setSignupDialog] = useState<SignupDialogState | null>(
    null
  );
  const [removeSignupDialog, setRemoveSignupDialog] =
    useState<SignupDialogState | null>(null);
  const [optimisticSlots, setOptimisticSlots] = useState<Map<string, boolean>>(
    () => new Map()
  );
  const [collapsedDays, setCollapsedDays] = useState<
    Set<CollapsibleVolunteerDay>
  >(() => new Set());
  const [, startTransition] = useTransition();
  const { slotsByCell, signupsBySlot } = useMemo(
    () => buildSlotMaps(board.slots, board.signups),
    [board.slots, board.signups]
  );
  const { columns, headerSegments } = useMemo(
    () => buildVolunteerColumnLayout(board.blocks, collapsedDays),
    [board.blocks, collapsedDays]
  );

  useEffect(() => {
    setOptimisticSlots((current) => {
      let changed = false;
      const next = new Map(current);

      for (const [cellKey, optimisticChecked] of current) {
        const serverChecked = slotsByCell.has(cellKey);
        if (serverChecked === optimisticChecked) {
          next.delete(cellKey);
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [slotsByCell]);

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
    const cellKey = keyFor(role.id, block.id);
    const pendingSlotKey = `slot:${role.id}:${block.id}`;

    setOptimisticSlots((current) => {
      const next = new Map(current);
      next.set(cellKey, checked);
      return next;
    });

    setPendingKey(pendingSlotKey);
    startTransition(async () => {
      try {
        const result = await setVolunteerSlotRequired(
          role.id,
          block.id,
          checked
        );
        if (!result.success) {
          setOptimisticSlots((current) => {
            const next = new Map(current);
            next.delete(cellKey);
            return next;
          });
          toast.error(result.error);
          return;
        }

        toast.success(checked ? 'Slot enabled' : 'Slot disabled');
        router.refresh();
      } finally {
        setPendingKey(null);
      }
    });
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

  function handleSignupMove(slotId: string) {
    if (!signupDialog) return;
    const { signup } = signupDialog;
    runAction(
      `signup:move:${signup.id}`,
      () => moveVolunteerSignup(signup.id, slotId),
      'Volunteer signup moved'
    );
    setSignupDialog(null);
  }

  function handleSignupRemove() {
    if (!removeSignupDialog) return;
    const { signup } = removeSignupDialog;
    runAction(
      `signup:remove:${signup.id}`,
      () => removeVolunteerSignupAsAdmin(signup.id),
      'Volunteer signup removed'
    );
    setRemoveSignupDialog(null);
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

        <VolunteerGridScrollArea>
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="bg-muted sticky top-0 left-0 z-30 min-w-64 border-b px-4 py-3 text-left align-middle font-semibold"
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
                      className="bg-muted sticky top-11 z-20 min-w-36 border-b border-l px-3 py-3 text-center font-semibold"
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
                  <th className="bg-background sticky left-0 z-10 min-w-64 px-4 py-3 text-left align-middle font-medium">
                    {role.name}
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

                    const cellKey = keyFor(role.id, column.block.id);
                    const slot = slotsByCell.get(cellKey);
                    const signup = slot
                      ? signupsBySlot.get(slot.id)
                      : undefined;
                    const pending =
                      pendingKey === `slot:${role.id}:${column.block.id}`;
                    const disabled = Boolean(signup) || pending;
                    const checked =
                      optimisticSlots.get(cellKey) ?? Boolean(slot);

                    return (
                      <td
                        key={column.block.id}
                        className={cn(
                          'h-24 min-w-36 border-l px-3 py-3 text-center align-middle',
                          !checked && 'bg-muted/20'
                        )}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            aria-label={`${role.name} during ${column.block.name}`}
                            title={
                              signup
                                ? `Occupied by ${signup.display_name}; remove the signup before disabling this slot.`
                                : undefined
                            }
                            onCheckedChange={(value) =>
                              handleSlotChange(
                                role,
                                column.block,
                                value === true
                              )
                            }
                          />
                          {signup && (
                            <div className="flex max-w-32 items-center gap-1">
                              <span className="text-muted-foreground min-w-0 truncate text-xs">
                                {signup.display_name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Move ${signup.display_name}`}
                                onClick={() => setSignupDialog({ signup })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${signup.display_name}`}
                                onClick={() =>
                                  setRemoveSignupDialog({ signup })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </VolunteerGridScrollArea>
      </section>

      <VolunteerActivityLog
        activityLog={activityLog}
        activityLogError={activityLogError}
      />

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
      {signupDialog && (
        <MoveSignupDialog
          key={signupDialog.signup.id}
          state={signupDialog}
          board={board}
          pending={Boolean(pendingKey)}
          onOpenChange={(open) => {
            if (!open) setSignupDialog(null);
          }}
          onSubmit={handleSignupMove}
        />
      )}
      <RemoveSignupDialog
        state={removeSignupDialog}
        pending={Boolean(pendingKey)}
        onOpenChange={(open) => {
          if (!open) setRemoveSignupDialog(null);
        }}
        onConfirm={handleSignupRemove}
      />
    </div>
  );
}

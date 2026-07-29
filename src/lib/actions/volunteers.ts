'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type {
  ActionResult,
  VolunteerActivityLog,
  VolunteerActivityLogPage,
  VolunteerBlock,
  VolunteerBoardData,
  VolunteerRole,
  VolunteerSignup,
  VolunteerSlot,
} from '@/types';
import type { UserRole } from '@/types';

type VolunteerAdminItem = 'role' | 'block';
type MoveDirection = 'up' | 'down';

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must be 120 characters or fewer');

const descriptionSchema = z
  .string()
  .max(1000, 'Description must be 1,000 characters or fewer')
  .transform((description) => {
    const trimmed = description.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const idSchema = z.string().uuid('Invalid id');
const directionSchema = z.enum(['up', 'down']);
const VOLUNTEER_ACTIVITY_LIMIT = 20;

const VOLUNTEER_PATHS = [
  '/volunteer',
  '/volunteer-version-2',
  '/admin/volunteers',
];

function revalidateVolunteerPaths() {
  for (const path of VOLUNTEER_PATHS) {
    revalidatePath(path);
  }
}

function isExactVolunteerAdmin(role: UserRole | string | null | undefined) {
  return role === 'admin' || role === 'super_admin';
}

function hasVolunteerAdminAccess(profile: {
  role?: UserRole | string | null;
  is_volunteer_admin?: boolean | null;
}) {
  return (
    isExactVolunteerAdmin(profile.role) || profile.is_volunteer_admin === true
  );
}

function isVolunteerTester(profile: {
  role?: UserRole | string | null;
  is_volunteer_admin?: boolean | null;
}) {
  return profile.role === 'teacher' || hasVolunteerAdminAccess(profile);
}

function formatDisplayName(profile: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  return [profile.first_name, profile.last_name]
    .map((name) => name?.trim())
    .filter(Boolean)
    .join(' ');
}

function friendlyError(error: unknown, fallback: string) {
  const err = error as { code?: string; message?: string; hint?: string };
  const text = `${err.message ?? ''} ${err.hint ?? ''}`.toLowerCase();

  if (err.code === '23505' || text.includes('duplicate key')) {
    if (text.includes('volunteer_slot_occupied')) {
      return 'This slot was just claimed';
    }
    if (text.includes('volunteer_block_conflict')) {
      return 'This volunteer already has a signup during that block';
    }
    if (text.includes('volunteer_signups_slot_id_key')) {
      return 'This slot was just claimed';
    }
    if (text.includes('volunteer_signups_user_id_block_id_key')) {
      return 'You already volunteer during this block';
    }
    return 'An item with that name already exists';
  }

  if (err.code === '23503' || text.includes('foreign key')) {
    return 'This item has occupied slots';
  }

  if (text.includes('volunteer_name_required')) {
    return 'Your profile needs a first or last name before volunteering';
  }

  if (text.includes('volunteer_admin_required')) {
    return 'Unauthorized';
  }

  if (text.includes('volunteer_signup_not_found')) {
    return 'Volunteer signup not found';
  }

  if (text.includes('volunteer_slot_not_found')) {
    return 'Volunteer slot not found';
  }

  if (text.includes('volunteer_slot_occupied')) {
    return 'This slot was just claimed';
  }

  if (text.includes('volunteer_block_conflict')) {
    return 'This volunteer already has a signup during that block';
  }

  return fallback;
}

async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, is_volunteer_admin')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return { supabase, user, profile: null };
  }

  return { supabase, user, profile };
}

async function requireAuthenticated() {
  const context = await getCurrentProfile();
  if (!context.user || !context.profile) {
    return { ...context, error: 'Not authenticated' };
  }
  return { ...context, error: null };
}

async function requireVolunteerAdmin() {
  const context = await requireAuthenticated();
  if (context.error) return context;
  if (!context.profile || !hasVolunteerAdminAccess(context.profile)) {
    return { ...context, error: 'Unauthorized' };
  }
  return context;
}

async function requireVolunteerTester() {
  const context = await requireAuthenticated();
  if (context.error) return context;
  if (!context.profile || !isVolunteerTester(context.profile)) {
    return { ...context, error: 'Unauthorized' };
  }
  return context;
}

async function getNextSortOrder(item: VolunteerAdminItem) {
  const supabase = await createClient();
  const table = item === 'role' ? 'volunteer_roles' : 'volunteer_blocks';
  const { data } = await supabase
    .from(table)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const currentMax = data?.[0]?.sort_order ?? 0;
  return currentMax + 1;
}

async function nameExists(
  item: VolunteerAdminItem,
  name: string,
  exceptId?: string
) {
  const supabase = await createClient();
  const table = item === 'role' ? 'volunteer_roles' : 'volunteer_blocks';
  let query = supabase.from(table).select('id, name').ilike('name', name);

  if (exceptId) {
    query = query.neq('id', exceptId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return Boolean(
    data?.some((row) => row.name.trim().toLowerCase() === name.toLowerCase())
  );
}

async function getSlotsForItem(item: VolunteerAdminItem, id: string) {
  const supabase = await createClient();
  const column = item === 'role' ? 'role_id' : 'block_id';
  const { data, error } = await supabase
    .from('volunteer_slots')
    .select('id')
    .eq(column, id);

  if (error) throw error;
  return data ?? [];
}

async function hasSignupsForSlots(slotIds: string[]) {
  if (slotIds.length === 0) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('volunteer_signups')
    .select('id')
    .in('slot_id', slotIds)
    .limit(1);

  if (error) throw error;
  return Boolean(data?.length);
}

export async function getVolunteerBoard(): Promise<
  ActionResult<VolunteerBoardData>
> {
  try {
    const context = await requireVolunteerTester();
    if (context.error || !context.user) {
      return { success: false, error: context.error ?? 'Not authenticated' };
    }

    const [rolesRes, blocksRes, slotsRes, signupsRes] = await Promise.all([
      context.supabase
        .from('volunteer_roles')
        .select('*')
        .order('sort_order', { ascending: true }),
      context.supabase
        .from('volunteer_blocks')
        .select('*')
        .order('sort_order', { ascending: true }),
      context.supabase.from('volunteer_slots').select('*'),
      context.supabase
        .from('volunteer_signups')
        .select('*')
        .order('created_at', { ascending: true }),
    ]);

    const error =
      rolesRes.error || blocksRes.error || slotsRes.error || signupsRes.error;
    if (error) {
      console.error('Error fetching volunteer board:', error);
      return { success: false, error: 'Failed to fetch volunteer board' };
    }

    return {
      success: true,
      data: {
        roles: (rolesRes.data ?? []) as VolunteerRole[],
        blocks: (blocksRes.data ?? []) as VolunteerBlock[],
        slots: (slotsRes.data ?? []) as VolunteerSlot[],
        signups: (signupsRes.data ?? []) as VolunteerSignup[],
        currentUserId: context.user.id,
      },
    };
  } catch (error) {
    console.error('Error in getVolunteerBoard:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function getVolunteerActivityLog(
  page = 1
): Promise<ActionResult<VolunteerActivityLogPage>> {
  try {
    const context = await requireVolunteerAdmin();
    if (context.error) return { success: false, error: context.error };

    const currentPage =
      Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const from = (currentPage - 1) * VOLUNTEER_ACTIVITY_LIMIT;
    const to = from + VOLUNTEER_ACTIVITY_LIMIT - 1;

    const { data, error, count } = await context.supabase
      .from('volunteer_activity_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching volunteer activity log:', error);
      return {
        success: false,
        error: 'Failed to fetch volunteer activity log',
      };
    }

    const totalCount = count ?? 0;
    const totalPages = Math.max(
      1,
      Math.ceil(totalCount / VOLUNTEER_ACTIVITY_LIMIT)
    );

    return {
      success: true,
      data: {
        entries: (data ?? []) as VolunteerActivityLog[],
        totalCount,
        currentPage,
        totalPages,
        limit: VOLUNTEER_ACTIVITY_LIMIT,
      },
    };
  } catch (error) {
    console.error('Error in getVolunteerActivityLog:', error);
    return { success: false, error: 'Internal server error' };
  }
}

async function createVolunteerItem<T extends VolunteerRole | VolunteerBlock>(
  item: VolunteerAdminItem,
  rawName: string,
  rawDescription?: string | null
): Promise<ActionResult<T>> {
  try {
    const context = await requireVolunteerAdmin();
    if (context.error) return { success: false, error: context.error };

    const parsed = nameSchema.safeParse(rawName);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    if (await nameExists(item, parsed.data)) {
      return { success: false, error: `That ${item} already exists` };
    }

    const descriptionParsed = descriptionSchema.safeParse(rawDescription ?? '');
    if (item === 'role' && !descriptionParsed.success) {
      return {
        success: false,
        error: descriptionParsed.error.issues[0].message,
      };
    }

    const sortOrder = await getNextSortOrder(item);
    const query =
      item === 'role'
        ? context.supabase
            .from('volunteer_roles')
            .insert({
              name: parsed.data,
              description: descriptionParsed.success
                ? descriptionParsed.data
                : null,
              sort_order: sortOrder,
            })
            .select('*')
        : context.supabase
            .from('volunteer_blocks')
            .insert({ name: parsed.data, sort_order: sortOrder })
            .select('*');
    const { data, error } = await query.single();

    if (error) {
      return {
        success: false,
        error: friendlyError(error, `Failed to create ${item}`),
      };
    }

    revalidateVolunteerPaths();
    return { success: true, data: data as T };
  } catch (error) {
    console.error(`Error creating volunteer ${item}:`, error);
    return { success: false, error: 'Internal server error' };
  }
}

async function renameVolunteerItem<T extends VolunteerRole | VolunteerBlock>(
  item: VolunteerAdminItem,
  id: string,
  rawName: string,
  rawDescription?: string | null
): Promise<ActionResult<T>> {
  try {
    const context = await requireVolunteerAdmin();
    if (context.error) return { success: false, error: context.error };

    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) return { success: false, error: 'Invalid id' };

    const nameParsed = nameSchema.safeParse(rawName);
    if (!nameParsed.success) {
      return { success: false, error: nameParsed.error.issues[0].message };
    }

    if (await nameExists(item, nameParsed.data, id)) {
      return { success: false, error: `That ${item} already exists` };
    }

    const descriptionParsed = descriptionSchema.safeParse(rawDescription ?? '');
    if (item === 'role' && !descriptionParsed.success) {
      return {
        success: false,
        error: descriptionParsed.error.issues[0].message,
      };
    }

    const query =
      item === 'role'
        ? context.supabase
            .from('volunteer_roles')
            .update({
              name: nameParsed.data,
              description: descriptionParsed.success
                ? descriptionParsed.data
                : null,
            })
            .eq('id', id)
            .select('*')
        : context.supabase
            .from('volunteer_blocks')
            .update({ name: nameParsed.data })
            .eq('id', id)
            .select('*');
    const { data, error } = await query.single();

    if (error) {
      return {
        success: false,
        error: friendlyError(error, `Failed to rename ${item}`),
      };
    }

    revalidateVolunteerPaths();
    return { success: true, data: data as T };
  } catch (error) {
    console.error(`Error renaming volunteer ${item}:`, error);
    return { success: false, error: 'Internal server error' };
  }
}

async function deleteVolunteerItem(
  item: VolunteerAdminItem,
  id: string
): Promise<ActionResult> {
  try {
    const context = await requireVolunteerAdmin();
    if (context.error) return { success: false, error: context.error };

    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) return { success: false, error: 'Invalid id' };

    const slots = await getSlotsForItem(item, id);
    const slotIds = slots.map((slot) => slot.id);
    if (await hasSignupsForSlots(slotIds)) {
      return { success: false, error: 'This item has occupied slots' };
    }

    if (slotIds.length > 0) {
      const { error: slotDeleteError } = await context.supabase
        .from('volunteer_slots')
        .delete()
        .in('id', slotIds);
      if (slotDeleteError) {
        return {
          success: false,
          error: friendlyError(slotDeleteError, `Failed to delete ${item}`),
        };
      }
    }

    const table = item === 'role' ? 'volunteer_roles' : 'volunteer_blocks';
    const { error } = await context.supabase.from(table).delete().eq('id', id);

    if (error) {
      return {
        success: false,
        error: friendlyError(error, `Failed to delete ${item}`),
      };
    }

    revalidateVolunteerPaths();
    return { success: true, data: undefined };
  } catch (error) {
    console.error(`Error deleting volunteer ${item}:`, error);
    return { success: false, error: 'Internal server error' };
  }
}

async function moveVolunteerItem(
  item: VolunteerAdminItem,
  id: string,
  direction: MoveDirection
): Promise<ActionResult> {
  try {
    const context = await requireVolunteerAdmin();
    if (context.error) return { success: false, error: context.error };

    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) return { success: false, error: 'Invalid id' };

    const directionParsed = directionSchema.safeParse(direction);
    if (!directionParsed.success) {
      return { success: false, error: 'Invalid move direction' };
    }

    const rpcName =
      item === 'role' ? 'move_volunteer_role' : 'move_volunteer_block';
    const rpcArgs =
      item === 'role'
        ? { p_role_id: id, p_direction: direction }
        : { p_block_id: id, p_direction: direction };

    const { error } = await context.supabase.rpc(rpcName, rpcArgs);
    if (error) {
      return {
        success: false,
        error: friendlyError(error, `Failed to move ${item}`),
      };
    }

    revalidateVolunteerPaths();
    return { success: true, data: undefined };
  } catch (error) {
    console.error(`Error moving volunteer ${item}:`, error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function createVolunteerRole(
  name: string,
  description?: string | null
) {
  return createVolunteerItem<VolunteerRole>('role', name, description);
}

export async function renameVolunteerRole(
  id: string,
  name: string,
  description?: string | null
) {
  return renameVolunteerItem<VolunteerRole>('role', id, name, description);
}

export async function deleteVolunteerRole(id: string) {
  return deleteVolunteerItem('role', id);
}

export async function moveVolunteerRole(id: string, direction: MoveDirection) {
  return moveVolunteerItem('role', id, direction);
}

export async function createVolunteerBlock(name: string) {
  return createVolunteerItem<VolunteerBlock>('block', name);
}

export async function renameVolunteerBlock(id: string, name: string) {
  return renameVolunteerItem<VolunteerBlock>('block', id, name);
}

export async function deleteVolunteerBlock(id: string) {
  return deleteVolunteerItem('block', id);
}

export async function moveVolunteerBlock(id: string, direction: MoveDirection) {
  return moveVolunteerItem('block', id, direction);
}

export async function setVolunteerSlotRequired(
  roleId: string,
  blockId: string,
  required: boolean
): Promise<ActionResult<VolunteerSlot | null>> {
  try {
    const context = await requireVolunteerAdmin();
    if (context.error) return { success: false, error: context.error };

    const roleParsed = idSchema.safeParse(roleId);
    const blockParsed = idSchema.safeParse(blockId);
    if (!roleParsed.success || !blockParsed.success) {
      return { success: false, error: 'Invalid id' };
    }

    const { data: existing, error: existingError } = await context.supabase
      .from('volunteer_slots')
      .select('*')
      .eq('role_id', roleId)
      .eq('block_id', blockId)
      .maybeSingle();

    if (existingError) {
      return { success: false, error: 'Failed to update slot' };
    }

    if (required) {
      if (existing) {
        return { success: true, data: existing as VolunteerSlot };
      }

      const { data, error } = await context.supabase
        .from('volunteer_slots')
        .insert({ role_id: roleId, block_id: blockId })
        .select('*')
        .single();

      if (error) {
        return {
          success: false,
          error: friendlyError(error, 'Failed to enable slot'),
        };
      }

      revalidateVolunteerPaths();
      return { success: true, data: data as VolunteerSlot };
    }

    if (!existing) {
      return { success: true, data: null };
    }

    if (await hasSignupsForSlots([existing.id])) {
      return {
        success: false,
        error: 'This slot already has a volunteer and cannot be disabled',
      };
    }

    const { error } = await context.supabase
      .from('volunteer_slots')
      .delete()
      .eq('id', existing.id);

    if (error) {
      return {
        success: false,
        error: friendlyError(error, 'Failed to disable slot'),
      };
    }

    revalidateVolunteerPaths();
    return { success: true, data: null };
  } catch (error) {
    console.error('Error setting volunteer slot:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function claimVolunteerSlot(
  slotId: string
): Promise<ActionResult<VolunteerSignup>> {
  try {
    const context = await requireVolunteerTester();
    if (context.error || !context.user || !context.profile) {
      return { success: false, error: context.error ?? 'Not authenticated' };
    }

    const parsed = idSchema.safeParse(slotId);
    if (!parsed.success) return { success: false, error: 'Invalid id' };

    const displayName = formatDisplayName(context.profile);
    if (!displayName) {
      return {
        success: false,
        error: 'Your profile needs a first or last name before volunteering',
      };
    }

    const { data: slot, error: slotError } = await context.supabase
      .from('volunteer_slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return { success: false, error: 'This volunteer slot is not available' };
    }

    const { data: existingSlotSignup } = await context.supabase
      .from('volunteer_signups')
      .select('id')
      .eq('slot_id', slotId)
      .maybeSingle();

    if (existingSlotSignup) {
      return { success: false, error: 'This slot was just claimed' };
    }

    const { data: existingBlockSignup } = await context.supabase
      .from('volunteer_signups')
      .select('id')
      .eq('user_id', context.user.id)
      .eq('block_id', slot.block_id)
      .maybeSingle();

    if (existingBlockSignup) {
      return {
        success: false,
        error: 'You already volunteer during this block',
      };
    }

    const { data, error } = await context.supabase
      .from('volunteer_signups')
      .insert({
        slot_id: slotId,
        block_id: slot.block_id,
        user_id: context.user.id,
        display_name: displayName,
      })
      .select('*')
      .single();

    if (error) {
      return {
        success: false,
        error: friendlyError(error, 'Failed to claim volunteer slot'),
      };
    }

    revalidateVolunteerPaths();
    return { success: true, data: data as VolunteerSignup };
  } catch (error) {
    console.error('Error claiming volunteer slot:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function releaseVolunteerSignup(
  signupId: string
): Promise<ActionResult> {
  try {
    const context = await requireVolunteerTester();
    if (context.error || !context.user) {
      return { success: false, error: context.error ?? 'Not authenticated' };
    }

    const parsed = idSchema.safeParse(signupId);
    if (!parsed.success) return { success: false, error: 'Invalid id' };

    const { data: signup, error: signupError } = await context.supabase
      .from('volunteer_signups')
      .select('id, user_id')
      .eq('id', signupId)
      .single();

    if (signupError || !signup) {
      return { success: false, error: 'Volunteer signup not found' };
    }

    if (signup.user_id !== context.user.id) {
      return {
        success: false,
        error: 'You can only remove your own volunteer signup',
      };
    }

    const { error } = await context.supabase
      .from('volunteer_signups')
      .delete()
      .eq('id', signupId)
      .eq('user_id', context.user.id);

    if (error) {
      return {
        success: false,
        error: friendlyError(error, 'Failed to remove volunteer signup'),
      };
    }

    revalidateVolunteerPaths();
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error releasing volunteer signup:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function moveVolunteerSignup(
  signupId: string,
  slotId: string
): Promise<ActionResult<VolunteerSignup>> {
  try {
    const context = await requireVolunteerAdmin();
    if (context.error) return { success: false, error: context.error };

    const signupParsed = idSchema.safeParse(signupId);
    const slotParsed = idSchema.safeParse(slotId);
    if (!signupParsed.success || !slotParsed.success) {
      return { success: false, error: 'Invalid id' };
    }

    const { data, error } = await context.supabase.rpc(
      'move_volunteer_signup',
      {
        p_signup_id: signupId,
        p_slot_id: slotId,
      }
    );

    if (error) {
      return {
        success: false,
        error: friendlyError(error, 'Failed to move volunteer signup'),
      };
    }

    if (!data) {
      return { success: false, error: 'Volunteer signup not found' };
    }

    revalidateVolunteerPaths();
    return { success: true, data: data as VolunteerSignup };
  } catch (error) {
    console.error('Error moving volunteer signup:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function removeVolunteerSignupAsAdmin(
  signupId: string
): Promise<ActionResult> {
  try {
    const context = await requireVolunteerAdmin();
    if (context.error) return { success: false, error: context.error };

    const parsed = idSchema.safeParse(signupId);
    if (!parsed.success) return { success: false, error: 'Invalid id' };

    const { error } = await context.supabase.rpc(
      'remove_volunteer_signup_as_admin',
      { p_signup_id: signupId }
    );

    if (error) {
      return {
        success: false,
        error: friendlyError(error, 'Failed to remove volunteer signup'),
      };
    }

    revalidateVolunteerPaths();
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error removing volunteer signup as admin:', error);
    return { success: false, error: 'Internal server error' };
  }
}

'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { SystemSetting, ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Retrieve a system setting by key.
 * Accessible to authenticated users (RLS permitting).
 */
export async function getSetting(key: string): Promise<ActionResult<SystemSetting | null>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      // PGRST116: JSON object requested, multiple (or no) rows returned
      if (error.code === 'PGRST116') {
         return { success: true, data: null };
      }
      console.error('Error fetching setting:', error);
      return { success: false, error: 'Failed to fetch setting' };
    }
    
    return { success: true, data: data as SystemSetting };

  } catch (error) {
    console.error('Error in getSetting:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Update or create a system setting.
 * Restricted to Admins only.
 */
export async function updateSetting(key: string, value: Record<string, unknown>): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Admin Check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    // 3. Upsert Setting
    const adminClient = await createAdminClient();
    const { error } = await adminClient
      .from('system_settings')
      .upsert({ 
        key, 
        value: value as import('@/types/database').Json,
        // updated_at is handled by trigger 2.5.4, but passing it explicitly ensures freshness
        updated_at: new Date().toISOString() 
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating setting:', error);
      return { success: false, error: 'Failed to update setting' };
    }

    // 4. Audit Log
    await logAdminAction(user.id, 'update_setting', 'system_setting', key, { value });

    revalidatePath('/admin/settings');
    return { success: true, data: undefined };

  } catch (error) {
    console.error('Error in updateSetting:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Internal helper to log admin actions
 */
async function logAdminAction(userId: string, action: string, targetType: string, targetId: string, details: Record<string, unknown> | null = null) {
    const supabase = await createClient();
    try {
        await supabase.from('audit_logs').insert({
            user_id: userId,
            action,
            target_type: targetType,
            target_id: targetId,
            details: details as import('@/types/database').Json
        });
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't fail the main action if audit logging fails, but warn
    }
}

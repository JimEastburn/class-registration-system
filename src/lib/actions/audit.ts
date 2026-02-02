'use server';

import { createAdminClient } from '@/lib/supabase/server';

/**
 * Log an audit action safely bypassing RLS
 * Uses service role client to ensure logs are always written
 */
export async function logAuditAction(
    userId: string,
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, unknown> | null = null
): Promise<void> {
    try {
        const supabase = await createAdminClient();
        await supabase.from('audit_logs').insert({
            user_id: userId,
            action,
            target_type: targetType,
            target_id: targetId,
            details: details || {},
        });
    } catch (error) {
        console.error('Failed to log audit entry:', error);
        // We do not throw here to prevent failing the main action due to logging error
    }
}

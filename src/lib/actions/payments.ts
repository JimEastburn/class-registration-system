'use server';

import { createClient } from '@/lib/supabase/server';
import { Payment } from '@/types';

export interface PaymentWithDetails extends Payment {
    enrollment: {
        student: {
            first_name: string;
            last_name: string;
            parent: {
                email: string;
                first_name: string | null;
                last_name: string | null;
            } | null;
        } | null;
        class: {
            name: string;
        } | null;
    } | null;
}

interface GetAllPaymentsOptions {
    page?: number;
    limit?: number;
    status?: Payment['status'];
    startDate?: string;
    endDate?: string;
}

export async function getAllPayments(
    options: GetAllPaymentsOptions = {}
): Promise<{ data: PaymentWithDetails[]; count: number; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { data: [], count: 0, error: 'Not authenticated' };
        }

        // Check Admin privilege
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

        if (!isAdmin) {
            return { data: [], count: 0, error: 'Access denied: Admin privileges required' };
        }

        const page = options.page || 1;
        const limit = options.limit || 10;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('payments')
            .select(`
                *,
                enrollment:enrollments (
                    student:family_members (
                        first_name,
                        last_name,
                        parent:profiles!family_members_parent_id_fkey (
                            email,
                            first_name,
                            last_name
                        )
                    ),
                    class:classes (
                        name
                    )
                )
            `, { count: 'exact' });

        if (options.status) {
            query = query.eq('status', options.status);
        }

        if (options.startDate) {
            query = query.gte('created_at', options.startDate);
        }

        if (options.endDate) {
            query = query.lte('created_at', options.endDate);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(from, to);

        const { data, count, error } = await query;

        if (error) {
            console.error('Error fetching payments:', error);
            return { data: [], count: 0, error: error.message };
        }

        return { 
            data: data as unknown as PaymentWithDetails[], 
            count: count || 0, 
            error: null 
        };

    } catch (err) {
        console.error('Unexpected error in getAllPayments:', err);
        return { data: [], count: 0, error: 'An unexpected error occurred' };
    }
}

export async function updatePaymentStatus(
    paymentId: string,
    status: Payment['status']
): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Check Admin privilege
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '');

        if (!isAdmin) {
            return { success: false, error: 'Access denied: Admin privileges required' };
        }

        // Get current payment to check existence and for side effects
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            return { success: false, error: 'Payment not found' };
        }

        // Update payment status
        const { error: updateError } = await supabase
            .from('payments')
            .update({ status })
            .eq('id', paymentId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        // Side effect: If marking as completed, confirm the enrollment
        // Only if it wasn't already completed
        if (status === 'completed' && payment.status !== 'completed' && payment.enrollment_id) {
            const { error: enrollError } = await supabase
                .from('enrollments')
                .update({ status: 'confirmed' })
                .eq('id', payment.enrollment_id);

            if (enrollError) {
                console.error('Failed to auto-confirm enrollment:', enrollError);
                // Return success true because payment WAS updated, but include specific error
                return { success: true, error: 'Payment updated, but failed to confirm enrollment' };
            }
        }

        return { success: true, error: null };

    } catch (err) {
        console.error('Unexpected error in updatePaymentStatus:', err);
        return { success: false, error: 'An unexpected error occurred' };
    }
}

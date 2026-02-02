'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { logAuditAction } from '@/lib/actions/audit';
import { sendWaitlistNotification } from '@/lib/email';
import { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

interface ProcessRefundInput {
    paymentId: string;
    amount?: number; // In cents, defaults to full amount if not provided
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export async function processRefund(input: ProcessRefundInput): Promise<ActionResult<{ refundId: string }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // Verify Admin Role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
            return { success: false, error: 'Not authorized to process refunds' };
        }

        // Fetch Payment Details
        const { data: payment } = await supabase
            .from('payments')
            .select('*, enrollment_id')
            .eq('id', input.paymentId)
            .single();

        if (!payment) {
            return { success: false, error: 'Payment not found' };
        }

        if (!payment.transaction_id) {
            return { success: false, error: 'No transaction ID found for this payment (cannot refund)' };
        }

        if (payment.status === 'refunded') {
            return { success: false, error: 'Payment is already refunded' };
        }

        // Process Refund via Stripe
        const refundAmount = input.amount || payment.amount;
        const refund = await stripe.refunds.create({
            payment_intent: payment.transaction_id.startsWith('pi_') ? payment.transaction_id : undefined,
            charge: payment.transaction_id.startsWith('ch_') ? payment.transaction_id : undefined, 
            // Fallback: If it's a checkout session (cs_), we might need to look up the PI. 
            // Often we store PI in transaction_id if possible, or we need to fetch session to get PI.
            // For now, assuming transaction_id works directly or is PI.
            amount: refundAmount,
            reason: input.reason,
        });

        // Update Payment Status in DB
        const { error: updateError } = await supabase
            .from('payments')
            .update({ 
                status: 'refunded',
                updated_at: new Date().toISOString()
            })
            .eq('id', input.paymentId);

        if (updateError) {
             console.error('Failed to update payment status:', updateError);
        }

        // Update Enrollment Status to 'cancelled' if fully refunded?
        // Let's assume refund always cancels enrollment for now unless partial?
        // Update Enrollment Status to 'cancelled'
        if (payment.enrollment_id) {
            // Get class_id first to handle waitlist
            const { data: enrollmentData } = await supabase
                .from('enrollments')
                .select('class_id')
                .eq('id', payment.enrollment_id)
                .single();

            await supabase
                .from('enrollments')
                .update({ status: 'cancelled' })
                .eq('id', payment.enrollment_id);
            
            // Log for audit
            await logAuditAction(user.id, 'enrollment.cancelled_by_refund', 'enrollment', payment.enrollment_id, { paymentId: input.paymentId });

            // Capacity Handling: Promote from Waitlist
            if (enrollmentData?.class_id) {
                 const { data: nextWaitlisted } = await supabase
                    .from('enrollments')
                    .select('*, student:family_members(*), class:classes(*)')
                    .eq('class_id', enrollmentData.class_id)
                    .eq('status', 'waitlisted')
                    .order('waitlist_position', { ascending: true })
                    .limit(1)
                    .single();
                
                 if (nextWaitlisted) {
                     await supabase
                        .from('enrollments')
                        .update({ 
                            status: 'pending', 
                            waitlist_position: null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', nextWaitlisted.id);
                    
                     await logAuditAction(user.id, 'waitlist.promoted_by_refund', 'enrollment', nextWaitlisted.id, { reason: 'Refund initialized vacancy' });

                     // Send Email
                     if (nextWaitlisted.student?.parent_id) {
                         const { data: parent } = await supabase.from('profiles').select('email, first_name, last_name').eq('id', nextWaitlisted.student.parent_id).single();
                         if (parent) {
                             await sendWaitlistNotification({
                                 parentEmail: parent.email,
                                 parentName: `${parent.first_name} ${parent.last_name}`,
                                 studentName: `${nextWaitlisted.student.first_name} ${nextWaitlisted.student.last_name}`,
                                 className: nextWaitlisted.class?.name || 'Unknown Class',
                                 schedule: "Check Dashboard", // TODO: Format schedule better if feasible
                                 startDate: nextWaitlisted.class?.start_date ? new Date(nextWaitlisted.class.start_date).toLocaleDateString() : 'TBA'
                             });
                         }
                     }
                 }
            }
        }

        await logAuditAction(user.id, 'payment.refunded', 'payment', input.paymentId, { amount: refundAmount, refundId: refund.id });
        revalidatePath('/admin/payments');

        return { success: true, data: { refundId: refund.id } };

    } catch (error) {
        console.error('Refund error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Refund failed' };
    }
}

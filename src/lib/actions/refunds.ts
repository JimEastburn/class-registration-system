'use server';

import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { logAuditAction } from '@/lib/actions/audit';
import { promoteFromWaitlist } from '@/lib/actions/waitlist';
import { ActionResult } from '@/types';
import { revalidatePath } from 'next/cache';

interface ProcessRefundInput {
  paymentId: string;
  amount?: number; // In cents, defaults to full amount if not provided
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export async function processRefund(
  input: ProcessRefundInput
): Promise<ActionResult<{ refundId: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify Admin Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      (profile.role !== 'admin' && profile.role !== 'super_admin')
    ) {
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
      return {
        success: false,
        error: 'No transaction ID found for this payment (cannot refund)',
      };
    }

    if (payment.status === 'refunded') {
      return { success: false, error: 'Payment is already refunded' };
    }

    // Process Refund via Stripe
    const refundAmount = input.amount || payment.amount;
    const refund = await stripe.refunds.create({
      payment_intent: payment.transaction_id.startsWith('pi_')
        ? payment.transaction_id
        : undefined,
      charge: payment.transaction_id.startsWith('ch_')
        ? payment.transaction_id
        : undefined,
      amount: refundAmount,
      reason: input.reason,
    });

    // Update Payment Status in DB
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.paymentId);

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
    }

    // Cancel enrollment and promote from waitlist
    if (payment.enrollment_id) {
      // Get class_id first
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
      await logAuditAction(
        user.id,
        'enrollment.cancelled_by_refund',
        'enrollment',
        payment.enrollment_id,
        { paymentId: input.paymentId }
      );

      // Promote next waitlisted student (handles email, audit, reorder)
      if (enrollmentData?.class_id) {
        await promoteFromWaitlist(enrollmentData.class_id);
      }
    }

    await logAuditAction(
      user.id,
      'payment.refunded',
      'payment',
      input.paymentId,
      { amount: refundAmount, refundId: refund.id }
    );
    revalidatePath('/admin/payments');

    return { success: true, data: { refundId: refund.id } };
  } catch (error) {
    console.error('Refund error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund failed',
    };
  }
}

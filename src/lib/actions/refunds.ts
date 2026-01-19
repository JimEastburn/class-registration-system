'use server';

import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { revalidatePath } from 'next/cache';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
});

export type RefundResult = {
    error?: string;
    success?: boolean;
    refundId?: string;
};

export async function processRefund(paymentId: string): Promise<RefundResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check admin role
    if (!user || user.user_metadata?.role !== 'admin') {
        return { error: 'Unauthorized - admin access required' };
    }

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (paymentError || !payment) {
        return { error: 'Payment not found' };
    }

    if (payment.status === 'refunded') {
        return { error: 'Payment has already been refunded' };
    }

    if (payment.status !== 'completed') {
        return { error: 'Only completed payments can be refunded' };
    }

    if (!payment.stripe_payment_id) {
        return { error: 'No Stripe payment ID found - cannot process refund' };
    }

    try {
        // Create refund in Stripe
        const refund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_id,
        });

        // Update payment status in database
        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: 'refunded',
                updated_at: new Date().toISOString(),
            })
            .eq('id', paymentId);

        if (updateError) {
            console.error('Failed to update payment status:', updateError);
            // Still return success since Stripe refund went through
        }

        // Update enrollment status back to pending
        if (payment.enrollment_id) {
            await supabase
                .from('enrollments')
                .update({
                    status: 'pending',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', payment.enrollment_id);
        }

        revalidatePath('/admin/payments');

        return {
            success: true,
            refundId: refund.id,
        };
    } catch (error) {
        console.error('Stripe refund error:', error);
        if (error instanceof Stripe.errors.StripeError) {
            return { error: error.message };
        }
        return { error: 'Failed to process refund' };
    }
}

export async function getRefundDetails(paymentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.role !== 'admin') {
        return null;
    }

    const { data: payment } = await supabase
        .from('payments')
        .select(`
            *,
            enrollment:enrollments(
                student:family_members(first_name, last_name),
                class:classes(name)
            )
        `)
        .eq('id', paymentId)
        .single();

    return payment;
}

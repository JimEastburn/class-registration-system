import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side session verification — belt-and-suspenders alongside webhooks.
 * Called by the checkout success page to ensure the enrollment/payment status
 * is updated even when the Stripe webhook hasn't fired yet (e.g. local dev
 * without `stripe listen`, or webhook delays in production).
 */
export async function POST(request: Request) {
    try {
        const { sessionId, enrollmentId } = await request.json();

        if (!sessionId || !enrollmentId) {
            return NextResponse.json(
                { error: 'sessionId and enrollmentId are required' },
                { status: 400 }
            );
        }

        // Retrieve the Stripe session to verify payment status
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return NextResponse.json({
                verified: false,
                status: session.payment_status,
            });
        }

        // Payment is confirmed — update the database
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check current enrollment status first (idempotent)
        const { data: enrollment } = await supabaseAdmin
            .from('enrollments')
            .select('status')
            .eq('id', enrollmentId)
            .single();

        if (enrollment?.status === 'confirmed') {
            // Already processed (likely by webhook) — nothing to do
            return NextResponse.json({ verified: true, already_confirmed: true });
        }

        // Update enrollment status to confirmed
        await supabaseAdmin
            .from('enrollments')
            .update({ status: 'confirmed' })
            .eq('id', enrollmentId);

        // Update payment record
        const paymentIntentId = session.payment_intent as string;

        await supabaseAdmin
            .from('payments')
            .update({
                status: 'completed',
                paid_at: new Date().toISOString(),
                transaction_id: paymentIntentId || session.id,
                stripe_payment_id: session.id,
            })
            .eq('transaction_id', session.id);

        console.log(
            `[verify-session] Payment verified and enrollment confirmed: ${enrollmentId}`
        );

        return NextResponse.json({ verified: true });
    } catch (error) {
        console.error('[verify-session] Error:', error);
        return NextResponse.json(
            { error: 'Failed to verify session' },
            { status: 500 }
        );
    }
}

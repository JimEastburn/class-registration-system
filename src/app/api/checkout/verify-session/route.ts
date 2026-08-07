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
      .select('status, class_id')
      .eq('id', enrollmentId)
      .single();

    if (enrollment?.status === 'confirmed') {
      // Already processed (likely by webhook) — nothing to do
      return NextResponse.json({ verified: true, already_confirmed: true });
    }

    // Same race the Stripe webhook guards against, but triggered by the
    // parent's browser on return from checkout. Without this check here, the
    // redirect would simply re-create the enrollment the webhook declined to
    // confirm. The payment is still recorded below: the money moved, and the
    // admin refund flow keys off that row.
    let classCancelled = false;
    if (enrollment?.class_id) {
      const { data: enrolledClass } = await supabaseAdmin
        .from('classes')
        .select('status')
        .eq('id', enrollment.class_id)
        .single();
      classCancelled = enrolledClass?.status === 'cancelled';
    }

    if (classCancelled) {
      console.error(
        `[verify-session] Payment verified for enrollment ${enrollmentId} in a cancelled class. Enrollment left cancelled; this payment needs a manual refund.`
      );
    } else {
      // Update enrollment status to confirmed
      await supabaseAdmin
        .from('enrollments')
        .update({ status: 'confirmed' })
        .eq('id', enrollmentId);
    }

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

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

// Create admin client lazily to avoid build-time errors
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: Request) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const enrollmentId = session.metadata?.enrollmentId;

            if (enrollmentId) {
                // Update payment status
                await supabaseAdmin
                    .from('payments')
                    .update({
                        status: 'completed',
                        paid_at: new Date().toISOString(),
                    })
                    .eq('transaction_id', session.id);

                // Update enrollment status to confirmed
                await supabaseAdmin
                    .from('enrollments')
                    .update({ status: 'confirmed' })
                    .eq('id', enrollmentId);

                console.log(`Payment completed for enrollment: ${enrollmentId}`);
            }
            break;
        }

        case 'checkout.session.expired': {
            const session = event.data.object as Stripe.Checkout.Session;

            // Update payment status to failed
            await supabaseAdmin
                .from('payments')
                .update({ status: 'failed' })
                .eq('transaction_id', session.id);

            console.log(`Payment expired for session: ${session.id}`);
            break;
        }

        case 'charge.refunded': {
            const charge = event.data.object as Stripe.Charge;
            const paymentIntentId = charge.payment_intent as string;

            // Find payment by looking up the session
            // Note: In production, you'd want to store the payment intent ID
            console.log(`Refund processed for payment intent: ${paymentIntentId}`);
            break;
        }

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}

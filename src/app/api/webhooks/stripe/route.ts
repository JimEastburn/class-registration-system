import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { sendPaymentReceipt } from '@/lib/email';

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
                // Check if payment is already processed (idempotency)
                const { data: existingPayment } = await supabaseAdmin
                    .from('payments')
                    .select('status, id')
                    .eq('transaction_id', session.id)
                    .single();

                if (existingPayment?.status === 'completed') {
                    console.log(`Payment already processed for session: ${session.id}`);
                    return NextResponse.json({ received: true, already_processed: true });
                }

                // Get the payment ID to trigger Zoho sync
                const { data: updatedPayment } = await supabaseAdmin
                    .from('payments')
                    .update({
                        status: 'completed',
                        paid_at: new Date().toISOString(),
                    })
                    .eq('transaction_id', session.id)
                    .select('id')
                    .single();

                // Update enrollment status to confirmed
                await supabaseAdmin
                    .from('enrollments')
                    .update({ status: 'confirmed' })
                    .eq('id', enrollmentId);

                // Trigger Zoho Sync asynchronously (don't block the webhook response)
                if (updatedPayment?.id) {
                    const { syncPaymentToZoho } = await import('@/lib/zoho');
                    syncPaymentToZoho(updatedPayment.id).catch(err => {
                        console.error('Initial Zoho sync trigger failed:', err);
                    });
                }

                // Fetch enrollment details for email
                const { data: enrollment } = await supabaseAdmin
                    .from('enrollments')
                    .select(`
            student:family_members(first_name, last_name, parent_id),
            class:classes(name, fee)
          `)
                    .eq('id', enrollmentId)
                    .single();

                if (enrollment) {
                    const student = enrollment.student as unknown as {
                        first_name: string;
                        last_name: string;
                        parent_id: string;
                    };
                    const classData = enrollment.class as unknown as {
                        name: string;
                        fee: number;
                    };

                    // Get parent email
                    const { data: parent } = await supabaseAdmin
                        .from('profiles')
                        .select('first_name, email')
                        .eq('id', student.parent_id)
                        .single();

                    if (parent) {
                        await sendPaymentReceipt({
                            parentEmail: parent.email,
                            parentName: parent.first_name,
                            studentName: `${student.first_name} ${student.last_name}`,
                            className: classData.name,
                            amount: classData.fee,
                            paymentDate: new Date().toLocaleDateString(),
                            transactionId: session.id,
                        });
                    }
                }

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

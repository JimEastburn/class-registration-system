import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import {
  sendPaymentReceipt,
  sendEnrollmentConfirmation,
  sendWaitlistNotification,
} from '@/lib/email';
import { notifyTeacherOfUnenrollment } from '@/lib/notifications/teacher-enrollment';
import { notifyEnrollmentCancelled } from '@/lib/notifications/enrollment-cancelled';
import { format } from 'date-fns';

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
        // AND update transaction_id to the PaymentIntent ID (for refunds)
        const paymentIntentId = session.payment_intent as string;

        const { data: updatedPayment } = await supabaseAdmin
          .from('payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            transaction_id: paymentIntentId || session.id, // Store PI if available
            stripe_payment_id: session.id, // Keep session ID ref
          })
          .eq('transaction_id', session.id)
          .select('id')
          .single();

        // A checkout can land after the class was cancelled: the parent had the
        // Stripe page open, or this is a delivery retry. Confirming would put an
        // active enrollment back into a cancelled class, which the
        // on_enrollment_reject_cancelled_class trigger now refuses outright.
        // Checking here means this returns 200 with an actionable log instead of
        // throwing and sending Stripe into a retry loop that can never succeed.
        const { data: enrollmentClass } = await supabaseAdmin
          .from('enrollments')
          .select('class_id')
          .eq('id', enrollmentId)
          .single();

        let classCancelled = false;
        if (enrollmentClass?.class_id) {
          const { data: enrolledClass } = await supabaseAdmin
            .from('classes')
            .select('status')
            .eq('id', enrollmentClass.class_id)
            .single();
          classCancelled = enrolledClass?.status === 'cancelled';
        }

        if (classCancelled) {
          // The payment stays 'completed' deliberately -- the money moved, and
          // the admin refund flow keys off that row.
          console.error(
            `[stripe] Payment ${session.id} landed for enrollment ${enrollmentId} in a cancelled class. Enrollment left cancelled; this payment needs a manual refund.`
          );
        } else {
          // Update enrollment status to confirmed
          await supabaseAdmin
            .from('enrollments')
            .update({ status: 'confirmed' })
            .eq('id', enrollmentId);
        }

        // Trigger Zoho Sync asynchronously (don't block the webhook response)
        if (updatedPayment?.id) {
          const { syncPaymentToZoho } = await import('@/lib/zoho');
          syncPaymentToZoho(updatedPayment.id).catch((err: Error) => {
            console.error('Initial Zoho sync trigger failed:', err);
          });
        }

        // Fetch enrollment details for emails
        const { data: enrollment } = await supabaseAdmin
          .from('enrollments')
          .select(
            `
            student:family_members(first_name, last_name, parent_id),
            class:classes(
                name, 
                fee:price, 
                location, 
                start_date, 
                day, 
                block,
                teacher:profiles(first_name, last_name)
            )
          `
          )
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
            location: string;
            start_date: string;
            day: number;
            block: number;
            teacher: { first_name: string; last_name: string };
          };

          // Get parent email
          const { data: parent } = await supabaseAdmin
            .from('profiles')
            .select('first_name, email')
            .eq('id', student.parent_id)
            .single();

          if (parent) {
            const studentName = `${student.first_name} ${student.last_name}`;

            try {
              // 1. Send Payment Receipt
              await sendPaymentReceipt({
                parentEmail: parent.email,
                parentName: parent.first_name,
                studentName: studentName,
                className: classData.name,
                amount: classData.fee,
                paymentDate: new Date().toLocaleDateString(),
                transactionId: paymentIntentId || session.id,
              });
            } catch (emailError) {
              console.error('Failed to send receipt:', emailError);
            }

            // The receipt above is unconditional -- they were charged either
            // way -- but do not confirm a seat in a class that is not running.
            if (!classCancelled) {
              try {
                // 2. Send Enrollment Confirmation
                const teacherName = classData.teacher
                  ? `${classData.teacher.first_name} ${classData.teacher.last_name}`
                  : 'TBA';

                const startDate = classData.start_date
                  ? format(new Date(classData.start_date), 'MMMM do, yyyy')
                  : 'TBA';

                await sendEnrollmentConfirmation({
                  parentEmail: parent.email,
                  parentName: parent.first_name,
                  studentName: studentName,
                  className: classData.name,
                  teacherName: teacherName,
                  schedule: `Day ${classData.day}, Block ${classData.block}`,
                  location: classData.location || 'TBA',
                  startDate: startDate,
                  fee: classData.fee,
                });
              } catch (emailError) {
                console.error(
                  'Failed to send enrollment confirmation:',
                  emailError
                );
              }
            }
          }
        }

        console.log(`Payment completed for enrollment: ${enrollmentId}`);
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Remove the pending payment record (cancelled checkout)
      await supabaseAdmin
        .from('payments')
        .delete()
        .eq('transaction_id', session.id);

      // Keep enrollment as pending so parent can retry payment
      if (session.metadata?.enrollmentId) {
        await supabaseAdmin
          .from('enrollments')
          .update({ status: 'pending' })
          .eq('id', session.metadata.enrollmentId);
      }

      console.log(`Payment expired for session: ${session.id}`);
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      // Find payment by payment_intent (which we stored in transaction_id)
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('id, status, enrollment_id')
        .eq('transaction_id', paymentIntentId)
        .single();

      if (payment && payment.status !== 'refunded') {
        // Update Payment
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Cancel Enrollment and Handle Waitlist
        if (payment.enrollment_id) {
          // Get class_id and student_id first
          const { data: enrollmentData } = await supabaseAdmin
            .from('enrollments')
            .select('class_id, student_id')
            .eq('id', payment.enrollment_id)
            .single();

          await supabaseAdmin
            .from('enrollments')
            .update({ status: 'cancelled' })
            .eq('id', payment.enrollment_id);

          // A refund cancels the seat, so the family and the teacher both hear
          // about it, same as any other cancellation. This fires for refunds
          // issued outside the app (Stripe dashboard); processRefund() sends its
          // own for admin-initiated ones and marks the payment 'refunded' first,
          // so the guard above stops this block double-sending.
          if (enrollmentData?.class_id && enrollmentData.student_id) {
            await notifyTeacherOfUnenrollment(
              enrollmentData.class_id,
              enrollmentData.student_id
            );
            await notifyEnrollmentCancelled(
              enrollmentData.class_id,
              enrollmentData.student_id
            );
          }

          // Promote from Waitlist (Duplicate logic from refunds.ts, but handled by system/webhook)
          if (enrollmentData?.class_id) {
            const { data: nextWaitlisted } = await supabaseAdmin
              .from('enrollments')
              .select('id, student_id')
              .eq('class_id', enrollmentData.class_id)
              .eq('status', 'waitlisted')
              .order('waitlist_position', { ascending: true })
              .limit(1)
              .single();

            if (nextWaitlisted) {
              await supabaseAdmin
                .from('enrollments')
                .update({
                  status: 'pending',
                  waitlist_position: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', nextWaitlisted.id);

              // Send Waitlist Notification
              // Fetch details
              const { data: waitlistDetails } = await supabaseAdmin
                .from('enrollments')
                .select(
                  `
                                    student:family_members(first_name, last_name, parent_id),
                                    class:classes(name, start_date, day, block)
                                `
                )
                .eq('id', nextWaitlisted.id)
                .single();

              if (waitlistDetails) {
                const student = waitlistDetails.student as unknown as {
                  first_name: string;
                  last_name: string;
                  parent_id: string;
                };
                const classData = waitlistDetails.class as unknown as {
                  name: string;
                  start_date: string;
                  day: number;
                  block: number;
                };

                const { data: parent } = await supabaseAdmin
                  .from('profiles')
                  .select('first_name, email')
                  .eq('id', student.parent_id)
                  .single();

                if (parent) {
                  const startDate = classData.start_date
                    ? format(new Date(classData.start_date), 'MMMM do, yyyy')
                    : 'TBA';

                  await sendWaitlistNotification({
                    parentEmail: parent.email,
                    parentName: parent.first_name,
                    studentName: `${student.first_name} ${student.last_name}`,
                    className: classData.name,
                    schedule: `Day ${classData.day}, Block ${classData.block}`,
                    startDate: startDate,
                  });
                }
              }
            }
          }
        }
        console.log(`Refund processed for payment: ${payment.id}`);

        // Trigger Zoho refund sync (credit note)
        const { syncRefundToZoho } = await import('@/lib/zoho');
        syncRefundToZoho(payment.id).catch((err: Error) => {
          console.error('Zoho refund sync failed:', err);
        });
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

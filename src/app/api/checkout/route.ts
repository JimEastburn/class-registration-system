import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, formatAmountForStripe } from '@/lib/stripe';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { enrollmentId } = await request.json();

        if (!enrollmentId) {
            return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 });
        }

        // Fetch enrollment with class details
        const { data: enrollment } = await supabase
            .from('enrollments')
            .select(`
        id,
        status,
        student:family_members!inner(
          id,
          first_name,
          last_name,
          parent_id
        ),
        class:classes(
          id,
          name,
          fee
        )
      `)
            .eq('id', enrollmentId)
            .single();

        if (!enrollment) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
        }

        // Verify parent owns this enrollment
        const student = enrollment.student as unknown as { parent_id: string; first_name: string; last_name: string };
        if (student.parent_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        if (enrollment.status !== 'pending') {
            return NextResponse.json({ error: 'Enrollment is not in pending status' }, { status: 400 });
        }

        const classData = enrollment.class as unknown as { id: string; name: string; fee: number };

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: classData.name,
                            description: `Enrollment for ${student.first_name} ${student.last_name}`,
                        },
                        unit_amount: formatAmountForStripe(classData.fee),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&enrollment_id=${enrollmentId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
            metadata: {
                enrollmentId: enrollmentId,
                userId: user.id,
            },
        });

        // Create pending payment record
        await supabase.from('payments').insert({
            enrollment_id: enrollmentId,
            amount: classData.fee,
            currency: 'USD',
            status: 'pending',
            provider: 'stripe',
            transaction_id: session.id,
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Checkout session error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}

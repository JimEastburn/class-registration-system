import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const supabase = await createServerClient();
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
          price
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

        const classData = enrollment.class as unknown as { id: string; name: string; price: number };

        // Determine the base URL for redirects
        // Prefer the request origin (where the user currently is) to verify they return to the same environment
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

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
                        unit_amount: 3000, // Fixed $30 for all classes
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&enrollment_id=${enrollmentId}`,
            cancel_url: `${origin}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}&enrollment_id=${enrollmentId}`,
            metadata: {
                enrollmentId: enrollmentId,
                userId: user.id,
            },
        });

        // Create the Supabase Admin client for the insert to ensure we bypass RLS
        // (Though we added an RLS policy, using admin here is safer for server-side logic)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Create pending payment record
        const { error: insertError } = await supabaseAdmin.from('payments').insert({
            enrollment_id: enrollmentId,
            amount: 30, // Fixed $30 for all classes
            currency: 'USD',
            status: 'pending',
            provider: 'stripe',
            transaction_id: session.id,
        });

        if (insertError) {
             console.error('Failed to create payment record:', insertError);
             // We don't block the redirect, but we log it. 
             // Ideally we should probably fail the request, but session is created.
        }

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Checkout session error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}

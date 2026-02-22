'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const enrollmentId = searchParams.get('enrollment_id');
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        async function verifySession() {
            if (!sessionId || !enrollmentId) {
                setVerifying(false);
                return;
            }

            try {
                await fetch('/api/checkout/verify-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, enrollmentId }),
                });
            } catch (error) {
                console.error('Failed to verify session:', error);
            } finally {
                setVerifying(false);
            }
        }

        verifySession();
    }, [sessionId, enrollmentId]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        {verifying ? (
                            <Loader2 className="h-16 w-16 text-muted-foreground animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        )}
                    </div>
                    <CardTitle className="text-2xl">
                        {verifying ? 'Confirming Payment...' : 'Payment Successful!'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {verifying ? (
                        <p className="text-muted-foreground mb-4">
                            Please wait while we confirm your payment with Stripe.
                        </p>
                    ) : (
                        <>
                            <p className="text-muted-foreground mb-4">
                                Thank you for your payment. Your enrollment has been confirmed.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                You can view your enrollment details in the dashboard.
                            </p>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                    <Button asChild disabled={verifying}>
                        <Link href="/parent/enrollments">
                            View Enrollments
                        </Link>
                    </Button>
                    <Button variant="outline" asChild disabled={verifying}>
                        <Link href="/parent">
                            Return to Dashboard
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8">Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}

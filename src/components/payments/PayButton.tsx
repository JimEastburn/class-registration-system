'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { hasCompleteAddress } from '@/lib/actions/profile';
import { AddressModal } from '@/components/payments/AddressModal';

interface PayButtonProps {
    enrollmentId: string;
    className?: string; // Optional
    amount: number;
    compact?: boolean;
}

export default function PayButton({
    enrollmentId,
    className,
    amount,
    compact = false,
}: PayButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddressModal, setShowAddressModal] = useState(false);

    const handlePayment = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsLoading(true);
        setError(null);

        try {
            // Check if user has a billing address before checkout
            const addressComplete = await hasCompleteAddress();
            if (!addressComplete) {
                setShowAddressModal(true);
                setIsLoading(false);
                return;
            }

            await proceedToCheckout();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
            setError(errorMessage);
            if (compact) {
                toast.error(errorMessage);
            }
            setIsLoading(false);
        }
    };

    const proceedToCheckout = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enrollmentId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session');
            }

            // Redirect to Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
            setError(errorMessage);
            if (compact) {
                toast.error(errorMessage);
            }
            setIsLoading(false);
        }
    };

    if (compact) {
        return (<>
            <Button
                onClick={handlePayment}
                disabled={isLoading}
                size="sm"
                className={cn("bg-[#4c7c92] hover:bg-[#3a6174] text-white h-7 px-3 text-xs", className)}
            >
                {isLoading ? '...' : 'Pay'}
            </Button>

            <AddressModal
                open={showAddressModal}
                onComplete={() => {
                    setShowAddressModal(false);
                    proceedToCheckout();
                }}
                onCancel={() => {
                    setShowAddressModal(false);
                    setIsLoading(false);
                }}
            />
        </>);
    }

    return (<>
        <div className={cn("space-y-3", className)}>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}
            <Button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#4c7c92] to-[#9BBFD3]"
            >
                {isLoading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
            </Button>
            <p className="text-xs text-center text-slate-500">
                Secure payment powered by Stripe
            </p>
        </div>

        <AddressModal
            open={showAddressModal}
            onComplete={() => {
                setShowAddressModal(false);
                proceedToCheckout();
            }}
            onCancel={() => {
                setShowAddressModal(false);
                setIsLoading(false);
            }}
        />
    </>);
}

// Payment success/cancel alert component
export function PaymentAlert() {
    const searchParams = useSearchParams();
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const [show] = useState(!!(success || canceled));

    useEffect(() => {
        if (show) {
            // Remove query params after showing alert
            const timer = setTimeout(() => {
                window.history.replaceState({}, '', '/parent/enrollments');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [show]);

    if (!show) return null;

    if (success) {
        return (
            <Card className="border-green-200 bg-green-50 mb-6">
                <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium text-green-800">Payment Successful!</p>
                        <p className="text-sm text-green-600">
                            Your enrollment has been confirmed.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (canceled) {
        return (
            <Card className="border-yellow-200 bg-yellow-50 mb-6">
                <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg
                            className="w-6 h-6 text-yellow-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium text-yellow-800">Payment Canceled</p>
                        <p className="text-sm text-yellow-600">
                            Your enrollment is still pending. You can try again anytime.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return null;
}

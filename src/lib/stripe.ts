import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
});

// Helper to format amount for Stripe (convert dollars to cents)
export function formatAmountForStripe(amount: number): number {
    return Math.round(amount * 100);
}

// Helper to format amount from Stripe (convert cents to dollars)
export function formatAmountFromStripe(amount: number): number {
    return amount / 100;
}

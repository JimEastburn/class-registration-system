import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
});

// Class prices are stored in cents in our DB; Stripe Checkout expects cents.
export function formatAmountForStripe(amount: number): number {
    return Math.round(amount);
}

// Helper to format amount from Stripe (convert cents to dollars)
export function formatAmountFromStripe(amount: number): number {
    return amount / 100;
}

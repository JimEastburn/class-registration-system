/**
 * Currency Formatting Regression Tests
 * 
 * CONVENTION: All monetary values in the database (payments.amount, classes.price)
 * are stored in DOLLARS (e.g., 30 means $30.00), NOT cents.
 * 
 * Stripe API amounts are in CENTS. Use formatAmountForStripe() when sending to Stripe.
 * Use formatAmountFromStripe() when converting Stripe responses for display.
 * 
 * These tests exist because incorrect /100 conversions have been a recurring bug.
 */
import { describe, it, expect } from 'vitest';
import { centsToDollars, formatCurrency } from '@/lib/utils';
import { formatAmountForStripe, formatAmountFromStripe } from '@/lib/stripe';

describe('Currency Formatting — DB Convention Guard', () => {
    // The standard class fee in our system
    const CLASS_FEE_DOLLARS = 30;

    describe('DB amounts are in dollars — never divide by 100', () => {
        it('a $30 payment.amount displays as $30.00', () => {
            expect(formatCurrency(CLASS_FEE_DOLLARS)).toBe('$30.00');
        });

        it('a $30 payment should NOT display as $0.30', () => {
            // This was the recurring bug: dividing dollars by 100
            expect(formatCurrency(CLASS_FEE_DOLLARS)).not.toBe('$0.30');
        });

        it('formats various dollar amounts correctly', () => {
            expect(formatCurrency(0)).toBe('$0.00');
            expect(formatCurrency(30)).toBe('$30.00');
            expect(formatCurrency(100)).toBe('$100.00');
            expect(formatCurrency(29.99)).toBe('$29.99');
        });

        it('does NOT convert when fromCents is false (default)', () => {
            // This is the correct usage for DB values
            expect(formatCurrency(30, false)).toBe('$30.00');
            expect(formatCurrency(30)).toBe('$30.00');
        });
    });

    describe('Stripe conversion helpers', () => {
        it('formatAmountForStripe converts dollars to cents', () => {
            expect(formatAmountForStripe(30)).toBe(3000);
            expect(formatAmountForStripe(0)).toBe(0);
            expect(formatAmountForStripe(29.99)).toBe(2999);
        });

        it('formatAmountFromStripe converts cents to dollars', () => {
            expect(formatAmountFromStripe(3000)).toBe(30);
            expect(formatAmountFromStripe(0)).toBe(0);
            expect(formatAmountFromStripe(2999)).toBe(29.99);
        });

        it('round-trips correctly: dollars → cents → dollars', () => {
            const original = 30;
            const cents = formatAmountForStripe(original);
            const backToDollars = formatAmountFromStripe(cents);
            expect(backToDollars).toBe(original);
        });
    });

    describe('centsToDollars (for Stripe webhook responses only)', () => {
        it('converts cents to dollars', () => {
            expect(centsToDollars(3000)).toBe(30);
            expect(centsToDollars(100)).toBe(1);
            expect(centsToDollars(0)).toBe(0);
        });
    });

    describe('formatCurrency with fromCents flag (for Stripe data only)', () => {
        it('converts from cents when fromCents is true', () => {
            expect(formatCurrency(3000, true)).toBe('$30.00');
            expect(formatCurrency(100, true)).toBe('$1.00');
        });
    });
});

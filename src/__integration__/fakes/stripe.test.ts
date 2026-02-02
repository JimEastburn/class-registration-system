
import { describe, it, expect } from 'vitest';
import { stripeFake } from './stripe';

describe('stripeFake', () => {
  describe('checkout.sessions', () => {
    it('should create a session', async () => {
      const session = await stripeFake.checkout.sessions.create({
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        line_items: [{ price: 'price_123', quantity: 1 }],
        mode: 'payment',
      });
      
      expect(session.id).toBeDefined();
      expect(session.id).toMatch(/^cs_test_/);
      expect(session.url).toBeDefined();
      expect(session.status).toBe('open');
      expect(session.payment_status).toBe('unpaid');
    });

    it('should retrieve a session', async () => {
      const session = await stripeFake.checkout.sessions.retrieve('cs_test_123');
      expect(session.id).toBe('cs_test_123');
      expect(session.payment_status).toBe('paid');
      expect(session.status).toBe('complete');
    });

    it('should expire a session', async () => {
      const session = await stripeFake.checkout.sessions.expire('cs_test_123');
      expect(session.id).toBe('cs_test_123');
      expect(session.status).toBe('expired');
    });
  });

  describe('refunds', () => {
    it('should create a refund', async () => {
      const refund = await stripeFake.refunds.create({
        payment_intent: 'pi_test_123',
        amount: 500,
      });

      expect(refund.id).toMatch(/^re_test_/);
      expect(refund.status).toBe('succeeded');
      expect(refund.amount).toBe(500);
      expect(refund.object).toBe('refund');
    });
  });

  describe('paymentIntents', () => {
    it('should retrieve a payment intent', async () => {
      const pi = await stripeFake.paymentIntents.retrieve('pi_test_123');
      expect(pi.id).toBe('pi_test_123');
      expect(pi.status).toBe('succeeded');
      expect(pi.amount).toBe(1000);
    });

    it('should cancel a payment intent', async () => {
      const pi = await stripeFake.paymentIntents.cancel('pi_test_123');
      expect(pi.id).toBe('pi_test_123');
      expect(pi.status).toBe('canceled');
    });
  });

  describe('customers', () => {
      it('should create a customer', async () => {
          const customer = await stripeFake.customers.create({
              email: 'test@example.com',
              name: 'Test User'
          });
          expect(customer.id).toMatch(/^cus_test_/);
          expect(customer.email).toBe('test@example.com');
      });

      it('should search customers', async () => {
          const result = await stripeFake.customers.search({
              query: 'email:\'test@example.com\''
          });
          expect(result.data).toBeDefined();
          expect(Array.isArray(result.data)).toBe(true);
      });
  });
});

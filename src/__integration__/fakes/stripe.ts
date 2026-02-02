
import { vi } from 'vitest';

/**
 * A fake Stripe client for integration testing.
 * Mocks the methods used in the application.
 */
export const stripeFake = {
  checkout: {
    sessions: {
      create: vi.fn().mockImplementation(async (params) => {
        return {
          id: `cs_test_${crypto.randomUUID()}`,
          url: `https://checkout.stripe.com/test/${crypto.randomUUID()}`,
          payment_status: 'unpaid',
          status: 'open',
          ...params
        };
      }),
      retrieve: vi.fn().mockImplementation(async (id) => ({
        id,
        payment_status: 'paid',
        status: 'complete',
      })),
      expire: vi.fn().mockImplementation(async (id) => ({
        id,
        status: 'expired',
      })),
    },
  },
  refunds: {
    create: vi.fn().mockImplementation(async (params) => {
      return {
        id: `re_test_${crypto.randomUUID()}`,
        status: 'succeeded',
        object: 'refund',
        amount: params.amount,
        currency: 'usd',
        ...params,
      };
    }),
  },
  paymentIntents: {
    retrieve: vi.fn().mockImplementation(async (id) => ({
      id,
      amount: 1000,
      currency: 'usd',
      status: 'succeeded',
    })),
    cancel: vi.fn().mockImplementation(async (id) => ({
      id,
      status: 'canceled',
    })),
  },
  customers: {
    create: vi.fn().mockImplementation(async (params) => ({
        id: `cus_test_${crypto.randomUUID()}`,
        ...params
    })),
    search: vi.fn().mockImplementation(async () => ({
        data: []
    }))
  }
};

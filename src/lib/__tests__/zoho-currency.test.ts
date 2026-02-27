import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally for Zoho API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: 'pay-1',
                amount: 30,
                transaction_id: 'pi_abc123',
                paid_at: '2026-01-15T10:00:00Z',
                created_at: '2026-01-15T09:00:00Z',
                enrollment: {
                  id: 'enr-1',
                  student: {
                    first_name: 'Jane',
                    last_name: 'Doe',
                    parent_id: 'parent-1',
                    grade: '3rd',
                  },
                  class: {
                    name: 'Art 101',
                    price: 30, // DB stores DOLLARS
                    description: 'Intro to art',
                    teacher: {
                      first_name: 'Mr.',
                      last_name: 'Smith',
                    },
                  },
                  parent: {
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@example.com',
                  },
                },
              },
              error: null,
            })
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

describe('Zoho Currency Boundary', () => {
  let syncPaymentToZoho: typeof import('@/lib/zoho').syncPaymentToZoho;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock Zoho OAuth token
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : String(url);

      // OAuth token request
      if (urlStr.includes('accounts.zoho.com/oauth')) {
        return new Response(
          JSON.stringify({ access_token: 'mock-token' }),
          { status: 200 }
        );
      }

      // Find contact (return empty to trigger create)
      if (urlStr.includes('/contacts') && (!options || options.method !== 'POST')) {
        return new Response(
          JSON.stringify({ contacts: [{ contact_id: 'zoho-contact-1' }] }),
          { status: 200 }
        );
      }

      // Create invoice
      if (urlStr.includes('/invoices') && options?.method === 'POST') {
        // Capture the body for assertions
        const body = JSON.parse(options.body as string);
        mockFetch._lastInvoiceBody = body;
        return new Response(
          JSON.stringify({ code: 0, invoice: { invoice_id: 'zoho-inv-1' } }),
          { status: 200 }
        );
      }

      // Record payment
      if (urlStr.includes('/customerpayments') && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        mockFetch._lastPaymentBody = body;
        return new Response(
          JSON.stringify({ code: 0 }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ code: 0 }), { status: 200 });
    });

    // Dynamic import to pick up mocks
    const mod = await import('@/lib/zoho');
    syncPaymentToZoho = mod.syncPaymentToZoho;
  });

  it('should send classes.price as DOLLARS in Zoho invoice rate (not cents)', async () => {
    await syncPaymentToZoho('pay-1');

    const invoiceBody = (mockFetch as unknown as Record<string, unknown>)._lastInvoiceBody as {
      line_items: Array<{ rate: number; quantity: number }>;
    };

    // Zoho rate must be in DOLLARS (30 = $30)
    expect(invoiceBody.line_items[0].rate).toBe(30);
    expect(invoiceBody.line_items[0].rate).not.toBe(3000); // Must NOT send cents
    expect(invoiceBody.line_items[0].rate).not.toBe(0.3); // Must NOT double-convert
  });

  it('should send payment.amount as DOLLARS in Zoho customer payment (not cents)', async () => {
    await syncPaymentToZoho('pay-1');

    const paymentBody = (mockFetch as unknown as Record<string, unknown>)._lastPaymentBody as {
      amount: number;
      invoices: Array<{ amount_applied: number }>;
    };

    // Zoho payment amount must be in DOLLARS (30 = $30)
    expect(paymentBody.amount).toBe(30);
    expect(paymentBody.amount).not.toBe(3000); // Must NOT send cents
    expect(paymentBody.invoices[0].amount_applied).toBe(30);
  });
});

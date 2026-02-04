-- Add missing columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS transaction_id text UNIQUE,
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS stripe_payment_id text;

-- Add index on transaction_id for faster lookups in webhooks
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);

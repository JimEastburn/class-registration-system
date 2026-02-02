CREATE TYPE public."PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  stripe_payment_intent TEXT, -- ID from Stripe
  amount DECIMAL(10, 2) NOT NULL,
  status public."PaymentStatus" NOT NULL DEFAULT 'pending',
  sync_status TEXT DEFAULT 'pending', -- For external sync logic (e.g. Zoho)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS 'Payment records linked to enrollments';

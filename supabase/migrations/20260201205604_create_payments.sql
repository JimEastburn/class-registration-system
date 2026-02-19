-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  stripe_payment_intent TEXT,
  amount NUMERIC NOT NULL,
  status "PaymentStatus" NOT NULL DEFAULT 'pending',
  sync_status TEXT DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

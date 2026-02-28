ALTER TABLE public.enrollments
  ADD COLUMN deposit_paid boolean NOT NULL DEFAULT false;

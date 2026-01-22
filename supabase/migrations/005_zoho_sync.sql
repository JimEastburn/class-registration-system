-- Migration: 005_zoho_sync
-- Description: Add Zoho Books synchronization tracking to payments
-- Created: 2026-01-20

-- Add columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS zoho_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Create index for sync status to help with background retries
CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON public.payments(sync_status) WHERE sync_status = 'failed' OR sync_status = 'pending';

-- COMMENT ON COLUMN
COMMENT ON COLUMN public.payments.sync_status IS 'Status of synchronization with Zoho Books';
COMMENT ON COLUMN public.payments.zoho_invoice_id IS 'The ID of the corresponding invoice in Zoho Books';
COMMENT ON COLUMN public.payments.sync_error IS 'Last error message encountered during Zoho sync';

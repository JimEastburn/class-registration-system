-- Make created_at and updated_at NOT NULL across all tables.
-- All these columns have DEFAULT now() and are never null in practice.
-- This ensures the generated TypeScript types match the application's assumption
-- that timestamps are always present.

-- Backfill any potential nulls (safety net)
DO $$
DECLARE
  tbl text;
  col text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['audit_logs','calendar_events','class_blocks','class_materials','classes','enrollments','family_members','payments'])
  LOOP
    FOR col IN SELECT unnest(ARRAY['created_at','updated_at'])
    LOOP
      -- Only update if column exists on this table
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = col
      ) THEN
        EXECUTE format('UPDATE public.%I SET %I = now() WHERE %I IS NULL', tbl, col, col);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- audit_logs
ALTER TABLE public.audit_logs
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

-- calendar_events
ALTER TABLE public.calendar_events
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

-- class_blocks
ALTER TABLE public.class_blocks
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='class_blocks' AND column_name='updated_at') THEN
    EXECUTE 'ALTER TABLE public.class_blocks ALTER COLUMN updated_at SET DEFAULT now(), ALTER COLUMN updated_at SET NOT NULL';
  END IF;
END $$;

-- class_materials
ALTER TABLE public.class_materials
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

-- classes
ALTER TABLE public.classes
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.classes
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- enrollments
ALTER TABLE public.enrollments
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.enrollments
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- family_members
ALTER TABLE public.family_members
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

-- payments
ALTER TABLE public.payments
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

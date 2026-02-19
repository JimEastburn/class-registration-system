-- Create system_settings table
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Generate schedule text function
CREATE OR REPLACE FUNCTION public.generate_schedule_text(
  p_recurrence_pattern text,
  p_recurrence_days text[],
  p_recurrence_time time without time zone,
  p_recurrence_duration integer
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    days_text TEXT;
    time_text TEXT;
    duration_text TEXT;
BEGIN
    IF p_recurrence_pattern = 'none' OR p_recurrence_pattern IS NULL THEN
        RETURN NULL;
    END IF;
    IF p_recurrence_days IS NOT NULL AND array_length(p_recurrence_days, 1) > 0 THEN
        days_text := array_to_string(ARRAY(SELECT initcap(unnest(p_recurrence_days))), ', ');
    ELSE
        days_text := initcap(p_recurrence_pattern);
    END IF;
    IF p_recurrence_time IS NOT NULL THEN
        time_text := to_char(p_recurrence_time, 'HH:MI AM');
    ELSE
        time_text := 'TBD';
    END IF;
    IF p_recurrence_duration IS NOT NULL THEN
        IF p_recurrence_duration >= 60 THEN
            duration_text := (p_recurrence_duration / 60)::TEXT || ' hour' || CASE WHEN p_recurrence_duration >= 120 THEN 's' ELSE '' END;
        ELSE
            duration_text := p_recurrence_duration::TEXT || ' min';
        END IF;
    ELSE
        duration_text := '';
    END IF;
    RETURN days_text || ' at ' || time_text || CASE WHEN duration_text != '' THEN ' (' || duration_text || ')' ELSE '' END;
END;
$function$;

-- Get next waitlist position
CREATE OR REPLACE FUNCTION public.get_next_waitlist_position(p_class_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    next_pos INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_pos
    FROM public.waitlist
    WHERE class_id = p_class_id AND status = 'waiting';
    RETURN next_pos;
END;
$function$;

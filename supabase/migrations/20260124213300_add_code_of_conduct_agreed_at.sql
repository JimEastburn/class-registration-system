-- Add column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS code_of_conduct_agreed_at TIMESTAMPTZ;

-- Update handle_new_user function to capture the timestamp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, first_name, last_name, code_of_conduct_agreed_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        (NEW.raw_user_meta_data->>'code_of_conduct_agreed_at')::TIMESTAMPTZ
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =================================================================================
-- CLASS REGISTRATION SYSTEM - FULL DATABASE SCHEMA
-- This script recreates the entire database structure (excluding data).
-- Use seed.sql to populate the database after running this script.
-- =================================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DROP TABLE IF EXISTS public.class_materials CASCADE;
-- DROP TABLE IF EXISTS public.waitlist CASCADE;
-- DROP TABLE IF EXISTS public.payments CASCADE;
-- DROP TABLE IF EXISTS public.enrollments CASCADE;
-- DROP TABLE IF EXISTS public.classes CASCADE;
-- DROP TABLE IF EXISTS public.family_members CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Cleanup utility: Drop all policies on a table
-- This ensures no stale policies from previous versions interfere
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'family_members', 'classes', 'enrollments', 'payments', 'waitlist', 'class_materials')) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ============================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('parent', 'teacher', 'student', 'admin', 'class_scheduler')),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT, -- For teachers
    specializations TEXT[], -- For teachers
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1.1 Secure Admin Check Function
-- Defined here so it can be used in policies immediately
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Profiles policies
CREATE POLICY "Profiles - Self access" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles - Teacher public view" ON public.profiles FOR SELECT TO public USING (role = 'teacher');
CREATE POLICY "Profiles - Admin and Service Role bypass" ON public.profiles FOR ALL TO authenticated, service_role 
    USING (is_admin() OR current_role = 'service_role')
    WITH CHECK (is_admin() OR current_role = 'service_role');
CREATE POLICY "Service role manage profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin metadata manage profiles" ON public.profiles FOR ALL TO authenticated 
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- 2. FAMILY_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Links student account to family member
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    grade_level TEXT CHECK (grade_level IN ('6', '7', '8', '9', '10', '11', '12')),
    relationship TEXT NOT NULL CHECK (relationship IN ('child', 'spouse', 'guardian', 'other')),
    birth_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_family_members_parent ON public.family_members(parent_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Family members policies
CREATE POLICY "Family - Parent manage own" ON public.family_members FOR ALL TO authenticated USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Family - Student view self" ON public.family_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Family - Admin and Service Role bypass" ON public.family_members FOR ALL TO authenticated, service_role 
    USING (is_admin() OR current_role = 'service_role')
    WITH CHECK (is_admin() OR current_role = 'service_role');
CREATE POLICY "Family - Teachers view enrolled" ON public.family_members FOR SELECT TO authenticated USING (is_teacher_of_student(id));

-- ============================================
-- 3. CLASSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
    location TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule TEXT NOT NULL, -- Human readable schedule e.g., "Mon/Wed 3:00 PM - 4:30 PM"
    max_students INTEGER NOT NULL CHECK (max_students > 0),
    current_enrollment INTEGER DEFAULT 0 NOT NULL,
    fee DECIMAL(10, 2) NOT NULL CHECK (fee >= 0),
    syllabus TEXT,
    
    -- Recurring Schedule Fields (Combined from migration 005)
    recurrence_pattern TEXT DEFAULT 'none' CHECK (recurrence_pattern IN ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
    recurrence_days TEXT[], -- Array of days: ['monday', 'wednesday', 'friday']
    recurrence_time TIME,
    recurrence_duration INTEGER, -- In minutes
    recurrence_end_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON public.classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_dates ON public.classes(start_date, end_date);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Classes policies
CREATE POLICY "Classes - Public view active" ON public.classes FOR SELECT TO public USING (status = 'active');
CREATE POLICY "Classes - Teacher manage own" ON public.classes FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Classes - Admin and Service Role bypass" ON public.classes FOR ALL TO authenticated, service_role 
    USING (is_admin() OR current_role = 'service_role')
    WITH CHECK (is_admin() OR current_role = 'service_role');

-- ============================================
-- 4. ENROLLMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Enrollments policies
CREATE POLICY "Enrollments - Parent manage family" ON public.enrollments FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = student_id AND fm.parent_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = student_id AND fm.parent_id = auth.uid()));
CREATE POLICY "Enrollments - Student view own" ON public.enrollments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = student_id AND fm.user_id = auth.uid()));
CREATE POLICY "Enrollments - Teacher view class" ON public.enrollments FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Enrollments - Admin and Service Role bypass" ON public.enrollments FOR ALL TO authenticated, service_role 
    USING (is_admin() OR current_role = 'service_role')
    WITH CHECK (is_admin() OR current_role = 'service_role');

-- ============================================
-- 5. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
    transaction_id TEXT,
    paid_at TIMESTAMPTZ,
    
    -- Zoho Sync Fields (Combined from migration 005)
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    zoho_invoice_id TEXT,
    sync_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON public.payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON public.payments(sync_status) WHERE sync_status = 'failed' OR sync_status = 'pending';
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Payments - Parent view family" ON public.payments FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.enrollments e JOIN public.family_members fm ON fm.id = e.student_id WHERE e.id = enrollment_id AND fm.parent_id = auth.uid()));
CREATE POLICY "Payments - Teacher view class" ON public.payments FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.enrollments e JOIN public.classes c ON c.id = e.class_id WHERE e.id = enrollment_id AND c.teacher_id = auth.uid()));
CREATE POLICY "Payments - Admin and Service Role bypass" ON public.payments FOR ALL TO authenticated, service_role 
    USING (is_admin() OR current_role = 'service_role')
    WITH CHECK (is_admin() OR current_role = 'service_role');

-- ============================================
-- 6. WAITLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'enrolled', 'expired', 'cancelled')),
    notified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_class_id ON public.waitlist(class_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_parent_id ON public.waitlist(parent_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Waitlist policies
CREATE POLICY "Waitlist - Parent manage own" ON public.waitlist FOR ALL TO authenticated USING (auth.uid() = parent_id) WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Waitlist - Service role and admin bypass" ON public.waitlist FOR ALL TO service_role, authenticated 
    USING (current_role = 'service_role' OR is_admin())
    WITH CHECK (current_role = 'service_role' OR is_admin());

-- ============================================
-- 7. FAMILY_MEMBER_INVITES TABLE
-- ============================================
CREATE TABLE public.family_member_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_member_invites_code ON public.family_member_invites(code);
CREATE INDEX idx_family_member_invites_family_member ON public.family_member_invites(family_member_id);
ALTER TABLE public.family_member_invites ENABLE ROW LEVEL SECURITY;

-- Invites policies
CREATE POLICY "Invites - Parent manage own" ON public.family_member_invites FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = family_member_id AND fm.parent_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.id = family_member_id AND fm.parent_id = auth.uid()));
CREATE POLICY "Invites - Student redeem by code" ON public.family_member_invites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Invites - Admin and Service Role bypass" ON public.family_member_invites FOR ALL TO authenticated, service_role 
    USING (is_admin() OR current_role = 'service_role')
    WITH CHECK (is_admin() OR current_role = 'service_role');

-- ============================================
-- 7. CLASS_MATERIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.class_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'doc', 'image', 'video', 'link', 'other'
    file_size INTEGER, -- Size in bytes
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_materials_class_id ON public.class_materials(class_id);
CREATE INDEX IF NOT EXISTS idx_class_materials_uploaded_by ON public.class_materials(uploaded_by);
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;

-- Class Materials policies
DROP POLICY IF EXISTS "Teachers can manage their class materials" ON public.class_materials;
CREATE POLICY "Teachers can manage their class materials" ON public.class_materials FOR ALL USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_materials.class_id AND classes.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Enrolled students can view public materials" ON public.class_materials;
CREATE POLICY "Enrolled students can view public materials" ON public.class_materials FOR SELECT USING (is_public = true AND EXISTS (SELECT 1 FROM public.enrollments e JOIN public.family_members fm ON fm.id = e.student_id WHERE e.class_id = class_materials.class_id AND e.status IN ('confirmed', 'completed') AND fm.parent_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all materials" ON public.class_materials;
CREATE POLICY "Admins can manage all materials" ON public.class_materials FOR ALL USING (is_admin());

-- ============================================
-- 8. FUNCTIONS AND TRIGGERS
-- ============================================

-- Robust handles new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle enrollment counts
CREATE OR REPLACE FUNCTION public.update_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE public.classes SET current_enrollment = current_enrollment + 1 WHERE id = NEW.class_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            UPDATE public.classes SET current_enrollment = current_enrollment + 1 WHERE id = NEW.class_id;
        ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE public.classes SET current_enrollment = current_enrollment - 1 WHERE id = NEW.class_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        UPDATE public.classes SET current_enrollment = current_enrollment - 1 WHERE id = OLD.class_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Utility: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Waitlist: Get next position
CREATE OR REPLACE FUNCTION public.get_next_waitlist_position(p_class_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_pos INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_pos
    FROM public.waitlist
    WHERE class_id = p_class_id AND status = 'waiting';
    RETURN next_pos;
END;
$$ LANGUAGE plpgsql;

-- Schedule: generate schedule text helper
CREATE OR REPLACE FUNCTION public.generate_schedule_text(
    p_recurrence_pattern TEXT,
    p_recurrence_days TEXT[],
    p_recurrence_time TIME,
    p_recurrence_duration INTEGER
)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- RLS Fix: Check if teacher teaches student
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(check_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = check_student_id
    AND c.teacher_id = auth.uid()
  );
$$;

-- Create the refined family_member policy using the function
DROP POLICY IF EXISTS "Teachers can view students enrolled in their classes" ON public.family_members;
CREATE POLICY "Teachers can view students enrolled in their classes"
ON public.family_members FOR SELECT TO public USING (is_teacher_of_student(id));

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enrollment count trigger
DROP TRIGGER IF EXISTS update_class_enrollment_count ON public.enrollments;
CREATE TRIGGER update_class_enrollment_count
    AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_count();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_family_members_updated_at ON public.family_members;
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_classes_updated_at ON public.classes;
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_enrollments_updated_at ON public.enrollments;
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_waitlist_updated_at ON public.waitlist;
CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON public.waitlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_class_materials_updated_at ON public.class_materials;
CREATE TRIGGER update_class_materials_updated_at BEFORE UPDATE ON public.class_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 10. COMMENTS
-- ============================================
COMMENT ON COLUMN public.payments.sync_status IS 'Status of synchronization with Zoho Books';
COMMENT ON COLUMN public.payments.zoho_invoice_id IS 'The ID of the corresponding invoice in Zoho Books';
COMMENT ON COLUMN public.payments.sync_error IS 'Last error message encountered during Zoho sync';
COMMENT ON TABLE public.class_materials IS 'Stores metadata for class materials and resources uploaded by teachers';

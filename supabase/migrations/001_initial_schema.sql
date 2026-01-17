-- Migration: 001_initial_schema
-- Description: Create initial database schema for class registration system
-- Created: 2026-01-17

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('parent', 'teacher', 'student', 'admin')),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT, -- For teachers
    specializations TEXT[], -- For teachers
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for role-based queries
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Public can view teacher profiles"
    ON public.profiles FOR SELECT
    USING (role = 'teacher');

-- ============================================
-- FAMILY_MEMBERS TABLE
-- ============================================
CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    grade_level TEXT CHECK (grade_level IN ('6', '7', '8', '9', '10', '11', '12')),
    relationship TEXT NOT NULL CHECK (relationship IN ('child', 'spouse', 'guardian', 'other')),
    birth_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for parent lookups
CREATE INDEX idx_family_members_parent ON public.family_members(parent_id);

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Family members policies
CREATE POLICY "Parents can view their own family members"
    ON public.family_members FOR SELECT
    USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert their own family members"
    ON public.family_members FOR INSERT
    WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update their own family members"
    ON public.family_members FOR UPDATE
    USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their own family members"
    ON public.family_members FOR DELETE
    USING (auth.uid() = parent_id);

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
    location TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule TEXT NOT NULL, -- e.g., "Mon/Wed 3:00 PM - 4:30 PM"
    max_students INTEGER NOT NULL CHECK (max_students > 0),
    current_enrollment INTEGER DEFAULT 0 NOT NULL,
    fee DECIMAL(10, 2) NOT NULL CHECK (fee >= 0),
    syllabus TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes
CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX idx_classes_status ON public.classes(status);
CREATE INDEX idx_classes_dates ON public.classes(start_date, end_date);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Classes policies
CREATE POLICY "Anyone can view active classes"
    ON public.classes FOR SELECT
    USING (status = 'active');

CREATE POLICY "Teachers can view all their own classes"
    ON public.classes FOR SELECT
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own classes"
    ON public.classes FOR INSERT
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own classes"
    ON public.classes FOR UPDATE
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own draft classes"
    ON public.classes FOR DELETE
    USING (auth.uid() = teacher_id AND status = 'draft');

-- ============================================
-- ENROLLMENTS TABLE
-- ============================================
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(student_id, class_id)
);

-- Create indexes
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_class ON public.enrollments(class_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);

-- Enable RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Enrollments policies (parents can manage enrollments for their children)
CREATE POLICY "Parents can view enrollments for their children"
    ON public.enrollments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = student_id AND fm.parent_id = auth.uid()
        )
    );

CREATE POLICY "Parents can insert enrollments for their children"
    ON public.enrollments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = student_id AND fm.parent_id = auth.uid()
        )
    );

CREATE POLICY "Parents can update enrollments for their children"
    ON public.enrollments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.id = student_id AND fm.parent_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view enrollments for their classes"
    ON public.enrollments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = class_id AND c.teacher_id = auth.uid()
        )
    );

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
    transaction_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_payments_enrollment ON public.payments(enrollment_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Parents can view payments for their enrollments"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.family_members fm ON fm.id = e.student_id
            WHERE e.id = enrollment_id AND fm.parent_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can view payments for their class enrollments"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.classes c ON c.id = e.class_id
            WHERE e.id = enrollment_id AND c.teacher_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to handle new user registration
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
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update enrollment count
CREATE OR REPLACE FUNCTION public.update_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE public.classes SET current_enrollment = current_enrollment + 1
        WHERE id = NEW.class_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            UPDATE public.classes SET current_enrollment = current_enrollment + 1
            WHERE id = NEW.class_id;
        ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE public.classes SET current_enrollment = current_enrollment - 1
            WHERE id = NEW.class_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        UPDATE public.classes SET current_enrollment = current_enrollment - 1
        WHERE id = OLD.class_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to maintain enrollment count
CREATE TRIGGER update_class_enrollment_count
    AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

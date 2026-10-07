-- ============================================================================
-- GymTrack Pro — Complete Database Schema & Migration Script
-- Compatible with Supabase PostgreSQL
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'trainer', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE membership_plan AS ENUM ('monthly', 'quarterly', 'half_yearly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'expired', 'frozen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workout_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'client')),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    photo_url TEXT,
    age INTEGER,
    gender TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. GYMS TABLE
CREATE TABLE IF NOT EXISTS public.gyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    qr_secret TEXT NOT NULL,
    qr_last_rotated DATE NOT NULL DEFAULT CURRENT_DATE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    assigned_trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'half_yearly', 'yearly')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'frozen')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'client')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. HEALTH RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    weight_kg NUMERIC(5, 2),
    height_cm NUMERIC(5, 2),
    bmi NUMERIC(4, 1),
    body_fat_pct NUMERIC(4, 1),
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    heart_rate INTEGER,
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. WORKOUT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    goal TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TEMPLATE EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public.template_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    exercise_name TEXT NOT NULL,
    muscle_group TEXT,
    sets INTEGER,
    reps INTEGER,
    weight_kg NUMERIC(5, 2),
    rest_seconds INTEGER DEFAULT 60,
    order_index INTEGER DEFAULT 0,
    notes TEXT
);

-- 11. CLIENT ROUTINES TABLE
CREATE TABLE IF NOT EXISTS public.client_routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. CLIENT ROUTINE EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public.client_routine_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID NOT NULL REFERENCES public.client_routines(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    exercise_name TEXT NOT NULL,
    muscle_group TEXT,
    sets INTEGER,
    reps INTEGER,
    weight_kg NUMERIC(5, 2),
    rest_seconds INTEGER DEFAULT 60,
    order_index INTEGER DEFAULT 0,
    notes TEXT
);

-- 13. EXERCISE LIBRARY
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    muscle_group TEXT,
    description TEXT,
    image_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 14. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_profile_date ON public.attendance(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_memberships_client_expiry ON public.memberships(client_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_health_records_client ON public.health_records(client_id);
CREATE INDEX IF NOT EXISTS idx_routines_client_active ON public.client_routines(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON public.notifications(recipient_id, is_read);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read all profiles; users can update their own
CREATE POLICY "Profiles readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Allow profile creation on signup"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- Gyms: Readable and updatable by authenticated users
CREATE POLICY "Gyms readable by authenticated"
    ON public.gyms FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Gyms manageable by admins"
    ON public.gyms FOR ALL
    TO authenticated
    USING (true);

-- Clients: Readable by authenticated, managed by admin & assigned trainers
CREATE POLICY "Clients readable by authenticated"
    ON public.clients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Clients manageable by authenticated"
    ON public.clients FOR ALL
    TO authenticated
    USING (true);

-- Memberships: Readable by authenticated, insert/update by admins
CREATE POLICY "Memberships accessible by authenticated"
    ON public.memberships FOR ALL
    TO authenticated
    USING (true);

-- Attendance: Full access for check-ins and tracking
CREATE POLICY "Attendance full access for authenticated"
    ON public.attendance FOR ALL
    TO authenticated
    USING (true);

-- Health records: Full access for trainers, admins and client self-read
CREATE POLICY "Health records accessible by authenticated"
    ON public.health_records FOR ALL
    TO authenticated
    USING (true);

-- Workout Templates & Exercises
CREATE POLICY "Templates viewable by authenticated"
    ON public.workout_templates FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Template exercises viewable by authenticated"
    ON public.template_exercises FOR ALL
    TO authenticated
    USING (true);

-- Client Routines & Exercises
CREATE POLICY "Client routines accessible by authenticated"
    ON public.client_routines FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Client routine exercises accessible by authenticated"
    ON public.client_routine_exercises FOR ALL
    TO authenticated
    USING (true);

-- Exercise library & Notifications
CREATE POLICY "Exercise library accessible by authenticated"
    ON public.exercises FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Notifications accessible by recipient"
    ON public.notifications FOR ALL
    TO authenticated
    USING (true);

-- ============================================================================
-- SAMPLE STARTER SEED DATA
-- ============================================================================
-- Insert default Gym
INSERT INTO public.gyms (id, name, address, qr_secret, qr_last_rotated)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'IronForge Fitness Pro',
    '742 Evergreen Terrace, Metro City',
    'GTP_START_SECRET_2026',
    CURRENT_DATE
) ON CONFLICT (id) DO NOTHING;

-- Insert Standard Exercise Library
INSERT INTO public.exercises (name, muscle_group, description)
VALUES
    ('Barbell Bench Press', 'Chest', 'Compound exercise targeting pectoralis major and triceps'),
    ('Incline Dumbbell Press', 'Chest', 'Emphasizes upper chest fibers and anterior deltoids'),
    ('Barbell Back Squat', 'Legs', 'Full lower body compound for quadriceps, hamstrings, and glutes'),
    ('Romanian Deadlift', 'Hamstrings', 'Hinge movement targeting posterior chain and hamstrings'),
    ('Pull-Ups', 'Back', 'Vertical pulling movement for latissimus dorsi and biceps'),
    ('Barbell Bent-Over Row', 'Back', 'Horizontal pulling for mid-back thickness and lats'),
    ('Overhead Shoulder Press', 'Shoulders', 'Compound exercise for deltoid strength and core stability'),
    ('Lateral Raises', 'Shoulders', 'Isolation exercise targeting lateral deltoid heads'),
    ('Dumbbell Bicep Curls', 'Biceps', 'Bicep isolation for arm peak and grip strength'),
    ('Tricep Rope Pushdowns', 'Triceps', 'Isolation movement for lateral and medial triceps heads'),
    ('Hanging Leg Raises', 'Core', 'Core abdominal flexion exercise'),
    ('Plank Hold', 'Core', 'Isometric core and spinal stabilizer exercise')
ON CONFLICT DO NOTHING;

-- Insert Default Workout Template (Push / Pull / Legs)
DO $$
DECLARE
    tpl_id UUID;
BEGIN
    INSERT INTO public.workout_templates (name, description, difficulty, goal)
    VALUES (
        '3-Day Push / Pull / Legs Hypertrophy',
        'Classic 3-day split designed for lean muscle growth and strength progression.',
        'intermediate',
        'Muscle Building & Strength'
    ) RETURNING id INTO tpl_id;

    -- Day 1: Push (Monday = 1)
    INSERT INTO public.template_exercises (template_id, day_of_week, exercise_name, muscle_group, sets, reps, weight_kg, rest_seconds, order_index)
    VALUES
        (tpl_id, 1, 'Barbell Bench Press', 'Chest', 4, 8, 70, 90, 1),
        (tpl_id, 1, 'Incline Dumbbell Press', 'Chest', 3, 10, 24, 75, 2),
        (tpl_id, 1, 'Overhead Shoulder Press', 'Shoulders', 3, 8, 45, 90, 3),
        (tpl_id, 1, 'Lateral Raises', 'Shoulders', 4, 15, 10, 60, 4),
        (tpl_id, 1, 'Tricep Rope Pushdowns', 'Triceps', 3, 12, 25, 60, 5);

    -- Day 2: Pull (Wednesday = 3)
    INSERT INTO public.template_exercises (template_id, day_of_week, exercise_name, muscle_group, sets, reps, weight_kg, rest_seconds, order_index)
    VALUES
        (tpl_id, 3, 'Pull-Ups', 'Back', 4, 8, 0, 90, 1),
        (tpl_id, 3, 'Barbell Bent-Over Row', 'Back', 4, 10, 60, 90, 2),
        (tpl_id, 3, 'Dumbbell Bicep Curls', 'Biceps', 3, 12, 14, 60, 3);

    -- Day 3: Legs (Friday = 5)
    INSERT INTO public.template_exercises (template_id, day_of_week, exercise_name, muscle_group, sets, reps, weight_kg, rest_seconds, order_index)
    VALUES
        (tpl_id, 5, 'Barbell Back Squat', 'Legs', 4, 8, 90, 120, 1),
        (tpl_id, 5, 'Romanian Deadlift', 'Hamstrings', 3, 10, 80, 90, 2),
        (tpl_id, 5, 'Plank Hold', 'Core', 3, 60, 0, 60, 3);
END $$;

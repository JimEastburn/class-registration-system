-- Demo Data Seed Script
DO $$ 
DECLARE
    teacher_alice_id UUID := 'd8ef732b-36f1-4389-9d7a-d0b1154589d1';
    teacher_bob_id   UUID := 'b7b7b7b7-b7b7-b7b7-b7b7-b7b7b7b7b7b7';
    parent_john_id   UUID := '10101010-1010-1010-1010-101010101010';
    student_jane_id  UUID := '11111111-1111-1111-1111-111111111111'; -- Jane's student account
    child_jane_id    UUID := '20202020-2020-2020-2020-202020202020';
    child_jack_id    UUID := '30303030-3030-3030-3030-303030303030';
    class_python_id  UUID := '40404040-4040-4040-4040-404040404040';
    class_writing_id UUID := '50505050-5050-5050-5050-505050505050';
    class_chess_id   UUID := '60606060-6060-6060-6060-606060606060';
    admin_bogan_id   UUID := '90909090-9090-9090-9090-909090909090';
BEGIN
    -- 1. Insert Users into auth.users (Trigger will handle profiles)
    -- Teacher Alice
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'alice@example.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, email_confirmed_at)
        VALUES (teacher_alice_id, 'alice@example.com', crypt('password123', gen_salt('bf')), '{"role": "teacher", "first_name": "Alice", "last_name": "Miller"}'::jsonb, 'authenticated', 'authenticated', now());
    END IF;

    -- Teacher Bob
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'bob@example.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, email_confirmed_at)
        VALUES (teacher_bob_id, 'bob@example.com', crypt('password123', gen_salt('bf')), '{"role": "teacher", "first_name": "Bob", "last_name": "Jones"}'::jsonb, 'authenticated', 'authenticated', now());
    END IF;

    -- Parent John
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'john@example.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, email_confirmed_at)
        VALUES (parent_john_id, 'john@example.com', crypt('password123', gen_salt('bf')), '{"role": "parent", "first_name": "John", "last_name": "Doe"}'::jsonb, 'authenticated', 'authenticated', now());
    END IF;

    -- Student Jane (linked to family member Jane Doe)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jane@example.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, email_confirmed_at)
        VALUES (student_jane_id, 'jane@example.com', crypt('password123', gen_salt('bf')), '{"role": "student", "first_name": "Jane", "last_name": "Doe"}'::jsonb, 'authenticated', 'authenticated', now());
    END IF;

    -- Admin Bogan (Parent Bogan)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'parent.bogan@gmail.com') THEN
        INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, email_confirmed_at)
        VALUES (admin_bogan_id, 'parent.bogan@gmail.com', crypt('password123', gen_salt('bf')), '{"role": "admin", "first_name": "Johnathan", "last_name": "Reynolds"}'::jsonb, 'authenticated', 'authenticated', now());
    END IF;

    -- 2. Insert Family Members (Jane is linked to her student account via user_id)
    INSERT INTO public.family_members (id, parent_id, user_id, first_name, last_name, grade_level, relationship)
    VALUES 
        (child_jane_id, parent_john_id, student_jane_id, 'Jane', 'Doe', '8', 'child'),
        (child_jack_id, parent_john_id, NULL, 'Jack', 'Doe', '10', 'child')
    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id;

    -- 3. Insert Classes
    INSERT INTO public.classes (id, teacher_id, name, description, status, location, start_date, end_date, schedule, max_students, fee)
    VALUES 
        (class_python_id, teacher_alice_id, 'Advanced Python for AI', 'Learn how to build AI agents with Python.', 'active', 'Room 302', CURRENT_DATE + 5, CURRENT_DATE + 90, 'Mon/Wed 4:00 PM - 5:30 PM', 15, 200.00),
        (class_writing_id, teacher_bob_id, 'Creative Writing', 'Unlock your inner storyteller.', 'active', 'Library A', CURRENT_DATE + 10, CURRENT_DATE + 60, 'Tue/Thu 3:30 PM - 5:00 PM', 12, 120.00),
        (class_chess_id, teacher_alice_id, 'Chess Masterclass', 'From beginner to Grandmaster.', 'active', 'Student Lounge', CURRENT_DATE + 2, CURRENT_DATE + 100, 'Fridays 4:00 PM - 6:00 PM', 10, 80.00)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Insert Enrollments
    INSERT INTO public.enrollments (student_id, class_id, status)
    VALUES 
        (child_jane_id, class_python_id, 'confirmed'),
        (child_jack_id, class_writing_id, 'confirmed')
    ON CONFLICT (student_id, class_id) DO NOTHING;

    -- 5. Insert Waitlist
    INSERT INTO public.waitlist (student_id, class_id, parent_id, position, status)
    VALUES (child_jane_id, class_chess_id, parent_john_id, 1, 'waiting')
    ON CONFLICT (class_id, student_id) DO NOTHING;

    -- 6. Insert Sample Invite Code for Jack (unlinked family member)
    INSERT INTO public.family_member_invites (family_member_id, code, created_by, expires_at)
    VALUES (child_jack_id, 'JACK23', parent_john_id, now() + interval '7 days')
    ON CONFLICT DO NOTHING;

END $$;


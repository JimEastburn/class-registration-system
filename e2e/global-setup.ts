import { createClient } from '@supabase/supabase-js';
import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Global Setup: Seeds test users via Supabase Admin API
 * Runs once before all tests.
 */

export default async function globalSetup(config: FullConfig) {
    console.log('🌱 Global Setup: Seeding test users...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    const testUsers = [
        {
            email: 'john@example.com',
            password: 'password123',
            role: 'parent',
            firstName: 'John',
            lastName: 'Doe',
        },
        {
            email: 'alice@example.com',
            password: 'password123',
            role: 'teacher',
            firstName: 'Alice',
            lastName: 'Smith',
        },
        {
            email: 'admin@example.com',
            password: 'Password123',
            role: 'admin',
            firstName: 'System',
            lastName: 'Admin',
        },
        {
            email: 'student@example.com',
            password: 'Password123',
            role: 'student',
            firstName: 'Test',
            lastName: 'Student',
        },
    ];

    for (const user of testUsers) {
        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const exists = existingUsers?.users?.some((u) => u.email === user.email);

        if (exists) {
            console.log(`  ⏭️  User ${user.email} already exists, skipping...`);
            continue;
        }

        // Create user with Admin API
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
                role: user.role,
                first_name: user.firstName,
                last_name: user.lastName,
            },
        });

        if (error) {
            console.error(`  ❌ Failed to create ${user.email}:`, error.message);
        } else {
            console.log(`  ✅ Created user: ${user.email} (${user.role})`);
        }
    }

    // Seed enrollment for teacher tests
    console.log('📝 Seeding test enrollments...');
    const { data: parentUser } = await supabase.from('profiles').select('id').eq('email', 'john@example.com').single();
    const { data: teacherClass } = await supabase.from('classes').select('id').eq('name', 'Advanced Python for AI').single();

    if (parentUser && teacherClass) {
        // 1. Ensure a family member exists for John
        let { data: familyMember } = await supabase
            .from('family_members')
            .select('id')
            .eq('parent_id', parentUser.id)
            .eq('first_name', 'Test')
            .eq('last_name', 'Student')
            .single();

        if (!familyMember) {
            const { data: newMember, error: memberError } = await supabase
                .from('family_members')
                .insert({
                    parent_id: parentUser.id,
                    first_name: 'Test',
                    last_name: 'Student',
                    grade_level: '10',
                    relationship: 'child',
                })

                .select()
                .single();

            if (memberError) {
                console.error('  ❌ Failed to seed family member:', memberError.message);
            } else {
                familyMember = newMember;
                console.log('  ✅ Seeded family member "Test Student" for John');
            }
        }

        // 2. Ensure the family member is enrolled in Alice's class
        if (familyMember) {
            const { data: existingEnrollment } = await supabase
                .from('enrollments')
                .select('id')
                .eq('student_id', familyMember.id)
                .eq('class_id', teacherClass.id)
                .single();

            if (!existingEnrollment) {
                const { error: enrollmentError } = await supabase.from('enrollments').insert({
                    student_id: familyMember.id,
                    class_id: teacherClass.id,
                    status: 'confirmed',
                });

                if (enrollmentError) {
                    console.error('  ❌ Failed to seed enrollment:', enrollmentError.message);
                } else {
                    console.log('  ✅ Seeded enrollment for "Test Student" in Advanced Python');
                }
            } else {
                console.log('  ⏭️  Enrollment already exists, skipping...');
            }
        }
    }

    console.log('🌱 Global Setup: Complete!\n');


}

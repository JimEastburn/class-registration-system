import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const COUNTS = {
    TEACHERS: 30,
    PARENTS: 160,
    SPOUSES_COUNT: 140, // subset of parents
    STUDENTS: 110,
    CLASSES_MIN_PER_TEACHER: 1,
    CLASSES_MAX_PER_TEACHER: 4,
    STUDENTS_MIN_PER_CLASS: 5,
    STUDENTS_MAX_PER_CLASS: 14,
};

async function seed() {
    console.log('🌱 Starting seed...');

    // 1. Create Teachers
    console.log(`Creating ${COUNTS.TEACHERS} teachers...`);
    const teachers = [];
    for (let i = 0; i < COUNTS.TEACHERS; i++) {
        const email = faker.internet.email({ firstName: 'teacher' });
        const { data: user, error } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: {
                role: 'teacher',
                first_name: faker.person.firstName(),
                last_name: faker.person.lastName(),
            }
        });

        if (error) {
            console.error(`Error creating teacher ${email}:`, error.message);
            continue;
        }
        if (user.user) teachers.push(user.user);
    }
    console.log(`✅ Created ${teachers.length} teachers.`);

    // 2. Create Parents
    console.log(`Creating ${COUNTS.PARENTS} parents...`);
    const parents = [];
    for (let i = 0; i < COUNTS.PARENTS; i++) {
        const email = faker.internet.email({ firstName: 'parent' });
        const { data: user, error } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: {
                role: 'parent',
                first_name: faker.person.firstName(),
                last_name: faker.person.lastName(),
            }
        });

        if (error) {
            console.error(`Error creating parent ${email}:`, error.message);
            continue;
        }
        if (user.user) parents.push(user.user);
    }
    console.log(`✅ Created ${parents.length} parents.`);

    // 3. Create Spouses (Family Members)
    console.log(`Creating ${COUNTS.SPOUSES_COUNT} spouses...`);
    const parentsWithSpouses = parents.slice(0, COUNTS.SPOUSES_COUNT);
    const spouseInserts = parentsWithSpouses.map(parent => ({
        parent_id: parent.id,
        first_name: faker.person.firstName(),
        last_name: parent.user_metadata.last_name, // usually share last name
        relationship: 'spouse',
        grade_level: null
    }));

    const { error: spouseError } = await supabase.from('family_members').insert(spouseInserts);
    if (spouseError) console.error('Error creating spouses:', spouseError);
    else console.log(`✅ Created ${spouseInserts.length} spouses.`);

    // 4. Create Students (Family Members)
    console.log(`Creating ${COUNTS.STUDENTS} students...`);
    const studentInserts = [];
    for (let i = 0; i < COUNTS.STUDENTS; i++) {
        const parent = faker.helpers.arrayElement(parents);
        studentInserts.push({
            parent_id: parent.id,
            first_name: faker.person.firstName(),
            last_name: parent.user_metadata.last_name,
            relationship: 'child',
            grade_level: faker.helpers.arrayElement(['6', '7', '8', '9', '10', '11', '12']),
            birth_date: faker.date.birthdate({ min: 11, max: 18, mode: 'age' }).toISOString()
        });
    }

    const { data: createdStudents, error: studentError } = await supabase
        .from('family_members')
        .insert(studentInserts)
        .select(); // Select back to get IDs for enrollment

    if (studentError) {
        console.error('Error creating students:', studentError);
        process.exit(1);
    }
    console.log(`✅ Created ${createdStudents?.length} students.`);

    // 5. Create Classes
    console.log('Creating classes...');
    const classes = [];
    const subjects = ['Math', 'Science', 'English', 'History', 'Art', 'Music', 'CS', 'PE'];
    const levels = ['Intro', 'Advanced', 'Intermediate', 'AP', 'Honors'];

    for (const teacher of teachers) {
        const numClasses = faker.number.int({ min: COUNTS.CLASSES_MIN_PER_TEACHER, max: COUNTS.CLASSES_MAX_PER_TEACHER });

        for (let k = 0; k < numClasses; k++) {
            const subject = faker.helpers.arrayElement(subjects);
            const level = faker.helpers.arrayElement(levels);

            const { data: newClass, error: classError } = await supabase.from('classes').insert({
                teacher_id: teacher.id,
                name: `${level} ${subject}`,
                description: faker.lorem.sentence(),
                status: 'active',
                location: `Room ${faker.number.int({ min: 100, max: 599 })}`,
                start_date: '2026-02-01',
                end_date: '2026-06-15',
                schedule: `${faker.helpers.arrayElement(['Mon/Wed', 'Tue/Thu'])} ${faker.number.int({ min: 8, max: 15 })}:00`,
                max_students: 20,
                fee: faker.finance.amount({ min: 50, max: 300, dec: 2 }),
            }).select().single();

            if (classError) console.error('Error creating class:', classError);
            else if (newClass) classes.push(newClass);
        }
    }
    console.log(`✅ Created ${classes.length} classes.`);

    // 6. Create Enrollments
    console.log('Creating enrollments...');
    let totalEnrollments = 0;

    if (!createdStudents || createdStudents.length === 0) {
        console.error('No students available for enrollment');
        return;
    }

    for (const cls of classes) {
        const numStudents = faker.number.int({ min: COUNTS.STUDENTS_MIN_PER_CLASS, max: COUNTS.STUDENTS_MAX_PER_CLASS });
        const classStudents = faker.helpers.arrayElements(createdStudents, numStudents);

        const enrollments = classStudents.map(student => ({
            class_id: cls.id,
            student_id: student.id,
            status: 'confirmed',
            enrolled_at: faker.date.recent().toISOString()
        }));

        const { error: enrollError } = await supabase.from('enrollments').insert(enrollments);

        if (enrollError) console.error(`Error enrolling in class ${cls.id}:`, enrollError);
        else totalEnrollments += enrollments.length;
    }

    console.log(`✅ Created ${totalEnrollments} enrollments.`);
    console.log('🏁 Seed complete!');
}

seed().catch(console.error);

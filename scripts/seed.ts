/**
 * Database Seed Script
 *
 * Wipes ALL data from the Supabase database (preserving schema, RLS, triggers)
 * then seeds with realistic test data.
 *
 * Usage: npx tsx scripts/seed.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "SeedPass123!";

// ---------------------------------------------------------------------------
// Name pools
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "James", "Maria", "David", "Sarah", "Michael", "Jennifer", "Robert", "Linda",
  "William", "Elizabeth", "Carlos", "Ana", "Diego", "Sofia", "Luis", "Isabella",
  "Daniel", "Camila", "Alejandro", "Valentina", "José", "Lucía", "Miguel", "Elena",
  "Antonio", "Carmen", "Francisco", "Patricia", "Rafael", "Adriana", "Gabriel",
  "Natalia", "Fernando", "Rosa", "Ricardo", "Teresa", "Eduardo", "Claudia",
  "Oscar", "Monica", "Andres", "Laura", "Jorge", "Beatriz", "Sergio", "Marta",
  "Pablo", "Cristina", "Raul", "Silvia", "Marco", "Diana", "Ivan", "Alicia",
  "Hector", "Gloria", "Pedro", "Victoria", "Manuel", "Irene", "Tomás", "Ruth",
  "Enrique", "Pilar", "Alberto", "Sandra", "Julio", "Dolores", "Felipe", "Carla",
  "Rodrigo", "Andrea", "Mateo", "Pam", "Emilio", "Gina", "Hugo", "Paula",
  "Santiago", "Lorena", "Ernesto", "Nora", "Arturo", "Ximena", "Gustavo", "Ines",
  "Leon", "Eva", "Martin", "Helena", "Nicolas", "Catalina", "Sebastian", "Renata",
  "Bruno", "Fernanda", "Damian", "Esperanza", "Elias", "Blanca", "Fabian", "Lidia",
  "Oliver", "Mariana", "Ignacio", "Rocio", "Dante", "Alma", "Simon", "Nayeli",
  "Axel", "Ariadna", "Liam", "Zoe", "Noah", "Ivy", "Ethan", "Maya", "Lucas",
  "Chloe", "Mason", "Harper", "Logan", "Ella", "Aiden", "Avery", "Jackson",
  "Lily", "Owen", "Grace", "Caleb", "Stella", "Henry", "Luna", "Wyatt", "Hazel",
  "Leo", "Aurora", "Jack", "Violet", "Alexander", "Scarlett", "Julian", "Aria",
  "Levi", "Riley", "Isaac", "Nova", "Theo", "Ellie", "Carter", "Bella", "Nolan",
  "Cora", "Asher", "Willow", "Eli", "Mia", "Miles", "Ruby", "Ezra", "Quinn",
  "Finn", "Sage", "Kai", "Jade", "Rowan", "Skye", "Atlas", "Wren", "River",
  "Ember", "Orion", "Juniper", "Jasper", "Iris", "Felix", "Olive", "Milo",
  "Piper", "Beckett", "Morgan",
];

const LAST_NAMES = [
  "Garcia", "Rodriguez", "Martinez", "Lopez", "Hernandez", "Gonzalez", "Perez",
  "Sanchez", "Ramirez", "Torres", "Flores", "Rivera", "Gomez", "Diaz", "Reyes",
  "Cruz", "Morales", "Ortiz", "Gutierrez", "Chavez", "Ramos", "Vargas", "Castillo",
  "Jimenez", "Ruiz", "Mendoza", "Medina", "Aguilar", "Vega", "Castro", "Delgado",
  "Herrera", "Cabrera", "Pena", "Soto", "Estrada", "Acosta", "Nunez", "Salazar",
  "Molina", "Figueroa", "Leon", "Dominguez", "Padilla", "Valencia", "Franco",
  "Espinoza", "Carrillo", "Sandoval", "Cordova", "Villanueva", "Mejia", "Rios",
  "Trujillo", "Serrano", "Ibarra", "Lara", "Navarro", "Fuentes", "Campos",
  "Rosales", "Cervantes", "Duran", "Ochoa", "Contreras", "Galvan", "Velasquez",
  "Solis", "Zamora", "Bautista", "Luna", "Paredes", "Vasquez", "Robles", "Montes",
  "Palacios", "Quinones", "Reeves", "Whitaker", "Bennett", "Carson", "Huang",
  "Patel", "Kim", "Singh", "Chen", "Lee", "Nguyen", "Ali", "Thompson", "Baker",
  "Clark", "Hall", "Young", "King", "Wright", "Hill", "Walker", "Moore", "Taylor",
];

const TEACHER_SPECIALIZATIONS = [
  ["Art", "Drawing", "Painting"],
  ["Music", "Guitar", "Vocals"],
  ["Mathematics", "Algebra", "Geometry"],
  ["Science", "Biology", "Chemistry"],
  ["English", "Creative Writing", "Poetry"],
  ["Dance", "Ballet", "Modern Dance"],
  ["Theater", "Acting", "Improvisation"],
  ["Photography", "Digital Media", "Design"],
  ["Martial Arts", "Self-Defense", "Fitness"],
  ["Coding", "Robotics", "Technology"],
];

const CLASS_TEMPLATES = [
  { name: "Intro to Watercolors", desc: "Learn foundational watercolor techniques including wet-on-wet, dry brush, and color mixing.", price: 75 },
  { name: "Acoustic Guitar Basics", desc: "Start your musical journey with chords, strumming patterns, and simple songs.", price: 65 },
  { name: "Fun with Fractions", desc: "Make sense of fractions through hands-on activities, games, and real-world problems.", price: 50 },
  { name: "Backyard Science Lab", desc: "Explore chemical reactions, plant biology, and physics with safe, exciting experiments.", price: 80 },
  { name: "Creative Storytelling", desc: "Develop narrative skills through guided writing exercises, prompts, and peer workshops.", price: 55 },
  { name: "Hip-Hop Dance Moves", desc: "Learn popular hip-hop choreography and freestyle techniques in a fun, upbeat environment.", price: 70 },
  { name: "Stage Presence Workshop", desc: "Build confidence and acting chops through improv games, monologues, and scene work.", price: 60 },
  { name: "Phone Photography 101", desc: "Master mobile photography composition, lighting, and basic editing techniques.", price: 45 },
  { name: "Kids Karate Foundations", desc: "Introduction to karate basics: stances, blocks, punches, and kata for beginners.", price: 90 },
  { name: "Scratch Coding Adventures", desc: "Create interactive stories, games, and animations using MIT Scratch.", price: 85 },
  { name: "Oil Painting Studio", desc: "Explore oil painting with emphasis on color theory, composition, and texture.", price: 95 },
  { name: "Ukulele Jam Session", desc: "A fun and relaxed intro to the ukulele with singalong favorites.", price: 55 },
  { name: "Math Puzzles & Games", desc: "Sharpen problem-solving skills through engaging puzzles, logic games, and challenges.", price: 45 },
  { name: "Nature & Ecology", desc: "Discover local ecosystems, wildlife identification, and conservation principles.", price: 70 },
  { name: "Poetry & Spoken Word", desc: "Find your voice through poetry writing, performance, and expressive reading.", price: 50 },
  { name: "Ballet Fundamentals", desc: "Learn core ballet positions, barre exercises, and basic choreography.", price: 80 },
  { name: "Comedy & Improv Club", desc: "Master the art of comedy through improv exercises, sketch writing, and stand-up basics.", price: 55 },
  { name: "Digital Art & Design", desc: "Create digital illustrations and designs using free tools and tablets.", price: 75 },
  { name: "Fitness & Flexibility", desc: "Build strength, flexibility, and healthy habits through age-appropriate exercises.", price: 60 },
  { name: "Robotics Workshop", desc: "Build and program simple robots using kits, learning engineering and coding basics.", price: 100 },
  { name: "Charcoal Drawing", desc: "Learn expressive charcoal techniques including shading, blending, and gesture drawing.", price: 65 },
  { name: "Rhythm & Percussion", desc: "Explore beats and rhythms using drums, shakers, and body percussion.", price: 60 },
  { name: "Geometry in the Real World", desc: "Discover geometry through architecture, art, and hands-on construction projects.", price: 55 },
  { name: "Kitchen Chemistry", desc: "Learn chemistry concepts through safe, delicious cooking and baking experiments.", price: 85 },
  { name: "Journaling & Memoir", desc: "Develop reflective writing skills through journaling prompts and memoir techniques.", price: 45 },
  { name: "Contemporary Dance Fusion", desc: "Blend modern, jazz, and lyrical dance styles in expressive choreography.", price: 75 },
  { name: "Puppetry & Storytelling", desc: "Create puppets and bring stories to life through puppet theater performances.", price: 50 },
  { name: "Photo Editing Mastery", desc: "Learn professional photo editing techniques using free software tools.", price: 65 },
  { name: "Tai Chi for Kids", desc: "Gentle movement practice promoting balance, focus, and mindfulness.", price: 55 },
  { name: "Game Design with Python", desc: "Create simple video games while learning Python programming fundamentals.", price: 95 },
];

// ---------------------------------------------------------------------------
// Schedule grid – 5 blocks × 3 valid day patterns = 15 unique slots
// ---------------------------------------------------------------------------

const DAYS = ["Tuesday/Thursday", "Tuesday", "Wednesday", "Thursday"] as const;
const BLOCKS = ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5"] as const;



interface Slot { day: string; block: string }

function buildSlotPool(): Slot[] {
  const pool: Slot[] = [];
  for (const day of DAYS) {
    for (const block of BLOCKS) {
      pool.push({ day, block });
    }
  }
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUnique<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomDob(minAge: number, maxAge: number): string {
  const now = new Date();
  const year = now.getFullYear() - minAge - Math.floor(Math.random() * (maxAge - minAge));
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const GRADES = ["elementary", "middle school", "high school"];

let nameIdx = 0;
function nextName(): { first: string; last: string } {
  const first = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
  const last = LAST_NAMES[nameIdx % LAST_NAMES.length];
  nameIdx++;
  return { first, last };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🗑️  Wiping database...\n");

  // ── Step 1: Wipe data in FK-safe order ──────────────────────────────────
  const { error: truncErr } = await supabase.rpc("exec_sql", {
    query: `
      TRUNCATE payments, enrollments, calendar_events, class_materials,
             class_blocks, audit_logs, system_settings, classes, family_members
      CASCADE;
    `,
  });

  // If the RPC doesn't exist, fall back to individual deletes
  if (truncErr) {
    console.log("  ⚠️  RPC exec_sql not available, deleting via API...");
    // Delete in dependency order
    for (const table of [
      "payments", "enrollments", "calendar_events", "class_materials",
      "class_blocks", "audit_logs", "system_settings", "classes", "family_members",
    ]) {
      // Delete all rows – supabase API requires a filter, use gte on created_at
      const { error } = await supabase
        .from(table)
        .delete()
        .gte("created_at", "1970-01-01");
      if (error) {
        // Some tables use 'key' as PK (system_settings)
        const { error: err2 } = await supabase
          .from(table)
          .delete()
          .not("id" in {} ? "id" : "key", "is", null);
        if (err2) console.warn(`  ⚠️  Could not clear ${table}: ${err2.message}`);
      }
      console.log(`  ✓ Cleared ${table}`);
    }
  } else {
    console.log("  ✓ Truncated all tables");
  }

  // Delete profiles (will cascade from auth.users deletion)
  const { data: existingProfiles } = await supabase.from("profiles").select("id");
  if (existingProfiles && existingProfiles.length > 0) {
    console.log(`  Deleting ${existingProfiles.length} auth users...`);
    let deleted = 0;
    for (const profile of existingProfiles) {
      const { error } = await supabase.auth.admin.deleteUser(profile.id);
      if (error) console.warn(`  ⚠️  Could not delete user ${profile.id}: ${error.message}`);
      else deleted++;
    }
    console.log(`  ✓ Deleted ${deleted} auth users (profiles cascade-deleted)`);
  }

  // Clean up any orphaned profiles
  await supabase.from("profiles").delete().gte("created_at", "1970-01-01");
  console.log("  ✓ Cleaned up orphaned profiles\n");

  // ── Step 2: Create auth users ───────────────────────────────────────────
  console.log("👤 Creating users...\n");

  nameIdx = 0; // reset name counter

  interface UserRecord { id: string; email: string; role: string; firstName: string; lastName: string }
  const users: UserRecord[] = [];

  async function createUser(email: string, role: string): Promise<UserRecord> {
    const { first, last } = nextName();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: first, last_name: last },
    });
    if (error) throw new Error(`Failed to create ${email}: ${error.message}`);
    const record = { id: data.user.id, email, role, firstName: first, lastName: last };
    users.push(record);
    return record;
  }

  // Super Admin (1)
  console.log("  Creating 1 super admin...");
  await createUser("superadmin@seed.local", "super_admin");

  // Admins (2)
  console.log("  Creating 2 admins...");
  for (let i = 1; i <= 2; i++) await createUser(`admin${i}@seed.local`, "admin");

  // Teachers (10)
  console.log("  Creating 10 teachers...");
  const teachers: UserRecord[] = [];
  for (let i = 1; i <= 10; i++) {
    const t = await createUser(`teacher${i}@seed.local`, "teacher");
    teachers.push(t);
  }

  // Parents (67)
  console.log("  Creating 67 parents...");
  const parents: UserRecord[] = [];
  for (let i = 1; i <= 67; i++) {
    const p = await createUser(`parent${i}@seed.local`, "parent");
    parents.push(p);
  }

  // Students (110)
  console.log("  Creating 110 students...");
  const students: UserRecord[] = [];
  for (let i = 1; i <= 110; i++) {
    const s = await createUser(`student${i}@seed.local`, "student");
    students.push(s);
  }

  console.log(`  ✓ Created ${users.length} auth users\n`);

  // ── Step 3: Update profiles with correct roles ──────────────────────────
  console.log("🔧 Updating profile roles...\n");

  // Teachers & admins that also have a parent view (is_parent = true)
  const teachersWithParentView = teachers.slice(0, 3); // first 3 teachers
  const adminsWithParentView = [users.find(u => u.role === "admin")!]; // first admin

  for (const u of users) {
    if (u.role === "parent") continue; // already default

    const updateData: Record<string, unknown> = {
      role: u.role,
      code_of_conduct_agreed_at: new Date().toISOString(),
    };

    // Set is_parent for multi-role users
    if (teachersWithParentView.includes(u) || adminsWithParentView.includes(u)) {
      updateData.is_parent = true;
    }

    if (u.role === "teacher") {
      const specIdx = teachers.indexOf(u);
      const specs = TEACHER_SPECIALIZATIONS[specIdx % TEACHER_SPECIALIZATIONS.length];
      updateData.specializations = specs;
      updateData.bio = `Experienced ${specs[0].toLowerCase()} instructor with a passion for teaching young learners.`;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", u.id);
    if (error) console.warn(`  ⚠️  Could not update profile for ${u.email}: ${error.message}`);
  }

  // Also set code_of_conduct for parents
  for (const p of parents) {
    await supabase
      .from("profiles")
      .update({ code_of_conduct_agreed_at: new Date().toISOString() })
      .eq("id", p.id);
  }

  console.log("  ✓ Updated all profile roles");
  console.log(`  ✓ Set is_parent=true for ${teachersWithParentView.length} teachers + ${adminsWithParentView.length} admin\n`);

  // ── Step 4: Create classes (3 per teacher, no overlaps) ─────────────────
  console.log("📚 Creating classes...\n");

  const slotPool = buildSlotPool();
  let slotIdx = 0;
  let classTemplateIdx = 0;
  let totalClassesCreated = 0;
  const DRAFT_COUNT = 5; // last 5 classes will be draft
  const TOTAL_CLASSES = teachers.length * 3; // 30

  interface ClassRecord { id: string; capacity: number; status: string; teacherEmail: string }
  const createdClasses: ClassRecord[] = [];

  for (const teacher of teachers) {
    for (let c = 0; c < 3; c++) {
      const slot = slotPool[slotIdx % slotPool.length];
      slotIdx++;

      const tmpl = CLASS_TEMPLATES[classTemplateIdx % CLASS_TEMPLATES.length];
      classTemplateIdx++;

      const capacity = 15 + Math.floor(Math.random() * 11); // 15-25
      const isDraft = totalClassesCreated >= TOTAL_CLASSES - DRAFT_COUNT;
      const status = isDraft ? "draft" : "published";

      const startDate = "2026-03-01";
      const endDate = "2026-05-31";

      const { data, error } = await supabase.from("classes").insert({
        teacher_id: teacher.id,
        name: tmpl.name,
        description: tmpl.desc,
        capacity,
        price: tmpl.price,
        location: pick(["Room 101", "Room 202", "Art Studio", "Music Room", "Gym", "Lab A", "Lab B", "Theater", "Outdoor Pavilion", "Library"]),
        status,
        day: slot.day,
        block: slot.block,
        day_of_week: slot.day,
        start_date: startDate,
        end_date: endDate,
        start_time: "TBA",
        end_time: "TBA",
        age_min: pick([5, 6, 7, 8]),
        age_max: pick([12, 13, 14, 15]),
        schedule_config: {
          day: slot.day,
          block: slot.block,
          recurring: true,
          startDate,
          endDate,
        },
      }).select("id, capacity, status").single();

      if (error) {
        console.warn(`  ⚠️  Could not create class ${tmpl.name}: ${error.message}`);
      } else if (data) {
        createdClasses.push({ id: data.id, capacity: data.capacity, status: data.status, teacherEmail: teacher.email });
      }
      totalClassesCreated++;
    }
  }

  const publishedClasses = createdClasses.filter(c => c.status === "published");
  const draftClasses = createdClasses.filter(c => c.status === "draft");
  console.log(`  ✓ Created ${createdClasses.length} classes (${publishedClasses.length} published, ${draftClasses.length} draft)\n`);

  // ── Step 5: Create family_members linking parents → students ────────────
  console.log("👨‍👩‍👧‍👦 Creating family member links...\n");

  // Distribute 110 students across 67 parents
  // First 43 parents get 2 students each (86 students)
  // Next 24 parents get 1 student each (24 students)
  // Total: 86 + 24 = 110

  interface FamilyMemberRecord { id: string; parentId: string; studentUserId: string }
  const familyMembers: FamilyMemberRecord[] = [];
  let studentIdx = 0;

  for (let pIdx = 0; pIdx < parents.length; pIdx++) {
    const parent = parents[pIdx];
    const numStudents = pIdx < 43 ? 2 : 1;

    for (let s = 0; s < numStudents; s++) {
      if (studentIdx >= students.length) break;
      const student = students[studentIdx];
      studentIdx++;

      const { data, error } = await supabase.from("family_members").insert({
        parent_id: parent.id,
        student_user_id: student.id,
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        grade: pick(GRADES),
        dob: randomDob(5, 15),
        relationship: "Student",
      }).select("id").single();

      if (error) {
        console.warn(`  ⚠️  Could not link ${student.email} to ${parent.email}: ${error.message}`);
      } else if (data) {
        familyMembers.push({ id: data.id, parentId: parent.id, studentUserId: student.id });
      }
    }
  }

  // Also create family_members for multi-role users (teachers/admins with is_parent)
  for (const multiRoleUser of [...teachersWithParentView, ...adminsWithParentView]) {
    // Give each multi-role user 1 child (a new family member, not tied to a student account)
    const { first, last } = nextName();
    const { error } = await supabase.from("family_members").insert({
      parent_id: multiRoleUser.id,
      first_name: first,
      last_name: last,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@seedchild.local`,
      grade: pick(GRADES),
      dob: randomDob(5, 15),
      relationship: "Student",
    });
    if (error) console.warn(`  ⚠️  Could not create family member for ${multiRoleUser.email}: ${error.message}`);
  }

  console.log(`  ✓ Created ${familyMembers.length} student-linked family members`);
  console.log(`  ✓ Created ${teachersWithParentView.length + adminsWithParentView.length} family members for multi-role users\n`);

  // ── Step 5b: Seed enrollments ───────────────────────────────────────────
  console.log("📝 Creating enrollments...\n");

  // Only enroll in published classes
  const enrollableClasses = publishedClasses.slice();
  const enrolledPairs = new Set<string>(); // track student_id+class_id to prevent duplicates
  let confirmedCount = 0;
  let waitlistedCount = 0;
  let pendingCount = 0;

  // Target: ~25 confirmed, ~10 waitlisted, ~5 pending = ~40 total
  const TARGET_CONFIRMED = 25;
  const TARGET_WAITLISTED = 10;
  const TARGET_PENDING = 5;

  // Helper to enroll a family member in a class
  async function seedEnrollment(studentId: string, classId: string, status: string): Promise<boolean> {
    const pairKey = `${studentId}-${classId}`;
    if (enrolledPairs.has(pairKey)) return false;

    const { error } = await supabase.from("enrollments").insert({
      student_id: studentId,
      class_id: classId,
      status,
    });

    if (error) {
      console.warn(`  ⚠️  Could not enroll ${studentId} in ${classId}: ${error.message}`);
      return false;
    }

    enrolledPairs.add(pairKey);
    return true;
  }

  // Confirmed enrollments — spread across different classes
  for (let i = 0; i < TARGET_CONFIRMED && i < familyMembers.length; i++) {
    const fm = familyMembers[i];
    const cls = enrollableClasses[i % enrollableClasses.length];
    if (await seedEnrollment(fm.id, cls.id, "confirmed")) confirmedCount++;
  }

  // Waitlisted enrollments — put students in already-used classes to simulate full classes
  for (let i = 0; i < TARGET_WAITLISTED; i++) {
    const fmIdx = TARGET_CONFIRMED + i;
    if (fmIdx >= familyMembers.length) break;
    const fm = familyMembers[fmIdx];
    // Reuse first few classes (which already have confirmed students)
    const cls = enrollableClasses[i % Math.min(5, enrollableClasses.length)];
    if (await seedEnrollment(fm.id, cls.id, "waitlisted")) waitlistedCount++;
  }

  // Pending enrollments — students awaiting payment
  for (let i = 0; i < TARGET_PENDING; i++) {
    const fmIdx = TARGET_CONFIRMED + TARGET_WAITLISTED + i;
    if (fmIdx >= familyMembers.length) break;
    const fm = familyMembers[fmIdx];
    const cls = enrollableClasses[(TARGET_CONFIRMED + i) % enrollableClasses.length];
    if (await seedEnrollment(fm.id, cls.id, "pending")) pendingCount++;
  }

  console.log(`  ✓ Created ${confirmedCount + waitlistedCount + pendingCount} enrollments`);
  console.log(`    confirmed: ${confirmedCount}, waitlisted: ${waitlistedCount}, pending: ${pendingCount}\n`);

  // ── Step 7: Verify ──────────────────────────────────────────────────────
  console.log("✅ Verifying seeded data...\n");

  const { data: roleCounts } = await supabase
    .from("profiles")
    .select("role, is_parent");

  if (roleCounts) {
    const counts: Record<string, number> = {};
    let isParentCount = 0;
    for (const r of roleCounts) {
      counts[r.role] = (counts[r.role] || 0) + 1;
      if (r.is_parent) isParentCount++;
    }
    console.log("  Profile counts by role:");
    for (const [role, count] of Object.entries(counts).sort()) {
      console.log(`    ${role}: ${count}`);
    }
    console.log(`  Profiles with is_parent=true: ${isParentCount}`);
  }

  const { count: classCount } = await supabase
    .from("classes")
    .select("*", { count: "exact", head: true });
  console.log(`  Classes: ${classCount}`);

  // Verify schedule_config
  const { data: classesWithConfig } = await supabase
    .from("classes")
    .select("schedule_config")
    .not("schedule_config", "is", null);
  console.log(`  Classes with schedule_config: ${classesWithConfig?.length ?? 0}`);

  // Verify class statuses
  const { data: statusCounts } = await supabase
    .from("classes")
    .select("status");
  if (statusCounts) {
    const sc: Record<string, number> = {};
    for (const s of statusCounts) sc[s.status] = (sc[s.status] || 0) + 1;
    console.log(`  Class statuses: ${JSON.stringify(sc)}`);
  }

  const { count: familyCount } = await supabase
    .from("family_members")
    .select("*", { count: "exact", head: true });
  console.log(`  Family members: ${familyCount}`);

  // Verify enrollments
  const { data: enrollmentCounts } = await supabase
    .from("enrollments")
    .select("status");
  if (enrollmentCounts) {
    const ec: Record<string, number> = {};
    for (const e of enrollmentCounts) ec[e.status] = (ec[e.status] || 0) + 1;
    console.log(`  Enrollments: ${JSON.stringify(ec)} (total: ${enrollmentCounts.length})`);
  }

  // Check for schedule overlaps
  const { data: classes } = await supabase
    .from("classes")
    .select("teacher_id, day, block");

  if (classes) {
    const seen = new Set<string>();
    let overlaps = 0;
    for (const c of classes) {
      const key = `${c.teacher_id}-${c.day}-${c.block}`;
      if (seen.has(key)) overlaps++;
      seen.add(key);
    }
    console.log(`  Schedule overlaps: ${overlaps === 0 ? "✓ None" : `⚠️ ${overlaps} found!`}`);
  }

  console.log("\n🎉 Seed complete!\n");
  console.log("  Login credentials:");
  console.log("  ─────────────────────────────────────────");
  console.log(`  Super Admin:  superadmin@seed.local / ${PASSWORD}`);
  console.log(`  Admin:        admin1@seed.local / ${PASSWORD}`);
  console.log(`  Teacher:      teacher1@seed.local / ${PASSWORD}`);
  console.log(`  Parent:       parent1@seed.local / ${PASSWORD}`);
  console.log(`  Student:      student1@seed.local / ${PASSWORD}`);
  console.log("  ─────────────────────────────────────────");
  console.log("  Multi-role (teacher+parent): teacher1@seed.local, teacher2@seed.local, teacher3@seed.local");
  console.log("  Multi-role (admin+parent):   admin1@seed.local");
  console.log("  ─────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

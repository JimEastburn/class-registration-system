import { createAdminClient } from '@/lib/supabase/admin';
import { parseArgs } from 'util';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface ClassReportRow {
  class_name: string;
  teacher_name: string;
  capacity: number;
  enrolled: number;
}

async function generateReport(format: 'table' | 'csv' = 'table') {
  const supabase = createAdminClient();

  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name, capacity, current_enrollment, teacher_id')
    .in('status', ['published', 'completed'])
    .order('name', { ascending: true });

  if (classesError) {
    console.error('Error fetching classes:', classesError);
    process.exit(1);
  }

  const classIds = (classes || []).map((c) => c.id);
  const teacherIds = [...new Set((classes || []).map((c) => c.teacher_id).filter(Boolean))];

  const [{ data: profiles, error: profilesError }, { data: enrollments, error: enrollmentsError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', teacherIds.length > 0 ? teacherIds : ['00000000-0000-0000-0000-000000000000']),
      supabase
        .from('enrollments')
        .select('class_id, status')
        .in('class_id', classIds.length > 0 ? classIds : ['00000000-0000-0000-0000-000000000000']),
    ]);

  if (profilesError) {
    console.error('Error fetching teacher profiles:', profilesError);
    process.exit(1);
  }

  if (enrollmentsError) {
    console.error('Error fetching enrollments:', enrollmentsError);
    process.exit(1);
  }

  const profileById = new Map(
    (profiles || []).map((p) => {
      const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Unknown';
      return [p.id, name];
    })
  );

  const enrolledByClass = new Map<string, number>();

  (enrollments || []).forEach((e) => {
    if (e.status === 'pending') {
      enrolledByClass.set(e.class_id, (enrolledByClass.get(e.class_id) ?? 0) + 1);
    }
  });

  const rows: ClassReportRow[] = (classes || []).map((c) => {
    const enrolled = enrolledByClass.get(c.id) ?? 0;
    return {
      class_name: c.name ?? 'Untitled',
      teacher_name: profileById.get(c.teacher_id) ?? 'Unknown',
      capacity: c.capacity ?? 0,
      enrolled,
    };
  });

  if (format === 'csv') {
    console.log('Class Name,Teacher Name,Capacity,Enrolled');
    rows.forEach((r) => {
      console.log(
        [
          escapeCsv(r.class_name),
          escapeCsv(r.teacher_name),
          r.capacity,
          r.enrolled,
        ].join(',')
      );
    });
  } else {
    console.log('Class Enrollment Report');
    console.log('='.repeat(66));
    console.log(
      `${pad('Class Name', 32)} ${pad('Teacher Name', 20)} ${pad('Capacity', 5)} ${pad('Enrolled', 6)}`
    );
    console.log('-'.repeat(66));
    rows.forEach((r) => {
      console.log(
        `${pad(r.class_name, 32)} ${pad(r.teacher_name, 20)} ${pad(String(r.capacity), 5)} ${pad(String(r.enrolled), 6)}`
      );
    });
    console.log('='.repeat(66));
    console.log(`Total classes: ${rows.length}`);
  }
}

function pad(value: string, width: number): string {
  return value.length > width ? value.slice(0, width - 1) + '…' : value.padEnd(width, ' ');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    format: { type: 'string', short: 'f', default: 'table' },
  },
  strict: false,
  allowPositionals: true,
});

const format = values.format === 'csv' ? 'csv' : 'table';
generateReport(format);

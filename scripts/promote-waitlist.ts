/**
 * Manual waitlist promotion script.
 * Promotes waitlisted students to pending when spots are available.
 *
 * Usage:
 *   npx tsx scripts/promote-waitlist.ts <class-id> [number-to-promote]
 *
 * Example:
 *   npx tsx scripts/promote-waitlist.ts 301d1f05-0fcc-4046-82a8-32e6abc7947e 3
 */

import dotenv from 'dotenv';
import { createAdminClient } from '@/lib/supabase/admin';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function promoteWaitlist(classId: string, limit?: number) {
  const supabase = createAdminClient();

  // Get class capacity
  const { data: cls, error: classError } = await supabase
    .from('classes')
    .select('id, capacity, name')
    .eq('id', classId)
    .single();

  if (classError || !cls) {
    console.error('Class not found:', classError);
    process.exit(1);
  }

  // Count current enrollments (confirmed + pending both hold a spot)
  const { count: enrolledCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .in('status', ['confirmed', 'pending']);

  const spotsAvailable = (cls.capacity || 0) - (enrolledCount || 0);
  if (spotsAvailable <= 0) {
    console.log(`No spots available for "${cls.name}" (${enrolledCount}/${cls.capacity}).`);
    return;
  }

  const toPromote = limit ? Math.min(limit, spotsAvailable) : spotsAvailable;
  console.log(`Promoting up to ${toPromote} waitlisted student(s) for "${cls.name}"...`);

  for (let i = 0; i < toPromote; i++) {
    // Get first in line
    const { data: firstInLine, error: waitlistError } = await supabase
      .from('enrollments')
      .select('id, student_id, waitlist_position')
      .eq('class_id', classId)
      .eq('status', 'waitlisted')
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .single();

    if (waitlistError || !firstInLine) {
      console.log('No more waitlisted students.');
      break;
    }

    // Promote to pending
    const { error: updateError } = await supabase
      .from('enrollments')
      .update({
        status: 'pending',
        waitlist_position: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', firstInLine.id);

    if (updateError) {
      console.error('Failed to promote enrollment', firstInLine.id, updateError);
      continue;
    }

    // Reorder remaining waitlist positions
    const { data: remaining } = await supabase
      .from('enrollments')
      .select('id, waitlist_position')
      .eq('class_id', classId)
      .eq('status', 'waitlisted')
      .gt('waitlist_position', firstInLine.waitlist_position)
      .order('waitlist_position', { ascending: true });

    if (remaining) {
      for (const enrollment of remaining) {
        await supabase
          .from('enrollments')
          .update({ waitlist_position: (enrollment.waitlist_position || 1) - 1 })
          .eq('id', enrollment.id);
      }
    }

    console.log(`  ✅ Promoted enrollment ${firstInLine.id} (student ${firstInLine.student_id})`);
  }

  console.log('Done.');
}

const classId = process.argv[2];
const limit = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

if (!classId) {
  console.error('Usage: npx tsx scripts/promote-waitlist.ts <class-id> [number-to-promote]');
  process.exit(1);
}

promoteWaitlist(classId, limit);

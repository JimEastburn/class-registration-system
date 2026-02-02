"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SchedulePattern, TimeBlock } from "@/types/calendar";

export async function updateClassSchedule(classId: string, updates: { time_block: TimeBlock | null; schedule_pattern: SchedulePattern | null }) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('classes')
    .update({ 
      time_block: updates.time_block, 
      schedule_pattern: updates.schedule_pattern 
    })
    .eq('id', classId);

  if (error) throw error;
  
  revalidatePath('/(dashboard)/class-scheduler/calendar', 'page');
}

interface UpsertClassData {
  id?: string;
  name: string;
  teacher_id: string;
  location: string;
  schedule_pattern: SchedulePattern | null;
  time_block: TimeBlock | null;
  max_students: number;
  fee: number;
  description?: string;
  grade_min?: number;
  grade_max?: number;
}

export async function upsertClass(data: UpsertClassData) {
  const supabase = await createClient();
  
  const payload = {
    name: data.name,
    teacher_id: data.teacher_id,
    location: data.location,
    schedule_pattern: data.schedule_pattern,
    time_block: data.time_block,
    max_students: data.max_students,
    fee: data.fee,
    // defaults
    description: data.description || "",
    grade_min: data.grade_min || 0,
    grade_max: data.grade_max || 12,
  };

  if (data.id) {
    const { error } = await supabase.from('classes').update(payload).eq('id', data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('classes').insert(payload);
    if (error) throw error;
  }

  revalidatePath('/(dashboard)/class-scheduler/calendar', 'page');
}

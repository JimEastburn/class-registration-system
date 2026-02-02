import { Database } from "@/types/supabase";

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export type SchedulePattern = 'Tu/Th' | 'Tu' | 'Th' | 'Wed';
export type TimeBlock = 'Block 1' | 'Block 2' | 'Lunch' | 'Block 3' | 'Block 4' | 'Block 5';

export interface CalendarClass extends Tables<'classes'> {
  teacher?: Tables<'profiles'>;
}

export interface DragItem {
  id: string;
  type: 'class';
  data: CalendarClass;
  currentBlock?: TimeBlock;
  currentPattern?: SchedulePattern;
}

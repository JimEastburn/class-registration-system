import { createClient } from "@/lib/supabase/server";
import { CalendarGrid } from "@/components/class-scheduler/CalendarGrid";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Master Schedule | Class Registration",
  description: "Manage class schedule assignments",
};

export default async function ClassSchedulerCalendarPage() {
  const supabase = await createClient();

  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      *,
      teacher:profiles!teacher_id (
        id,
        first_name,
        last_name
      )
    `)
    .order('name');

  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'teacher')
    .order('last_name');

  if (error) {
    console.error("Error fetching classes:", error);
    return <div>Error loading schedule</div>;
  }

  // The type of 'classes' includes 'teacher' property due to the join. 
  // We need to ensure it matches CalendarClass interface.
  // The 'profiles' join returns an object or array? teacher_id is FK. 
  // Supabase returns object if it's 1:1 or N:1.
  
  return (
    <div className="container mx-auto py-6 max-w-[1600px]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Master Schedule</h1>
      </div>
      
      <CalendarGrid classes={classes as any} teachers={teachers || []} /> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
    </div>
  );
}

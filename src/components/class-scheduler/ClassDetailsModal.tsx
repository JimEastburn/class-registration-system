"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClass, SchedulePattern, TimeBlock } from "@/types/calendar";

const classSchema = z.object({
  name: z.string().min(1, "Name is required"),
  teacher_id: z.string().min(1, "Teacher is required"),
  location: z.string().min(1, "Location is required"),
  schedule_pattern: z.enum(['Tu/Th', 'Tu', 'Th', 'Wed']).nullable(),
  time_block: z.string().nullable(), 
  max_students: z.coerce.number().min(1),
  fee: z.coerce.number().min(0),
});

type ClassFormValues = {
  name: string;
  teacher_id: string;
  location: string;
  schedule_pattern: "Tu/Th" | "Tu" | "Th" | "Wed" | null;
  time_block: string | null;
  max_students: number;
  fee: number;
};

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classItem?: CalendarClass | null; 
  prefill?: { block: TimeBlock, pattern: SchedulePattern };
  teachers: { id: string; first_name: string; last_name: string }[];
  onSave: (data: ClassFormValues & { id?: string }) => Promise<void>;
}

export function ClassDetailsModal({ isOpen, onClose, classItem, prefill, teachers, onSave }: ClassDetailsModalProps) {
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      name: "",
      teacher_id: "",
      location: "",
      max_students: 20,
      fee: 0,
      schedule_pattern: prefill?.pattern || null,
      time_block: prefill?.block || null,
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (classItem) {
        form.reset({
          name: classItem.name,
          teacher_id: classItem.teacher_id,
          location: classItem.location,
          schedule_pattern: classItem.schedule_pattern,
          time_block: classItem.time_block,
          max_students: classItem.max_students,
          fee: classItem.fee
        });
      } else {
        form.reset({
          name: "",
          teacher_id: "",
          location: "",
          max_students: 20,
          fee: 0,
          schedule_pattern: prefill?.pattern || null,
          time_block: prefill?.block || null, // Ensure string match?
        });
      }
    }
  }, [isOpen, classItem, prefill, form]);

  const watchedTeacherId = form.watch("teacher_id");

  const onSubmit = async (data: ClassFormValues) => {
    await onSave({ ...data, id: classItem?.id });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{classItem ? "Edit Class" : "Create Class"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Class Name</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="teacher">Teacher</Label>
             <Select 
                value={watchedTeacherId} 
                onValueChange={(val) => {
                    form.setValue("teacher_id", val);
                    form.trigger("teacher_id");
                }}
             >
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.teacher_id && <p className="text-sm text-red-500">{form.formState.errors.teacher_id.message}</p>}
          </div>

           <div className="grid gap-2">
            <Label htmlFor="location">Room / Location</Label>
            <Input id="location" {...form.register("location")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
               <Label>Max Students</Label>
               <Input type="number" {...form.register("max_students")} />
             </div>
             <div className="grid gap-2">
               <Label>Fee ($)</Label>
               <Input type="number" {...form.register("fee")} />
             </div>
          </div>
  
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

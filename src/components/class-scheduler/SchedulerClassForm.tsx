
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Class } from '@/types'; // ClassStatus needed?
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getTeachersForScheduler, schedulerUpdateClass, schedulerCreateClass } from '@/lib/actions/scheduler';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { upsertSyllabusLink } from '@/lib/actions/materials';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  price: z.coerce.number().min(0, 'Fee must be 0 or greater'),
  location: z.string().optional(),
  teacher_id: z.string().optional(),
  day: z.string().min(1, 'Day is required'),
  block: z.string().min(1, 'Block is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  syllabusUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'completed', 'cancelled']).default('draft'),
});

type FormValues = z.infer<typeof formSchema>;

interface SchedulerClassFormProps {
  initialData?: Partial<Class>;
  isEdit?: boolean;
  initialSyllabusUrl?: string | null;
  onSuccess?: () => void;
}

type TeacherOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export function SchedulerClassForm({
  initialData,
  isEdit = false,
  initialSyllabusUrl,
  onSuccess,
}: SchedulerClassFormProps) {
  const router = useRouter();
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  
  const defaultValues = useMemo<FormValues>(() => ({
    name: initialData?.name || '',
    description: initialData?.description || '',
    capacity: initialData?.capacity || 20,
    price: initialData?.price != null ? Number(initialData.price) / 100 : 0,
    location: initialData?.location || '',
    teacher_id: initialData?.teacher_id || 'unassigned',
    status: (initialData?.status as FormValues['status']) || 'draft',
    day: initialData?.schedule_config?.day || '',
    block: initialData?.schedule_config?.block || '',
    startDate: initialData?.schedule_config?.startDate || '',
    endDate: initialData?.schedule_config?.endDate || '',
    syllabusUrl: initialSyllabusUrl || '',
  }), [initialData, initialSyllabusUrl]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    const loadTeachers = async () => {
      const res = await getTeachersForScheduler();
      if (res.success && res.data) {
        setTeacherOptions(res.data);
      }
    };
    void loadTeachers();
  }, []);

  const teacherSelectItems = useMemo(() => {
    return teacherOptions.map((teacher) => {
      const name = `${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim();
      const label = name ? `${name} (${teacher.email})` : teacher.email;
      return { id: teacher.id, label };
    });
  }, [teacherOptions]);

  async function onSubmit(values: FormValues) {
    try {
        let res;
        const payload = { 
            name: values.name,
            description: values.description,
            capacity: values.capacity,
            location: values.location,
            teacher_id: values.teacher_id === 'unassigned' ? null : values.teacher_id,
            price: Math.round(values.price * 100),
            schedule_config: {
                day: values.day,
                block: values.block,
                recurring: true,
                startDate: values.startDate || undefined,
                endDate: values.endDate || undefined,
            },
            status: values.status as Class['status'] 
        };

        if (isEdit && initialData?.id) {
            res = await schedulerUpdateClass(initialData.id, payload);
        } else {
            res = await schedulerCreateClass(payload);
        }

        if (!res.success) {
            toast.error(res.error || 'Operation failed');
            return;
        }

        const classId = isEdit ? initialData?.id : res.data?.classId;

        if (classId && values.syllabusUrl && values.syllabusUrl.trim().length > 0) {
          const syllabusRes = await upsertSyllabusLink(classId, values.syllabusUrl.trim());
          if (!syllabusRes.success) {
            toast.error(syllabusRes.error || 'Failed to save syllabus URL');
            return;
          }
        }

        toast.success(isEdit ? 'Class updated' : 'Class created');

        if (onSuccess) {
          onSuccess();
          return;
        }

        router.push('/class-scheduler/classes');
        router.refresh();
    } catch(err) {
        console.error(err);
        toast.error('Something went wrong');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl" data-testid="scheduler-class-form">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Name</FormLabel>
              <FormControl>
                <Input placeholder="Math 101" {...field} data-testid="class-name-input" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Class overview" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="teacher_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Teacher</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'unassigned'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teacherSelectItems.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room Location</FormLabel>
              <FormControl>
                <Input placeholder="Room 3B" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {[
                              { value: 'Tuesday/Thursday', label: 'Tuesday/Thursday' },
                              { value: 'Tuesday', label: 'Tuesday only' },
                              { value: 'Wednesday', label: 'Wednesday only' },
                              { value: 'Thursday', label: 'Thursday only' },
                            ].map((day) => (
                              <SelectItem key={day.value} value={day.value}>
                                {day.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="block"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Block</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Block" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'].map(block => (
                                <SelectItem key={block} value={block}>{block}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Student Class Size</FormLabel>
                <FormControl>
                  <Input type="number" {...field} data-testid="capacity-input" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fee ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="syllabusUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Syllabus URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" data-testid="scheduler-submit-button">{isEdit ? 'Update Class' : 'Create Class'}</Button>
      </form>
    </Form>
  );
}

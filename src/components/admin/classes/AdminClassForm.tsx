'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod'; // Use Zod directly or import schema
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Class } from '@/types';
import { createClass, updateClass } from '@/lib/actions/classes';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const classFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  description: z.string().optional(),
  capacity: z.coerce.number().min(1),

  day: z.string().optional(),
  block: z.string().optional(),
  status: z.enum(['draft', 'published', 'completed', 'cancelled']),
  teacher_id: z.string().uuid({ message: 'Assigned teacher is required' }),
  age_min: z.coerce.number().min(0).optional(),
  age_max: z.coerce.number().min(0).optional(),
  age_display_mode: z.enum(['age_range', 'pills', 'both']).default('both'),
  schedule_display_mode: z.enum(['day_block', 'asynchronous']).default('day_block'),
}).refine(
  (data) => {
    if (data.age_min != null && data.age_max != null) {
      return data.age_min <= data.age_max;
    }
    return true;
  },
  {
    message: 'Age Min cannot exceed Age Max',
    path: ['age_min'],
  }
).refine(
  (data) => {
    if (data.schedule_display_mode === 'day_block') {
      return !!data.day && data.day.length > 0;
    }
    return true;
  },
  {
    message: 'Day is required',
    path: ['day'],
  }
).refine(
  (data) => {
    if (data.schedule_display_mode === 'day_block') {
      return !!data.block && data.block.length > 0;
    }
    return true;
  },
  {
    message: 'Block is required',
    path: ['block'],
  }
);

type ClassFormValues = z.infer<typeof classFormSchema>;

interface AdminClassFormProps {
  initialData?: Class;
  teachers: { id: string; first_name: string; last_name: string }[];
}

export function AdminClassForm({ initialData, teachers }: AdminClassFormProps) {
  const router = useRouter();

  const form = useForm<ClassFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver type mismatch with react-hook-form generics
    resolver: zodResolver(classFormSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      capacity: initialData?.capacity || 10,

      day: initialData?.schedule_config?.day || initialData?.day || '',
      block: initialData?.schedule_config?.block || initialData?.block || '',
      status: ['draft', 'published', 'completed', 'cancelled'].includes(
        initialData?.status as string
      )
        ? (initialData?.status as
            | 'draft'
            | 'published'
            | 'completed'
            | 'cancelled')
        : 'draft',
      teacher_id: initialData?.teacher_id || '',
      age_min: initialData?.age_min ?? undefined,
      age_max: initialData?.age_max ?? undefined,
      age_display_mode: initialData?.age_display_mode ?? 'both',
      schedule_display_mode: initialData?.schedule_display_mode ?? 'day_block',
    },
  });

  async function onSubmit(data: ClassFormValues) {
    const payload = {
      name: data.name,
      description: data.description,
      capacity: data.capacity,

      schedule_config: data.schedule_display_mode === 'day_block'
        ? { day: data.day!, block: data.block!, recurring: true }
        : undefined,
      teacherId: data.teacher_id,
      status: data.status,
      ageMin: data.age_min ?? undefined,
      ageMax: data.age_max ?? undefined,
      ageDisplayMode: data.age_display_mode,
      scheduleDisplayMode: data.schedule_display_mode,
    };

    let result;
    if (initialData) {
      result = await updateClass(initialData.id, payload);
    } else {
      result = await createClass(payload);
    }

    if (result.success) {
      toast.success(initialData ? 'Class updated' : 'Class created');
      router.push('/admin/classes');
      router.refresh();
    } else {
      toast.error(result.error || 'Operation failed');
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-2xl space-y-8"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Name</FormLabel>
              <FormControl>
                <Input placeholder="Introduction to Piano" {...field} />
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
                <Textarea placeholder="Course details..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="age_min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age Min</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="age_max"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age Max</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 12"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-lg border bg-muted/50 p-4 max-w-xs">
          <FormField
            control={form.control}
            name="age_display_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age Display on Browse Page</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="age_range" id="age-display-range" />
                      <label htmlFor="age-display-range" className="text-sm font-normal cursor-pointer">Show only age ranges</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pills" id="age-display-pills" />
                      <label htmlFor="age-display-pills" className="text-sm font-normal cursor-pointer">Show only Elementary, MS, HS</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="age-display-both" />
                      <label htmlFor="age-display-both" className="text-sm font-normal cursor-pointer">Show both</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-lg border bg-muted/50 p-4 max-w-xs">
          <FormField
            control={form.control}
            name="schedule_display_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Display on Browse Page</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="day_block" id="schedule-display-day-block" />
                      <label htmlFor="schedule-display-day-block" className="text-sm font-normal cursor-pointer">Show Day and Block</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="asynchronous" id="schedule-display-async" />
                      <label htmlFor="schedule-display-async" className="text-sm font-normal cursor-pointer">Show Asynchronous</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="teacher_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Teacher</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Schedule Fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Day</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
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
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Block" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[
                      'Block 1',
                      'Block 2',
                      'Block 3',
                      'Block 4',
                    ].map((block) => (
                      <SelectItem key={block} value={block}>
                        {block}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Class
        </Button>
      </form>
    </Form>
  );
}

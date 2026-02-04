
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Class } from '@/types'; // ClassStatus needed?
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { schedulerUpdateClass, schedulerCreateClass } from '@/lib/actions/scheduler';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  location: z.string().optional(),
  teacher_id: z.string().optional(),
  day: z.string().min(1, 'Day is required'),
  block: z.string().min(1, 'Block is required'),
  status: z.enum(['draft', 'published', 'archived', 'completed']).default('draft'),
});

type FormValues = z.infer<typeof formSchema>;

interface SchedulerClassFormProps {
  initialData?: Partial<Class>;
  isEdit?: boolean;
}

export function SchedulerClassForm({ initialData, isEdit = false }: SchedulerClassFormProps) {
  const router = useRouter();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      capacity: initialData?.capacity || 20,
      location: initialData?.location || '',
      teacher_id: initialData?.teacher_id || '',
      status: (initialData?.status as FormValues['status']) || 'draft',
      day: initialData?.schedule_config?.day || '',
      block: initialData?.schedule_config?.block || '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
        let res;
        const payload = { 
            name: values.name,
            description: values.description,
            capacity: values.capacity,
            location: values.location,
            teacherId: values.teacher_id,
            price: initialData?.price || 0, // Ensure price is carried over or defaulted
            schedule_config: {
                day: values.day,
                block: values.block,
                recurring: true
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

        toast.success(isEdit ? 'Class updated' : 'Class created');
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
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location / Room</FormLabel>
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
                            {['Tuesday/Thursday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                                <SelectItem key={day} value={day}>{day}</SelectItem>
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

        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacity</FormLabel>
              <FormControl>
                <Input type="number" {...field} data-testid="capacity-input" />
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
              <FormLabel>Teacher ID (UUID)</FormLabel>
              <FormControl>
                <Input placeholder="Teacher UUID" {...field} />
              </FormControl>
              <FormMessage>Ideally this would be a Select dropdown</FormMessage>
            </FormItem>
          )}
        />

        <Button type="submit" data-testid="scheduler-submit-button">{isEdit ? 'Update Class' : 'Create Class'}</Button>
      </form>
    </Form>
  );
}

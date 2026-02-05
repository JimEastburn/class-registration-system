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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Class } from '@/types';
import { createClass, updateClass } from '@/lib/actions/classes';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { centsToDollars } from '@/lib/utils';

const classFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  description: z.string().optional(),
  capacity: z.coerce.number().min(1),
  price: z.coerce.number().min(0),
  day: z.string().min(1, 'Day is required'),
  block: z.string().min(1, 'Block is required'),
  status: z.enum(['draft', 'published', 'completed', 'cancelled']),
  teacher_id: z.string().uuid({ message: 'Assigned teacher is required' }),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface AdminClassFormProps {
    initialData?: Class;
    teachers: { id: string; first_name: string; last_name: string }[];
}

export function AdminClassForm({ initialData, teachers }: AdminClassFormProps) {
    const router = useRouter();

    const form = useForm<ClassFormValues>({
        resolver: zodResolver(classFormSchema) as any,
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            capacity: initialData?.capacity || 10,
            price: initialData?.price ? centsToDollars(initialData.price) : 80, 
            day: initialData?.schedule_config?.day || '',
            block: initialData?.schedule_config?.block || '',
            status: (['draft', 'published', 'completed', 'cancelled'].includes(initialData?.status as string) 
                ? (initialData?.status as "draft" | "published" | "completed" | "cancelled") 
                : 'draft'),
            teacher_id: initialData?.teacher_id || '',
        },
    });

    async function onSubmit(data: ClassFormValues) {
        const payload = {
            name: data.name,
            description: data.description,
            capacity: data.capacity,
            price: Math.round(data.price * 100), // Convert to cents
            schedule_config: {
              day: data.day,
              block: data.block,
              recurring: true
            },
            teacherId: data.teacher_id,
            status: data.status,
            // Add other fields mapping if needed
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
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
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Class
            </Button>
        </form>
        </Form>
    );
}

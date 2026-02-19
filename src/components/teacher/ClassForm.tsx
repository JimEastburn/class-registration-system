'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClass, updateClass } from '@/lib/actions/classes';
import type { Class, ScheduleConfig } from '@/types';


// Define Zod Schema for the flat form structure
const classFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),

  capacity: z.string().refine((val) => !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 1, {
    message: 'Capacity must be at least 1',
  }),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  ageMin: z.string().optional(),
  ageMax: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classFormSchema>;

interface ClassFormProps {
  existingClass?: Class;
  mode: 'create' | 'edit';
}

export function ClassForm({ existingClass, mode }: ClassFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Helper to safely access schedule config
  const scheduleConfig = existingClass?.schedule_config as ScheduleConfig | undefined;

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: existingClass?.name || '',
      description: existingClass?.description || '',

      capacity: existingClass ? String(existingClass.capacity) : '10',
      startDate: scheduleConfig?.startDate || '',
      endDate: scheduleConfig?.endDate || '',
      location: existingClass?.location || '',
      ageMin: existingClass?.age_min != null ? String(existingClass.age_min) : '',
      ageMax: existingClass?.age_max != null ? String(existingClass.age_max) : '',
    },
  });

  const onSubmit = (values: ClassFormValues) => {
    setServerError(null);


    const capacityNum = parseInt(values.capacity, 10);

    startTransition(async () => {
      const input = {
        name: values.name,
        description: values.description || undefined,

        capacity: capacityNum,
        // Preserve existing day/block from schedule_config (teachers cannot change these)
        schedule_config: {
            day: scheduleConfig?.day || '',
            block: scheduleConfig?.block || '',
            recurring: true, // Default to recurring for now
            startDate: values.startDate || undefined,
            endDate: values.endDate || undefined,
        },
        location: values.location || undefined,
        ageMin: values.ageMin ? parseInt(values.ageMin, 10) : undefined,
        ageMax: values.ageMax ? parseInt(values.ageMax, 10) : undefined,
      };

      let result;
      if (mode === 'create') {
        result = await createClass(input);
        if (result.success && result.data) {
          router.push(`/teacher/classes/${result.data.classId}`);
          router.refresh();
        }
      } else if (existingClass) {
        result = await updateClass(existingClass.id, input);
        if (result.success) {
          router.push(`/teacher/classes/${existingClass.id}`);
          router.refresh();
        }
      }

      if (result && !result.success) {
        setServerError(result.error || 'An error occurred');
      }
    });
  };

  // Get errors for summary from form state
  const formErrors = Object.values(form.formState.errors);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Main Server Error */}
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential details about your class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Beginner Guitar" {...field} />
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
                    <Textarea
                      placeholder="Describe what students will learn..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">


              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormDescription>Maximum students</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>When will this class take place?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
            <CardDescription>Optional class information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">


            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="ageMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Age</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ageMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Age</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Validation Errors Summary */}
        {formErrors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                    <p className="font-semibold mb-2">Please correct the following errors:</p>
                    <ul className="list-disc pl-4">
                        {formErrors.map((error, index) => (
                            <li key={index}>{error.message}</li>
                        ))}
                    </ul>
                </AlertDescription>
            </Alert>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Class' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

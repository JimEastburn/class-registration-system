'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClass, updateClass } from '@/lib/actions/classes';
import type { Class, ScheduleConfig } from '@/types';

interface ClassFormValues {
  name: string;
  description: string;
  price: string;
  capacity: string;
  startDate: string;
  endDate: string;
  day: string;
  block: string;
  location: string;
  ageMin: string;
  ageMax: string;
}

interface ClassFormProps {
  existingClass?: Class;
  mode: 'create' | 'edit';
}

const dayOptions = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
];

const blockOptions = [
  'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'
];

export function ClassForm({ existingClass, mode }: ClassFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Helper to safely access schedule config
  const scheduleConfig = existingClass?.schedule_config as ScheduleConfig | undefined;

  const form = useForm<ClassFormValues>({
    defaultValues: {
      name: existingClass?.name || '',
      description: existingClass?.description || '',
      price: existingClass ? String(existingClass.price / 100) : '0',
      capacity: existingClass ? String(existingClass.capacity) : '10',
      startDate: scheduleConfig?.startDate || '',
      endDate: scheduleConfig?.endDate || '',
      day: scheduleConfig?.day || '',
      block: scheduleConfig?.block || '',
      location: existingClass?.location || '',
      ageMin: existingClass?.age_min != null ? String(existingClass.age_min) : '',
      ageMax: existingClass?.age_max != null ? String(existingClass.age_max) : '',
    },
  });

  const onSubmit = (values: ClassFormValues) => {
    // Validate required fields manually
    if (!values.name || values.name.length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }

    const priceNum = parseFloat(values.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Price must be 0 or greater');
      return;
    }

    const capacityNum = parseInt(values.capacity, 10);
    if (isNaN(capacityNum) || capacityNum < 1) {
      setError('Capacity must be at least 1');
      return;
    }
    
    // Validate Schedule
    if (!values.day || !values.block) {
        setError('Please select both a Day and a Block');
        return;
    }

    setError(null);

    startTransition(async () => {
      const input = {
        name: values.name,
        description: values.description || undefined,
        price: Math.round(priceNum * 100), // Convert to cents
        capacity: capacityNum,
        // Construct ScheduleConfig
        schedule_config: {
            day: values.day,
            block: values.block,
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
        setError(result.error || 'An error occurred');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormDescription>Class fee in dollars</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              name="day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dayOptions.map((day) => (
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
                             <SelectValue placeholder="Select a block" />
                           </SelectTrigger>
                         </FormControl>
                         <SelectContent>
                             {blockOptions.map(blk => (
                                 <SelectItem key={blk} value={blk}>{blk}</SelectItem>
                             ))}
                         </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
            />
            </div>
            
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
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Room 101, Building A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

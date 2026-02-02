'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { classDefaultsSchema, ClassDefaultsFormData } from '@/lib/validations';
import { updateSetting } from '@/lib/actions/settings';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ClassDefaultsFormProps {
  initialData: ClassDefaultsFormData;
}

export function ClassDefaultsForm({ initialData }: ClassDefaultsFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ClassDefaultsFormData>({
    resolver: zodResolver(classDefaultsSchema),
    defaultValues: initialData,
  });

  async function onSubmit(data: ClassDefaultsFormData) {
    setLoading(true);
    try {
      const res = await updateSetting('class_defaults', data as unknown as Record<string, unknown>);
      if (!res.success) {
        toast.error(res.error || 'Failed to update defaults');
        return;
      }
      toast.success('Class defaults updated');
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Configuration Defaults</CardTitle>
        <CardDescription>Set default values for new classes and payment policies.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Class Capacity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Standard class student limit.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentDeadlineDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Deadline (Days)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Days after enrollment until payment is due.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Defaults'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

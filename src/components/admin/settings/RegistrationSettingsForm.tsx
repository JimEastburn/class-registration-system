'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSettingsSchema, RegistrationSettingsFormData } from '@/lib/validations';
import { updateSetting } from '@/lib/actions/settings';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface RegistrationSettingsFormProps {
  initialData: RegistrationSettingsFormData;
}

export function RegistrationSettingsForm({ initialData }: RegistrationSettingsFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RegistrationSettingsFormData>({
    resolver: zodResolver(registrationSettingsSchema),
    defaultValues: initialData,
  });

  async function onSubmit(data: RegistrationSettingsFormData) {
    setLoading(true);
    try {
      const res = await updateSetting('registration_settings', data as unknown as Record<string, unknown>);
      if (!res.success) {
        toast.error(res.error || 'Failed to update settings');
        return;
      }
      toast.success('Registration settings updated');
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
        <CardTitle>Registration & Semesters</CardTitle>
        <CardDescription>Manage registration access and semester timelines.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="registrationOpen"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Registration Open</FormLabel>
                    <FormDescription>
                      Allow parents to enroll students in classes.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="semesterStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester Start</FormLabel>
                    <FormControl>
                      {/* Using native date input when shadcn calendar is unavailable */}
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="semesterEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Registration Settings'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

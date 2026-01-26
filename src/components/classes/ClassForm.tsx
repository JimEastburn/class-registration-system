'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClass, updateClass } from '@/lib/actions/classes';
import { classSchema, type ClassFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RecurringScheduleInput from '@/components/classes/RecurringScheduleInput';
import TeacherSelect from '@/components/classes/TeacherSelect';

interface ClassFormProps {
    classData?: {
        id: string;
        name: string;
        description: string | null;
        location: string;
        start_date: string;
        end_date: string;
        schedule: string;
        max_students: number;
        fee: number;
        syllabus: string | null;
        recurrence_pattern?: string;
        recurrence_days?: string[];
        recurrence_time?: string;
        recurrence_duration?: number;
        teacher_id?: string;
    };
    redirectUrl?: string; // Optional redirect URL after success
    userRole?: string;
    teachers?: { id: string; full_name: string }[];
}

export default function ClassForm({ classData, redirectUrl, userRole, teachers }: ClassFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isTeacher = userRole === 'teacher';

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<ClassFormData>({
        resolver: zodResolver(classSchema),
        defaultValues: classData
            ? {
                name: classData.name,
                description: classData.description || undefined,
                location: classData.location,
                startDate: classData.start_date,
                endDate: classData.end_date,
                schedule: classData.schedule,
                maxStudents: classData.max_students,
                fee: classData.fee,
                syllabus: classData.syllabus || undefined,
                recurrence_pattern: classData.recurrence_pattern,
                recurrence_days: classData.recurrence_days ? JSON.stringify(classData.recurrence_days) : undefined,
                recurrence_time: classData.recurrence_time,
                recurrence_duration: classData.recurrence_duration?.toString(),
                teacherId: classData.teacher_id,
            }
            : {
                maxStudents: 20,
                fee: 0,
                schedule: isTeacher ? 'To Be Announced' : '', // Pre-fill for teachers
            },
    });

    const onSubmit = async (data: ClassFormData) => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('name', data.name);
        if (data.description) formData.append('description', data.description);
        formData.append('location', data.location);
        formData.append('startDate', data.startDate);
        formData.append('endDate', data.endDate);
        formData.append('schedule', data.schedule);
        formData.append('maxStudents', data.maxStudents.toString());
        formData.append('fee', data.fee.toString());
        if (data.syllabus) formData.append('syllabus', data.syllabus);
        
        // Append recurrence fields
        if (data.recurrence_pattern) formData.append('recurrence_pattern', data.recurrence_pattern);
        if (data.recurrence_days) formData.append('recurrence_days', data.recurrence_days);
        if (data.recurrence_time) formData.append('recurrence_time', data.recurrence_time);
        if (data.recurrence_duration) formData.append('recurrence_duration', data.recurrence_duration);
        if (data.teacherId) formData.append('teacherId', data.teacherId);

        const result = classData
            ? await updateClass(classData.id, formData)
            : await createClass(formData);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            router.push(redirectUrl || '/teacher/classes');
        }
    };

    const handleScheduleChange = (schedule: {
        pattern: string;
        days: string[];
        time: string;
        duration: number;
    }) => {
         // Auto-generate the text schedule string
         let scheduleText = '';
         if (schedule.pattern !== 'none') {
             scheduleText = schedule.pattern.charAt(0).toUpperCase() + schedule.pattern.slice(1);
             if (schedule.days.length > 0) {
                 const dayLabels = schedule.days.map(d => d.charAt(0).toUpperCase() + d.slice(1));
                 scheduleText += ` on ${dayLabels.join(', ')}`;
             }
             if (schedule.time) {
                 // Convert 24h to 12h
                 const [h, m] = schedule.time.split(':');
                 const hour = parseInt(h);
                 const ampm = hour >= 12 ? 'PM' : 'AM';
                 const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                 scheduleText += ` at ${displayHour}:${m} ${ampm}`;
             }
         }
         
         if (scheduleText) {
             setValue('schedule', scheduleText, { shouldValidate: true });
         }

         setValue('recurrence_pattern', schedule.pattern);
         setValue('recurrence_days', JSON.stringify(schedule.days));
         setValue('recurrence_time', schedule.time);
         setValue('recurrence_duration', schedule.duration.toString());
    };

    return (
        <Card className="max-w-2xl border-0 shadow-lg">
            <CardHeader>
                <CardTitle>{classData ? 'Edit Class' : 'Create New Class'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Class Name</Label>
                        <Input id="name" placeholder="e.g., Introduction to Algebra" {...register('name')} />
                        {errors.name && (
                            <p className="text-red-500 text-sm">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Teacher Selection for Admins/Schedulers */}
                    {(userRole === 'admin' || userRole === 'class_scheduler') && teachers && (
                        <div className="space-y-2">
                            <Label>Assigned Teacher</Label>
                            <TeacherSelect
                                teachers={teachers}
                                value={classData?.teacher_id}
                                onChange={(value) => setValue('teacherId', value)}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Describe what students will learn..."
                            {...register('description')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" placeholder="e.g., Room 101, Building A" {...register('location')} />
                        {errors.location && (
                            <p className="text-red-500 text-sm">{errors.location.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input type="date" id="startDate" {...register('startDate')} />
                            {errors.startDate && (
                                <p className="text-red-500 text-sm">{errors.startDate.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input type="date" id="endDate" {...register('endDate')} />
                            {errors.endDate && (
                                <p className="text-red-500 text-sm">{errors.endDate.message}</p>
                            )}
                        </div>
                    </div>

                    {!isTeacher ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="schedule">Schedule (Manual Entry)</Label>
                                <Input
                                    id="schedule"
                                    placeholder="e.g., Mon/Wed 3:00 PM - 4:30 PM"
                                    {...register('schedule')}
                                />
                                {errors.schedule && (
                                    <p className="text-red-500 text-sm">{errors.schedule.message}</p>
                                )}
                                <p className="text-xs text-slate-500">
                                    Or use the recurring schedule builder below for automatic formatting
                                </p>
                            </div>

                            {/* Recurring Schedule Section */}
                            <div className="space-y-2">
                                <Label>Recurring Schedule Builder (Optional)</Label>
                                <RecurringScheduleInput
                                    defaultPattern={classData?.recurrence_pattern}
                                    defaultDays={classData?.recurrence_days}
                                    defaultTime={classData?.recurrence_time}
                                    defaultDuration={classData?.recurrence_duration}
                                    onChange={handleScheduleChange}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <Label>Schedule</Label>
                            <p className="text-sm font-medium text-slate-700">
                                {classData?.schedule || 'To Be Announced'}
                            </p>
                            <p className="text-xs text-slate-500">
                                Schedule will be assigned by an administrator.
                            </p>
                            {/* Hidden input to satisfy react-hook-form validation */}
                            <input type="hidden" {...register('schedule')} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="maxStudents">Maximum Students</Label>
                            <Input
                                type="number"
                                id="maxStudents"
                                min="1"
                                {...register('maxStudents', { valueAsNumber: true })}
                            />
                            {errors.maxStudents && (
                                <p className="text-red-500 text-sm">{errors.maxStudents.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fee">Fee ($)</Label>
                            <Input
                                type="number"
                                id="fee"
                                min="0"
                                step="0.01"
                                {...register('fee', { valueAsNumber: true })}
                            />
                            {errors.fee && (
                                <p className="text-red-500 text-sm">{errors.fee.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="syllabus">Syllabus URL (optional)</Label>
                        <Input
                            id="syllabus"
                            placeholder="https://..."
                            {...register('syllabus')}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-gradient-to-r from-primary to-secondary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : classData ? 'Update Class' : 'Create Class'}
                        </Button>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
}

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
import TeacherSelect from '@/components/classes/TeacherSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIME_BLOCKS } from '@/lib/schedule-helpers';

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
        schedule_days?: string[];
        schedule_time?: string;
        teacher_id?: string;
    };
    redirectUrl?: string;
    userRole?: string;
    teachers?: { id: string; full_name: string }[];
}

const DAY_OPTIONS = [
    { value: 'tuesday,thursday', label: 'Tuesday & Thursday' },
    { value: 'tuesday', label: 'Tuesday only' },
    { value: 'thursday', label: 'Thursday only' },
    { value: 'wednesday', label: 'Wednesday only' },
];

// Filter out lunch block for scheduling
const SCHEDULABLE_BLOCKS = TIME_BLOCKS.filter(b => b.id !== 'lunch');

export default function ClassForm({ classData, redirectUrl, userRole, teachers }: ClassFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Local state for schedule selectors
    const [selectedDays, setSelectedDays] = useState<string>(
        classData?.schedule_days?.join(',') || ''
    );
    const [selectedTime, setSelectedTime] = useState<string>(
        classData?.schedule_time || ''
    );

    const isTeacher = userRole === 'teacher';

    const {
        register,
        handleSubmit,
        setValue,
        watch,
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
                teacherId: classData.teacher_id,
            }
            : {
                maxStudents: 20,
                fee: 0,
                schedule: isTeacher ? 'To Be Announced' : '',
            },
    });

    const onSubmit = async (data: ClassFormData) => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('name', data.name);
        if (data.description) formData.append('description', data.description);
        if (data.location) formData.append('location', data.location);
        if (data.startDate) formData.append('startDate', data.startDate);
        if (data.endDate) formData.append('endDate', data.endDate);
        formData.append('schedule', data.schedule);
        formData.append('maxStudents', data.maxStudents.toString());
        formData.append('fee', data.fee.toString());
        if (data.syllabus) formData.append('syllabus', data.syllabus);
        
        // Append schedule fields
        if (selectedDays) {
            const daysArray = selectedDays.split(',');
            formData.append('schedule_days', JSON.stringify(daysArray));
        }
        if (selectedTime) {
            formData.append('schedule_time', selectedTime);
        }
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

    // Generate schedule text when days/time change
    const updateScheduleText = (days: string, time: string) => {
        if (!days || !time) return;
        
        const daysArray = days.split(',');
        const dayLabels = daysArray.map(d => d.charAt(0).toUpperCase() + d.slice(1));
        
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        
        const scheduleText = `${dayLabels.join(', ')} at ${displayHour}:${m} ${ampm}`;
        setValue('schedule', scheduleText, { shouldValidate: true });
    };

    const handleDaysChange = (value: string) => {
        setSelectedDays(value);
        updateScheduleText(value, selectedTime);
    };

    const handleTimeChange = (value: string) => {
        setSelectedTime(value);
        updateScheduleText(selectedDays, value);
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
                                value={watch('teacherId')}
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

                    {!isTeacher && (
                        <>
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
                        </>
                    )}

                    {!isTeacher ? (
                        <>
                            {/* Schedule Selection */}
                            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <Label className="text-base font-semibold">Class Schedule</Label>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm">Days</Label>
                                        <Select value={selectedDays} onValueChange={handleDaysChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select days" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DAY_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm">Time Block</Label>
                                        <Select value={selectedTime} onValueChange={handleTimeChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select time" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SCHEDULABLE_BLOCKS.map(block => (
                                                    <SelectItem key={block.id} value={block.startTime}>
                                                        {block.label} ({block.timeRange})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="text-sm text-slate-600">
                                    <strong>Preview:</strong> {watch('schedule') || 'Select days and time'}
                                </div>
                                
                                {/* Hidden input for form validation */}
                                <input type="hidden" {...register('schedule')} />
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
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
                            {error}
                        </div>
                    )}
                </CardContent>
            </form>
        </Card>
    );
}

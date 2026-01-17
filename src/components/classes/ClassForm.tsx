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
    };
}

export default function ClassForm({ classData }: ClassFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
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
            }
            : {
                maxStudents: 20,
                fee: 0,
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

        const result = classData
            ? await updateClass(classData.id, formData)
            : await createClass(formData);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            router.push('/teacher/classes');
        }
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

                    <div className="space-y-2">
                        <Label htmlFor="schedule">Schedule</Label>
                        <Input
                            id="schedule"
                            placeholder="e.g., Mon/Wed 3:00 PM - 4:30 PM"
                            {...register('schedule')}
                        />
                        {errors.schedule && (
                            <p className="text-red-500 text-sm">{errors.schedule.message}</p>
                        )}
                    </div>

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
                            className="bg-gradient-to-r from-blue-600 to-cyan-600"
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

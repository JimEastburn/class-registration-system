'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ClassWithTeacher } from '@/types';

interface ClassSearchListProps {
    initialClasses: ClassWithTeacher[];
}

export default function ClassSearchList({ initialClasses }: ClassSearchListProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClasses = initialClasses.filter((classItem) => {
        const searchLower = searchTerm.toLowerCase();
        const teacher = classItem.teacher as unknown as {
            first_name: string;
            last_name: string;
        };
        const teacherFullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();

        return (
            classItem.name.toLowerCase().includes(searchLower) ||
            teacherFullName.includes(searchLower)
        );
    });

    return (
        <div className="space-y-6">
            <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                        className="h-5 w-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
                <Input
                    type="text"
                    placeholder="Search by class or teacher name..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="class-search-input"
                />
            </div>

            {filteredClasses.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClasses.map((classItem) => {
                        const teacher = classItem.teacher as unknown as {
                            first_name: string;
                            last_name: string;
                        };
                        const spotsLeft = classItem.max_students - classItem.current_enrollment;

                        return (
                            <Card key={classItem.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg">{classItem.name}</CardTitle>
                                        <Badge
                                            variant={spotsLeft <= 3 ? 'destructive' : 'secondary'}
                                        >
                                            {spotsLeft} spots left
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        by {teacher.first_name} {teacher.last_name}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {classItem.description && (
                                        <p className="text-sm text-slate-600 line-clamp-2">
                                            {classItem.description}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-slate-500">Schedule</p>
                                            <p className="font-medium">{classItem.schedule}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Location</p>
                                            <p className="font-medium">{classItem.location}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Dates</p>
                                            <p className="font-medium">
                                                {new Date(classItem.start_date).toLocaleDateString()} -{' '}
                                                {new Date(classItem.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Fee</p>
                                            <p className="font-medium text-lg">${classItem.fee.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <Link href={`/parent/classes/${classItem.id}`} className="block">
                                        <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600" data-testid={`view-details-button-${classItem.id}`}>
                                            View Details & Enroll
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border-0 shadow-lg">
                    <CardContent className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Match Found</h3>
                        <p className="text-slate-500">
                            We couldn't find any classes matching "{searchTerm}".
                        </p>
                        <Button
                            variant="link"
                            className="mt-2 text-purple-600"
                            onClick={() => setSearchTerm('')}
                        >
                            Clear search
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

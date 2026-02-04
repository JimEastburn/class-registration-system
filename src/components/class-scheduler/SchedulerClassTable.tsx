'use client';

import { Class } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Edit } from 'lucide-react';


interface SchedulerClassTableProps {
  classes: (Class & { teacher?: { first_name: string | null; last_name: string | null; email: string } })[]; // Extended type
  count: number;
}

export function SchedulerClassTable({ classes }: SchedulerClassTableProps) {
    // Helper to format schedule
    const formatSchedule = (config: any) => {
        if (!config || !config.day || !config.block) return 'Unscheduled';
        const dates = config.startDate && config.endDate
            ? ` • ${config.startDate}–${config.endDate}`
            : '';
        return `${config.day} • ${config.block}${dates}`;
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Class Name</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {classes.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                                No classes found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        classes.map((cls) => (
                            <TableRow key={cls.id}>
                                <TableCell className="font-medium">{cls.name}</TableCell>
                                <TableCell>
                                    {cls.teacher
                                        ? `${cls.teacher.first_name ?? ''} ${cls.teacher.last_name ?? ''}`.trim() || cls.teacher.email
                                        : 'Unknown'}
                                </TableCell>
                                <TableCell>{cls.location || 'TBD'}</TableCell>
                                <TableCell>{formatSchedule(cls.schedule_config)}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        cls.status === 'published' ? 'bg-green-100 text-green-800' : 
                                        cls.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {cls.status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/class-scheduler/classes/${cls.id}`}>
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Edit</span>
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

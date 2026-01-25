'use client';

import { useState, Fragment } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StudentActionMenu } from '@/components/classes/StudentActionMenu';
import { ChevronDown, ChevronRight, Mail, Phone, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

type FamilyMember = {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    email?: string;
    phone?: string | null;
};

type Student = {
    id: string;
    first_name: string;
    last_name: string;
    grade_level: string | null;
    parent?: {
        email: string;
        phone: string | null;
        family_members?: FamilyMember[];
    };
};

type Enrollment = {
    id: string;
    status: string;
    enrolled_at: string;
    class_id: string;
    student_id: string;
    student: Student;
};

type StudentListProps = {
    enrollments: Enrollment[];
    blockedSet: Set<string>;
    classNameMap: Record<string, string>;
};

export default function StudentList({ enrollments, blockedSet, classNameMap }: StudentListProps) {
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedStudentId(expandedStudentId === id ? null : id);
    };

    if (!enrollments || enrollments.length === 0) {
        return (
            <p className="text-center text-slate-500 py-8">
                No students enrolled in any of your classes yet.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrolled On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {enrollments.map((enrollment) => {
                    const student = enrollment.student;
                    const isBlocked = blockedSet.has(`${enrollment.class_id}:${enrollment.student_id}`);
                    const isExpanded = expandedStudentId === enrollment.id;
                    const parent = student.parent;
                    const siblings = parent?.family_members?.filter(
                        (m) => m.id !== student.id
                    );

                    return (
                        <Fragment key={enrollment.id}>
                            <TableRow
                                className={cn(
                                    'cursor-pointer transition-colors hover:bg-slate-50',
                                    isBlocked ? 'bg-red-50/50' : '',
                                    isExpanded ? 'bg-slate-50 border-b-0' : ''
                                )}
                                onClick={() => toggleExpand(enrollment.id)}
                            >
                                <TableCell>
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-slate-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-500" />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {student.first_name} {student.last_name}
                                    {isBlocked && (
                                        <Badge variant="destructive" className="ml-2 text-[10px] h-5">
                                            BLOCKED
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>{classNameMap[enrollment.class_id]}</TableCell>
                                <TableCell>
                                    {student.grade_level ? student.grade_level : '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        className={
                                            statusColors[enrollment.status as keyof typeof statusColors]
                                        }
                                    >
                                        {enrollment.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <StudentActionMenu
                                            classId={enrollment.class_id}
                                            studentId={enrollment.student_id}
                                            studentName={`${student.first_name} ${student.last_name}`}
                                            isBlocked={isBlocked}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                            <AnimatePresence>
                                {isExpanded && (
                                    <TableRow className={cn('hover:bg-slate-50 bg-slate-50')}>
                                        <TableCell colSpan={7} className="p-0 border-t-0">
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 pl-14 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                                            <Mail className="h-4 w-4" /> Parent Contact
                                                        </h4>
                                                        {parent ? (
                                                            <div className="text-sm text-slate-600 space-y-1">
                                                                <p className="flex items-center gap-2">
                                                                    <span className="font-medium">Email:</span>
                                                                    <a
                                                                        href={`mailto:${parent.email}`}
                                                                        className="text-blue-600 hover:underline"
                                                                    >
                                                                        {parent.email}
                                                                    </a>
                                                                </p>
                                                                <p className="flex items-center gap-2">
                                                                    <span className="font-medium">Phone:</span>
                                                                    {parent.phone ? (
                                                                        <a
                                                                            href={`tel:${parent.phone}`}
                                                                            className="text-blue-600 hover:underline"
                                                                        >
                                                                            {parent.phone}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-slate-400">Not provided</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-400">
                                                                Parent information not available.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                                            <Users className="h-4 w-4" /> Family Members
                                                        </h4>
                                                        {siblings && siblings.length > 0 ? (
                                                            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
                                                                {siblings.map((member) => (
                                                                    <li key={member.id}>
                                                                        {member.first_name} {member.last_name}{' '}
                                                                        <span className="text-slate-400 text-xs">
                                                                            ({member.role})
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-slate-400">
                                                                No other family members listed.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </AnimatePresence>
                        </Fragment>
                    );
                })}
            </TableBody>
        </Table>
    );
}

'use client';

import Link from 'next/link';
import { MoreHorizontal, ExternalLink, XCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EnrollmentStatusBadge } from './EnrollmentStatusBadge';
import PayButton from '@/components/payments/PayButton';
import type { Enrollment } from '@/types';
import { centsToDollars, formatCurrency } from '@/lib/utils';

interface EnrollmentWithDetails extends Enrollment {
    class: {
        id: string;
        title: string;
        price: number;
    } | null;
    student?: {
        id: string;
        first_name: string;
        last_name: string;
    } | null;
}

interface EnrollmentTableProps {
    enrollments: EnrollmentWithDetails[];
    onCancel?: (enrollmentId: string) => void;
    showStudent?: boolean;
}

export function EnrollmentTable({
    enrollments,
    onCancel,
    showStudent = false,
}: EnrollmentTableProps) {
    if (enrollments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No enrollments found
            </div>
        );
    }

    return (
        <Table data-testid="enrollment-table">
            <TableHeader>
                <TableRow>
                    <TableHead>Class</TableHead>
                    {showStudent && <TableHead>Student</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id} data-testid={`enrollment-row-${enrollment.id}`}>
                        <TableCell className="font-medium">
                            {enrollment.class?.title || 'Unknown Class'}
                        </TableCell>
                        {showStudent && (
                            <TableCell>
                                {enrollment.student
                                    ? `${enrollment.student.first_name} ${enrollment.student.last_name}`
                                    : '-'}
                            </TableCell>
                        )}
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <EnrollmentStatusBadge
                                    status={enrollment.status}
                                    waitlistPosition={enrollment.waitlist_position}
                                />
                                {enrollment.status === 'pending' && enrollment.class && (
                                     <PayButton
                                        enrollmentId={enrollment.id}
                                        amount={centsToDollars(enrollment.class.price)}
                                        compact={true}
                                    />
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            {formatCurrency(enrollment.class?.price ?? 0, true)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                            {new Date(enrollment.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid="enrollment-actions-trigger">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {enrollment.class && (
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href={`/parent/browse/${enrollment.class.id}`}
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View Class
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {onCancel &&
                                        (enrollment.status === 'pending' ||
                                            enrollment.status === 'waitlisted') && (
                                            <DropdownMenuItem
                                                onClick={() => onCancel(enrollment.id)}
                                                className="text-destructive"
                                                data-testid="cancel-enrollment-button"
                                            >
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Cancel Enrollment
                                            </DropdownMenuItem>
                                        )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

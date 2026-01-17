'use client';

import { useState } from 'react';
import { updateClassStatus } from '@/lib/actions/classes';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClassStatusButtonProps {
    classId: string;
    currentStatus: string;
}

const statusActions = {
    draft: [
        { label: 'Publish Class', status: 'active' as const },
        { label: 'Cancel Class', status: 'cancelled' as const },
    ],
    active: [
        { label: 'Mark Complete', status: 'completed' as const },
        { label: 'Cancel Class', status: 'cancelled' as const },
    ],
    cancelled: [],
    completed: [],
};

export default function ClassStatusButton({
    classId,
    currentStatus,
}: ClassStatusButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const actions = statusActions[currentStatus as keyof typeof statusActions] || [];

    if (actions.length === 0) return null;

    const handleStatusChange = async (newStatus: 'draft' | 'active' | 'cancelled' | 'completed') => {
        setIsLoading(true);
        await updateClassStatus(classId, newStatus);
        setIsLoading(false);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Change Status'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {actions.map((action) => (
                    <DropdownMenuItem
                        key={action.status}
                        onClick={() => handleStatusChange(action.status)}
                        className={action.status === 'cancelled' ? 'text-red-600' : ''}
                    >
                        {action.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

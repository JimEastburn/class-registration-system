'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserRole } from '@/types';

interface UserRoleSelectProps {
    currentRole: UserRole;
    onRoleChange: (role: UserRole) => void;
    disabled?: boolean;
}

export function UserRoleSelect({ currentRole, onRoleChange, disabled }: UserRoleSelectProps) {
    return (
        <Select 
            value={currentRole} 
            onValueChange={(v) => onRoleChange(v as UserRole)} 
            disabled={disabled}
        >
            <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="class_scheduler">Scheduler</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
        </Select>
    );
}

'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { signOut } from '@/lib/actions/auth';
import type { UserRole } from '@/types';

interface TopbarUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    avatarUrl: string | null;
}

interface TopbarProps {
    user: TopbarUser;
}

/**
 * Get display name from user profile
 */
function getDisplayName(user: TopbarUser): string {
    if (user.firstName || user.lastName) {
        return [user.firstName, user.lastName].filter(Boolean).join(' ');
    }
    return user.email.split('@')[0];
}

/**
 * Get initials for avatar fallback
 */
function getInitials(user: TopbarUser): string {
    if (user.firstName && user.lastName) {
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
        return user.firstName.slice(0, 2).toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
}

/**
 * Get role display label
 */
function getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
        parent: 'Parent',
        teacher: 'Teacher',
        student: 'Student',
        admin: 'Admin',
        class_scheduler: 'Class Scheduler',
        super_admin: 'Super Admin',
    };
    return labels[role] || role;
}

/**
 * Get role badge variant
 */
function getRoleBadgeVariant(role: UserRole): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (role) {
        case 'super_admin':
            return 'destructive';
        case 'admin':
            return 'default';
        case 'teacher':
        case 'class_scheduler':
            return 'secondary';
        default:
            return 'outline';
    }
}

export function Topbar({ user }: TopbarProps) {
    const displayName = getDisplayName(user);
    const initials = getInitials(user);

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6" data-testid="topbar">
            {/* Spacer for mobile */}
            <div className="flex-1" />

            {/* Right side: User menu */}
            <div className="flex items-center gap-4">
                {/* Role Badge */}
                <Badge variant={getRoleBadgeVariant(user.role)} data-testid="role-badge">
                    {getRoleLabel(user.role)}
                </Badge>

                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative h-10 w-10 rounded-full"
                            data-testid="user-menu-trigger"
                        >
                            <Avatar className="h-10 w-10">
                                <AvatarImage
                                    src={user.avatarUrl || undefined}
                                    alt={displayName}
                                />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {displayName}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link
                                href={`/${user.role === 'class_scheduler' ? 'class-scheduler' : user.role}/profile`}
                                className="flex items-center"
                                data-testid="profile-link"
                            >
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={async () => {
                                await signOut();
                            }}
                            data-testid="logout-button"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

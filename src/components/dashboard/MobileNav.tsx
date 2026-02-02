'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface MobileNavProps {
    userRole: UserRole;
}

interface NavItem {
    href: string;
    label: string;
}

/**
 * Simplified nav items for mobile
 */
const navItemsByRole: Record<UserRole, NavItem[]> = {
    parent: [
        { href: '/parent', label: 'Dashboard' },
        { href: '/parent/family', label: 'My Family' },
        { href: '/parent/browse', label: 'Browse Classes' },
        { href: '/parent/enrollments', label: 'Enrollments' },
    ],
    teacher: [
        { href: '/teacher', label: 'Dashboard' },
        { href: '/teacher/classes', label: 'My Classes' },
        { href: '/parent', label: 'Parent View' },
        { href: '/parent/family', label: 'My Family' },
    ],
    student: [
        { href: '/student', label: 'Dashboard' },
        { href: '/student/schedule', label: 'My Schedule' },
    ],
    admin: [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/classes', label: 'Classes' },
        { href: '/admin/enrollments', label: 'Enrollments' },
        { href: '/admin/payments', label: 'Payments' },
        { href: '/parent', label: 'Parent View' },
    ],
    class_scheduler: [
        { href: '/class-scheduler', label: 'Dashboard' },
        { href: '/class-scheduler/calendar', label: 'Calendar' },
        { href: '/class-scheduler/classes', label: 'Manage Classes' },
    ],
    super_admin: [
        { href: '/admin', label: 'Admin' },
        { href: '/class-scheduler', label: 'Scheduler' },
        { href: '/teacher', label: 'Teacher' },
        { href: '/parent', label: 'Parent' },
    ],
};

export function MobileNav({ userRole }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const navItems = navItemsByRole[userRole] || navItemsByRole.parent;

    return (
        <div className="lg:hidden border-b bg-background">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Brand */}
                <Link href="/" className="font-bold text-lg">
                    Austin AAC
                </Link>

                {/* Menu Button */}
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger className={cn(
                        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-9"
                    )}>
                        {isOpen ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <Menu className="h-6 w-6" />
                        )}
                        <span className="sr-only">Toggle menu</span>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <div className="flex h-full flex-col">
                            {/* Header */}
                            <div className="flex h-16 items-center border-b px-6">
                                <span className="text-xl font-bold">
                                    Austin AAC
                                </span>
                            </div>

                            {/* Nav Items */}
                            <nav className="flex-1 overflow-y-auto px-3 py-4">
                                <ul className="space-y-1">
                                    {navItems.map((item) => {
                                        const isActive =
                                            pathname === item.href ||
                                            (item.href !== '/' &&
                                                pathname.startsWith(
                                                    item.href + '/'
                                                ));

                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    onClick={() =>
                                                        setIsOpen(false)
                                                    }
                                                    className={cn(
                                                        'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                                        isActive
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'hover:bg-muted'
                                                    )}
                                                >
                                                    {item.label}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
}

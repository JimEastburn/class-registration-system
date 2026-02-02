'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Calendar,
    CreditCard,
    Settings,
    UserCheck,
    GraduationCap,
    FileText,
    Shield,
    CalendarClock,
    User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface SidebarProps {
    userRole: UserRole;
    className?: string;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    roles: UserRole[];
    exact?: boolean;
}

/**
 * Navigation items configuration.
 * Each item specifies which roles can see it.
 */
const navItems: NavItem[] = [
    // Parent Portal Items
    {
        href: '/parent',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['parent', 'teacher', 'admin', 'super_admin'],
        exact: true,
    },
    {
        href: '/parent/family',
        label: 'My Family',
        icon: Users,
        roles: ['parent', 'teacher', 'admin', 'super_admin'],
    },
    {
        href: '/parent/browse',
        label: 'Browse Classes',
        icon: BookOpen,
        roles: ['parent', 'teacher', 'admin', 'super_admin'],
    },
    {
        href: '/parent/enrollments',
        label: 'Enrollments',
        icon: UserCheck,
        roles: ['parent', 'teacher', 'admin', 'super_admin'],
    },
    {
        href: '/parent/profile',
        label: 'Profile',
        icon: User,
        roles: ['parent', 'teacher', 'admin', 'super_admin'],
    },

    // Teacher Portal Items
    {
        href: '/teacher',
        label: 'Teacher Dashboard',
        icon: GraduationCap,
        roles: ['teacher', 'admin', 'super_admin'],
        exact: true,
    },
    {
        href: '/teacher/classes',
        label: 'My Classes',
        icon: BookOpen,
        roles: ['teacher', 'admin', 'super_admin'],
    },
    {
        href: '/teacher/profile',
        label: 'Profile',
        icon: User,
        roles: ['teacher', 'admin', 'super_admin'],
    },

    // Student Portal Items
    {
        href: '/student',
        label: 'Student Dashboard',
        icon: LayoutDashboard,
        roles: ['student'],
        exact: true,
    },
    {
        href: '/student/schedule',
        label: 'My Schedule',
        icon: Calendar,
        roles: ['student'],
    },
    {
        href: '/student/profile',
        label: 'Profile',
        icon: User,
        roles: ['student'],
    },

    // Admin Portal Items
    {
        href: '/admin',
        label: 'Admin Dashboard',
        icon: Shield,
        roles: ['admin', 'super_admin'],
        exact: true,
    },
    {
        href: '/admin/users',
        label: 'User Management',
        icon: Users,
        roles: ['admin', 'super_admin'],
    },
    {
        href: '/admin/classes',
        label: 'All Classes',
        icon: BookOpen,
        roles: ['admin', 'super_admin'],
    },
    {
        href: '/admin/enrollments',
        label: 'All Enrollments',
        icon: UserCheck,
        roles: ['admin', 'super_admin'],
    },
    {
        href: '/admin/payments',
        label: 'Payments',
        icon: CreditCard,
        roles: ['admin', 'super_admin'],
    },
    {
        href: '/admin/audit',
        label: 'Audit Logs',
        icon: FileText,
        roles: ['admin', 'super_admin'],
    },
    {
        href: '/admin/settings',
        label: 'Settings',
        icon: Settings,
        roles: ['admin', 'super_admin'],
    },
    {
        href: '/admin/profile',
        label: 'Profile',
        icon: User,
        roles: ['admin', 'super_admin'],
    },

    // Class Scheduler Portal Items
    {
        href: '/class-scheduler',
        label: 'Scheduler Dashboard',
        icon: CalendarClock,
        roles: ['class_scheduler', 'super_admin'],
        exact: true,
    },
    {
        href: '/class-scheduler/calendar',
        label: 'Master Calendar',
        icon: Calendar,
        roles: ['class_scheduler', 'super_admin'],
    },
    {
        href: '/class-scheduler/classes',
        label: 'Manage Classes',
        icon: BookOpen,
        roles: ['class_scheduler', 'super_admin'],
    },
];

/**
 * Filter nav items based on user role
 */
function getNavItemsForRole(role: UserRole): NavItem[] {
    return navItems.filter((item) => item.roles.includes(role));
}

export function Sidebar({ userRole, className }: SidebarProps) {
    const pathname = usePathname();
    const filteredNavItems = getNavItemsForRole(userRole);

    // Group items by portal
    const parentItems = filteredNavItems.filter((item) =>
        item.href.startsWith('/parent')
    );
    const teacherItems = filteredNavItems.filter((item) =>
        item.href.startsWith('/teacher')
    );
    const studentItems = filteredNavItems.filter((item) =>
        item.href.startsWith('/student')
    );
    const adminItems = filteredNavItems.filter((item) =>
        item.href.startsWith('/admin')
    );
    const schedulerItems = filteredNavItems.filter((item) =>
        item.href.startsWith('/class-scheduler')
    );

    return (
        <aside
            className={cn(
                'fixed inset-y-0 left-0 z-50 w-64 flex-col bg-slate-900 border-r border-slate-800',
                className
            )}
        >
            {/* Logo / Brand */}
            <div className="flex h-16 items-center border-b border-slate-800 px-6">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">
                        Austin AAC
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                {/* Parent Portal Section */}
                {parentItems.length > 0 && (
                    <NavSection
                        title="Parent Portal"
                        items={parentItems}
                        pathname={pathname}
                    />
                )}

                {/* Teacher Portal Section */}
                {teacherItems.length > 0 && (
                    <NavSection
                        title="Teacher Portal"
                        items={teacherItems}
                        pathname={pathname}
                    />
                )}

                {/* Student Portal Section */}
                {studentItems.length > 0 && (
                    <NavSection
                        title="Student Portal"
                        items={studentItems}
                        pathname={pathname}
                    />
                )}

                {/* Admin Portal Section */}
                {adminItems.length > 0 && (
                    <NavSection
                        title="Admin Portal"
                        items={adminItems}
                        pathname={pathname}
                    />
                )}

                {/* Scheduler Portal Section */}
                {schedulerItems.length > 0 && (
                    <NavSection
                        title="Scheduler Portal"
                        items={schedulerItems}
                        pathname={pathname}
                    />
                )}
            </nav>

            {/* Footer */}
            <div className="border-t border-slate-800 p-4">
                <p className="text-xs text-slate-500 text-center">
                    © {new Date().getFullYear()} Austin AAC
                </p>
            </div>
        </aside>
    );
}

interface NavSectionProps {
    title: string;
    items: NavItem[];
    pathname: string;
}

function NavSection({ title, items, pathname }: NavSectionProps) {
    return (
        <div className="mb-6">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {title}
            </h3>
            <ul className="space-y-1">
                {items.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (!item.exact &&
                            item.href !== '/' &&
                            pathname.startsWith(item.href + '/'));

                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface MobileNavProps {
  userRole: UserRole;
  isParent: boolean;
  isVolunteerAdmin: boolean;
  isPhotoConsentAdmin: boolean;
}

interface NavItem {
  href: string;
  label: string;
}

/**
 * Base nav items by role (simplified for mobile)
 */
const navItemsByRole: Record<UserRole, NavItem[]> = {
  parent: [
    { href: '/volunteer', label: 'Volunteer Board' },
    { href: '/parent', label: 'Dashboard' },
    { href: '/parent/family', label: 'My Family' },
    { href: '/parent/browse', label: 'Browse Classes' },
    { href: '/parent/enrollments', label: 'Enrollments' },
  ],
  teacher: [
    { href: '/volunteer', label: 'Volunteer Board' },
    { href: '/teacher', label: 'Dashboard' },
    { href: '/teacher/classes', label: 'My Classes' },
    { href: '/teacher/all-aac-enrollments', label: 'All AAC Enrollments' },
    // Parent View removed - added dynamically if isParent
  ],
  student: [
    { href: '/volunteer', label: 'Volunteer Board' },
    { href: '/student', label: 'Dashboard' },
    { href: '/student/schedule', label: 'My Schedule' },
  ],
  admin: [
    { href: '/volunteer', label: 'Volunteer Board' },
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/photo-consents', label: 'Photo Consents' },
    { href: '/admin/classes', label: 'Classes' },
    { href: '/admin/enrollments', label: 'Enrollments' },
    { href: '/admin/volunteers', label: 'Volunteer Config' },
    { href: '/teacher/all-aac-enrollments', label: 'All AAC Enrollments' },
    // Parent View removed - added dynamically if isParent
  ],
  class_scheduler: [
    { href: '/class-scheduler', label: 'Dashboard' },
    { href: '/class-scheduler/calendar', label: 'Calendar' },
  ],
  super_admin: [
    { href: '/volunteer', label: 'Volunteer Board' },
    { href: '/admin', label: 'Admin' },
    { href: '/admin/photo-consents', label: 'Photo Consents' },
    { href: '/admin/volunteers', label: 'Volunteer Config' },
    { href: '/class-scheduler', label: 'Scheduler' },
    { href: '/teacher', label: 'Teacher' },
    { href: '/teacher/all-aac-enrollments', label: 'All AAC Enrollments' },
    { href: '/parent', label: 'Parent' },
  ],
};

export function MobileNav({
  userRole,
  isParent,
  isVolunteerAdmin,
  isPhotoConsentAdmin,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Determine nav items dynamically
  const navItems = [...(navItemsByRole[userRole] || navItemsByRole.parent)];

  if (isVolunteerAdmin) {
    if (!navItems.some((item) => item.href === '/volunteer')) {
      navItems.unshift({ href: '/volunteer', label: 'Volunteer Board' });
    }
    if (!navItems.some((item) => item.href === '/admin/volunteers')) {
      navItems.push({
        href: '/admin/volunteers',
        label: 'Volunteer Configuration',
      });
    }
  }

  if (
    isPhotoConsentAdmin &&
    !navItems.some((item) => item.href === '/admin/photo-consents')
  ) {
    navItems.push({
      href: '/admin/photo-consents',
      label: 'Photo Consents',
    });
  }

  // Add Parent Link if user is also a parent (and not already seeing parent view as primary)
  if (isParent && userRole !== 'parent' && userRole !== 'super_admin') {
    // Avoid duplicates if logic changes
    if (!navItems.find((item) => item.href === '/parent')) {
      navItems.push({ href: '/parent', label: 'Parent View' });
      navItems.push({ href: '/parent/family', label: 'My Family' });
    }
  }

  return (
    <div className="bg-background border-b lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/" className="text-lg font-bold">
          Austin AAC
        </Link>

        {/* Menu Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger
            className={cn(
              "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            )}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex h-16 items-center border-b px-6">
                <span className="text-xl font-bold">Austin AAC</span>
              </div>

              {/* Nav Items */}
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                  {navItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/' &&
                        pathname.startsWith(item.href + '/'));

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
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

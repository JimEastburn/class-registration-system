'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Shield,
  GraduationCap,
  Users,
  CalendarClock,
  Sparkles,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { switchProfileView } from '@/lib/actions/profile';
import { type PortalView } from '@/lib/logic/profile';
import type { UserRole } from '@/types';

interface PortalSwitcherProps {
  currentView: PortalView;
  allowedViews: PortalView[];
  userRole: UserRole;
  className?: string;
}

/**
 * Configuration for each portal view
 */
const PORTAL_CONFIG: Record<
  PortalView,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
  }
> = {
  parent: {
    label: 'Parent Portal',
    icon: Users,
    color: 'bg-blue-500',
    description: 'Manage family & enrollments',
  },
  teacher: {
    label: 'Teacher Portal',
    icon: GraduationCap,
    color: 'bg-green-500',
    description: 'Manage classes & students',
  },
  student: {
    label: 'Student Portal',
    icon: Users,
    color: 'bg-purple-500',
    description: 'View schedule & materials',
  },
  admin: {
    label: 'Admin Portal',
    icon: Shield,
    color: 'bg-red-500',
    description: 'Full system access',
  },
  class_scheduler: {
    label: 'Scheduler Portal',
    icon: CalendarClock,
    color: 'bg-orange-500',
    description: 'Manage class schedules',
  },
};

/**
 * Get the redirect path for a portal view
 */
function getPortalPath(view: PortalView): string {
  const paths: Record<PortalView, string> = {
    parent: '/parent',
    teacher: '/teacher',
    student: '/student',
    admin: '/admin',
    class_scheduler: '/class-scheduler',
  };
  return paths[view];
}

/**
 * PortalSwitcher component allows users to switch between different portal views
 * based on their role permissions.
 */
export function PortalSwitcher({
  currentView,
  allowedViews,
  userRole,
  className,
}: PortalSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Don't render if user only has one view option
  if (allowedViews.length <= 1) {
    return null;
  }

  const currentConfig = PORTAL_CONFIG[currentView];
  const isSuperAdmin = userRole === 'super_admin';

  const handleViewSwitch = async (view: PortalView) => {
    if (view === currentView) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await switchProfileView(view);

      if (result.success) {
        // Redirect to the new portal
        router.push(getPortalPath(view));
        router.refresh();
      }

      setOpen(false);
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white',
            className
          )}
          disabled={isPending}
          data-testid="portal-switcher-trigger"
        >
          <div
            className={cn('h-2 w-2 rounded-full', currentConfig.color)}
            aria-hidden
          />
          <span className="hidden sm:inline">{currentConfig.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-slate-900 border-slate-700"
      >
        <DropdownMenuLabel className="flex items-center gap-2 text-slate-400">
          {isSuperAdmin && (
            <Sparkles className="h-3 w-3 text-yellow-500" aria-hidden />
          )}
          {isSuperAdmin ? 'God Mode' : 'Switch Portal'}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-slate-700" />

        {allowedViews.map((view) => {
          const config = PORTAL_CONFIG[view];
          const isActive = view === currentView;

          return (
            <DropdownMenuItem
              key={view}
              onClick={() => handleViewSwitch(view)}
              disabled={isPending}
              className={cn(
                'cursor-pointer gap-3 py-2',
                isActive && 'bg-slate-800'
              )}
              data-testid={`portal-option-${view}`}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md',
                  config.color
                )}
              >
                <config.icon className="h-4 w-4 text-white" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">
                    {config.label}
                  </span>
                  {isActive && (
                    <Check className="h-3 w-3 text-green-500" aria-hidden />
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {config.description}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

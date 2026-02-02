'use client';

import { Badge } from '@/components/ui/badge';
import { Shield, GraduationCap, Users, CalendarClock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type PortalView } from '@/lib/logic/profile';
import type { UserRole } from '@/types';

interface RoleBadgeProps {
  view: PortalView;
  userRole?: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Configuration for each portal view badge
 */
const BADGE_CONFIG: Record<
  PortalView,
  {
    label: string;
    icon: React.ElementType;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
  }
> = {
  parent: {
    label: 'Parent',
    icon: Users,
    variant: 'secondary',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  },
  teacher: {
    label: 'Teacher',
    icon: GraduationCap,
    variant: 'secondary',
    className: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
  },
  student: {
    label: 'Student',
    icon: Users,
    variant: 'secondary',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    variant: 'secondary',
    className: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  },
  class_scheduler: {
    label: 'Scheduler',
    icon: CalendarClock,
    variant: 'secondary',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
  },
};

/**
 * Size configuration for badges
 */
const SIZE_CONFIG = {
  sm: {
    badge: 'text-xs px-1.5 py-0.5',
    icon: 'h-3 w-3',
  },
  md: {
    badge: 'text-sm px-2 py-0.5',
    icon: 'h-3.5 w-3.5',
  },
  lg: {
    badge: 'text-sm px-3 py-1',
    icon: 'h-4 w-4',
  },
};

/**
 * RoleBadge component displays the current portal view context.
 * Used to indicate which portal the user is currently viewing.
 */
export function RoleBadge({
  view,
  userRole,
  size = 'md',
  showIcon = true,
  className,
}: RoleBadgeProps) {
  const config = BADGE_CONFIG[view];
  const sizeConfig = SIZE_CONFIG[size];
  const isSuperAdmin = userRole === 'super_admin';
  const Icon = isSuperAdmin ? Sparkles : config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1 font-medium border',
        config.className,
        sizeConfig.badge,
        className
      )}
    >
      {showIcon && <Icon className={sizeConfig.icon} aria-hidden />}
      <span>{isSuperAdmin && view !== 'parent' ? `${config.label} (God Mode)` : config.label}</span>
    </Badge>
  );
}

/**
 * Compact role indicator (just the colored dot with optional label)
 */
export function RoleIndicator({
  view,
  showLabel = false,
  className,
}: {
  view: PortalView;
  showLabel?: boolean;
  className?: string;
}) {
  const config = BADGE_CONFIG[view];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          view === 'parent' && 'bg-blue-500',
          view === 'teacher' && 'bg-green-500',
          view === 'student' && 'bg-purple-500',
          view === 'admin' && 'bg-red-500',
          view === 'class_scheduler' && 'bg-orange-500'
        )}
        aria-hidden
      />
      {showLabel && (
        <span className="text-xs font-medium text-slate-400">{config.label}</span>
      )}
    </div>
  );
}

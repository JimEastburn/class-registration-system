import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogWithUser } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';

/** Build a human-readable description of the audit action */
export function describeAction(log: AuditLogWithUser): string {
  const action = log.action.replace(/_/g, ' ');
  const target = log.target_type ?? '';
  const details = log.details as Record<string, unknown> | null;

  // Add meaningful detail when available
  if (details) {
    if ('newRole' in details) return `Set role to ${details.newRole} on ${target}`;
    if ('is_parent' in details) return `Set parent status to ${details.is_parent} on ${target}`;
    if ('className' in details) return `${action}: ${details.className}`;
    if ('status' in details) return `${action} → ${details.status}`;
  }

  return target ? `${action} on ${target}` : action;
}

export function RecentActivityFeed({ logs }: { logs: AuditLogWithUser[] }) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity.</p>
          ) : (
            logs.map((log) => {
              const userName = log.profiles
                ? `${log.profiles.first_name} ${log.profiles.last_name}`
                : 'System';
              const userEmail = log.profiles?.email ?? null;

              return (
                <div key={log.id} className="flex items-start gap-3">
                  <Activity className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm leading-tight font-medium">
                      {describeAction(log)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      by <span className="font-medium text-foreground">{userName}</span>
                      {userEmail && (
                        <span className="text-muted-foreground"> ({userEmail})</span>
                      )}
                      {' · '}
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

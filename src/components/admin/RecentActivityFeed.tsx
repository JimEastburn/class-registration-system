import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLog } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';

export function RecentActivityFeed({ logs }: { logs: AuditLog[] }) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
            {logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity.</p>
            ) : (
                logs.map(log => (
                    <div key={log.id} className="flex items-center">
                        <Activity className="h-4 w-4 mr-4 text-muted-foreground" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {log.action} <span className="text-muted-foreground">on {log.target_type}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                        </div>
                        {/* {log.user_id && <div className="ml-auto font-medium text-xs truncate w-24 text-right">{log.user_id}</div>} */}
                    </div>
                ))
            )}
        </div>
      </CardContent>
    </Card>
  );
}

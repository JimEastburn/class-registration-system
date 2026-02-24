import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { getConflictAlerts } from '@/lib/actions/scheduler';

export async function ConflictAlertsList() {
  const res = await getConflictAlerts();
  const alerts = res.success && res.data ? res.data : [];

  if (alerts.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Conflict Alerts</CardTitle>
          <CardDescription>Detected scheduling issues.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="mb-3 h-10 w-10 text-green-500 opacity-20" />
            <p className="font-medium">No conflicts detected</p>
            <p className="text-muted-foreground/70 mt-1 text-xs">
              System scan complete on active classes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50 col-span-1 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Conflict Alerts
          <span className="text-muted-foreground bg-secondary ml-auto rounded-full px-2 py-0.5 text-xs font-normal">
            {alerts.length} found
          </span>
        </CardTitle>
        <CardDescription>
          Immediate attention required for scheduling overlaps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-destructive/5 text-destructive border-destructive/10 hover:bg-destructive/10 flex items-start gap-3 rounded-md border p-3 transition-colors"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="text-foreground/90 text-sm leading-tight font-medium">
                  {alert.message}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      alert.severity === 'high'
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                    }`}
                  >
                    {alert.severity} Priority
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

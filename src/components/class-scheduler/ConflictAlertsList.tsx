import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <CheckCircle2 className="h-10 w-10 mb-3 opacity-20 text-green-500" />
                        <p className="font-medium">No conflicts detected</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">System scan complete on active classes.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-1 border-destructive/50 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Conflict Alerts
                    <span className="ml-auto text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        {alerts.length} found
                    </span>
                </CardTitle>
                <CardDescription>Immediate attention required for scheduling overlaps.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3 p-3 bg-destructive/5 text-destructive rounded-md border border-destructive/10 hover:bg-destructive/10 transition-colors">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="font-medium text-sm leading-tight text-foreground/90">{alert.message}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                        alert.severity === 'high' 
                                            ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-500'
                                    }`}>
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

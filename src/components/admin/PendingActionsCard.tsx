import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function PendingActionsCard() {
  return (
    <Card className="col-span-3 lg:col-span-1">
      <CardHeader>
        <CardTitle>Needs Attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Placeholder logic for now, hardcoded 0 until we have specific queries */}
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pending Enrollments</span>
            <span className="text-sm text-muted-foreground">0</span>
        </div>
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Failed Payments</span>
            <span className="text-sm text-muted-foreground">0</span>
        </div>
         <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Unresolved Blocks</span>
            <span className="text-sm text-muted-foreground">0</span>
        </div>
        
        <div className="pt-4">
             <Link href="/admin/users">
                <Button className="w-full" size="sm" variant="outline">Manage Users</Button>
            </Link>
        </div>
      </CardContent>
    </Card>
  );
}

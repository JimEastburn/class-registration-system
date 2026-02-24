import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, DollarSign } from 'lucide-react';
import { SystemStats } from '@/lib/actions/admin';

export function SystemStatsCards({ stats }: { stats: SystemStats }) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Link href="/admin/payments" className="block">
        <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatter.format(stats.totalRevenue)}
            </div>
            <p className="text-muted-foreground text-xs">Lifetime</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/enrollments" className="block">
        <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
            <GraduationCap className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <p className="text-muted-foreground text-xs">Confirmed active</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/classes" className="block">
        <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-muted-foreground text-xs">
              Across all semesters
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/users" className="block">
        <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-muted-foreground text-xs">Registered accounts</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

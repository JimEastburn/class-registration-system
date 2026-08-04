import Link from 'next/link';
import {
  BookOpen,
  Users,
  Calendar,
  CalendarClock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClassCapacityBadge } from '@/components/classes/ClassCapacityBadge';
import { getTeacherDashboardData } from '@/lib/actions/dashboard';

export const metadata = {
  title: 'Teacher Dashboard | Class Registration System',
  description: 'Manage your classes and students',
};

export default async function TeacherDashboardPage() {
  const result = await getTeacherDashboardData();

  if (!result.success || !result.data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Unable to load dashboard data.</p>
      </div>
    );
  }

  const { stats, todayClasses, recentEnrollments } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Teacher Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your classes and view student enrollments.
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/classes/new">
            <span className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Create Class
            </span>
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/teacher/classes" className="block">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Classes
              </CardTitle>
              <BookOpen className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClasses}</div>
              <p className="text-muted-foreground text-xs">
                {stats.activeClasses} published
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/classes" className="block">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Students
              </CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-muted-foreground text-xs">
                across classes
              </p>
              <div className="mt-3 space-y-1 border-t pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enrolled</span>
                  <span className="font-medium">{stats.pendingStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed &amp; Paid</span>
                  <span className="font-medium">{stats.confirmedStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waitlisted</span>
                  <span className="font-medium">{stats.waitlistedStudents}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/classes" className="block">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Classes Today
              </CardTitle>
              <Calendar className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.classesToday}</div>
              <p className="text-muted-foreground text-xs">
                scheduled sessions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/classes" className="block">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <CalendarClock className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingClasses}</div>
              <p className="text-muted-foreground text-xs">classes this week</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Schedule</CardTitle>
            <CardDescription>Your classes scheduled for today</CardDescription>
          </CardHeader>
          <CardContent>
            {todayClasses.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No classes scheduled today.
              </p>
            ) : (
              <div className="space-y-3">
                {todayClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{cls.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {cls.block}
                      </p>
                    </div>
                    <ClassCapacityBadge
                      seatsTaken={cls.enrolledCount}
                      capacity={cls.capacity}
                      variant="compact"
                      className="justify-end text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" className="mt-4 w-full" asChild>
              <Link href="/teacher/classes">
                <span className="flex items-center">
                  View All Classes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Enrollments</CardTitle>
            <CardDescription>
              Latest students enrolled in your classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEnrollments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No recent enrollments.
              </p>
            ) : (
              <div className="space-y-3">
                {recentEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {enrollment.studentName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {enrollment.className}
                      </p>
                    </div>
                    <Badge variant="secondary">{enrollment.enrolledAgo}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" className="mt-4 w-full" asChild>
              <Link href="/teacher/classes">
                <span className="flex items-center">
                  Manage Classes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/teacher/classes/new">
                <span className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Class
                </span>
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/teacher/classes">
                <span className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Classes
                </span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

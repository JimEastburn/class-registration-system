import Link from 'next/link';
import { BookOpen, Users, Calendar, CalendarClock, ArrowRight, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTeacherDashboardData } from '@/lib/actions/dashboard';

export const metadata = {
  title: 'Teacher Dashboard | Class Registration System',
  description: 'Manage your classes and students',
};

export default async function TeacherDashboardPage() {
  const result = await getTeacherDashboardData();

  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Unable to load dashboard data.</p>
      </div>
    );
  }

  const { stats, todayClasses, recentEnrollments } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeClasses} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              enrolled across classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classesToday}</div>
            <p className="text-xs text-muted-foreground">scheduled sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingClasses}</div>
            <p className="text-xs text-muted-foreground">classes this week</p>
          </CardContent>
        </Card>
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
              <p className="text-sm text-muted-foreground">
                No classes scheduled today.
              </p>
            ) : (
              <div className="space-y-3">
                {todayClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.startTime} - {cls.endTime}
                      </p>
                    </div>
                    <Badge variant={cls.enrolledCount >= cls.capacity ? 'default' : 'outline'}>
                      {cls.enrolledCount}/{cls.capacity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" className="w-full mt-4" asChild>
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
            <CardDescription>Latest students enrolled in your classes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent enrollments.
              </p>
            ) : (
              <div className="space-y-3">
                {recentEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {enrollment.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.className}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {enrollment.enrolledAgo}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" className="w-full mt-4" asChild>
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
          <CardDescription>Common tasks for managing your classes</CardDescription>
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

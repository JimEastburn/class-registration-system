import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import AdminUserActions from '@/components/admin/AdminUserActions';
import { SearchBar, FilterSelect, ClearFilters } from '@/components/admin/SearchFilters';

export const metadata = {
    title: 'User Management | Admin Portal',
};

const roleColors = {
    parent: 'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100 text-blue-700',
    student: 'bg-green-100 text-green-700',
    admin: 'bg-red-100 text-red-700',
};

const roleOptions = [
    { value: 'parent', label: 'Parent' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'student', label: 'Student' },
    { value: 'admin', label: 'Admin' },
];

interface PageProps {
    searchParams: Promise<{ q?: string; role?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;
    const searchQuery = params.q || '';
    const roleFilter = params.role || '';

    let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    // Apply search filter
    if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    // Apply role filter
    if (roleFilter) {
        query = query.eq('role', roleFilter);
    }

    const { data: users } = await query;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">User Management</h2>
                <p className="text-slate-500">View and manage all users in the system</p>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle>All Users ({users?.length || 0})</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <SearchBar placeholder="Search users..." />
                            <FilterSelect
                                options={roleOptions}
                                paramName="role"
                                placeholder="All Roles"
                                allLabel="All Roles"
                            />
                            <ClearFilters paramNames={['q', 'role']} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveTable>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                            No users found matching your criteria
                                        </TableCell>
                                    </TableRow>
                                )}
                                {users?.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                {user.first_name} {user.last_name}
                                                <div className="sm:hidden text-xs text-slate-500 truncate max-w-[150px]">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                                        <TableCell>
                                            <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AdminUserActions userId={user.id} currentRole={user.role} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ResponsiveTable>
                </CardContent>
            </Card>
        </div>
    );
}

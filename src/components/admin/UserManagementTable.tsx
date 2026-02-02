'use client';

import { Profile, UserRole } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Trash2 } from 'lucide-react';
import { UserRoleSelect } from './UserRoleSelect';
import { ChangeRoleDialog } from './ChangeRoleDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface UserManagementTableProps {
  users: Profile[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export function UserManagementTable({ users, totalCount, currentPage, totalPages }: UserManagementTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Dialog states
  const [roleDialogUser, setRoleDialogUser] = useState<Profile | null>(null);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<Profile | null>(null);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      if (name === 'search') params.set('page', '1'); // Reset page on search
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = (term: string) => {
      setSearch(term);
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
          params.set('search', term);
      } else {
          params.delete('search');
      }
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
  }
  
  // Debounce manually if use-debounce not present?
  // I'll assume users press Enter or I use a simple timeout effect, 
  // but for now I'll just update on change with a small valid delay or just "onKeyDown Enter".
  // "onKeyDown Enter" is safer without library.

  const onRoleChangeRequest = (user: Profile, newRole: UserRole) => {
      if (user.role === newRole) return;
      setRoleDialogUser(user);
      setPendingRole(newRole);
  };

  const onDeleteRequest = (user: Profile) => {
      setDeleteDialogUser(user);
  }

  const handlePageChange = (newPage: number) => {
      router.push(pathname + '?' + createQueryString('page', newPage.toString()));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search users..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    // Debounce logic could go here
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSearch(search);
                    }
                }}
            />
        </div>
        <Button variant="outline" onClick={() => handleSearch(search)}>Search</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No users found.
                    </TableCell>
                </TableRow>
            ) : (
                users.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell>
                            <div>
                                <div className="font-medium">{user.first_name} {user.last_name}</div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <UserRoleSelect 
                                currentRole={user.role} 
                                onRoleChange={(role) => onRoleChangeRequest(user, role)} 
                            />
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDeleteRequest(user)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
           <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
           >
            Previous
           </Button>
           <div className="text-sm font-medium">Page {currentPage} of {Math.max(1, totalPages)} (Total: {totalCount})</div>
           <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
           >
            Next
           </Button>
      </div>

      {roleDialogUser && pendingRole && (
          <ChangeRoleDialog
            open={!!roleDialogUser}
            onOpenChange={(open) => !open && setRoleDialogUser(null)}
            userId={roleDialogUser.id}
            currentRole={roleDialogUser.role}
            newRole={pendingRole}
            onSuccess={() => {
                setRoleDialogUser(null);
                setPendingRole(null);
                router.refresh(); 
            }}
          />
      )}

      {deleteDialogUser && (
          <DeleteUserDialog
            open={!!deleteDialogUser}
            onOpenChange={(open) => !open && setDeleteDialogUser(null)}
            userId={deleteDialogUser.id}
            userName={`${deleteDialogUser.first_name} ${deleteDialogUser.last_name}`}
            onSuccess={() => {
                setDeleteDialogUser(null);
                router.refresh();
            }}
          />
      )}
    </div>
  );
}

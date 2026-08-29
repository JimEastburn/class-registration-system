'use client';

import { UserRole } from '@/types';
import { UserRoleSelect } from './UserRoleSelect';
import { ChangeRoleDialog } from './ChangeRoleDialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import {
  updateParentStatus,
  updatePhotoConsentAdminStatus,
  updateVolunteerAdminStatus,
} from '@/lib/actions/admin';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UserPermissionsEditorProps {
  userId: string;
  currentRole: UserRole;
  isParent: boolean;
  isVolunteerAdmin: boolean;
  isPhotoConsentAdmin: boolean;
}

export function UserPermissionsEditor({
  userId,
  currentRole,
  isParent,
  isVolunteerAdmin,
  isPhotoConsentAdmin,
}: UserPermissionsEditorProps) {
  const router = useRouter();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [parentToggleLoading, setParentToggleLoading] = useState(false);
  const [localIsParent, setLocalIsParent] = useState(isParent);
  const [volunteerAdminToggleLoading, setVolunteerAdminToggleLoading] =
    useState(false);
  const [localIsVolunteerAdmin, setLocalIsVolunteerAdmin] =
    useState(isVolunteerAdmin);
  const [photoConsentAdminToggleLoading, setPhotoConsentAdminToggleLoading] =
    useState(false);
  const [localIsPhotoConsentAdmin, setLocalIsPhotoConsentAdmin] =
    useState(isPhotoConsentAdmin);

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === currentRole) return;
    setPendingRole(newRole);
    setRoleDialogOpen(true);
  };

  const handleVolunteerAdminToggle = async (checked: boolean) => {
    setVolunteerAdminToggleLoading(true);
    setLocalIsVolunteerAdmin(checked);
    try {
      const { success, error } = await updateVolunteerAdminStatus(
        userId,
        checked
      );
      if (success) {
        toast.success(
          checked
            ? 'Volunteer administrator access enabled'
            : 'Volunteer administrator access disabled'
        );
        router.refresh();
      } else {
        setLocalIsVolunteerAdmin(!checked);
        toast.error(error || 'Failed to update volunteer administrator access');
      }
    } catch {
      setLocalIsVolunteerAdmin(!checked);
      toast.error('An unexpected error occurred');
    } finally {
      setVolunteerAdminToggleLoading(false);
    }
  };

  const handleParentToggle = async (checked: boolean) => {
    setParentToggleLoading(true);
    setLocalIsParent(checked); // optimistic
    try {
      const { success, error } = await updateParentStatus(userId, checked);
      if (success) {
        toast.success(
          checked ? 'Parent access enabled' : 'Parent access disabled'
        );
        router.refresh();
      } else {
        setLocalIsParent(!checked); // revert
        toast.error(error || 'Failed to update parent status');
      }
    } catch {
      setLocalIsParent(!checked); // revert
      toast.error('An unexpected error occurred');
    } finally {
      setParentToggleLoading(false);
    }
  };

  const handlePhotoConsentAdminToggle = async (checked: boolean) => {
    setPhotoConsentAdminToggleLoading(true);
    setLocalIsPhotoConsentAdmin(checked);
    try {
      const { success, error } = await updatePhotoConsentAdminStatus(
        userId,
        checked
      );
      if (success) {
        toast.success(
          checked
            ? 'Photo consent administrator access enabled'
            : 'Photo consent administrator access disabled'
        );
        router.refresh();
      } else {
        setLocalIsPhotoConsentAdmin(!checked);
        toast.error(
          error || 'Failed to update photo consent administrator access'
        );
      }
    } catch {
      setLocalIsPhotoConsentAdmin(!checked);
      toast.error('An unexpected error occurred');
    } finally {
      setPhotoConsentAdminToggleLoading(false);
    }
  };

  // Don't show is_parent toggle for users whose role is already 'parent'
  const showParentToggle = currentRole !== 'parent';

  return (
    <div className="space-y-4">
      {/* Role selector */}
      <div className="flex items-center justify-between border-b pb-2">
        <span className="font-medium">Role</span>
        <UserRoleSelect
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
        />
      </div>

      {/* Parent access toggle */}
      {showParentToggle && (
        <div className="flex items-center justify-between border-b pb-2">
          <div className="space-y-0.5">
            <Label htmlFor="parent-toggle" className="text-sm font-medium">
              Parent Access
            </Label>
            <p className="text-muted-foreground text-xs">
              Allow this user to manage family members and enroll students
            </p>
          </div>
          <Switch
            id="parent-toggle"
            checked={localIsParent}
            onCheckedChange={handleParentToggle}
            disabled={parentToggleLoading}
            data-testid="parent-access-toggle"
          />
        </div>
      )}

      <div className="flex items-center justify-between border-b pb-2">
        <div className="space-y-0.5">
          <Label
            htmlFor="volunteer-admin-toggle"
            className="text-sm font-medium"
          >
            Volunteer Administrator Access
          </Label>
          <p className="text-muted-foreground text-xs">
            Allow this user to configure the volunteer board and manage
            volunteer signups
          </p>
        </div>
        <Switch
          id="volunteer-admin-toggle"
          checked={localIsVolunteerAdmin}
          onCheckedChange={handleVolunteerAdminToggle}
          disabled={volunteerAdminToggleLoading}
          data-testid="volunteer-admin-access-toggle"
        />
      </div>

      <div className="flex items-center justify-between border-b pb-2">
        <div className="space-y-0.5">
          <Label
            htmlFor="photo-consent-admin-toggle"
            className="text-sm font-medium"
          >
            Photo Consent Administrator Access
          </Label>
          <p className="text-muted-foreground text-xs">
            Allow this user to view student photo consent records
          </p>
        </div>
        <Switch
          id="photo-consent-admin-toggle"
          checked={localIsPhotoConsentAdmin}
          onCheckedChange={handlePhotoConsentAdminToggle}
          disabled={photoConsentAdminToggleLoading}
          data-testid="photo-consent-admin-access-toggle"
        />
      </div>

      {/* Role change confirmation dialog */}
      {pendingRole && (
        <ChangeRoleDialog
          open={roleDialogOpen}
          onOpenChange={(open) => {
            setRoleDialogOpen(open);
            if (!open) setPendingRole(null);
          }}
          userId={userId}
          currentRole={currentRole}
          newRole={pendingRole}
          onSuccess={() => {
            setPendingRole(null);
            setRoleDialogOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { getCurrentUserProfile } from '@/lib/actions/auth';

export const metadata = {
  title: 'Profile | Parent Portal',
  description: 'Manage your profile settings',
};

export default async function ParentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  const profile = await getCurrentUserProfile();

  const initials =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`
      : user.email?.[0]?.toUpperCase() || 'U';

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    'User';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your basic profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{fullName}</h3>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <p className="text-muted-foreground mt-1 text-xs capitalize">
                Role: {profile?.role || 'Parent'}
              </p>
            </div>
          </div>

          <ProfileForm initialData={profile} />
        </CardContent>
      </Card>
    </div>
  );
}

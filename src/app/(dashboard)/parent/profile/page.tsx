import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const metadata = {
    title: 'Profile | Parent Portal',
    description: 'Manage your profile settings',
};

export default async function ParentProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div>Please log in to view your profile.</div>;
    }

    const initials = user.user_metadata?.first_name && user.user_metadata?.last_name
        ? `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`
        : user.email?.[0]?.toUpperCase() || 'U';

    const fullName = [user.user_metadata?.first_name, user.user_metadata?.last_name]
        .filter(Boolean)
        .join(' ') || 'User';

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
                    <CardDescription>
                        Your basic profile details
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.user_metadata?.avatar_url} />
                            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium text-lg">{fullName}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground capitalize mt-1">
                                Role: {user.user_metadata?.role || 'Parent'}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input 
                                id="firstName" 
                                value={user.user_metadata?.first_name || ''} 
                                disabled 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input 
                                id="lastName" 
                                value={user.user_metadata?.last_name || ''} 
                                disabled 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                value={user.email || ''} 
                                disabled 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

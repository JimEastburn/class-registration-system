'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { profileSchema, type ProfileFormData } from '@/lib/validations';
import { updateProfile } from '@/lib/actions/profile';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProfileFormProps {
    initialData: {
        firstName: string;
        lastName: string;
        phone?: string;
        bio?: string;
        email: string;
        role: string;
    };
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: initialData.firstName,
            lastName: initialData.lastName,
            phone: initialData.phone || '',
            bio: initialData.bio || '',
        },
    });

    const onSubmit = async (data: ProfileFormData) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        const result = await updateProfile(data);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            router.refresh();
        }

        setIsLoading(false);
    };

    const roleLabels: Record<string, string> = {
        parent: 'Parent',
        teacher: 'Teacher',
        student: 'Student',
        admin: 'Administrator',
    };

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                            Profile updated successfully!
                        </div>
                    )}

                    {/* Read-only fields */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-slate-500">Email</Label>
                            <Input
                                value={initialData.email}
                                disabled
                                className="bg-slate-50"
                            />
                            <p className="text-xs text-slate-400">Email cannot be changed</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-500">Role</Label>
                            <Input
                                value={roleLabels[initialData.role] || initialData.role}
                                disabled
                                className="bg-slate-50"
                            />
                            <p className="text-xs text-slate-400">Contact admin to change role</p>
                        </div>
                    </div>

                    {/* Editable fields */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                {...register('firstName')}
                            />
                            {errors.firstName && (
                                <p className="text-red-500 text-sm">{errors.firstName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                {...register('lastName')}
                            />
                            {errors.lastName && (
                                <p className="text-red-500 text-sm">{errors.lastName.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="(555) 123-4567"
                            {...register('phone')}
                        />
                        {errors.phone && (
                            <p className="text-red-500 text-sm">{errors.phone.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            placeholder="Tell us a bit about yourself..."
                            rows={4}
                            {...register('bio')}
                        />
                        {errors.bio && (
                            <p className="text-red-500 text-sm">{errors.bio.message}</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-[#4c7c92] to-[#9BBFD3]"
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addFamilyMember, updateFamilyMember } from '@/lib/actions/family';
import { familyMemberSchema, type FamilyMemberFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface FamilyMemberFormProps {
    member?: {
        id: string;
        first_name: string;
        last_name: string;
        relationship: string;
        grade_level: string | null;
        birth_date: string | null;
        notes: string | null;
    };
}

export default function FamilyMemberForm({ member }: FamilyMemberFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<FamilyMemberFormData>({
        resolver: zodResolver(familyMemberSchema),
        defaultValues: member
            ? {
                firstName: member.first_name,
                lastName: member.last_name,
                relationship: member.relationship as 'child' | 'spouse' | 'guardian' | 'other',
                gradeLevel: member.grade_level as '6' | '7' | '8' | '9' | '10' | '11' | '12' | undefined,
                birthDate: member.birth_date || undefined,
                notes: member.notes || undefined,
            }
            : undefined,
    });

    const onSubmit = async (data: FamilyMemberFormData) => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('firstName', data.firstName);
        formData.append('lastName', data.lastName);
        formData.append('relationship', data.relationship);
        if (data.gradeLevel) formData.append('gradeLevel', data.gradeLevel);
        if (data.birthDate) formData.append('birthDate', data.birthDate);
        if (data.notes) formData.append('notes', data.notes);

        const result = member
            ? await updateFamilyMember(member.id, formData)
            : await addFamilyMember(formData);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            router.push('/parent/family');
        }
    };

    return (
        <Card className="max-w-2xl border-0 shadow-lg">
            <CardHeader>
                <CardTitle>{member ? 'Edit Family Member' : 'Add Family Member'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" {...register('firstName')} />
                            {errors.firstName && (
                                <p className="text-red-500 text-sm">{errors.firstName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" {...register('lastName')} />
                            {errors.lastName && (
                                <p className="text-red-500 text-sm">{errors.lastName.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="relationship">Relationship</Label>
                        <Select
                            defaultValue={member?.relationship}
                            onValueChange={(value) => setValue('relationship', value as 'child' | 'spouse' | 'guardian' | 'other')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="child">Child</SelectItem>
                                <SelectItem value="spouse">Spouse</SelectItem>
                                <SelectItem value="guardian">Guardian</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.relationship && (
                            <p className="text-red-500 text-sm">{errors.relationship.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="gradeLevel">Grade Level (optional)</Label>
                            <Select
                                defaultValue={member?.grade_level || undefined}
                                onValueChange={(value) => setValue('gradeLevel', value as '6' | '7' | '8' | '9' | '10' | '11' | '12')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6">6th Grade</SelectItem>
                                    <SelectItem value="7">7th Grade</SelectItem>
                                    <SelectItem value="8">8th Grade</SelectItem>
                                    <SelectItem value="9">9th Grade</SelectItem>
                                    <SelectItem value="10">10th Grade</SelectItem>
                                    <SelectItem value="11">11th Grade</SelectItem>
                                    <SelectItem value="12">12th Grade</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="birthDate">Birth Date (optional)</Label>
                            <Input type="date" id="birthDate" {...register('birthDate')} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Input id="notes" {...register('notes')} placeholder="Any additional notes..." />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-gradient-to-r from-purple-600 to-pink-600"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : member ? 'Update' : 'Add Family Member'}
                        </Button>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
}

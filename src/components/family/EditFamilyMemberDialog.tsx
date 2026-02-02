'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateFamilyMember } from '@/lib/actions/family';
import { familyMemberSchema } from '@/lib/validations';
import { Loader2 } from 'lucide-react';
import type { FamilyMember } from '@/types';

type FormValues = z.infer<typeof familyMemberSchema>;

interface EditFamilyMemberDialogProps {
    member: FamilyMember;
    children: React.ReactNode;
}

export function EditFamilyMemberDialog({
    member,
    children,
}: EditFamilyMemberDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(familyMemberSchema),
        defaultValues: {
            firstName: member.first_name,
            lastName: member.last_name,
            email: member.email || '',
            relationship: (member.relationship as 'Student' | 'Parent/Guardian') || 'Student',
            dob: member.dob || '',
            grade: (member.grade as 'elementary' | 'middle school' | 'high school') || undefined,
        },
    });

    const relationship = form.watch('relationship');

    async function onSubmit(values: FormValues) {
        setIsLoading(true);

        try {
            const { data, error } = await updateFamilyMember({
                id: member.id,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                relationship: values.relationship,
                dob: values.dob || null,
                grade: values.grade || null,
            });

            if (error) {
                toast.error(error);
                return;
            }

            if (data) {
                toast.success(`${values.firstName} ${values.lastName} has been updated.`);
                setOpen(false);
            }
        } catch {
            toast.error('An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Family Member</DialogTitle>
                    <DialogDescription>
                        Update information for {member.first_name} {member.last_name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="email@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="relationship"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Relationship</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select relationship" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Student">Student</SelectItem>
                                            <SelectItem value="Parent/Guardian">Parent/Guardian</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {relationship === 'Student' && (
                        <FormField
                            control={form.control}
                            name="grade"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Grade</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select grade" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="elementary">Elementary</SelectItem>
                                            <SelectItem value="middle school">Middle School</SelectItem>
                                            <SelectItem value="high school">High School</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

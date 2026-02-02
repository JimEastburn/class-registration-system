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
import { updateFamilyMember } from '@/lib/actions/family';
import { Loader2 } from 'lucide-react';
import type { FamilyMember } from '@/types';

const formSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    dob: z.string().optional(),
    grade: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: member.first_name,
            lastName: member.last_name,
            email: member.email || '',
            dob: member.dob || '',
            grade: member.grade || '',
        },
    });

    async function onSubmit(values: FormValues) {
        setIsLoading(true);

        try {
            const { data, error } = await updateFamilyMember({
                id: member.id,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
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
                            name="dob"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date of Birth</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="grade"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Grade</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. 5th grade" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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

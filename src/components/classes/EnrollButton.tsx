'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import { getFamilyMembers } from '@/lib/actions/family';
import type { FamilyMember } from '@/types';

interface EnrollButtonProps {
    classId: string;
    className: string;
    price: number;
    available: number;
}

export function EnrollButton({
    classId,
    className,
    price,
    available,
}: EnrollButtonProps) {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [selectedMember, setSelectedMember] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);

    async function loadMembers() {
        if (members.length > 0) return;
        
        setLoadingMembers(true);
        const { data, error } = await getFamilyMembers();
        
        if (error) {
            toast.error('Failed to load family members');
        } else if (data) {
            setMembers(data);
        }
        setLoadingMembers(false);
    }

    async function handleEnroll() {
        if (!selectedMember) {
            toast.error('Please select a family member');
            return;
        }

        setIsLoading(true);
        
        // For now, redirect to checkout - enrollment action will be implemented later
        const checkoutUrl = `/api/checkout?classId=${classId}&familyMemberId=${selectedMember}`;
        window.location.href = checkoutUrl;
    }

    if (available <= 0) {
        return (
            <Button className="w-full" disabled>
                Class Full - Join Waitlist
            </Button>
        );
    }

    return (
        <Dialog 
            open={open} 
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (isOpen) loadMembers();
            }}
        >
            <DialogTrigger asChild>
                <Button className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Enroll Now
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enroll in {className}</DialogTitle>
                    <DialogDescription>
                        Select a family member to enroll in this class.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="family-member">Family Member</Label>
                        {loadingMembers ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading family members...
                            </div>
                        ) : members.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                                <p>No family members found.</p>
                                <Button variant="link" className="p-0 h-auto" asChild>
                                    <Link href="/parent/family">
                                        Add a family member first
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <Select
                                value={selectedMember}
                                onValueChange={setSelectedMember}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a family member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((member) => (
                                        <SelectItem key={member.id} value={member.id}>
                                            {member.first_name} {member.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="rounded-lg bg-muted p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Class Fee</span>
                            <span className="font-medium">${price.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleEnroll}
                        disabled={isLoading || !selectedMember || members.length === 0}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Proceed to Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

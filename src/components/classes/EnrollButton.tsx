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
import { enrollStudent } from '@/lib/actions/enrollments';
import { hasCompleteAddress } from '@/lib/actions/profile';
import { AddressModal } from '@/components/payments/AddressModal';
import type { FamilyMember } from '@/types';

interface EnrollButtonProps {
    classId: string;
    className: string;
    available: number;
}

export function EnrollButton({
    classId,
    className,
    available,
}: EnrollButtonProps) {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [selectedMember, setSelectedMember] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [pendingEnrollmentId, setPendingEnrollmentId] = useState<string | null>(null);

    async function loadMembers() {
        if (members.length > 0) return;
        
        setLoadingMembers(true);
        const { data, error } = await getFamilyMembers({ relationship: 'Student' });
        
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

        try {
            // 1. Create Enrollment
            const { data: enrollment, status, error } = await enrollStudent({
                classId,
                familyMemberId: selectedMember,
            });

            if (error) {
                toast.error(error);
                setIsLoading(false);
                return;
            }

            if (status === 'waitlisted') {
                toast.success('Successfully joined waitlist');
                setOpen(false);
                setIsLoading(false);
                return;
            }

            if (status === 'blocked') {
                toast.error('Enrollment pending approval');
                setOpen(false);
                setIsLoading(false);
                return;
            }

            if (status === 'confirmed') {
                toast.success('Enrollment confirmed');
                setOpen(false);
                setIsLoading(false);
                return;
            }

            // 2. Proceed to Payment (if pending)
            if (enrollment && status === 'pending') {
                // Check if user has a billing address before checkout
                const addressComplete = await hasCompleteAddress();
                if (!addressComplete) {
                    setPendingEnrollmentId(enrollment.id);
                    setShowAddressModal(true);
                    setIsLoading(false);
                    return;
                }

                await proceedToCheckout(enrollment.id);
            } else {
                 // Should not happen for standard flow, but handle gracefully
                 toast.success('Enrollment processed');
                 setOpen(false);
                 setIsLoading(false);
            }

        } catch (err) {
            console.error('Enrollment error:', err);
            toast.error('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    }

    async function proceedToCheckout(enrollmentId: string) {
        setIsLoading(true);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enrollmentId }),
            });

            const checkoutData = await response.json();

            if (!response.ok) {
                throw new Error(checkoutData.error || 'Failed to create checkout session');
            }

            if (checkoutData.url) {
                window.location.href = checkoutData.url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            toast.error('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    }

    if (available <= 0) {
        return (
            <Button className="w-full" disabled>
                Class Full - Join Waitlist
            </Button>
        );
    }

    return (<>
        <Dialog 
            open={open} 
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (isOpen) loadMembers();
            }}
        >
            <DialogTrigger asChild>
                <Button className="w-full" data-testid="enroll-now-button">
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
                                <SelectTrigger data-testid="family-member-select">
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
                            <span className="font-medium">$30.00</span>
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
                        data-testid="proceed-to-payment-button"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Proceed to Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AddressModal
            open={showAddressModal}
            onComplete={() => {
                setShowAddressModal(false);
                if (pendingEnrollmentId) {
                    proceedToCheckout(pendingEnrollmentId);
                }
            }}
            onCancel={() => {
                setShowAddressModal(false);
                setPendingEnrollmentId(null);
                setIsLoading(false);
            }}
        />
    </>);
}

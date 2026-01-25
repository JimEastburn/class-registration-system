'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { joinWaitlist, leaveWaitlist } from '@/lib/actions/waitlist';

interface FamilyMember {
    id: string;
    first_name: string;
    last_name: string;
}

interface WaitlistEntry {
    id: string;
    position: number;
    student_id: string;
}

interface WaitlistButtonProps {
    classId: string;
    className: string;
    familyMembers: FamilyMember[];
    waitlistEntries: WaitlistEntry[];
    waitlistCount: number;
}

export default function WaitlistButton({
    classId,
    className,
    familyMembers,
    waitlistEntries,
    waitlistCount,
}: WaitlistButtonProps) {
    const router = useRouter();
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Get students who are already on waitlist
    const waitlistedStudentIds = waitlistEntries.map(w => w.student_id);
    const availableStudents = familyMembers.filter(fm => !waitlistedStudentIds.includes(fm.id));

    const handleJoinWaitlist = async () => {
        if (!selectedStudent) {
            setMessage({ type: 'error', text: 'Please select a student' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        const result = await joinWaitlist(classId, selectedStudent);

        if (result.error) {
            setMessage({ type: 'error', text: result.error });
        } else {
            setMessage({ type: 'success', text: `Added to waitlist! Position: ${result.position}` });
            setSelectedStudent('');
            router.refresh();
        }

        setIsLoading(false);
    };

    const handleLeaveWaitlist = async (waitlistId: string) => {
        setIsLoading(true);
        setMessage(null);

        const result = await leaveWaitlist(waitlistId);

        if (result.error) {
            setMessage({ type: 'error', text: result.error });
        } else {
            setMessage({ type: 'success', text: 'Removed from waitlist' });
            router.refresh();
        }

        setIsLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Class is Full
                </div>
                <p className="text-amber-600 text-sm">
                    This class is currently at capacity. You can join the waitlist and we&apos;ll notify you when a spot becomes available.
                </p>
                {waitlistCount > 0 && (
                    <p className="text-amber-600 text-sm mt-1">
                        <strong>{waitlistCount}</strong> {waitlistCount === 1 ? 'person' : 'people'} currently on waitlist
                    </p>
                )}
            </div>

            {/* Current waitlist entries for this parent */}
            {waitlistEntries.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Your Waitlist Entries:</p>
                    {waitlistEntries.map((entry) => {
                        const student = familyMembers.find(fm => fm.id === entry.student_id);
                        return (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between p-3 bg-[#4c7c92]/10 rounded-lg"
                            >
                                <div>
                                    <span className="font-medium">
                                        {student?.first_name} {student?.last_name}
                                    </span>
                                    <span className="text-[#4c7c92] ml-2">
                                        Position #{entry.position}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleLeaveWaitlist(entry.id)}
                                    disabled={isLoading}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    Leave
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Join waitlist form */}
            {availableStudents.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Add to Waitlist:</p>
                    <div className="flex gap-2">
                        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select a student" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableStudents.map((student) => (
                                    <SelectItem key={student.id} value={student.id}>
                                        {student.first_name} {student.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={handleJoinWaitlist}
                            disabled={isLoading || !selectedStudent}
                            className="bg-gradient-to-r from-amber-500 to-orange-500"
                        >
                            {isLoading ? 'Adding...' : 'Join Waitlist'}
                        </Button>
                    </div>
                </div>
            )}

            {availableStudents.length === 0 && waitlistEntries.length > 0 && (
                <p className="text-sm text-slate-500">
                    All your family members are already on the waitlist for this class.
                </p>
            )}

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}
        </div>
    );
}

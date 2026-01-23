'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { redeemFamilyInviteCode } from '@/lib/actions/invites';
import { useRouter } from 'next/navigation';

export default function RedeemInviteCodeForm() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await redeemFamilyInviteCode(code);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            setSuccess(true);
            setTimeout(() => {
                router.push('/student/classes');
                router.refresh();
            }, 1500);
        }
    };

    if (success) {
        return (
            <Card className="border-0 shadow-lg bg-green-50">
                <CardContent className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Success!</h3>
                    <p className="text-green-600">Your account has been linked. Redirecting to your classes...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <CardTitle>Link to Your Family</CardTitle>
                <CardDescription>
                    Enter the invite code your parent shared with you to see your enrolled classes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            type="text"
                            placeholder="Enter 6-character code (e.g., ABC123)"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="text-center text-2xl font-mono tracking-widest uppercase"
                            disabled={loading}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                        disabled={loading || code.length !== 6}
                    >
                        {loading ? 'Linking...' : 'Link My Account'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

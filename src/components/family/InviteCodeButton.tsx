'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateFamilyInviteCode } from '@/lib/actions/invites';

interface InviteCodeButtonProps {
    familyMemberId: string;
    memberName: string;
}

export default function InviteCodeButton({ familyMemberId, memberName }: InviteCodeButtonProps) {
    const [code, setCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerateCode = async () => {
        setLoading(true);
        setError(null);
        setCopied(false);

        const result = await generateFamilyInviteCode(familyMemberId);

        if (result.error) {
            setError(result.error);
        } else if (result.code) {
            setCode(result.code);
        }

        setLoading(false);
    };

    const handleCopy = async () => {
        if (code) {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (code) {
        return (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-1">
                    <p className="text-xs text-green-600 font-medium">Invite Code</p>
                    <p className="text-lg font-mono font-bold text-green-700 tracking-wider">{code}</p>
                    <p className="text-xs text-green-500">Expires in 7 days</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                >
                    {copied ? '✓ Copied' : 'Copy'}
                </Button>
            </div>
        );
    }

    return (
        <div>
            <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateCode}
                disabled={loading}
                className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
            >
                {loading ? 'Generating...' : '🔗 Generate Student Link Code'}
            </Button>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}

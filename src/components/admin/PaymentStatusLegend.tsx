'use client';

import {
    Info,
    CheckCircle2,
    Clock,
    XCircle,
    RotateCcw,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const statuses = [
    {
        name: 'Completed',
        status: 'completed',
        icon: CheckCircle2,
        color: 'bg-green-100 text-green-700',
        description: 'Payment has been successfully processed and verified by Stripe. Revenue is recorded.',
        impact: 'Enrollment is automatically confirmed.'
    },
    {
        name: 'Pending',
        status: 'pending',
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-700',
        description: 'Payment is initiated but not yet confirmed by the bank or Stripe. Common for some payment methods.',
        impact: 'Enrollment remains in Pending status.'
    },
    {
        name: 'Failed',
        status: 'failed',
        icon: XCircle,
        color: 'bg-red-100 text-red-700',
        description: 'Payment was declined or failed during processing. No funds were transferred.',
        impact: 'Enrollment may be cancelled or require retry.'
    },
    {
        name: 'Refunded',
        status: 'refunded',
        icon: RotateCcw,
        color: 'bg-[#4c7c92]/10 text-[#4c7c92]',
        description: 'Payment has been returned to the user, either partially or in full.',
        impact: 'Revenue is adjusted; enrollment remains unchanged unless manually updated.'
    }
];

export default function PaymentStatusLegend() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card className="border-0 shadow-md bg-slate-50/50 overflow-hidden mt-4">
            <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Info className="w-4 h-4 text-[#4c7c92]" />
                    <span>Understanding Payment Statuses</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-2">
                        {statuses.map((item) => (
                            <div key={item.status} className="space-y-2 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <item.icon className="w-4 h-4 text-slate-400" />
                                    <Badge className={`${item.color} border-0`}>
                                        {item.name}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {item.description}
                                </p>
                                <div className="pt-2 border-t border-slate-50">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                        System Impact
                                    </p>
                                    <p className="text-[10px] text-slate-500 italic">
                                        {item.impact}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

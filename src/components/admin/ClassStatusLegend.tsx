'use client';

import {
    Info,
    FileText,
    CheckCircle2,
    XCircle,
    CheckSquare,
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const statuses = [
    {
        name: 'Draft',
        status: 'draft',
        icon: FileText,
        color: 'bg-slate-100 text-slate-700',
        description: 'New class being prepared. Not visible to parents or students.',
        transition: 'Manual change to Active to open enrollment.'
    },
    {
        name: 'Active',
        status: 'active',
        icon: CheckCircle2,
        color: 'bg-green-100 text-green-700',
        description: 'Class is live and visible. Parents can browse and enroll children.',
        transition: 'Manual change to Completed or Cancelled.'
    },
    {
        name: 'Completed',
        status: 'completed',
        icon: CheckSquare,
        color: 'bg-blue-100 text-blue-700',
        description: 'Class has finished. No longer visible in "Browse Classes", but visible in student/teacher histories.',
        transition: 'Marks the end of the class lifecycle.'
    },
    {
        name: 'Cancelled',
        status: 'cancelled',
        icon: XCircle,
        color: 'bg-red-100 text-red-700',
        description: 'Class is discontinued. Enrollments are halted.',
        transition: 'Manual change back to Draft/Active if reopened.'
    }
];

export default function ClassStatusLegend() {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card className="border-0 shadow-md bg-slate-50/50 overflow-hidden">
            <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Info className="w-4 h-4 text-[#4c7c92]" />
                    <span>Understanding Class Statuses & Actions</span>
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
                                        Transitions
                                    </p>
                                    <p className="text-[10px] text-slate-500 italic">
                                        {item.transition}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-amber-800 leading-relaxed">
                            <span className="font-semibold">Note on Transitions:</span> Status changes are immediate and affect visibility for parents.
                            Deletions are permanent and will also delete all associated enrollment records.
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
